'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotifications } from '@/lib/push'

export async function revealWinner(eventId: string, candidateId: string) {
  const supabase = createAdminClient()

  // Set winner on live_events (triggers Realtime → confetti on /live)
  const { error: eventError } = await supabase
    .from('live_events')
    .update({
      winner_candidate_id: candidateId,
      winner_revealed_at: new Date().toISOString(),
    })
    .eq('id', eventId)

  if (eventError) return { error: eventError.message }

  // Update candidate status to winner
  const { error: candidateError } = await supabase
    .from('candidates')
    .update({ status: 'winner' })
    .eq('id', candidateId)

  if (candidateError) return { error: candidateError.message }

  // Push notification (fire-and-forget)
  const { data: evtPush } = await supabase
    .from('live_events')
    .select('session_id')
    .eq('id', eventId)
    .single()
  const { data: winner } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, category')
    .eq('id', candidateId)
    .single()

  if (evtPush && winner) {
    const name = winner.stage_name || `${winner.first_name} ${winner.last_name}`
    sendPushNotifications({
      sessionId: evtPush.session_id,
      role: 'all',
      payload: {
        title: `${name} remporte ${winner.category ? `la catégorie ${winner.category}` : 'le concours'} !`,
        body: 'Félicitations au gagnant de ChanteEnScene !',
        tag: 'winner-reveal',
      },
    }).catch(() => {})
  }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function validateCategoryResults(eventId: string, category: string, rankings: { candidateId: string; rank: number }[]) {
  const supabase = createAdminClient()

  // Promote top candidate to finalist/winner status based on rank
  for (const item of rankings) {
    if (item.rank === 1) {
      // Winner will be set via revealWinner
      continue
    }
    // Others keep their current status (finalist)
  }

  revalidatePath('/admin/finale')
  return { success: true }
}

// ─── Sequential lineup actions for finale format ───

export async function advanceToNext(eventId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: lineup } = await supabase
    .from('lineup')
    .select('id, candidate_id, position, status, ended_at, vote_opened_at')
    .eq('live_event_id', eventId)
    .order('position')

  if (!lineup || lineup.length === 0) return { error: 'Aucun lineup.' }

  const currentIdx = lineup.findIndex((l) => l.status === 'performing')
  if (currentIdx >= 0) {
    const current = lineup[currentIdx]
    const updates: Record<string, unknown> = { status: 'completed', vote_closed_at: now }
    if (!current.ended_at) updates.ended_at = now
    if (!current.vote_opened_at) updates.vote_opened_at = now
    await supabase
      .from('lineup')
      .update(updates)
      .eq('id', current.id)
  }

  const nextIdx = currentIdx + 1
  if (nextIdx < lineup.length) {
    await supabase
      .from('lineup')
      .update({
        status: 'performing',
        started_at: now,
        ended_at: null,
        vote_opened_at: null,
        vote_closed_at: null,
      })
      .eq('id', lineup[nextIdx].id)

    await supabase
      .from('live_events')
      .update({ current_candidate_id: lineup[nextIdx].candidate_id })
      .eq('id', eventId)
  } else {
    await supabase
      .from('live_events')
      .update({ current_candidate_id: null })
      .eq('id', eventId)
  }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function markAbsent(eventId: string, lineupId: string) {
  const supabase = createAdminClient()

  const { data: item } = await supabase
    .from('lineup')
    .select('candidate_id, status')
    .eq('id', lineupId)
    .single()

  await supabase
    .from('lineup')
    .update({ status: 'absent' })
    .eq('id', lineupId)

  if (item?.status === 'performing') {
    await supabase
      .from('live_events')
      .update({ current_candidate_id: null })
      .eq('id', eventId)
  }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function resetJuryScores(sessionId: string, candidateId: string, eventType: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('jury_scores')
    .delete()
    .eq('session_id', sessionId)
    .eq('candidate_id', candidateId)
    .eq('event_type', eventType)

  if (error) return { error: error.message }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function reorderLineupLive(eventId: string, candidateIds: string[]) {
  const supabase = createAdminClient()

  for (let i = 0; i < candidateIds.length; i++) {
    await supabase
      .from('lineup')
      .update({ position: i + 1 })
      .eq('live_event_id', eventId)
      .eq('candidate_id', candidateIds[i])
  }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function addReplacementCandidate(eventId: string, candidateId: string, position: number) {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('lineup')
    .select('id')
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existing) return { error: 'Candidat déjà dans le lineup.' }

  const { error } = await supabase.from('lineup').insert({
    live_event_id: eventId,
    candidate_id: candidateId,
    position,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function setReplay(eventId: string, lineupId: string) {
  const supabase = createAdminClient()

  const { data: item } = await supabase
    .from('lineup')
    .select('candidate_id')
    .eq('id', lineupId)
    .single()

  if (!item) return { error: 'Entrée lineup introuvable.' }

  await supabase
    .from('lineup')
    .update({
      status: 'performing',
      started_at: new Date().toISOString(),
      ended_at: null,
      vote_opened_at: null,
      vote_closed_at: null,
    })
    .eq('id', lineupId)

  await supabase
    .from('live_events')
    .update({ current_candidate_id: item.candidate_id })
    .eq('id', eventId)

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function updateScoringWeights(sessionId: string, jury: number, publicW: number, social: number) {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable.' }

  const config = (session.config || {}) as Record<string, unknown>

  const { error } = await supabase
    .from('sessions')
    .update({
      config: {
        ...config,
        jury_weight_percent: jury,
        public_weight_percent: publicW,
        social_weight_percent: social,
      },
    })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/finale')
  return { success: true }
}

export async function resetWinnerReveal(eventId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({
      winner_candidate_id: null,
      winner_revealed_at: null,
    })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/finale')
  return { success: true }
}
