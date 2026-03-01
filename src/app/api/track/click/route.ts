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
    } catch {
      // Fire-and-forget
    }
  }

  return NextResponse.redirect(url)
}
