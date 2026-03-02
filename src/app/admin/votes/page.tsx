export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

async function getVotesData() {
  const supabase = createAdminClient()

  // Session active
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)

  let sessionId = sessions?.[0]?.id
  if (!sessionId) {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('id')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessionId = fallback?.[0]?.id
  }

  if (!sessionId) return { candidates: [], totalVotes: 0, uniqueVoters: 0 }

  // Candidats approuvés avec nombre de votes
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, slug, photo_url, status, song_title, song_artist')
    .eq('session_id', sessionId)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .order('first_name')

  // Tous les votes de la session
  const { data: votes } = await supabase
    .from('votes')
    .select('id, candidate_id, fingerprint, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  // Compter les votes par candidat
  const votesMap: Record<string, { count: number; last_vote: string }> = {}
  const uniqueFingerprints = new Set<string>()

  for (const v of votes || []) {
    uniqueFingerprints.add(v.fingerprint)
    if (!votesMap[v.candidate_id]) {
      votesMap[v.candidate_id] = { count: 0, last_vote: v.created_at }
    }
    votesMap[v.candidate_id].count++
  }

  // Assembler les résultats
  const result = (candidates || []).map(c => ({
    ...c,
    vote_count: votesMap[c.id]?.count || 0,
    last_vote: votesMap[c.id]?.last_vote || null,
  })).sort((a, b) => b.vote_count - a.vote_count)

  return {
    candidates: result,
    totalVotes: votes?.length || 0,
    uniqueVoters: uniqueFingerprints.size,
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default async function AdminVotesPage() {
  const { candidates, totalVotes, uniqueVoters } = await getVotesData()
  const maxVotes = candidates.length > 0 ? candidates[0].vote_count : 1

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-white/30 text-xs hover:text-white/50 transition-colors">← Dashboard</Link>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white mt-1">
            Détail des votes
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#E91E8C15', color: '#E91E8C' }}>
            {totalVotes} vote{totalVotes > 1 ? 's' : ''}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#7ec85015', color: '#7ec850' }}>
            {uniqueVoters} votant{uniqueVoters > 1 ? 's' : ''} unique{uniqueVoters > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Classement */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        {candidates.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {candidates.map((c, i) => {
              const pct = maxVotes > 0 ? (c.vote_count / maxVotes) * 100 : 0
              const name = c.stage_name || `${c.first_name} ${c.last_name}`

              return (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  {/* Rang */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-300/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {i + 1}
                  </div>

                  {/* Photo + nom */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E91E8C]/10 flex items-center justify-center text-sm text-[#E91E8C] shrink-0">
                        {(c.first_name?.[0] || '?')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{name}</p>
                      {c.song_title && (
                        <p className="text-xs text-white/30 truncate">
                          {c.song_title}{c.song_artist ? ` — ${c.song_artist}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="hidden sm:block w-32 lg:w-48">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: i === 0 ? '#E91E8C' : i === 1 ? '#E91E8C99' : '#E91E8C44',
                        }}
                      />
                    </div>
                  </div>

                  {/* Votes */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{c.vote_count}</p>
                    <p className="text-[10px] text-white/30">
                      {c.last_vote ? timeAgo(c.last_vote) : 'aucun'}
                    </p>
                  </div>

                  {/* Statut */}
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 hidden lg:inline-block"
                    style={{
                      background: c.status === 'approved' ? '#7ec85015' :
                        c.status === 'semifinalist' ? '#3b82f615' :
                        c.status === 'finalist' ? '#E91E8C15' :
                        c.status === 'winner' ? '#eab30815' : '#ffffff08',
                      color: c.status === 'approved' ? '#7ec850' :
                        c.status === 'semifinalist' ? '#3b82f6' :
                        c.status === 'finalist' ? '#E91E8C' :
                        c.status === 'winner' ? '#eab308' : '#ffffff40',
                    }}
                  >
                    {c.status === 'approved' ? 'Qualifié' :
                     c.status === 'semifinalist' ? 'Demi-finaliste' :
                     c.status === 'finalist' ? 'Finaliste' :
                     c.status === 'winner' ? 'Gagnant' : c.status}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-white/30 text-sm">
            Aucun candidat approuvé.
          </p>
        )}
      </div>
    </div>
  )
}
