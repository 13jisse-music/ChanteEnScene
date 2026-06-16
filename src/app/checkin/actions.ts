'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Check-in PUBLIC : auto-declaration d'arrivee par le candidat lui-meme (pas de
// requireAdmin, sinon le candidat non connecte se fait rejeter). La securite est
// assuree par la validation ci-dessous : on n'accepte qu'un vrai demi-finaliste
// de la session de l'evenement, et seulement si la demi-finale est ouverte.
export async function selfCheckin(eventId: string, candidateId: string) {
  if (!eventId || !candidateId) return { error: 'Informations manquantes.' }

  const supabase = createAdminClient()

  // L'evenement existe et est ouvert ?
  const { data: event } = await supabase
    .from('live_events')
    .select('id, session_id, status')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || !['pending', 'live', 'paused'].includes(event.status as string)) {
    return { error: "La demi-finale n'est pas ouverte." }
  }

  // Le candidat est bien un demi-finaliste de cette session ?
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('id', candidateId)
    .eq('session_id', event.session_id)
    .eq('status', 'semifinalist')
    .maybeSingle()

  if (!candidate) return { error: 'Candidat introuvable.' }

  // Deja enregistre : on considere que c'est bon (pas une erreur)
  const { data: existing } = await supabase
    .from('lineup')
    .select('id')
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existing) return { success: true }

  const { error } = await supabase.from('lineup').insert({
    live_event_id: eventId,
    candidate_id: candidateId,
    position: 0,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}
