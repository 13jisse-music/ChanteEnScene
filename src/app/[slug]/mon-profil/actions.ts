'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Verify that the candidateId matches the provided token (candidate slug).
 * This prevents users from modifying other candidates' profiles.
 */
async function verifyOwnership(candidateId: string, token: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('candidates')
    .select('slug')
    .eq('id', candidateId)
    .single()

  if (!data || data.slug !== token) {
    throw new Error('Accès non autorisé')
  }
}

export async function updateCandidateProfile(
  candidateId: string,
  token: string,
  data: {
    stage_name?: string
    bio?: string
    accent_color?: string
    song_title?: string
    song_artist?: string
    city?: string
    phone?: string
    youtube_url?: string
    instagram_url?: string
    tiktok_url?: string
    website_url?: string
  }
) {
  await verifyOwnership(candidateId, token)
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (data.stage_name !== undefined) updateData.stage_name = data.stage_name || null
  if (data.bio !== undefined) updateData.bio = data.bio || null
  if (data.accent_color !== undefined) updateData.accent_color = data.accent_color
  if (data.song_title !== undefined) updateData.song_title = data.song_title
  if (data.song_artist !== undefined) updateData.song_artist = data.song_artist
  if (data.city !== undefined) updateData.city = data.city || null
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.youtube_url !== undefined) updateData.youtube_url = data.youtube_url || null
  if (data.instagram_url !== undefined) updateData.instagram_url = data.instagram_url || null
  if (data.tiktok_url !== undefined) updateData.tiktok_url = data.tiktok_url || null
  if (data.website_url !== undefined) updateData.website_url = data.website_url || null

  const { error } = await supabase
    .from('candidates')
    .update(updateData)
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/mon-profil')
  return { success: true }
}

export interface FinaleSong {
  title: string
  artist: string
  youtube_url: string
}

export async function updateFinaleSongs(
  candidateId: string,
  token: string,
  songs: FinaleSong[],
  phone: string
) {
  await verifyOwnership(candidateId, token)
  const supabase = createAdminClient()

  if (!phone.trim()) return { error: 'Le numéro de téléphone est obligatoire.' }

  const { error } = await supabase
    .from('candidates')
    .update({ finale_songs: songs, phone: phone.trim() })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/mon-profil')
  return { success: true }
}

export async function updateCandidatePhoto(candidateId: string, token: string, photoUrl: string) {
  await verifyOwnership(candidateId, token)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ photo_url: photoUrl })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/mon-profil')
  return { success: true }
}
