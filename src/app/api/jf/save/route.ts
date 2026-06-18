import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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
    .select('id, session_id, role, is_active')
    .eq('qr_token', token ?? '')
    .eq('is_active', true)
    .single()
  if (!juror || juror.role !== 'semifinal') return NextResponse.json({ error: 'Accès invalide.' }, { status: 403 })

  await sb.from('jury_priorities').delete().eq('juror_id', juror.id).eq('round', 'final')

  if (!picks?.length) return NextResponse.json({ success: true, count: 0 })

  const rows = picks.map((p, i) => ({
    juror_id: juror.id,
    candidate_id: p.id,
    category: p.cat,
    rank: i + 1,
    round: 'final',
    session_id: juror.session_id,
  }))
  const { error } = await sb.from('jury_priorities').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: rows.length })
}
