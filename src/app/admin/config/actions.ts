'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { SESSION_STATUSES, getStatusIndex, type SessionStatus } from '@/lib/phases'

export async function updateSessionConfig(sessionId: string, config: Record<string, unknown>) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sessions')
    .update({ config })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/config')
  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  if (!SESSION_STATUSES.includes(status as SessionStatus)) {
    return { error: `Statut invalide : ${status}` }
  }

  const supabase = createAdminClient()

  // Auto-update the corresponding config date when changing phase
  const dateField = PHASE_DATE_MAP[status]
  if (dateField) {
    const { data: session } = await supabase
      .from('sessions')
      .select('config')
      .eq('id', sessionId)
      .single()

    if (session) {
      const config = { ...(session.config as Record<string, unknown>) }
      const today = new Date().toISOString().split('T')[0]
      config[dateField] = today
      await supabase.from('sessions').update({ config }).eq('id', sessionId)
    }
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/config')
  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

// Map phase transitions to config date fields that should auto-update
const PHASE_DATE_MAP: Record<string, string> = {
  registration_open: 'registration_start',
  registration_closed: 'registration_end',
  semifinal: 'semifinal_date',
  final: 'final_date',
}

export async function advanceSessionPhase(sessionId: string) {
  const supabase = createAdminClient()

  const { data: session, error: fetchError } = await supabase
    .from('sessions')
    .select('status, config')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) return { error: 'Session introuvable.' }

  const currentIdx = getStatusIndex(session.status)
  if (currentIdx < 0 || currentIdx >= SESSION_STATUSES.length - 1) {
    return { error: 'Cette session ne peut pas avancer de phase.' }
  }

  const nextStatus = SESSION_STATUSES[currentIdx + 1]

  // Auto-update the corresponding config date when advancing phase
  const dateField = PHASE_DATE_MAP[nextStatus]
  if (dateField) {
    const config = { ...(session.config as Record<string, unknown>) }
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    config[dateField] = today
    await supabase.from('sessions').update({ config }).eq('id', sessionId)
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status: nextStatus })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/config')
  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true, newStatus: nextStatus }
}
