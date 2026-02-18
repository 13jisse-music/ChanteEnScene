import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegieEnLigne from '@/components/RegieEnLigne'

export const metadata = { title: 'Régie Jury En Ligne — ChanteEnScène Admin' }

export default async function JuryEnLignePage() {
  const supabase = await createClient()

  // Get active session
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug, status, config')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  // Get approved + semifinalist candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, likes_count, status')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist'])
    .order('category')
    .order('last_name')

  // Get online jury scores (full detail)
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('id, candidate_id, juror_id, total_score, scores, comment')
    .eq('session_id', session.id)
    .eq('event_type', 'online')

  // Get online jurors
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role, is_active')
    .eq('session_id', session.id)
    .eq('role', 'online')

  // Extract categories from config
  const config = (session.config || {}) as Record<string, unknown>
  const ageCategories = (config.age_categories as { name: string }[] | undefined) || []
  const categories = ageCategories.map((c) => c.name)

  // If no categories in config, derive from candidates
  if (categories.length === 0 && candidates) {
    const found = [...new Set(candidates.map((c) => c.category))]
    categories.push(...found.sort())
  }

  const notificationsSentAt = (config.selection_notifications_sent_at as string) || null

  return (
    <div className="p-4 sm:p-6">
      <RegieEnLigne
        session={session}
        candidates={candidates || []}
        juryScores={juryScores || []}
        jurors={jurors || []}
        categories={categories}
        notificationsSentAt={notificationsSentAt}
      />
    </div>
  )
}
