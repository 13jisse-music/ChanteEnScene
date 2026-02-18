export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import PalmaresAdmin from '@/components/PalmaresAdmin'

export const metadata = { title: 'Palmarès — ChanteEnScène Admin' }

export default async function AdminPalmaresPage() {
  const supabase = createAdminClient()

  // Get all archived sessions (palmarès editions)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, year')
    .eq('status', 'archived')
    .order('year', { ascending: false })

  // Get all winners across editions
  const sessionIds = (sessions || []).map((s) => s.id)
  const { data: winners } = sessionIds.length > 0
    ? await supabase
        .from('candidates')
        .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, session_id, slug')
        .in('session_id', sessionIds)
        .eq('status', 'winner')
        .order('category')
    : { data: [] }

  // Group by edition
  const editions = (sessions || []).map((s) => ({
    year: s.year,
    name: s.name,
    sessionId: s.id,
    winners: (winners || []).filter((w) => w.session_id === s.id),
  }))

  return (
    <div className="p-4 sm:p-6">
      <PalmaresAdmin editions={editions} />
    </div>
  )
}
