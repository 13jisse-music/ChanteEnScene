'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type SubscribeSource = 'footer' | 'live' | 'install_prompt' | 'mobile_fallback' | 'countdown' | 'inscription'

export async function subscribeEmail(
  sessionId: string,
  email: string,
  source: SubscribeSource = 'footer',
  fingerprint?: string
): Promise<{ success?: boolean; already?: boolean; error?: string }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Adresse email invalide.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('email_subscribers')
    .insert({
      session_id: sessionId,
      email: email.toLowerCase().trim(),
      source,
      fingerprint: fingerprint || null,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: true, already: true }
    }
    return { error: "Erreur lors de l'inscription." }
  }

  return { success: true }
}
