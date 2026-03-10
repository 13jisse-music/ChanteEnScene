'use client'

import { useState, useEffect, useMemo } from 'react'
import { updateCandidateStatus, deleteCandidate, toggleVideoPublic, toggleImageSocialConsent, requestCorrection, sendDistanceEmail } from '@/app/admin/candidats/actions'
import { getDistanceToAubagne, DISTANCE_COLORS } from '@/lib/city-distance'

interface DistanceEvent {
  campaign_id: string
  subscriber_email: string
  event_type: string
  created_at: string
}

interface EmailPreview {
  candidateId: string
  email: string
  firstName: string
  city: string
  badge: 'red' | 'orange'
  subject: string
  body: string
}

function getDistanceEmailStatus(email: string, events: DistanceEvent[]): 'none' | 'sent' | 'read' {
  const mine = events.filter(e => e.subscriber_email === email)
  if (mine.some(e => e.event_type === 'open')) return 'read'
  if (mine.some(e => e.event_type === 'send')) return 'sent'
  return 'none'
}

function buildDistanceEmail(firstName: string, city: string, badge: 'red' | 'orange') {
  if (badge === 'red') {
    return {
      subject: 'ChanteEnScène Aubagne 2026 — Présence sur place',
      body: `Bonjour ${firstName},\n\nMerci pour ton inscription à ChanteEnScène Aubagne 2026 !\n\nJe me permets de te contacter car j'ai vu que tu es de ${city}. Je voulais m'assurer que tu as bien noté que la demi-finale (17 juin) et la finale (16 juillet 2026) se déroulent sur scène à Aubagne (13). La présence physique est obligatoire pour ces deux dates.\n\nLa sélection se fait sur vidéo, donc pas besoin de te déplacer pour l'instant. Mais si tu es retenu(e), il faudra être là en personne.\n\nEst-ce que ça te convient ?\n\nÀ bientôt,\nJisse — ChanteEnScène`,
    }
  }
  return {
    subject: 'ChanteEnScène Aubagne 2026 — Info pratique',
    body: `Bonjour ${firstName},\n\nMerci pour ton inscription à ChanteEnScène Aubagne 2026 !\n\nPetit rappel pratique : la demi-finale (17 juin) et la finale (16 juillet 2026) se déroulent sur scène à Aubagne (13). La présence physique est obligatoire pour ces deux dates.\n\nN'hésite pas si tu as des questions !\n\nÀ bientôt,\nJisse — ChanteEnScène`,
  }
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const ytId = getYouTubeId(url)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Fermer">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
      </button>
      {ytId ? (
        <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen className="w-full max-w-4xl aspect-video rounded-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()} />
      ) : (
        <video src={url} autoPlay controls playsInline className="max-w-full max-h-[85vh] rounded-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()} />
      )}
    </div>
  )
}

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
  image_social_consent: boolean
  status: string
  likes_count: number
  created_at: string
  updated_at: string | null
  correction_token: string | null
  correction_fields: string[] | null
  correction_submitted_at: string | null
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
  distanceEvents: initialDistanceEvents = [],
}: {
  candidates: Candidate[]
  juryScores?: JuryScore[]
  distanceEvents?: DistanceEvent[]
}) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null)
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const [correctionChecked, setCorrectionChecked] = useState<Record<string, boolean>>({})
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({})
  const [distanceEvents, setDistanceEvents] = useState(initialDistanceEvents)

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
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  function openCorrectionModal(id: string) {
    setCorrectionId(id)
    setCorrectionChecked({})
  }

  async function handleCorrection() {
    if (!correctionId) return
    const fields = Object.entries(correctionChecked).filter(([, v]) => v).map(([k]) => k)
    if (fields.length === 0) return
    setCorrectionLoading(true)
    await requestCorrection(correctionId, fields)
    setCorrectionLoading(false)
    setCorrectionId(null)
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
                        {c.correction_token && c.correction_submitted_at && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[#f59e0b]/15 text-[#f59e0b]" title={`Corrigé le ${new Date(c.correction_submitted_at).toLocaleDateString('fr-FR')} à ${new Date(c.correction_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}>
                            ✏️ Corrigé
                          </span>
                        )}
                        {c.correction_token && !c.correction_submitted_at && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[#e91e8c]/15 text-[#e91e8c]">
                            ✉️ Correction demandée
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
                          {c.city && (() => {
                            const dist = getDistanceToAubagne(c.city)
                            const colors = DISTANCE_COLORS[dist.badge]
                            return (
                              <p className="flex items-center gap-2 flex-wrap">
                                <span className="text-white/30">Ville :</span>
                                <span className="text-white">{c.city}</span>
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ background: colors.bg, color: colors.text }}
                                >
                                  📍 {dist.label}
                                </span>
                                {(dist.badge === 'red' || dist.badge === 'orange') && (() => {
                                  const status = getDistanceEmailStatus(c.email, distanceEvents)
                                  const isRed = dist.badge === 'red'
                                  const btnColor = isRed ? '#ef4444' : '#f59e0b'
                                  const label = status === 'read' ? '✓ Lu' : status === 'sent' ? '✓ Envoyé' : isRed ? '✉️ Informer' : '✉️ Rappeler'
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const { subject, body } = buildDistanceEmail(c.first_name, c.city!, dist.badge as 'red' | 'orange')
                                        setEmailPreview({
                                          candidateId: c.id,
                                          email: c.email,
                                          firstName: c.first_name,
                                          city: c.city!,
                                          badge: dist.badge as 'red' | 'orange',
                                          subject,
                                          body,
                                        })
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                                      style={{
                                        background: status === 'read' ? '#7ec85030' : status === 'sent' ? `${btnColor}30` : `${btnColor}20`,
                                        color: status === 'read' ? '#7ec850' : btnColor,
                                      }}
                                      title={status === 'read' ? 'Email lu par le candidat' : status === 'sent' ? 'Email envoyé (pas encore lu)' : isRed ? 'Informer sur la présence obligatoire' : 'Rappeler la localisation'}
                                    >
                                      {label}
                                    </button>
                                  )
                                })()}
                              </p>
                            )
                          })()}
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
                          {/* Image social consent toggle */}
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleImageSocialConsent(c.id, !c.image_social_consent)
                              }}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                c.image_social_consent ? 'bg-[#7ec850]' : 'bg-[#2a2545]'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                  c.image_social_consent ? 'translate-x-5' : ''
                                }`}
                              />
                            </button>
                            <span className="text-xs text-white/40">
                              Réseaux sociaux {c.image_social_consent ? '(autorisé)' : '(refusé)'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {c.video_url && (
                              <button
                                type="button"
                                onClick={() => setVideoModalUrl(c.video_url)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                📹 Vidéo
                              </button>
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
                        {c.status !== 'approved' && (
                          <button
                            onClick={() => openCorrectionModal(c.id)}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors"
                          >
                            ✏️ Demander correction
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
      {videoModalUrl && <VideoModal url={videoModalUrl} onClose={() => setVideoModalUrl(null)} />}

      {/* Correction modal */}
      {correctionId && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setCorrectionId(null)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-1">Demander une correction</h3>
            <p className="text-white/40 text-xs mb-4">Le candidat recevra un email avec un lien pour corriger les champs sélectionnés.</p>
            <div className="space-y-3 mb-5">
              {[
                { key: 'song_title', label: 'Titre de la chanson' },
                { key: 'song_artist', label: 'Artiste original' },
                { key: 'video', label: 'Vidéo' },
                { key: 'photo', label: 'Photo' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={correctionChecked[key] || false}
                    onChange={(e) => setCorrectionChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#2a2545] bg-[#1a1533] text-[#e91e8c] focus:ring-[#e91e8c]/30 accent-[#e91e8c]"
                  />
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCorrectionId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCorrection}
                disabled={correctionLoading || !Object.values(correctionChecked).some(Boolean)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[#f59e0b] hover:bg-[#f59e0b]/20 disabled:opacity-40 transition-colors"
              >
                {correctionLoading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email preview modal */}
      {emailPreview && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => !emailSending && setEmailPreview(null)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2545]">
              <h3 className="font-bold text-white mb-1">Prévisualisation email</h3>
              <p className="text-white/40 text-xs">
                Envoi via <span className="text-[#e91e8c]">inscriptions@chantenscene.fr</span> (IONOS)
              </p>
            </div>

            {/* Email meta */}
            <div className="px-5 pt-4 space-y-2 text-sm">
              <p><span className="text-white/30">À :</span> <span className="text-white">{emailPreview.email}</span></p>
              <div>
                <label className="text-white/30 block mb-1">Objet :</label>
                <input
                  type="text"
                  value={emailPreview.subject}
                  onChange={(e) => setEmailPreview({ ...emailPreview, subject: e.target.value })}
                  className="w-full bg-[#0d0b1a] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
                />
              </div>
            </div>

            {/* Email body (editable) */}
            <div className="px-5 pt-3 pb-2">
              <label className="text-white/30 text-sm block mb-1">Message :</label>
              <textarea
                value={emailPreview.body}
                onChange={(e) => setEmailPreview({ ...emailPreview, body: e.target.value })}
                rows={10}
                className="w-full bg-[#0d0b1a] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#e91e8c] resize-y leading-relaxed"
              />
            </div>

            {/* Preview render */}
            <div className="px-5 pb-3">
              <details className="group">
                <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/40 transition-colors">
                  Aperçu HTML
                </summary>
                <div className="mt-2 bg-[#0d0b1a] border border-[#2a2545] rounded-lg p-4 text-sm text-white/60 leading-relaxed">
                  {emailPreview.body.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() ? '' : 'h-3'}>{line}</p>
                  ))}
                </div>
              </details>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 border-t border-[#2a2545]">
              <button
                onClick={() => setEmailPreview(null)}
                disabled={emailSending}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setEmailSending(true)
                  const result = await sendDistanceEmail(
                    emailPreview.candidateId,
                    emailPreview.badge,
                    emailPreview.subject,
                    emailPreview.body,
                  )
                  setEmailSending(false)
                  if (result.error) {
                    alert(`Erreur : ${result.error}`)
                  } else {
                    // Update local state
                    setEmailSent(prev => ({ ...prev, [emailPreview.candidateId]: true }))
                    setDistanceEvents(prev => [...prev, {
                      campaign_id: result.trackingId || '',
                      subscriber_email: emailPreview.email,
                      event_type: 'send',
                      created_at: new Date().toISOString(),
                    }])
                    setEmailPreview(null)
                  }
                }}
                disabled={emailSending || !emailPreview.subject.trim() || !emailPreview.body.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 disabled:opacity-40 transition-colors"
              >
                {emailSending ? 'Envoi en cours...' : '✉️ Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
