import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/track/click?cid=xxx&e=yyy&url=zzz
 * Logs an email click event then redirects to the actual URL.
 */
export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get('cid')
  const email = request.nextUrl.searchParams.get('e')
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.redirect('https://chantenscene.fr')
  }

  if (cid && email) {
    try {
      const supabase = createAdminClient()
      await supabase.from('email_events').insert({
        campaign_id: cid,
        subscriber_email: email,
        event_type: 'click',
        metadata: {
          url,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        },
      })

      // Notifier chaque clic sur Telegram
      const { count: totalClicks } = await supabase
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .eq('event_type', 'click')
      const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url
      const { sendTelegram } = await import('@/lib/telegram')
      await sendTelegram(
        `🔗 <b>Clic newsletter</b> (${totalClicks} clics total)\n` +
        `📧 ${email}\n` +
        `🔗 ${shortUrl}`,
        '🎤 CES'
      )
    } catch {
      // Fire-and-forget
    }
  }

  return NextResponse.redirect(url)
}
