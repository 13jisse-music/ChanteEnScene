'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotifications } from '@/lib/push'
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

export async function trackJurorLogin(jurorId: string, sessionId?: string) {
  const supabase = createAdminClient()

  // Direct update: increment login_count + set last_login_at
  const { data } = await supabase
    .from('jurors')
    .select('login_count, first_name, last_name, role, session_id')
    .eq('id', jurorId)
    .single()

  if (!data) return

  await supabase
    .from('jurors')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: ((data.login_count as number) || 0) + 1,
    })
    .eq('id', jurorId)

  // Push notification to admin (non-blocking, 5s timeout)
  try {
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    const roleLabel: Record<string, string> = {
      online: 'en ligne',
      semifinal: 'demi-finale',
      final: 'finale',
    }
    const label = roleLabel[data.role] || data.role

    const pushPromise = sendPushNotifications({
      sessionId: sessionId || data.session_id,
      role: 'admin',
      payload: {
        title: 'Jury connecté',
        body: `${name} (jury ${label}) vient de se connecter`,
        url: '/admin/jury',
        tag: `jury-login-${jurorId}`,
      },
    })
    const timeout = new Promise<void>(r => setTimeout(r, 5000))
    await Promise.race([pushPromise, timeout])
  } catch {
    // Push failure should not block jury login
  }
}

export async function completeJurorOnboarding(jurorId: string) {
  const supabase = createAdminClient()

  await supabase
    .from('jurors')
    .update({ onboarding_done: true })
    .eq('id', jurorId)
}

/**
 * Heartbeat: update last_seen_at + manage juror_sessions.
 * Called every 30s from the jury client.
 * If no active session exists (or last ping > 2 min ago), creates a new one.
 */
export async function heartbeatJuror(jurorId: string, sessionId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Update last_seen_at on jurors table
  await supabase
    .from('jurors')
    .update({ last_seen_at: now })
    .eq('id', jurorId)

  // Check for an open juror_session (no ended_at, last_ping < 2 min ago)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: openSession } = await supabase
    .from('juror_sessions')
    .select('id')
    .eq('juror_id', jurorId)
    .is('ended_at', null)
    .gte('last_ping_at', twoMinAgo)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openSession) {
    // Update existing session ping
    await supabase
      .from('juror_sessions')
      .update({ last_ping_at: now })
      .eq('id', openSession.id)
  } else {
    // Close any stale open sessions for this juror
    await supabase
      .from('juror_sessions')
      .update({ ended_at: now })
      .eq('juror_id', jurorId)
      .is('ended_at', null)

    // Create new session
    await supabase
      .from('juror_sessions')
      .insert({
        juror_id: jurorId,
        session_id: sessionId,
        started_at: now,
        last_ping_at: now,
      })
  }
}
