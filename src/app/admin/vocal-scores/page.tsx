export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import VocalScoresAdmin from '@/components/VocalScoresAdmin'

export const metadata = { title: 'Scores Vocaux — ChanteEnScène Admin' }

async function getData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return { session: null, candidates: [], analyses: [] }

  const session = sessions[0]

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, status')
    .eq('session_id', session.id)
    .order('category')
    .order('last_name')

  const { data: analyses } = await supabase
    .from('vocal_analyses')
    .select('*')
    .eq('session_id', session.id)

  return { session, candidates: candidates || [], analyses: analyses || [] }
}

export default async function VocalScoresPage() {
  const { session, candidates, analyses } = await getData()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
            Scores Vocaux
          </h1>
          {session && (
            <p className="text-white/40 text-sm mt-1">{session.name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            Analysés <span className="text-[#e91e8c] font-bold text-base">{analyses.length}</span> / {candidates.length}
          </span>
        </div>
      </div>

      <VocalScoresAdmin
        sessionId={session?.id || ''}
        candidates={candidates}
        analyses={analyses}
      />
    </div>
  )
}
