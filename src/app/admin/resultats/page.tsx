export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveSession } from '@/lib/active-session'
import ResultsView from '@/components/ResultsView'

async function getData() {
  const supabase = createAdminClient()

  // Resultats : session de test en repetition locale, sinon la plus recente
  const { data: session } = await getActiveSession<{ id: string; name: string; config: Record<string, unknown> }>(supabase, 'id, name, config', { fallback: 'latest' })

  if (!session)
    return { session: null, candidates: [], jurors: [], scores: [], votes: [], liveVotes: [], events: [] }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status, likes_count, photo_url, mp3_url')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .order('category')

  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role')
    .eq('session_id', session.id)
    .eq('is_active', true)

  const { data: scores } = await supabase
    .from('jury_scores')
    .select('id, juror_id, candidate_id, event_type, scores, total_score, comment')
    .eq('session_id', session.id)

  const { data: votes } = await supabase
    .from('votes')
    .select('candidate_id')
    .eq('session_id', session.id)

  const { data: events } = await supabase
    .from('live_events')
    .select('id, event_type, status')
    .eq('session_id', session.id)

  // Get live votes for each event
  const eventIds = (events || []).map((e) => e.id)
  let liveVotes: { candidate_id: string; live_event_id: string }[] = []
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from('live_votes')
      .select('candidate_id, live_event_id')
      .in('live_event_id', eventIds)
    liveVotes = data || []
  }

  return {
    // config typee dynamiquement (colonnes en chaine) : cast vers le type strict attendu par ResultsView
    session: session as Parameters<typeof ResultsView>[0]['session'],
    candidates: candidates || [],
    jurors: jurors || [],
    scores: scores || [],
    votes: votes || [],
    liveVotes,
    events: events || [],
  }
}

export default async function AdminResultatsPage() {
  const data = await getData()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
          Résultats
        </h1>
        {data.session && (
          <p className="text-white/40 text-sm mt-1">{data.session.name}</p>
        )}
      </div>

      <ResultsView {...data} />
    </div>
  )
}
