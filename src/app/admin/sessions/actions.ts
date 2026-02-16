'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const DEFAULT_CONFIG = {
  age_categories: [
    { name: 'Enfant', min_age: 6, max_age: 12 },
    { name: 'Ado', min_age: 13, max_age: 17 },
    { name: 'Adulte', min_age: 18, max_age: 99 },
  ],
  registration_start: '',
  registration_end: '',
  semifinal_date: '',
  final_date: '',
  semifinal_location: '',
  final_location: '',
  max_video_duration_sec: 180,
  max_video_size_mb: 100,
  max_mp3_size_mb: 20,
  max_photo_size_mb: 5,
  max_votes_per_device: 50,
  registration_fee: 0,
  semifinalists_per_category: 10,
  finalists_per_category: 5,
  jury_weight_percent: 60,
  public_weight_percent: 40,
  jury_criteria: [
    { name: 'Justesse vocale', max_score: 10 },
    { name: 'Interprétation', max_score: 10 },
    { name: 'Présence scénique', max_score: 10 },
    { name: 'Originalité', max_score: 10 },
  ],
}

export async function createSession(formData: FormData) {
  const supabase = createAdminClient()

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const city = formData.get('city') as string
  const year = parseInt(formData.get('year') as string)

  if (!name || !slug || !city || !year) {
    return { error: 'Tous les champs sont requis.' }
  }

  const { error } = await supabase.from('sessions').insert({
    name,
    slug,
    city,
    year,
    status: 'draft',
    is_active: false,
    config: DEFAULT_CONFIG,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ce slug est déjà utilisé.' }
    return { error: error.message }
  }

  revalidatePath('/admin/sessions')
  return { success: true }
}

export async function updateSession(id: string, formData: FormData) {
  const supabase = createAdminClient()

  const name = formData.get('name') as string
  const city = formData.get('city') as string
  const status = formData.get('status') as string

  const { error } = await supabase
    .from('sessions')
    .update({ name, city, status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sessions')
  return { success: true }
}

export async function setActiveSession(id: string) {
  const supabase = createAdminClient()

  // Deactivate all sessions
  await supabase.from('sessions').update({ is_active: false }).neq('id', 'none')

  // Activate the selected one
  const { error } = await supabase
    .from('sessions')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sessions')
  revalidatePath('/admin')
  return { success: true }
}

export async function duplicateSession(id: string) {
  const supabase = createAdminClient()

  const { data: source, error: fetchError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !source) return { error: 'Session introuvable.' }

  const newYear = source.year + 1
  const newSlug = source.slug.replace(/\d{4}$/, String(newYear))
  const newName = source.name.replace(/\d{4}/, String(newYear))

  const { error } = await supabase.from('sessions').insert({
    name: newName,
    slug: newSlug,
    city: source.city,
    year: newYear,
    status: 'draft',
    is_active: false,
    config: source.config,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Une session avec ce slug existe déjà.' }
    return { error: error.message }
  }

  revalidatePath('/admin/sessions')
  return { success: true }
}

export async function archiveSession(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'archived', is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sessions')
  return { success: true }
}

export async function deleteSession(id: string) {
  const supabase = createAdminClient()

  // Only allow deleting draft sessions with no candidates
  const { count } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', id)

  if (count && count > 0) {
    return { error: 'Impossible de supprimer une session qui contient des candidats.' }
  }

  const { error } = await supabase.from('sessions').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sessions')
  return { success: true }
}
