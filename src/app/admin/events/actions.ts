'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotifications } from '@/lib/push'

export async function createEvent(sessionId: string, eventType: string, orderedCandidateIds?: string[]) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('live_events')
    .insert({ session_id: sessionId, event_type: eventType })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Auto-populate lineup with finalists when creating a finale event
  if (eventType === 'final') {
    let candidateIds: string[]

    if (orderedCandidateIds && orderedCandidateIds.length > 0) {
      // Use the provided order (from FinaleRundown)
      candidateIds = orderedCandidateIds
    } else {
      // Fallback: fetch finalists, sort Enfant → Ado → Adulte
      const { data: finalists } = await supabase
        .from('candidates')
        .select('id, category')
        .eq('session_id', sessionId)
        .eq('status', 'finalist')
        .order('last_name', { ascending: true })

      const catOrder = ['Enfant', 'Ado', 'Adulte']
      candidateIds = (finalists || [])
        .sort((a, b) => {
          const ia = catOrder.indexOf(a.category) === -1 ? 99 : catOrder.indexOf(a.category)
          const ib = catOrder.indexOf(b.category) === -1 ? 99 : catOrder.indexOf(b.category)
          return ia - ib
        })
        .map(c => c.id)
    }

    if (candidateIds.length > 0) {
      const rows = candidateIds.map((cid, i) => ({
        live_event_id: data.id,
        candidate_id: cid,
        position: i + 1,
      }))
      await supabase.from('lineup').insert(rows)
    }
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin/demi-finale')
  revalidatePath('/admin/finale')
  return { success: true, eventId: data.id }
}

export async function updateEventStatus(eventId: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ status })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function setCurrentCandidate(eventId: string, candidateId: string | null) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ current_candidate_id: candidateId })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function toggleVoting(eventId: string, isOpen: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ is_voting_open: isOpen })
    .eq('id', eventId)

  if (error) return { error: error.message }

  // Set vote timing on the currently performing lineup item
  const now = new Date().toISOString()
  const { data: performingItem } = await supabase
    .from('lineup')
    .select('id, ended_at')
    .eq('live_event_id', eventId)
    .eq('status', 'performing')
    .maybeSingle()

  if (performingItem) {
    if (isOpen) {
      // Opening voting → freeze performance time + mark vote start
      const updates: Record<string, string> = { vote_opened_at: now }
      if (!performingItem.ended_at) updates.ended_at = now
      await supabase.from('lineup').update(updates).eq('id', performingItem.id)
    } else {
      // Closing voting → mark vote end
      await supabase.from('lineup').update({ vote_closed_at: now }).eq('id', performingItem.id)
    }
  }

  // Push notifications (fire-and-forget)
  const { data: eventForPush } = await supabase
    .from('live_events')
    .select('session_id, current_candidate_id')
    .eq('id', eventId)
    .single()

  if (eventForPush) {
    let candidateName = ''
    if (eventForPush.current_candidate_id) {
      const { data: c } = await supabase
        .from('candidates')
        .select('first_name, last_name, stage_name')
        .eq('id', eventForPush.current_candidate_id)
        .single()
      if (c) candidateName = c.stage_name || `${c.first_name} ${c.last_name}`
    }

    if (isOpen) {
      sendPushNotifications({
        sessionId: eventForPush.session_id,
        role: 'public',
        payload: {
          title: 'Le vote est ouvert !',
          body: candidateName ? `Votez maintenant pour ${candidateName} !` : 'Votez maintenant !',
          tag: 'vote-open',
        },
      }).catch(() => {})
    } else {
      sendPushNotifications({
        sessionId: eventForPush.session_id,
        role: 'public',
        payload: {
          title: 'Le vote est fermé',
          body: 'Merci pour vos votes !',
          tag: 'vote-close',
        },
      }).catch(() => {})
    }
  }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function saveLineup(eventId: string, candidateIds: string[]) {
  const supabase = createAdminClient()

  // Delete existing lineup
  await supabase.from('lineup').delete().eq('live_event_id', eventId)

  // Insert new lineup
  const rows = candidateIds.map((cid, i) => ({
    live_event_id: eventId,
    candidate_id: cid,
    position: i + 1,
  }))

  const { error } = await supabase.from('lineup').insert(rows)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function setCurrentCategory(eventId: string, category: string | null) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ current_category: category })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function deleteEvent(eventId: string) {
  const supabase = createAdminClient()

  // Delete lineup items first (FK)
  await supabase.from('lineup').delete().eq('live_event_id', eventId)

  // Delete live votes for this event
  await supabase.from('live_votes').delete().eq('live_event_id', eventId)

  // Delete the event
  const { error } = await supabase
    .from('live_events')
    .delete()
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function reorderLineup(updates: { id: string; position: number }[]) {
  const supabase = createAdminClient()

  for (const { id, position } of updates) {
    const { error } = await supabase
      .from('lineup')
      .update({ position })
      .eq('id', id)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/events')
  return { success: true }
}

export async function callToStage(eventId: string, candidateId: string, lineupId: string) {
  const supabase = createAdminClient()

  // 1. Set candidate on stage (don't open voting yet — admin does it explicitly)
  const { error: e1 } = await supabase
    .from('live_events')
    .update({ current_candidate_id: candidateId, status: 'live' })
    .eq('id', eventId)

  if (e1) return { error: e1.message }

  // 2. Set lineup status to performing + record start time, reset timing
  const { error: e2 } = await supabase
    .from('lineup')
    .update({
      status: 'performing',
      started_at: new Date().toISOString(),
      ended_at: null,
      vote_opened_at: null,
      vote_closed_at: null,
    })
    .eq('id', lineupId)

  if (e2) return { error: e2.message }

  // Push notification (fire-and-forget)
  const { data: evtPush } = await supabase
    .from('live_events')
    .select('session_id')
    .eq('id', eventId)
    .single()
  const { data: candPush } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name')
    .eq('id', candidateId)
    .single()

  if (evtPush && candPush) {
    const name = candPush.stage_name || `${candPush.first_name} ${candPush.last_name}`
    sendPushNotifications({
      sessionId: evtPush.session_id,
      role: 'public',
      payload: {
        title: `${name} monte sur scène !`,
        body: 'Regardez la performance en direct !',
        tag: 'on-stage',
      },
    }).catch(() => {})
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin/finale')
  return { success: true }
}

export async function endPerformance(eventId: string, lineupId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. Get current state to fill in missing timestamps
  const { data: item } = await supabase
    .from('lineup')
    .select('ended_at, vote_opened_at')
    .eq('id', lineupId)
    .single()

  const updates: Record<string, unknown> = { status: 'completed', vote_closed_at: now }
  if (!item?.ended_at) updates.ended_at = now
  if (!item?.vote_opened_at) updates.vote_opened_at = now

  const { error: e1 } = await supabase
    .from('lineup')
    .update(updates)
    .eq('id', lineupId)

  if (e1) return { error: e1.message }

  // 2. Close voting + clear current candidate
  const { error: e2 } = await supabase
    .from('live_events')
    .update({ current_candidate_id: null, is_voting_open: false })
    .eq('id', eventId)

  if (e2) return { error: e2.message }

  revalidatePath('/admin/events')
  revalidatePath('/admin/finale')
  return { success: true }
}

export async function updateLineupStatus(lineupId: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('lineup')
    .update({ status })
    .eq('id', lineupId)

  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  return { success: true }
}
