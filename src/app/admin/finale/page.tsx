import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegieFinale from '@/components/RegieFinale'
import FinaleRundown from '@/components/FinaleRundown'

export const metadata = { title: 'Régie Finale — ChanteEnScène Admin' }

export default async function RegieAnalePage() {
  const supabase = await createClient()

  // Get active session
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug, config')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  // Get final event
  const { data: event } = await supabase
    .from('live_events')
    .select('*')
    .eq('session_id', session.id)
    .eq('event_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!event) {
    // Fetch all finalists for the rundown
    const { data: finalists } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, stage_name, category, photo_url, mp3_url, song_title, song_artist')
      .eq('session_id', session.id)
      .eq('status', 'finalist')
      .order('last_name', { ascending: true })

    const rundownConfig = session.config as {
      age_categories?: { name: string }[]
      final_date?: string
      final_location?: string
      performance_recommended_sec?: number
      vote_duration_sec?: number
    }

    return (
      <div className="p-4 sm:p-6">
        <FinaleRundown
          sessionId={session.id}
          sessionName={session.name}
          config={rundownConfig}
          finalists={finalists || []}
        />
      </div>
    )
  }

  // Get lineup with candidates
  const { data: lineup } = await supabase
    .from('lineup')
    .select('*, candidates(id, first_name, last_name, stage_name, category, photo_url, mp3_url, song_title, song_artist, likes_count)')
    .eq('live_event_id', event.id)
    .order('position')

  // Get available candidates for replacement
  const lineupCandidateIds = (lineup || []).map((l: { candidate_id: string }) => l.candidate_id)
  const { data: availableCandidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category')
    .eq('session_id', session.id)
    .in('status', ['finalist', 'semifinalist'])
    .not('id', 'in', `(${lineupCandidateIds.length > 0 ? lineupCandidateIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)

  // Get jurors
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role, is_active')
    .eq('session_id', session.id)
    .in('role', ['final'])
    .eq('is_active', true)

  // Get jury scores for final
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('candidate_id, total_score, juror_id')
    .eq('session_id', session.id)
    .eq('event_type', 'final')

  // Get live votes for this event
  const { data: liveVotes } = await supabase
    .from('live_votes')
    .select('candidate_id')
    .eq('live_event_id', event.id)

  const config = session.config as {
    jury_weight_percent?: number
    public_weight_percent?: number
    social_weight_percent?: number
    jury_criteria?: { name: string; max_score: number }[]
    age_categories?: { name: string }[]
  }

  return (
    <div className="p-4 sm:p-6">
      <RegieFinale
        session={session}
        event={event}
        lineup={lineup || []}
        availableCandidates={availableCandidates || []}
        jurors={jurors || []}
        juryScores={juryScores || []}
        liveVotes={liveVotes || []}
        config={config}
      />
    </div>
  )
}
