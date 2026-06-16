export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveSession } from '@/lib/active-session'
import JuryManager from '@/components/JuryManager'

async function getData() {
  const supabase = createAdminClient()

  // Jury : session de test en repetition locale, sinon la plus recente
  const { data: session } = await getActiveSession<{ id: string; name: string; config: Record<string, unknown> }>(supabase, 'id, name, config', { fallback: 'latest' })

  if (!session) return { session: null, jurors: [] as never[], candidates: [] as never[], scores: [] as never[] }

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
          Jury
        </h1>
        {session && (
          <p className="text-white/40 text-sm mt-1">{session.name}</p>
        )}
      </div>

      <JuryManager
        /* config typee dynamiquement (colonnes en chaine) : cast vers le type strict attendu par JuryManager */
        session={session as Parameters<typeof JuryManager>[0]['session']}
        jurors={jurors}
        candidates={candidates}
        scores={scores}
      />
    </div>
  )
}
