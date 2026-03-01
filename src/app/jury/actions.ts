'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function loginJuror(email: string): Promise<{ error: string }> {
  const supabase = await createClient()

  // Find the active session
  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, config')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!session) {
    return { error: 'Aucune session active pour le moment.' }
  }

  // Find juror by email in this session
  const { data: juror } = await supabase
    .from('jurors')
    .select('qr_token, role')
    .eq('session_id', session.id)
    .eq('email', email.trim().toLowerCase())
    .eq('is_active', true)
    .maybeSingle()

  if (!juror) {
    return { error: 'Aucun compte jury trouvé avec cet email.' }
  }

  // Gate online jurors: open as soon as approved candidates exist,
  // closed only when admin sets jury_online_voting_closed
  if (juror.role === 'online') {
    const config = (session.config || {}) as Record<string, unknown>
    if (config.jury_online_voting_closed) {
      return { error: 'Le jury en ligne est terminé. Merci pour votre participation !' }
    }
  }

  redirect(`/jury/${juror.qr_token}`)
}

export async function trackJurorLogin(jurorId: string) {
  const supabase = createAdminClient()

  // Use the RPC function for atomic increment + timestamp
  try {
    await supabase.rpc('increment_juror_login', { juror_id: jurorId })
  } catch {
    // Fallback: simple update if RPC not available
    const { data } = await supabase
      .from('jurors')
      .select('login_count')
      .eq('id', jurorId)
      .single()

    await supabase
      .from('jurors')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: ((data?.login_count as number) || 0) + 1,
      })
      .eq('id', jurorId)
  }
}

export async function completeJurorOnboarding(jurorId: string) {
  const supabase = createAdminClient()

  await supabase
    .from('jurors')
    .update({ onboarding_done: true })
    .eq('id', jurorId)
}
