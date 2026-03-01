import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Auto-advance session status based on config dates.
 * Called from server components — if status is 'draft' and registration_start
 * has passed, auto-updates to 'registration_open'.
 * Similarly handles registration_closed when registration_end passes.
 * Returns the (possibly updated) status.
 */
export async function autoAdvanceSessionStatus(
  session: { id: string; status: string; config: unknown }
): Promise<string> {
  const config = (session.config || {}) as Record<string, string>
  const now = new Date()
  const todayStr = now.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const today = new Date(todayStr + 'T00:00:00')

  let newStatus: string | null = null

  // Draft → registration_open when registration_start has passed
  if (session.status === 'draft' && config.registration_start) {
    const startDate = new Date(config.registration_start + 'T00:00:00')
    if (today >= startDate) {
      newStatus = 'registration_open'
    }
  }

  // registration_open → registration_closed when registration_end has passed
  if (session.status === 'registration_open' && config.registration_end) {
    const endDate = new Date(config.registration_end + 'T00:00:00')
    // Close the day after end date
    const dayAfterEnd = new Date(endDate)
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1)
    if (today >= dayAfterEnd) {
      newStatus = 'registration_closed'
    }
  }

  if (newStatus) {
    try {
      const admin = createAdminClient()
      await admin
        .from('sessions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', session.id)
      return newStatus
    } catch {
      // Silently fail — return current status
      return session.status
    }
  }

  return session.status
}
