'use client'

import { useState } from 'react'
import { updateCandidateStatus, deleteCandidate, toggleVideoPublic } from '@/app/admin/candidats/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  email: string
  phone: string | null
  city: string | null
  date_of_birth: string
  category: string
  song_title: string
  song_artist: string
  photo_url: string | null
  video_url: string | null
  mp3_url: string | null
  bio: string | null
  parental_consent_url: string | null
  video_public: boolean
  status: string
  likes_count: number
  created_at: string
  finale_songs: { title: string; artist: string; youtube_url: string }[] | null
}

interface JuryScore {
  candidate_id: string
  event_type: string
  scores: Record<string, string | number>
  total_score: number
}

type Decision = 'oui' | 'peut-etre' | 'non'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#f59e0b' },
  approved: { label: 'Approuvé', color: '#7ec850' },
  rejected: { label: 'Refusé', color: '#ef4444' },
  semifinalist: { label: 'Demi-finaliste', color: '#3b82f6' },
  finalist: { label: 'Finaliste', color: '#8b5cf6' },
  winner: { label: 'Gagnant', color: '#f59e0b' },
}

const DECISION_COLORS: Record<Decision, string> = {
  oui: '#7ec850',
  'peut-etre': '#f59e0b',
  non: '#ef4444',
}

function isMinor(dateOfBirth: string): boolean {
  const birth = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age < 18
}

function getDecisionCounts(candidateId: string, juryScores: JuryScore[]) {
  const candidateScores = juryScores.filter((s) => s.candidate_id === candidateId)
  let oui = 0, peutEtre = 0, non = 0
  for (const s of candidateScores) {
    const d = s.scores?.decision as Decision | undefined
    if (d === 'oui') oui++
    else if (d === 'peut-etre') peutEtre++
    else if (d === 'non') non++
  }
  return { oui, peutEtre, non, total: candidateScores.length }
}

export default function CandidatsTable({
  candidates: initialCandidates,
  juryScores = [],
}: {
  candidates: Candidate[]
  juryScores?: JuryScore[]
}) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const CATEGORY_ORDER = ['Enfant', 'Ado', 'Adulte']

  const filtered = initialCandidates
    .filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        const match =
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.stage_name?.toLowerCase().includes(q) ?? false) ||
          c.email.toLowerCase().includes(q) ||
          c.song_title.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category)
      const bi = CATEGORY_ORDER.indexOf(b.category)
      if (ai !== bi) return ai - bi
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function handleStatus(id: string, status: string) {
    setLoadingId(id)
    await updateCandidateStatus(id, status)
    setLoadingId(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer définitivement ${name} ?`)) return
    setLoadingId(id)
    await deleteCandidate(id)
    setLoadingId(null)
  }

  const counts = {
    all: initialCandidates.length,
    pending: initialCandidates.filter((c) => c.status === 'pending').length,
    approved: initialCandidates.filter((c) => c.status === 'approved').length,
    rejected: initialCandidates.filter((c) => c.status === 'rejected').length,
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => {
          const labels: Record<string, string> = {
            all: 'Tous',
            pending: 'En attente',
            approved: 'Approuvés',
            rejected: 'Refusés',
          }
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                  : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {labels[s]} ({counts[s]})
            </button>
          )
        })}

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="ml-auto bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {filtered.map((c, idx) => {
              const prevCategory = idx > 0 ? filtered[idx - 1].category : null
              const showCategoryHeader = c.category !== prevCategory
              const categoryCount = filtered.filter((x) => x.category === c.category).length
              const st = STATUS_CONFIG[c.status] || { label: c.status, color: '#666' }
              const isExpanded = expandedId === c.id
              const isLoading = loadingId === c.id
              const displayName = c.stage_name || `${c.first_name} ${c.last_name}`
              const minor = isMinor(c.date_of_birth)
              const votes = getDecisionCounts(c.id, juryScores)
              const hasVotes = votes.total > 0

              // Jury verdict
              let juryVerdict: { label: string; color: string; emoji: string } | null = null
              if (hasVotes) {
                const ouiPercent = votes.oui / votes.total
                const nonPercent = votes.non / votes.total
                if (ouiPercent > 0.5) {
                  juryVerdict = { label: 'Jury favorable', color: '#7ec850', emoji: '✓' }
                } else if (nonPercent > 0.5) {
                  juryVerdict = { label: 'Jury défavorable', color: '#ef4444', emoji: '✗' }
                } else {
                  juryVerdict = { label: 'En balance', color: '#f59e0b', emoji: '~' }
                }
              }

              return (
                <div key={c.id}>
                  {/* Category header */}
                  {showCategoryHeader && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d0b1a]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#e91e8c]">
                        {c.category}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {categoryCount} candidat{categoryCount > 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 h-px bg-[#2a2545]" />
                    </div>
                  )}
                  <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    {/* Photo */}
                    <div className="w-11 h-11 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-lg">🎤</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{displayName}</p>
                        {juryVerdict && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${juryVerdict.color}15`, color: juryVerdict.color }}
                          >
                            {juryVerdict.emoji} {juryVerdict.label}
                          </span>
                        )}
                        {minor && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              c.parental_consent_url
                                ? 'bg-[#7ec850]/15 text-[#7ec850]'
                                : 'bg-[#f59e0b]/15 text-[#f59e0b]'
                            }`}
                          >
                            {c.parental_consent_url ? 'Autorisation ✓' : 'Autorisation manquante'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30 truncate">
                        {c.song_title} — {c.song_artist}
                      </p>
                    </div>

                    {/* Jury votes mini */}
                    {hasVotes && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold" style={{ color: DECISION_COLORS.oui }}>
                          {votes.oui}
                        </span>
                        <span className="text-white/15">/</span>
                        <span className="text-xs font-bold" style={{ color: DECISION_COLORS['peut-etre'] }}>
                          {votes.peutEtre}
                        </span>
                        <span className="text-white/15">/</span>
                        <span className="text-xs font-bold" style={{ color: DECISION_COLORS.non }}>
                          {votes.non}
                        </span>
                      </div>
                    )}

                    {/* Category */}
                    <span className="text-xs text-white/30 hidden sm:block">{c.category}</span>

                    {/* Likes */}
                    <span className="text-xs text-white/30 hidden sm:block">❤️ {c.likes_count}</span>

                    {/* Status */}
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: `${st.color}15`, color: st.color }}
                    >
                      {st.label}
                    </span>

                    {/* Expand arrow */}
                    <span className={`text-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#1e1a35]">
                      {/* Jury vote bar */}
                      {hasVotes && (
                        <div className="mt-4 bg-[#0d0b1a] border border-[#2a2545] rounded-xl p-4">
                          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Vote du jury en ligne</p>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">👍</span>
                              <span className="text-sm font-bold" style={{ color: DECISION_COLORS.oui }}>{votes.oui}</span>
                              <span className="text-white/20 text-xs">Oui</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">🤔</span>
                              <span className="text-sm font-bold" style={{ color: DECISION_COLORS['peut-etre'] }}>{votes.peutEtre}</span>
                              <span className="text-white/20 text-xs">Peut-être</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">👎</span>
                              <span className="text-sm font-bold" style={{ color: DECISION_COLORS.non }}>{votes.non}</span>
                              <span className="text-white/20 text-xs">Non</span>
                            </div>
                            <span className="text-white/20 text-xs ml-auto">{votes.total} vote(s)</span>
                          </div>
                          {/* Visual bar */}
                          {votes.total > 0 && (
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-[#2a2545]">
                              {votes.oui > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(votes.oui / votes.total) * 100}%`,
                                    background: DECISION_COLORS.oui,
                                  }}
                                />
                              )}
                              {votes.peutEtre > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(votes.peutEtre / votes.total) * 100}%`,
                                    background: DECISION_COLORS['peut-etre'],
                                  }}
                                />
                              )}
                              {votes.non > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(votes.non / votes.total) * 100}%`,
                                    background: DECISION_COLORS.non,
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Left: Info */}
                        <div className="space-y-2 text-sm">
                          <p><span className="text-white/30">Nom :</span> <span className="text-white">{c.first_name} {c.last_name}</span></p>
                          {c.stage_name && <p><span className="text-white/30">Scène :</span> <span className="text-white">{c.stage_name}</span></p>}
                          <p><span className="text-white/30">Email :</span> <a href={`mailto:${c.email}`} className="text-[#e91e8c] hover:underline">{c.email}</a></p>
                          {c.phone && <p><span className="text-white/30">Tél :</span> <span className="text-white">{c.phone}</span></p>}
                          {c.city && <p><span className="text-white/30">Ville :</span> <span className="text-white">{c.city}</span></p>}
                          <p><span className="text-white/30">Né(e) le :</span> <span className="text-white">{new Date(c.date_of_birth).toLocaleDateString('fr-FR')}</span></p>
                          {minor && (
                            <p>
                              <span className="text-white/30">Autorisation parentale :</span>{' '}
                              {c.parental_consent_url ? (
                                <a href={c.parental_consent_url} target="_blank" rel="noopener noreferrer" className="text-[#7ec850] hover:underline">Voir le document</a>
                              ) : (
                                <span className="text-[#f59e0b]">Non fournie</span>
                              )}
                            </p>
                          )}
                          <p><span className="text-white/30">Inscrit le :</span> <span className="text-white">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span></p>
                        </div>

                        {/* Right: Media */}
                        <div className="space-y-2 text-sm">
                          {c.bio && (
                            <div>
                              <span className="text-white/30">Bio :</span>
                              <p className="text-white/60 mt-1">{c.bio}</p>
                            </div>
                          )}
                          {c.finale_songs && c.finale_songs.length > 0 && (
                            <div>
                              <span className="text-white/30">Morceaux finale :</span>
                              <div className="mt-1 space-y-1">
                                {c.finale_songs.map((s, i) => (
                                  <p key={i} className="text-white/60">
                                    {i + 1}. <span className="text-white/80">{s.title}</span> — {s.artist}
                                    {s.youtube_url && (
                                      <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#e91e8c] hover:underline text-xs">YouTube</a>
                                    )}
                                  </p>
                                ))}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const name = c.stage_name || `${c.first_name} ${c.last_name}`
                                  const lines = (c.finale_songs || []).map((s, i) =>
                                    `${i + 1}. ${s.title} — ${s.artist}${s.youtube_url ? ` (${s.youtube_url})` : ''}`
                                  ).join('\n')
                                  const subject = encodeURIComponent(`Morceaux finale — ${name}`)
                                  const body = encodeURIComponent(`${name}\nTel: ${c.phone || 'Non renseigne'}\nEmail: ${c.email}\n\nMorceaux proposes pour la finale:\n${lines}`)
                                  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                                }}
                                className="mt-2 px-3 py-1.5 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-xs text-[#8b5cf6] hover:bg-[#8b5cf6]/20 transition-colors"
                              >
                                Envoyer par email
                              </button>
                            </div>
                          )}
                          {/* Video public toggle */}
                          {c.video_url && (
                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleVideoPublic(c.id, !c.video_public)
                                }}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                  c.video_public ? 'bg-[#7ec850]' : 'bg-[#2a2545]'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                    c.video_public ? 'translate-x-5' : ''
                                  }`}
                                />
                              </button>
                              <span className="text-xs text-white/40">
                                Video publique {c.video_public ? '(visible)' : '(masquee)'}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {c.video_url && (
                              <a
                                href={c.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                📹 Vidéo
                              </a>
                            )}
                            {c.mp3_url && (
                              <a
                                href={c.mp3_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                🎵 MP3
                              </a>
                            )}
                            {c.photo_url && (
                              <a
                                href={c.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                📷 Photo HD
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#1e1a35]">
                        {c.status !== 'approved' && (
                          <button
                            onClick={() => handleStatus(c.id, 'approved')}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
                          >
                            ✅ Approuver
                          </button>
                        )}
                        {c.status !== 'rejected' && (
                          <button
                            onClick={() => handleStatus(c.id, 'rejected')}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            ❌ Refuser
                          </button>
                        )}
                        {c.status === 'approved' && (
                          <button
                            onClick={() => handleStatus(c.id, 'semifinalist')}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            🏆 Demi-finaliste
                          </button>
                        )}
                        {c.status !== 'pending' && (
                          <button
                            onClick={() => handleStatus(c.id, 'pending')}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors"
                          >
                            ↩ Remettre en attente
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id, `${c.first_name} ${c.last_name}`)}
                          className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/5 border border-red-500/15 text-red-400/60 hover:bg-red-500/15 hover:text-red-400 transition-colors ml-auto"
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-white/30 text-sm">
            {search ? 'Aucun résultat.' : 'Aucun candidat inscrit.'}
          </p>
        )}
      </div>
    </div>
  )
}
