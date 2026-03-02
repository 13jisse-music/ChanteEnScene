'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteSubscriber(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('email_subscribers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
