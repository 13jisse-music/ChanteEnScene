'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotifications } from '@/lib/push'
import { revalidatePath } from 'next/cache'

export async function submitCorrection(
  token: string,
  updates: {
    song_title?: string
    song_artist?: string
    video_url?: string
    photo_url?: string
  }
) {
  const supabase = createAdminClient()

  // Find candidate by correction token
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, session_id, correction_fields, status, slug')
    .eq('correction_token', token)
    .single()

  if (!candidate) {
    return { error: 'Lien de correction invalide.' }
  }

  if (candidate.status === 'approved') {
    return { error: 'Votre candidature a déjà été validée. Aucune correction possible.' }
  }

  const allowedFields = candidate.correction_fields || []

  // Build update object with only allowed fields
  const updateData: Record<string, string> = {}

  if (allowedFields.includes('song_title') && updates.song_title?.trim()) {
    updateData.song_title = updates.song_title.trim()
  }
  if (allowedFields.includes('song_artist') && updates.song_artist?.trim()) {
    updateData.song_artist = updates.song_artist.trim()
  }
  if (allowedFields.includes('video') && updates.video_url) {
    updateData.video_url = updates.video_url
  }
  if (allowedFields.includes('photo') && updates.photo_url) {
    updateData.photo_url = updates.photo_url
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'Aucune modification détectée.' }
  }

  // Add updated_at timestamp
  const { error } = await supabase
    .from('candidates')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', candidate.id)

  if (error) {
    return { error: 'Erreur lors de la sauvegarde.' }
  }

  // Notify admin (non-blocking)
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const correctedFields = Object.keys(updateData).join(', ')
  sendPushNotifications({
    sessionId: candidate.session_id,
    role: 'admin',
    payload: {
      title: 'Candidature corrigée',
      body: `${displayName} a corrigé : ${correctedFields}`,
      url: '/admin/candidats',
      tag: `correction-${candidate.id}-${Date.now()}`,
    },
  }).catch(() => {})

  revalidatePath('/admin/candidats')
  return { success: true }
}
