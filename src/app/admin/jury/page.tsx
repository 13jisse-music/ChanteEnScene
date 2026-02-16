export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import JuryManager from '@/components/JuryManager'

async function getData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, config')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return { session: null, jurors: [] as never[], candidates: [] as never[], scores: [] as never[] }

  const session = sessions[0]

  const { data: jurors } = await supabase
    .from('jurors')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist'])
    .order('category')

  // Get existing scores
  const { data: scores } = await supabase
    .from('jury_scores')
    .select('*')
    .eq('session_id', session.id)

  return {
    session,
    jurors: jurors || [],
    candidates: candidates || [],
    scores: scores || [],
  }
}

export default async function AdminJuryPage() {
  const { session, jurors, candidates, scores } = await getData()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white">
          Jury
        </h1>
        {session && (
          <p className="text-white/40 text-sm mt-1">{session.name}</p>
        )}
      </div>

      <JuryManager
        session={session}
        jurors={jurors}
        candidates={candidates}
        scores={scores}
      />
    </div>
  )
}
