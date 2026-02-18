export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import EventManager from '@/components/EventManager'

async function getData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, config')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0)
    return { session: null, events: [] as never[], candidates: [] as never[], lineups: [] as never[], jurors: [] as never[], existingScoreCount: 0 }

  const session = sessions[0]

  const { data: events } = await supabase
    .from('live_events')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status, likes_count')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist'])
    .order('likes_count', { ascending: false })

  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role')
    .eq('session_id', session.id)

  const eventIds = (events || []).map((e) => e.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lineups: any[] = []
  let existingScoreCount = 0
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from('lineup')
      .select('*, candidates(id, first_name, last_name, stage_name, category)')
      .in('live_event_id', eventIds)
      .order('position')
    lineups = data || []

    const liveEvent = (events || []).find((e: { status: string }) => e.status === 'live')
    if (liveEvent) {
      const { count } = await supabase
        .from('jury_scores')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('event_type', liveEvent.event_type)
      existingScoreCount = count || 0
    }
  }

  return {
    session,
    events: events || [],
    candidates: candidates || [],
    lineups,
    jurors: jurors || [],
    existingScoreCount,
  }
}

export default async function AdminEventsPage() {
  const { session, events, candidates, lineups, jurors, existingScoreCount } = await getData()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
          Événements Live
        </h1>
        {session && (
          <p className="text-white/40 text-sm mt-1">{session.name}</p>
        )}
      </div>

      <EventManager
        session={session}
        events={events}
        candidates={candidates}
        lineups={lineups}
        jurors={jurors}
        existingScoreCount={existingScoreCount}
      />
    </div>
  )
}
