export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import CandidatsTable from '@/components/CandidatsTable'

async function getCandidates() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return { session: null, candidates: [], scores: [] }

  const session = sessions[0]

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  const { data: scores } = await supabase
    .from('jury_scores')
    .select('candidate_id, event_type, scores, total_score')
    .eq('session_id', session.id)
    .eq('event_type', 'online')

  return { session, candidates: candidates || [], scores: scores || [] }
}

export default async function AdminCandidatsPage() {
  const { session, candidates, scores } = await getCandidates()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
            Candidats
          </h1>
          {session && (
            <p className="text-white/40 text-sm mt-1">{session.name}</p>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {['Enfant', 'Ado', 'Adulte'].map((cat) => {
            const count = candidates.filter((c) => c.category === cat).length
            if (count === 0) return null
            return (
              <span key={cat} className="text-xs text-white/40">
                {cat} <span className="text-white/60 font-medium">{count}</span>
              </span>
            )
          })}
          <span className="text-white font-bold text-base sm:text-lg bg-[#e91e8c]/10 border border-[#e91e8c]/25 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl">
            {candidates.length} <span className="text-white/50 text-xs sm:text-sm font-normal">inscrit(s)</span>
          </span>
        </div>
      </div>

      <CandidatsTable candidates={candidates} juryScores={scores} />
    </div>
  )
}
