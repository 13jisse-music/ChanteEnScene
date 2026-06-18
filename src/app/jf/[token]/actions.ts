'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// Sauvegarde la sélection de finalistes d'un juré de demi-finale.
// Le juré est ré-identifié par son token (jamais par une valeur cliente),
// puis on écrit dans jury_priorities (round 'final'), réutilisé par la régie.
export async function saveFinalePicks(token: string, picks: { id: string; cat: string }[]) {
  const sb = createAdminClient()

  const { data: juror } = await sb
    .from('jurors')
    .select('id, session_id, role, is_active')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()
  if (!juror || juror.role !== 'semifinal') return { error: 'Accès invalide.' }

  await sb.from('jury_priorities').delete().eq('juror_id', juror.id).eq('round', 'final')

  if (!picks.length) return { success: true, count: 0 }

  const rows = picks.map((p, i) => ({
    juror_id: juror.id,
    candidate_id: p.id,
    category: p.cat,
    rank: i + 1,
    round: 'final',
    session_id: juror.session_id,
  }))
  const { error } = await sb.from('jury_priorities').insert(rows)
  if (error) return { error: error.message }
  return { success: true, count: rows.length }
}
