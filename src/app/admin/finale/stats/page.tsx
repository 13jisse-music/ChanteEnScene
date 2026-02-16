import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinaleStats from '@/components/FinaleStats'

export const metadata = { title: 'Stats Finale — ChanteEnScène Admin' }

export default async function FinaleStatsPage() {
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
    .select('id, event_type, status, created_at')
    .eq('session_id', session.id)
    .eq('event_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!event) {
    return (
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-4">
          Statistiques Finale
        </h1>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/40">Aucun événement de finale créé.</p>
        </div>
      </div>
    )
  }

  // Get lineup with candidates
  const { data: lineup } = await supabase
    .from('lineup')
    .select('id, candidate_id, position, status, started_at, ended_at, candidates(id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, likes_count)')
    .eq('live_event_id', event.id)
    .order('position')

  // Get jury scores for final (with full detail)
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('id, juror_id, candidate_id, scores, total_score, comment')
    .eq('session_id', session.id)
    .eq('event_type', 'final')

  // Get live votes
  const { data: liveVotes } = await supabase
    .from('live_votes')
    .select('id, candidate_id')
    .eq('live_event_id', event.id)

  // Get jurors
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role')
    .eq('session_id', session.id)
    .in('role', ['final'])

  // Get winners
  const { data: winners } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist')
    .eq('session_id', session.id)
    .eq('status', 'winner')

  const config = session.config as {
    jury_weight_percent?: number
    public_weight_percent?: number
    social_weight_percent?: number
    jury_criteria?: { name: string; max_score: number }[]
    age_categories?: { name: string }[]
  }

  return (
    <div className="p-6">
      <FinaleStats
        session={{ id: session.id, name: session.name, slug: session.slug }}
        event={event}
        lineup={(lineup || []) as never[]}
        juryScores={juryScores || []}
        liveVotes={liveVotes || []}
        jurors={jurors || []}
        winners={winners || []}
        config={config}
      />
    </div>
  )
}
