import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsDemiFinale from '@/components/StatsDemiFinale'

export const metadata = { title: 'Stats Marketing Demi-finale — ChanteEnScène Admin' }

export default async function StatsDemiFinalePage() {
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

  // Get semifinalists
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, likes_count, status')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .order('category')
    .order('last_name')

  // Get page views
  const { data: pageViews } = await supabase
    .from('page_views')
    .select('id, candidate_id, page_path, fingerprint, user_agent, referrer, duration_seconds, created_at')
    .eq('session_id', session.id)

  // Get public votes (likes) with details
  const { data: votes } = await supabase
    .from('votes')
    .select('id, candidate_id, fingerprint, user_agent, created_at')
    .eq('session_id', session.id)

  // Extract categories
  const ageCategories = (config.age_categories as { name: string }[] | undefined) || []
  const categories = ageCategories.map((c) => c.name)
  if (categories.length === 0 && candidates) {
    const found = [...new Set(candidates.map((c) => c.category))]
    categories.push(...found.sort())
  }

  return (
    <div className="p-6">
      <StatsDemiFinale
        session={{ id: session.id, name: session.name }}
        candidates={candidates || []}
        pageViews={pageViews || []}
        votes={votes || []}
        categories={categories}
      />
    </div>
  )
}
