import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JuryEngagementStats from '@/components/JuryEngagementStats'

export const metadata = { title: 'Fiabilité Jury — ChanteEnScène Admin' }

export default async function StatsJuryPage() {
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

  // Get all online jurors
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, email, role, is_active, created_at')
    .eq('session_id', session.id)
    .eq('role', 'online')

  // Get ALL jury_scores for online event_type (including watch tracking)
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('id, juror_id, candidate_id, event_type, scores, total_score, comment, viewed_at, watch_seconds, created_at')
    .eq('session_id', session.id)
    .eq('event_type', 'online')

  // Get candidates to know which have videos
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, video_url, mp3_url, song_title, song_artist')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist'])
    .order('category')
    .order('last_name')

  return (
    <div className="p-4 sm:p-6">
      <JuryEngagementStats
        session={{ id: session.id, name: session.name }}
        jurors={jurors || []}
        juryScores={juryScores || []}
        candidates={candidates || []}
      />
    </div>
  )
}
