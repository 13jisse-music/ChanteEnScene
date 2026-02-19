'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/security'

export async function toggleEditionPhoto(id: string, published: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('photos')
    .update({ published })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}

export async function bulkToggleEditionPhotos(ids: string[], published: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('photos')
    .update({ published })
    .in('id', ids)

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}

export async function deleteEditionPhoto(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('photos').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}

export async function addEditionVideo(
  sessionId: string,
  youtubeUrl: string,
  title: string,
  description: string
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('edition_videos').insert({
    session_id: sessionId,
    youtube_url: youtubeUrl,
    title,
    description: description || null,
    published: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}

export async function toggleEditionVideo(id: string, published: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('edition_videos')
    .update({ published })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}

export async function deleteEditionVideo(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('edition_videos').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/editions')
  revalidatePath('/editions')
  return { success: true }
}
