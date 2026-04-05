import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

/**
 * GET /api/track/open?cid=xxx&e=yyy
 * Logs an email open event and returns a 1x1 transparent pixel.
 */
export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get('cid')
  const email = request.nextUrl.searchParams.get('e')

  if (cid && email) {
    try {
      const supabase = createAdminClient()

      // Verifier si c'est la premiere ouverture de cet email pour cette campagne
      const { count } = await supabase
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .eq('subscriber_email', email)
        .eq('event_type', 'open')
      const isFirstOpen = (count || 0) === 0

      await supabase.from('email_events').insert({
        campaign_id: cid,
        subscriber_email: email,
        event_type: 'open',
        metadata: {
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          ua: request.headers.get('user-agent') || null,
        },
      })

      // Notifier uniquement la premiere ouverture
      if (isFirstOpen) {
        const { count: totalOpens } = await supabase
          .from('email_events')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', cid)
          .eq('event_type', 'open')
        const { sendTelegram } = await import('@/lib/telegram')
        await sendTelegram(
          `👁 <b>Newsletter ouverte</b> (${totalOpens} ouvertures)\n` +
          `📧 ${email}`,
          '🎤 CES'
        )
      }
    } catch {
      // Fire-and-forget: never block the pixel response
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
