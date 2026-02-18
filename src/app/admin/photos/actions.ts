'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/security'

export async function uploadPhoto(
  sessionId: string,
  photoUrl: string,
  caption: string,
  tagType: string,
  tagCandidateId: string | null,
  tagEvent: string | null
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('photos').insert({
    session_id: sessionId,
    photo_url: photoUrl,
    caption: caption || null,
    tag_type: tagType || 'general',
    tag_candidate_id: tagCandidateId || null,
    tag_event: tagEvent || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/photos')
  return { success: true }
}

export async function updatePhoto(
  id: string,
  caption: string,
  tagType: string,
  tagCandidateId: string | null,
  tagEvent: string | null
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('photos')
    .update({
      caption,
      tag_type: tagType,
      tag_candidate_id: tagCandidateId || null,
      tag_event: tagEvent || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/photos')
  return { success: true }
}

export async function togglePhotoPublished(id: string, published: boolean) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('photos')
      .update({ published })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/photos')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue lors du toggle' }
  }
}

export async function bulkTogglePublished(ids: string[], published: boolean) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('photos')
      .update({ published })
      .in('id', ids)

    if (error) return { error: error.message }

    revalidatePath('/admin/photos')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue lors du bulk toggle' }
  }
}

export async function deletePhoto(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('photos').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/photos')
  return { success: true }
}
