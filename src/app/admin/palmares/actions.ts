'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateWinner(
  candidateId: string,
  data: {
    first_name: string
    last_name: string
    stage_name: string
    song_title: string
    song_artist: string
  }
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      stage_name: data.stage_name || null,
      song_title: data.song_title || null,
      song_artist: data.song_artist || null,
    })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/palmares')
  revalidatePath('/admin/palmares')
  return { success: true }
}

export async function updateWinnerPhoto(candidateId: string, photoUrl: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ photo_url: photoUrl })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/palmares')
  revalidatePath('/admin/palmares')
  return { success: true }
}
