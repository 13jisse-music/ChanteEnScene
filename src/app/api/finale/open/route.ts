import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Pixel transparent 1x1 (GIF)
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

async function tg(text: string) {
  try {
    await fetch('https://api.telegram.org/bot8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8386182992', text }),
    })
  } catch { /* notif non bloquante */ }
}

// Suivi d'ouverture du mail finaliste : le client mail charge ce pixel,
// on enregistre la première ouverture (et on alerte l'admin une seule fois).
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') || ''
  if (t) {
    try {
      const sb = createAdminClient()
      const { data: entry } = await sb
        .from('finale_entries')
        .select('id, candidate_id, mail_opened_at')
        .eq('token', t)
        .single()
      if (entry && !entry.mail_opened_at) {
        await sb.from('finale_entries').update({ mail_opened_at: new Date().toISOString() }).eq('id', entry.id).is('mail_opened_at', null)
        const { data: c } = await sb.from('candidates').select('first_name, stage_name').eq('id', entry.candidate_id).single()
        await tg(`📬 ${c?.stage_name || c?.first_name || 'Un finaliste'} vient d'ouvrir son mail de finaliste.`)
      }
    } catch { /* le pixel doit toujours répondre */ }
  }
  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
