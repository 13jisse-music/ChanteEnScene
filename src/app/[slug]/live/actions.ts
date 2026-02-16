'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function subscribeEmail(sessionId: string, email: string) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Adresse email invalide.' }
  }

  const supabase = createAdminClient()

  // Fetch current config
  const { data: session, error: fetchError } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { error: 'Session introuvable.' }
  }

  const config = (session.config || {}) as Record<string, unknown>
  const subscribers = (config.subscribers as string[]) || []

  // Check for duplicate
  if (subscribers.includes(email.toLowerCase())) {
    return { success: true, already: true }
  }

  // Append email
  subscribers.push(email.toLowerCase())

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ config: { ...config, subscribers } })
    .eq('id', sessionId)

  if (updateError) return { error: updateError.message }

  return { success: true }
}
