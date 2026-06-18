import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Pixel transparent 1x1 (GIF)
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Suivi d'ouverture du mail finaliste : le client mail charge ce pixel,
// on enregistre la première ouverture (pour les relances).
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') || ''
  if (t) {
    try {
      const sb = createAdminClient()
      await sb.from('finale_entries').update({ mail_opened_at: new Date().toISOString() }).eq('token', t).is('mail_opened_at', null)
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
