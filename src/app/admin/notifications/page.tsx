export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NotificationsAdmin from '@/components/NotificationsAdmin'

export const metadata = { title: 'Notifications — ChanteEnScene Admin' }

export default async function NotificationsPage() {
  const supabase = createAdminClient()

  // Get active session (is_active flag, fallback to most recent non-archived)
  let sessionData = await supabase
    .from('sessions')
    .select('id, name, slug, status, config')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sessionData.data) {
    const fallback = await supabase
      .from('sessions')
      .select('id, name, slug, status, config')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    sessionData = fallback
  }

  const session = sessionData.data
  if (!session) redirect('/admin/sessions')

  // Get all non-archived sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, status, config')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  // Get candidates for autocomplete + stats
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, status, fingerprint, email')
    .eq('session_id', session.id)
    .neq('status', 'rejected')
    .order('first_name')

  // Get push subscription stats
  const { data: pushSubs } = await supabase
    .from('push_subscriptions')
    .select('role, fingerprint')
    .eq('session_id', session.id)

  // Get recent push logs
  const { data: pushLogs } = await supabase
    .from('push_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Count reachable candidates (fingerprint in both candidates and push_subscriptions)
  const candidateFingerprints = new Set(
    (candidates || []).map((c) => c.fingerprint).filter(Boolean)
  )
  const pushFingerprints = new Set(
    (pushSubs || []).map((s) => s.fingerprint).filter(Boolean)
  )
  const reachableCandidates = [...candidateFingerprints].filter((f) =>
    pushFingerprints.has(f)
  ).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <NotificationsAdmin
        sessions={(sessions || []) as { id: string; name: string; slug: string; status: string; config: Record<string, unknown> | null }[]}
        activeSessionId={session.id}
        activeSessionStatus={session.status}
        activeSessionConfig={(session.config || {}) as Record<string, unknown>}
        candidates={(candidates || []) as { id: string; first_name: string; last_name: string; stage_name: string | null; status: string; fingerprint: string | null; email: string }[]}
        pushStats={{
          total: pushSubs?.length || 0,
          public: pushSubs?.filter((s) => s.role === 'public').length || 0,
          jury: pushSubs?.filter((s) => s.role === 'jury' || s.role?.startsWith('jury_')).length || 0,
          jury_generic: pushSubs?.filter((s) => s.role === 'jury').length || 0,
          jury_online: pushSubs?.filter((s) => s.role === 'jury_online').length || 0,
          jury_semi: pushSubs?.filter((s) => s.role === 'jury_semi').length || 0,
          jury_finale: pushSubs?.filter((s) => s.role === 'jury_finale').length || 0,
          admin: pushSubs?.filter((s) => s.role === 'admin').length || 0,
          reachableCandidates,
          totalCandidates: candidates?.length || 0,
        }}
        pushLogs={(pushLogs || []) as { id: string; title: string; body: string; url: string | null; role: string; segment: string | null; is_test: boolean; sent: number; failed: number; expired: number; sent_by: string | null; created_at: string }[]}
      />
    </div>
  )
}
