import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsEnLigne from '@/components/StatsEnLigne'

export const metadata = { title: 'Stats Phase En Ligne — ChanteEnScène Admin' }

export default async function StatsEnLignePage() {
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

  const config = (session.config || {}) as Record<string, unknown>

  // Get candidates (approved + semifinalist)
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, likes_count, shares_count, status')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist'])
    .order('category')
    .order('last_name')

  // Get online jury scores (with created_at for timeline)
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('id, candidate_id, juror_id, total_score, scores, comment, created_at')
    .eq('session_id', session.id)
    .eq('event_type', 'online')

  // Get online jurors
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role, is_active')
    .eq('session_id', session.id)
    .eq('role', 'online')

  // Get public votes (likes) with timestamps
  const { data: votes } = await supabase
    .from('votes')
    .select('id, candidate_id, created_at')
    .eq('session_id', session.id)

  // Get shares (platform, candidate, timestamps)
  const { data: shares } = await supabase
    .from('shares')
    .select('id, candidate_id, platform, created_at')
    .eq('session_id', session.id)

  // Extract categories
  const ageCategories = (config.age_categories as { name: string }[] | undefined) || []
  const categories = ageCategories.map((c) => c.name)
  if (categories.length === 0 && candidates) {
    const found = [...new Set(candidates.map((c) => c.category))]
    categories.push(...found.sort())
  }

  const juryWeightPercent = (config.jury_weight_percent as number) || 60
  const publicWeightPercent = (config.public_weight_percent as number) || 40

  return (
    <div className="p-4 sm:p-6">
      <StatsEnLigne
        session={{ id: session.id, name: session.name }}
        candidates={candidates || []}
        juryScores={juryScores || []}
        jurors={jurors || []}
        votes={votes || []}
        shares={shares || []}
        categories={categories}
        juryWeightPercent={juryWeightPercent}
        publicWeightPercent={publicWeightPercent}
      />
    </div>
  )
}
