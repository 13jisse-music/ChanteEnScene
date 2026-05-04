import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

/**
 * GET /api/track/transactional?id={uuid}
 * Logs open event for transactional emails (not newsletter campaigns).
 * id = UUID from email_opens table, inserted at send time.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    try {
      const supabase = createAdminClient()

      const { data: existing } = await supabase
        .from('email_opens')
        .select('id, to_email, subject, first_open_at, opens_count')
        .eq('id', id)
        .single()

      if (existing) {
        const isFirst = !existing.first_open_at
        await supabase
          .from('email_opens')
          .update({
            opens_count: (existing.opens_count || 0) + 1,
            ...(isFirst ? { first_open_at: new Date().toISOString() } : {}),
          })
          .eq('id', id)

        if (isFirst) {
          const { sendTelegram } = await import('@/lib/telegram')
          await sendTelegram(
            `👁 <b>Mail ouvert</b>\n📧 ${existing.to_email}\n✉️ ${existing.subject}`,
            '🎤 CES'
          )
        }
      }
    } catch {
      // Fire-and-forget
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
