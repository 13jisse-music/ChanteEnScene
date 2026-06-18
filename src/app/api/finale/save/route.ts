import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function tg(text: string) {
  try {
    await fetch('https://api.telegram.org/bot8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8386182992', text }),
    })
  } catch { /* notif non bloquante */ }
}

interface Body {
  token?: string
  phone?: string
  fastTitle?: string; fastArtist?: string; fastKey?: string
  slowTitle?: string; slowArtist?: string; slowKey?: string
}

// Enregistre la fiche finaliste (téléphone + 2 chansons). Route API car les
// écritures server-action échouent silencieusement en prod (Next 16 / Turbopack).
export async function POST(req: Request) {
  let b: Body
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const sb = createAdminClient()
  const { data: entry } = await sb
    .from('finale_entries')
    .select('id, candidate_id, submitted_at')
    .eq('token', b.token ?? '')
    .single()
  if (!entry) return NextResponse.json({ error: 'Lien invalide.' }, { status: 403 })

  const wasSubmitted = !!entry.submitted_at
  const now = new Date().toISOString()
  const { error } = await sb.from('finale_entries').update({
    phone: b.phone ?? null,
    fast_title: b.fastTitle ?? null, fast_artist: b.fastArtist ?? null, fast_key: b.fastKey ?? null,
    slow_title: b.slowTitle ?? null, slow_artist: b.slowArtist ?? null, slow_key: b.slowKey ?? null,
    submitted_at: now, updated_at: now,
  }).eq('id', entry.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: c } = await sb.from('candidates').select('first_name, stage_name').eq('id', entry.candidate_id).single()
  const nom = c?.stage_name || c?.first_name || 'Un finaliste'
  const fk = b.fastKey ? ` [${b.fastKey}]` : ''
  const sk = b.slowKey ? ` [${b.slowKey}]` : ''
  await tg(`🎵 ${nom} a ${wasSubmitted ? 'mis à jour' : 'rempli'} sa fiche finaliste.\n📱 ${b.phone || '—'}\n⚡ Rapide : ${b.fastTitle || '—'} — ${b.fastArtist || '—'}${fk}\n🌙 Lente : ${b.slowTitle || '—'} — ${b.slowArtist || '—'}${sk}`)

  return NextResponse.json({ success: true })
}
