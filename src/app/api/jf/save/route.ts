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

// Sauvegarde la sélection de finalistes d'un juré de demi-finale.
// Route API (et non server action) car les écritures server-action échouaient
// silencieusement en prod (Next 16 / Turbopack). Le juré est ré-identifié par
// son token (jamais une valeur cliente), puis écriture dans jury_priorities.
export async function POST(req: Request) {
  let body: { token?: string; picks?: { id: string; cat: string }[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }
  const { token, picks } = body

  const sb = createAdminClient()
  const { data: juror } = await sb
    .from('jurors')
    .select('id, first_name, session_id, role, is_active')
    .eq('qr_token', token ?? '')
    .eq('is_active', true)
    .single()
  if (!juror || juror.role !== 'semifinal') return NextResponse.json({ error: 'Accès invalide.' }, { status: 403 })

  await sb.from('jury_priorities').delete().eq('juror_id', juror.id).eq('round', 'final')

  if (!picks?.length) return NextResponse.json({ success: true, count: 0 })

  // Rang PAR catégorie (1..N) : une contrainte check limite la valeur du rang,
  // un rang global (1..14) la violerait.
  const rankByCat: Record<string, number> = {}
  const rows = picks.map((p) => {
    rankByCat[p.cat] = (rankByCat[p.cat] || 0) + 1
    return {
      juror_id: juror.id,
      candidate_id: p.id,
      category: p.cat,
      rank: rankByCat[p.cat],
      round: 'final',
      session_id: juror.session_id,
    }
  })
  const { error } = await sb.from('jury_priorities').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byC: Record<string, number> = { Enfant: 0, Ado: 0, Adulte: 0 }
  for (const p of picks) byC[p.cat] = (byC[p.cat] ?? 0) + 1
  await tg(`✅ ${juror.first_name} a validé sa sélection de finalistes : ${rows.length} au total (${byC.Enfant} enfants, ${byC.Ado} ados, ${byC.Adulte} adultes).`)

  return NextResponse.json({ success: true, count: rows.length })
}
