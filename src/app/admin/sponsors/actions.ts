'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createSponsor(
  sessionId: string,
  name: string,
  logoUrl: string | null,
  websiteUrl: string | null,
  description: string | null,
  tier: string
) {
  const supabase = createAdminClient()

  const { count } = await supabase
    .from('sponsors')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const { error } = await supabase.from('sponsors').insert({
    session_id: sessionId,
    name,
    logo_url: logoUrl || null,
    website_url: websiteUrl || null,
    description: description || null,
    tier: tier || 'partner',
    position: (count || 0) + 1,
    published: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/sponsors')
  return { success: true }
}

export async function updateSponsor(
  id: string,
  name: string,
  logoUrl: string | null,
  websiteUrl: string | null,
  description: string | null,
  tier: string
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sponsors')
    .update({
      name,
      logo_url: logoUrl,
      website_url: websiteUrl || null,
      description: description || null,
      tier,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sponsors')
  return { success: true }
}

export async function toggleSponsorPublished(id: string, published: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sponsors')
    .update({ published })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sponsors')
  return { success: true }
}

export async function deleteSponsor(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('sponsors').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/sponsors')
  return { success: true }
}

export async function reorderSponsors(sessionId: string, orderedIds: string[]) {
  const supabase = createAdminClient()

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('sponsors')
      .update({ position: i + 1 })
      .eq('id', orderedIds[i])
  }

  revalidatePath('/admin/sponsors')
  return { success: true }
}
