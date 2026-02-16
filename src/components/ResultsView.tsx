'use client'

import { useState } from 'react'
import { promoteToSemifinalist, removeFromSemifinalist, getEmailPreviews, sendSelectionNotifications, autoSelectSemifinalists } from '@/app/admin/resultats/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  status: string
  likes_count: number
  photo_url: string | null
  mp3_url: string | null
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
}

interface Score {
  id: string
  juror_id: string
  candidate_id: string
  event_type: string
  scores: Record<string, number | string>
  total_score: number
  comment: string | null
}

interface Vote {
  candidate_id: string
}

interface LiveVote {
  candidate_id: string
  live_event_id: string
}

interface LiveEvent {
  id: string
  event_type: string
  status: string
}

interface Session {
  id: string
  name: string
  config: {
    jury_weight_percent: number
    public_weight_percent: number
    jury_criteria: { name: string; max_score: number }[]
    semifinalists_per_category: number
    finalists_per_category: number
    age_categories: { name: string }[]
    semifinal_date?: string
    semifinal_time?: string
    semifinal_location?: string
    selection_notifications_sent_at?: string | null
  }
}

interface Props {
  session: Session | null
  candidates: Candidate[]
  jurors: Juror[]
  scores: Score[]
  votes: Vote[]
  liveVotes: LiveVote[]
  events: LiveEvent[]
}

type ViewMode = 'selection' | 'semifinal' | 'final'
type Decision = 'oui' | 'peut-etre' | 'non'

const DECISION_DISPLAY: Record<Decision, { label: string; emoji: string; color: string }> = {
  oui: { label: 'Oui', emoji: '👍', color: '#7ec850' },
  'peut-etre': { label: 'Peut-être', emoji: '🤔', color: '#f59e0b' },
  non: { label: 'Non', emoji: '👎', color: '#ef4444' },
}

export default function ResultsView({ session, candidates, jurors, scores, votes, liveVotes, events }: Props) {
  const [view, setView] = useState<ViewMode>('selection')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [emailPreviews, setEmailPreviews] = useState<{ selectionHtml: string; rejectionHtml: string } | null>(null)
  const [previewTab, setPreviewTab] = useState<'selection' | 'rejection'>('selection')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    selectionSent: number
    rejectionSent: number
    failures: string[]
    report: { email: string; name: string; type: 'selection' | 'rejection'; status: 'sent' | 'simulated' | 'failed'; detail?: string }[]
    isSimulation: boolean
    sentAt: string
  } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [autoSelectLoading, setAutoSelectLoading] = useState(false)
  const [autoSelectResult, setAutoSelectResult] = useState<{
    selected: number
    promoted: number
    demoted: number
    perCategory: { category: string; count: number; target: number }[]
  } | null>(null)
  const [autoSelectError, setAutoSelectError] = useState<string | null>(null)
  const [customJuryWeight, setCustomJuryWeight] = useState<number | null>(null)

  if (!session) return <p className="text-white/30">Aucune session active.</p>

  const config = session.config
  const categories = config.age_categories.map((c) => c.name)
  const maxCriteriaScore = config.jury_criteria.length * 5
  const juryWeight = config.jury_weight_percent / 100
  const publicWeight = config.public_weight_percent / 100

  const onlineJurors = jurors.filter((j) => j.role === 'online')
  const semifinalJurors = jurors.filter((j) => j.role === 'semifinal')
  const finalJurors = jurors.filter((j) => j.role === 'final')

  function getDecisionCounts(candidateId: string) {
    const candidateScores = scores.filter(
      (s) => s.candidate_id === candidateId && s.event_type === 'online'
    )
    let oui = 0, peutEtre = 0, non = 0
    for (const s of candidateScores) {
      const d = s.scores?.decision as Decision | undefined
      if (d === 'oui') oui++
      else if (d === 'peut-etre') peutEtre++
      else if (d === 'non') non++
    }
    return { oui, peutEtre, non, total: candidateScores.length }
  }

  // ─── Filter candidates by phase ───
  const selectionCandidates = candidates // All approved+ candidates
  const semifinalCandidates = candidates.filter((c) => ['semifinalist', 'finalist', 'winner'].includes(c.status))
  const finalCandidates = candidates.filter((c) => ['finalist', 'winner'].includes(c.status))

  function getSelectionRankings() {
    const maxLikes = Math.max(1, ...selectionCandidates.map((c) => c.likes_count || 0))
    const totalOnline = onlineJurors.length || 1

    return selectionCandidates.map((c) => {
      const counts = getDecisionCounts(c.id)
      const candidateScores = scores.filter(
        (s) => s.candidate_id === c.id && s.event_type === 'online'
      )
      const votedJurorIds = new Set(candidateScores.map((s) => s.juror_id))

      // Normalized jury score: (oui×2 + peutEtre×1) / (totalJurors × 2) × 100
      const maxJuryPoints = totalOnline * 2
      const juryNormalized = maxJuryPoints > 0
        ? ((counts.oui * 2 + counts.peutEtre * 1) / maxJuryPoints) * 100
        : 0

      // Normalized public score: likes / maxLikes × 100
      const publicNormalized = ((c.likes_count || 0) / maxLikes) * 100

      // Combined with config weights
      const selectionScore = juryNormalized * juryWeight + publicNormalized * publicWeight

      return {
        ...c,
        juryScores: candidateScores,
        juryAvg: Math.round(juryNormalized * 10) / 10,
        juryNormalized: Math.round(juryNormalized * 10) / 10,
        juryTotal: 0,
        jurorCount: counts.total,
        totalJurors: totalOnline,
        votedJurorIds,
        decisionCounts: counts,
        publicNormalized: Math.round(publicNormalized * 10) / 10,
        finalScore: Math.round(selectionScore * 10) / 10,
      }
    })
  }

  function getSemifinalRankings() {
    const relevantScores = scores.filter((s) => s.event_type === 'semifinal')

    return semifinalCandidates.map((c) => {
      const candidateScores = relevantScores.filter((s) => s.candidate_id === c.id)
      // Star-based: average stars (1-5) from semifinal jurors
      const avgStars = candidateScores.length > 0
        ? candidateScores.reduce((a, s) => a + s.total_score, 0) / candidateScores.length
        : 0
      // Normalize on 100 for ranking
      const juryNormalized = (avgStars / 5) * 100

      return {
        ...c,
        juryScores: candidateScores,
        juryTotal: candidateScores.reduce((a, s) => a + s.total_score, 0),
        juryAvg: Math.round(avgStars * 10) / 10,
        avgStars: Math.round(avgStars * 10) / 10,
        juryNormalized: Math.round(juryNormalized * 10) / 10,
        jurorCount: candidateScores.length,
        totalJurors: semifinalJurors.length || 1,
        finalScore: Math.round(juryNormalized * 10) / 10,
      }
    })
  }

  function getFinalRankings() {
    const finalEvent = events.find((e) => e.event_type === 'final')
    const relevantScores = scores.filter((s) => s.event_type === 'final')
    const relevantLiveVotes = finalEvent
      ? liveVotes.filter((v) => v.live_event_id === finalEvent.id)
      : []

    const voteCountMap = new Map<string, number>()
    for (const v of relevantLiveVotes) {
      voteCountMap.set(v.candidate_id, (voteCountMap.get(v.candidate_id) || 0) + 1)
    }
    for (const v of votes) {
      voteCountMap.set(v.candidate_id, (voteCountMap.get(v.candidate_id) || 0) + 1)
    }
    const maxVotes = Math.max(1, ...voteCountMap.values())

    return finalCandidates.map((c) => {
      const candidateScores = relevantScores.filter((s) => s.candidate_id === c.id)
      const juryTotal = candidateScores.reduce((a, s) => a + s.total_score, 0)
      const juryAvg = candidateScores.length > 0 ? juryTotal / candidateScores.length : 0
      const juryNormalized = maxCriteriaScore > 0 ? (juryAvg / maxCriteriaScore) * 100 : 0

      const publicVotes = voteCountMap.get(c.id) || 0
      const publicNormalized = (publicVotes / maxVotes) * 100
      const finalScore = juryNormalized * juryWeight + publicNormalized * publicWeight

      return {
        ...c,
        juryScores: candidateScores,
        juryTotal,
        juryAvg: Math.round(juryAvg * 10) / 10,
        juryNormalized: Math.round(juryNormalized * 10) / 10,
        jurorCount: candidateScores.length,
        totalJurors: finalJurors.length || 1,
        publicVotes,
        publicNormalized: Math.round(publicNormalized * 10) / 10,
        finalScore: Math.round(finalScore * 10) / 10,
      }
    })
  }

  const rankings =
    view === 'selection'
      ? getSelectionRankings()
      : view === 'semifinal'
        ? getSemifinalRankings()
        : getFinalRankings()

  const filtered = rankings
    .filter((c) => !activeCategory || c.category === activeCategory)
    .sort((a, b) => b.finalScore - a.finalScore)

  const rankedByCategory = new Map<string, typeof filtered>()
  for (const cat of categories) {
    rankedByCategory.set(
      cat,
      rankings.filter((c) => c.category === cat).sort((a, b) => b.finalScore - a.finalScore)
    )
  }

  function getRank(candidateId: string, category: string): number {
    const list = rankedByCategory.get(category) || []
    return list.findIndex((c) => c.id === candidateId) + 1
  }

  function getMedalColor(rank: number): string {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return 'transparent'
  }

  const selectionStats = view === 'selection' ? (() => {
    const totalOnlineJurors = onlineJurors.length
    const onlineScores = scores.filter((s) => s.event_type === 'online')
    const jurorsThatVoted = new Set(onlineScores.map((s) => s.juror_id))
    const candidatesWithScores = new Set(onlineScores.map((s) => s.candidate_id))
    const totalPairs = totalOnlineJurors * selectionCandidates.length
    const completedPairs = onlineScores.length

    return {
      totalOnlineJurors,
      jurorsThatVoted: jurorsThatVoted.size,
      candidatesWithScores: candidatesWithScores.size,
      totalCandidates: selectionCandidates.length,
      completedPairs,
      totalPairs,
      progressPercent: totalPairs > 0 ? Math.round((completedPairs / totalPairs) * 100) : 0,
    }
  })() : null

  // Notification state
  const notificationsSent = !!config.selection_notifications_sent_at
  const semifinalDate = config.semifinal_date ? new Date(config.semifinal_date + 'T00:00:00') : null
  const daysUntilSemifinal = semifinalDate
    ? Math.ceil((semifinalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const showDeadlineWarning = !notificationsSent && daysUntilSemifinal !== null && daysUntilSemifinal <= 15

  const semifinalistCount = candidates.filter((c) => c.status === 'semifinalist').length
  const nonSelectedCount = candidates.filter((c) => c.status === 'approved').length

  async function handlePromote(candidateId: string) {
    setLoadingId(candidateId)
    await promoteToSemifinalist(candidateId)
    setLoadingId(null)
  }

  async function handleDemote(candidateId: string) {
    setLoadingId(candidateId)
    await removeFromSemifinalist(candidateId, session!.id)
    setLoadingId(null)
  }

  async function handleOpenNotificationModal() {
    setShowNotificationModal(true)
    setSendResult(null)
    setPreviewTab('selection')
    const previews = await getEmailPreviews(session!.id)
    if ('error' in previews) return
    setEmailPreviews(previews as { selectionHtml: string; rejectionHtml: string })
  }

  async function handleConfirmSend() {
    setIsSending(true)
    setSendError(null)
    const result = await sendSelectionNotifications(session!.id)
    setIsSending(false)

    if ('error' in result) {
      setSendError(result.error as string)
      return
    }

    if ('success' in result && result.success) {
      const r = result as {
        selectionSent: number; rejectionSent: number; failures: string[]
        report: { email: string; name: string; type: 'selection' | 'rejection'; status: 'sent' | 'simulated' | 'failed'; detail?: string }[]
        isSimulation: boolean; sentAt: string
      }
      setSendResult(r)
      setShowNotificationModal(false)
    }
  }

  const TABS: { key: ViewMode; label: string; desc: string }[] = [
    { key: 'selection', label: 'Sélection', desc: 'Votes jury en ligne' },
    { key: 'semifinal', label: 'Demi-finale', desc: 'Notes jury' },
    { key: 'final', label: 'Finale', desc: 'Jury + Public' },
  ]

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setView(tab.key); setExpandedId(null) }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              view === tab.key
                ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className="hidden sm:inline text-[10px] ml-1.5 opacity-60">({tab.desc})</span>
          </button>
        ))}
      </div>

      {/* Selection progress stats */}
      {view === 'selection' && selectionStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Jurés en ligne</p>
              <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-[#3b82f6]">
                {selectionStats.jurorsThatVoted}/{selectionStats.totalOnlineJurors}
              </p>
              <p className="text-white/20 text-xs mt-0.5">ont voté</p>
            </div>
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Candidats notés</p>
              <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-[#7ec850]">
                {selectionStats.candidatesWithScores}/{selectionStats.totalCandidates}
              </p>
              <p className="text-white/20 text-xs mt-0.5">ont reçu des votes</p>
            </div>
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Progression</p>
              <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-[#e91e8c]">
                {selectionStats.progressPercent}%
              </p>
              <p className="text-white/20 text-xs mt-0.5">{selectionStats.completedPairs}/{selectionStats.totalPairs} votes</p>
            </div>
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Qualifiés/cat.</p>
              <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-[#f59e0b]">
                {config.semifinalists_per_category}
              </p>
              <p className="text-white/20 text-xs mt-0.5">demi-finalistes</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs">Avancement global des votes</p>
              <p className="text-white/60 text-xs font-medium">{selectionStats.progressPercent}%</p>
            </div>
            <div className="w-full h-2.5 bg-[#2a2545] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] transition-all duration-500"
                style={{ width: `${selectionStats.progressPercent}%` }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Détail par juré</p>
              {onlineJurors.map((j) => {
                const jurorName = `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Sans nom'
                const jurorScoreCount = scores.filter(
                  (s) => s.juror_id === j.id && s.event_type === 'online'
                ).length
                const percent = selectionCandidates.length > 0 ? Math.round((jurorScoreCount / selectionCandidates.length) * 100) : 0
                const isDone = jurorScoreCount >= selectionCandidates.length

                return (
                  <div key={j.id} className="flex items-center gap-3">
                    <span className={`text-xs w-32 truncate ${isDone ? 'text-[#7ec850]' : 'text-white/50'}`}>
                      {isDone ? '✓' : '○'} {jurorName}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#2a2545] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isDone ? 'bg-[#7ec850]' : 'bg-[#e91e8c]/60'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 w-16 text-right">
                      {jurorScoreCount}/{selectionCandidates.length}
                    </span>
                  </div>
                )
              })}
              {onlineJurors.length === 0 && (
                <p className="text-white/20 text-xs">Aucun juré en ligne configuré.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deadline warning / Notification status */}
      {view === 'selection' && showDeadlineWarning && (
        <div className={`rounded-xl p-4 border ${
          daysUntilSemifinal! <= 5
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <p className={`font-medium text-sm ${daysUntilSemifinal! <= 5 ? 'text-red-400' : 'text-amber-400'}`}>
            {daysUntilSemifinal! <= 0
              ? 'La demi-finale est aujourd\'hui ou déjà passée !'
              : `Plus que ${daysUntilSemifinal} jour(s) avant la demi-finale.`
            }
            {' '}Les notifications aux candidats n&apos;ont pas encore été envoyées.
          </p>
        </div>
      )}
      {view === 'selection' && notificationsSent && (
        <div className="rounded-xl p-4 border bg-[#7ec850]/10 border-[#7ec850]/30">
          <p className="text-sm text-[#7ec850]">
            Notifications envoyées le {new Date(config.selection_notifications_sent_at!).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      )}

      {/* Weight info (selection + final) */}
      {(view === 'selection' || view === 'final') && (
        <div className="flex gap-4 text-xs text-white/30">
          <span className="px-3 py-1.5 rounded-lg bg-[#e91e8c]/5 border border-[#e91e8c]/15">
            Jury : {config.jury_weight_percent}%
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/15">
            Public : {config.public_weight_percent}%
          </span>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !activeCategory
              ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
              : 'bg-white/5 border border-white/10 text-white/40'
          }`}
        >
          Toutes catégories
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                : 'bg-white/5 border border-white/10 text-white/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results list */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        {view === 'selection' ? (
          /* ─── Selection view: Oui / Peut-être / Non ─── */
          filtered.length > 0 ? (
            <div className="divide-y divide-[#2a2545]">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 text-xs text-white/30 uppercase tracking-wider">
                <span className="w-5">#</span>
                <span className="w-10" />
                <span className="flex-1">Candidat</span>
                <span className="w-24 text-center">Jury</span>
                <span className="w-12 text-center">Likes</span>
              </div>

              {filtered.map((c) => {
                const rank = getRank(c.id, c.category)
                const name = c.stage_name || `${c.first_name} ${c.last_name}`
                const isExpanded = expandedId === c.id
                const isSemifinalist = c.status === 'semifinalist'
                const isLoading = loadingId === c.id
                const counts = 'decisionCounts' in c
                  ? (c as { decisionCounts: { oui: number; peutEtre: number; non: number; total: number } }).decisionCounts
                  : { oui: 0, peutEtre: 0, non: 0, total: 0 }

                return (
                  <div key={c.id} className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                        isSemifinalist ? 'bg-[#7ec850]/[0.04]' : ''
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      <span className="text-xs font-bold text-white/30 w-5 text-center">{rank}</span>

                      <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">🎤</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{name}</p>
                          {isSemifinalist && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7ec850]/15 text-[#7ec850] shrink-0">
                              Demi-finaliste
                            </span>
                          )}
                          {isSemifinalist && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                c.mp3_url
                                  ? 'bg-[#7ec850]/15 text-[#7ec850]'
                                  : 'bg-red-500/15 text-red-400'
                              }`}
                              title={c.mp3_url ? 'MP3 reçu' : 'MP3 en attente'}
                            >
                              {c.mp3_url ? '🎵 MP3' : '⚠️ MP3'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/20">{c.category}</p>
                      </div>

                      {/* Decision summary: Oui / Peut-être / Non */}
                      <div className="flex items-center gap-1 shrink-0 w-24 justify-center">
                        {counts.total > 0 ? (
                          <>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: '#7ec850', background: '#7ec85015' }}>
                              👍{counts.oui}
                            </span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: '#f59e0b', background: '#f59e0b15' }}>
                              🤔{counts.peutEtre}
                            </span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: '#ef4444', background: '#ef444415' }}>
                              👎{counts.non}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </div>

                      <div className="w-12 text-center shrink-0">
                        <p className="text-xs font-bold text-[#e91e8c]">{c.likes_count}</p>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-[#1e1a35]">
                        <div className="mt-3 space-y-3">
                          {/* Decision bars */}
                          <div className="bg-[#1a1533] rounded-xl p-4">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Résumé des votes</p>
                            <div className="space-y-2">
                              {(['oui', 'peut-etre', 'non'] as Decision[]).map((d) => {
                                const count = d === 'oui' ? counts.oui : d === 'peut-etre' ? counts.peutEtre : counts.non
                                const pct = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0
                                const cfg = DECISION_DISPLAY[d]
                                return (
                                  <div key={d} className="flex items-center gap-3">
                                    <span className="text-sm w-24" style={{ color: cfg.color }}>
                                      {cfg.emoji} {cfg.label}
                                    </span>
                                    <div className="flex-1 h-3 bg-[#2a2545] rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${pct}%`, background: cfg.color }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold w-8 text-right" style={{ color: cfg.color }}>
                                      {count}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Per-juror decisions */}
                          <p className="text-white/40 text-xs uppercase tracking-wider">Détail par juré</p>
                          <div className="flex flex-wrap gap-1.5">
                            {onlineJurors.map((j) => {
                              const jurorName = `${j.first_name || ''} ${j.last_name || ''}`.trim() || '?'
                              const jurorScore = scores.find(
                                (s) => s.juror_id === j.id && s.candidate_id === c.id && s.event_type === 'online'
                              )
                              const decision = jurorScore?.scores?.decision as Decision | undefined
                              const cfg = decision ? DECISION_DISPLAY[decision] : null

                              return (
                                <div
                                  key={j.id}
                                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${
                                    cfg ? '' : 'bg-white/[0.03] text-white/20 border-white/5'
                                  }`}
                                  style={cfg ? {
                                    background: `${cfg.color}10`,
                                    color: cfg.color,
                                    borderColor: `${cfg.color}25`,
                                  } : undefined}
                                >
                                  {cfg ? cfg.emoji : '○'} {jurorName}
                                  {jurorScore?.comment && (
                                    <p className="text-[10px] opacity-60 mt-0.5 italic">
                                      &laquo; {jurorScore.comment} &raquo;
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Likes info */}
                          <div className="bg-[#1a1533] rounded-xl p-3 flex items-center justify-between">
                            <span className="text-xs text-white/40">Likes du public</span>
                            <span className="font-bold text-sm text-[#e91e8c]">{c.likes_count}</span>
                          </div>

                          {/* Upload MP3 link for semifinalists */}
                          {isSemifinalist && (
                            <div className="bg-[#1a1533] rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-white/40">Lien upload MP3</span>
                              <div className="flex items-center gap-2">
                                <code className="text-[10px] text-white/30 bg-black/20 px-2 py-1 rounded max-w-[200px] truncate">
                                  /upload-mp3/{c.id}
                                </code>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const url = `${window.location.origin}/upload-mp3/${c.id}`
                                    navigator.clipboard.writeText(url)
                                    alert('Lien copié !')
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                                >
                                  Copier
                                </button>
                                <a
                                  href={`/upload-mp3/${c.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2.5 py-1 rounded-lg text-[10px] bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
                                >
                                  Ouvrir
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Promote / Demote button */}
                          {notificationsSent ? (
                            <p className="text-xs text-white/20 pt-1">
                              Les notifications ont été envoyées. La liste ne peut plus être modifiée.
                            </p>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              {isSemifinalist ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDemote(c.id) }}
                                  className="px-4 py-2.5 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  Retirer de la demi-finale
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePromote(c.id) }}
                                  className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
                                >
                                  Promouvoir en demi-finaliste
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-white/30 text-sm">Aucun résultat disponible.</p>
          )
        ) : (
          /* ─── Semifinal / Final view ─── */
          <>
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#2a2545] text-xs text-white/30 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Candidat</div>
              <div className="col-span-2 text-center">Jury</div>
              {view === 'final' && <div className="col-span-2 text-center">Public</div>}
              <div className={`${view === 'semifinal' ? 'col-span-5' : 'col-span-3'} text-right`}>Score</div>
            </div>

            {filtered.length > 0 ? (
              <div className="divide-y divide-[#2a2545]">
                {filtered.map((c) => {
                  const rank = getRank(c.id, c.category)
                  const medal = getMedalColor(rank)
                  const isExpanded = expandedId === c.id
                  const name = c.stage_name || `${c.first_name} ${c.last_name}`

                  return (
                    <div key={c.id}>
                      <div
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      >
                        <div className="col-span-1">
                          <span
                            className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              background: medal !== 'transparent' ? `${medal}20` : 'transparent',
                              color: medal !== 'transparent' ? medal : 'rgba(255,255,255,0.3)',
                              border: medal !== 'transparent' ? `2px solid ${medal}` : '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            {rank}
                          </span>
                        </div>

                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                            {c.photo_url ? (
                              <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10">🎤</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{name}</p>
                            <p className="text-xs text-white/20">{c.category}</p>
                          </div>
                        </div>

                        <div className="col-span-2 text-center">
                          {view === 'semifinal' && 'avgStars' in c ? (
                            <>
                              <p className="text-sm tracking-wide">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <span key={i} className={i <= Math.round((c as { avgStars: number }).avgStars) ? 'text-[#f5a623]' : 'text-white/15'}>
                                    ★
                                  </span>
                                ))}
                              </p>
                              <p className="text-[10px] text-white/30">{(c as { avgStars: number }).avgStars}/5</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-[#e91e8c]">{c.juryAvg}</p>
                              <p className="text-[10px] text-white/20">/{maxCriteriaScore}</p>
                            </>
                          )}
                        </div>

                        {view === 'final' && (
                          <div className="col-span-2 text-center">
                            <p className="text-sm font-bold text-[#3b82f6]">
                              {'publicVotes' in c ? (c as { publicVotes: number }).publicVotes : c.likes_count}
                            </p>
                            <p className="text-[10px] text-white/20">votes</p>
                          </div>
                        )}

                        <div className={`${view === 'semifinal' ? 'col-span-5' : 'col-span-3'} text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-[#2a2545] rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850]"
                                style={{ width: `${Math.min(c.finalScore, 100)}%` }}
                              />
                            </div>
                            <span className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white">
                              {c.finalScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[#1e1a35]">
                          <div className="mt-3 space-y-3">
                            <p className="text-white/40 text-xs uppercase tracking-wider">Détail des notes jury</p>

                            {c.juryScores.length > 0 ? (
                              <div className="space-y-2">
                                {c.juryScores.map((score) => {
                                  const juror = jurors.find((j) => j.id === score.juror_id)
                                  const jurorName = juror
                                    ? `${juror.first_name || ''} ${juror.last_name || ''}`.trim()
                                    : 'Juré inconnu'
                                  const isSemifinalScore = score.event_type === 'semifinal'
                                  const starValue = isSemifinalScore ? ((score.scores?.stars as number) || score.total_score) : 0

                                  return (
                                    <div key={score.id} className="bg-[#1a1533] rounded-xl p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-white/60">{jurorName}</span>
                                        {isSemifinalScore ? (
                                          <span className="text-sm tracking-wide">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                              <span key={i} className={i <= starValue ? 'text-[#f5a623]' : 'text-white/15'}>
                                                ★
                                              </span>
                                            ))}
                                          </span>
                                        ) : (
                                          <>
                                            <span className="text-xs text-white/20">{score.event_type}</span>
                                            <span className="font-bold text-sm text-[#e91e8c]">{score.total_score}/{maxCriteriaScore}</span>
                                          </>
                                        )}
                                      </div>
                                      {!isSemifinalScore && (
                                        <div className="flex flex-wrap gap-2">
                                          {Object.entries(score.scores || {}).map(([sName, val]) => (
                                            <span key={sName} className="text-[10px] text-white/30 px-2 py-0.5 bg-white/[0.03] rounded">
                                              {sName}: <span className="text-white/50">{val as number}/5</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {score.comment && (
                                        <p className="text-xs text-white/25 mt-2 italic">&laquo; {score.comment} &raquo;</p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-white/20 text-xs">Aucune note jury pour ce candidat.</p>
                            )}

                            {view === 'final' && (
                              <div className="bg-[#1a1533] rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-white/60">Votes du public</span>
                                  <span className="font-bold text-sm text-[#3b82f6]">
                                    {'publicVotes' in c ? (c as { publicVotes: number }).publicVotes : c.likes_count} votes
                                    <span className="text-white/20 font-normal ml-1">
                                      ({'publicNormalized' in c ? (c as { publicNormalized: number }).publicNormalized : 0}%)
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="p-8 text-center text-white/30 text-sm">Aucun résultat disponible.</p>
            )}
          </>
        )}
      </div>

      {/* ─── Notification recap & action (selection only) ─── */}
      {view === 'selection' && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
          <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
            Récapitulatif de la sélection
          </h3>

          {/* Per-category counts */}
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const selected = candidates.filter((c) => c.category === cat && c.status === 'semifinalist').length
              const target = config.semifinalists_per_category
              const isComplete = selected >= target
              return (
                <div key={cat} className={`p-3 rounded-xl border ${
                  isComplete ? 'border-[#7ec850]/30 bg-[#7ec850]/5' : 'border-[#2a2545]'
                }`}>
                  <p className="text-xs text-white/40">{cat}</p>
                  <p className={`font-bold text-lg ${isComplete ? 'text-[#7ec850]' : 'text-white'}`}>
                    {selected}/{target}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-white/40">
            {semifinalistCount} candidat(s) sélectionné(s) &middot; {nonSelectedCount} candidat(s) recevront un email de non-sélection.
          </p>

          {/* ─── Auto-selection ─── */}
          {!notificationsSent && (
            <div className="bg-[#1a1533] border border-[#2a2545] rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-white">Sélection automatique</p>

              {/* Weight slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#e91e8c] font-medium">Jury : {customJuryWeight ?? config.jury_weight_percent}%</span>
                  <span className="text-[#3b82f6] font-medium">Likes public : {100 - (customJuryWeight ?? config.jury_weight_percent)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={customJuryWeight ?? config.jury_weight_percent}
                    onChange={(e) => setCustomJuryWeight(parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #e91e8c ${customJuryWeight ?? config.jury_weight_percent}%, #3b82f6 ${customJuryWeight ?? config.jury_weight_percent}%)`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/20">
                  <span>100% jury</span>
                  <span>50/50</span>
                  <span>100% likes</span>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={async () => {
                  setAutoSelectLoading(true)
                  setAutoSelectError(null)
                  setAutoSelectResult(null)
                  const result = await autoSelectSemifinalists(session.id, customJuryWeight ?? undefined)
                  setAutoSelectLoading(false)
                  if ('error' in result) {
                    setAutoSelectError(result.error as string)
                  } else if ('success' in result) {
                    setAutoSelectResult(result as typeof autoSelectResult)
                  }
                }}
                disabled={autoSelectLoading}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors disabled:opacity-50"
              >
                {autoSelectLoading ? 'Calcul en cours...' : 'Générer la sélection'}
              </button>

              {selectionStats && selectionStats.progressPercent < 100 && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                  <span>⚠️</span>
                  <span>Tous les jurés n&apos;ont pas encore fini de voter ({selectionStats.progressPercent}%). La sélection pourrait évoluer.</span>
                </div>
              )}

              {autoSelectError && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                  {autoSelectError}
                </div>
              )}

              {autoSelectResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#7ec850] bg-[#7ec850]/10 rounded-lg px-3 py-2">
                    <span>✓</span>
                    <span>
                      {autoSelectResult.selected} candidat(s) sélectionné(s)
                      {autoSelectResult.promoted > 0 && ` · ${autoSelectResult.promoted} promu(s)`}
                      {autoSelectResult.demoted > 0 && ` · ${autoSelectResult.demoted} retiré(s)`}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30">
                    Vous pouvez ajuster manuellement en développant chaque candidat ci-dessus, puis valider avec le bouton ci-dessous.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleOpenNotificationModal}
            disabled={notificationsSent || isSending || semifinalistCount === 0}
            className={`w-full px-6 py-3 rounded-xl font-medium text-sm transition-colors ${
              notificationsSent
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : semifinalistCount === 0
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#e91e8c] to-[#7ec850] text-white hover:opacity-90'
            }`}
          >
            {notificationsSent
              ? 'Notifications déjà envoyées'
              : semifinalistCount === 0
                ? 'Sélectionnez des demi-finalistes d\'abord'
                : 'Valider et notifier les candidats'
            }
          </button>
        </div>
      )}

      {/* ─── Notification preview modal ─── */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6 space-y-4 mx-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
                Aperçu des notifications
              </h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
                <p className="text-[#7ec850] font-bold text-xl">{semifinalistCount}</p>
                <p className="text-white/40 text-xs">Emails de sélection</p>
              </div>
              <div className="p-3 rounded-xl bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-center">
                <p className="text-[#e91e8c] font-bold text-xl">{nonSelectedCount}</p>
                <p className="text-white/40 text-xs">Emails de non-sélection</p>
              </div>
            </div>

            {/* Email preview tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewTab('selection')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'selection'
                    ? 'bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email de sélection
              </button>
              <button
                onClick={() => setPreviewTab('rejection')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'rejection'
                    ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email de non-sélection
              </button>
            </div>

            {/* HTML preview */}
            <div className="border border-[#2a2545] rounded-xl overflow-hidden">
              {emailPreviews ? (
                <iframe
                  srcDoc={previewTab === 'selection' ? emailPreviews.selectionHtml : emailPreviews.rejectionHtml}
                  className="w-full h-96 bg-white/5"
                  sandbox=""
                />
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-white/30 text-sm">Chargement de l&apos;aperçu...</p>
                </div>
              )}
            </div>

            {/* Error display */}
            {sendError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 font-medium text-sm">Erreur</p>
                <p className="text-red-400/70 text-xs mt-1">{sendError}</p>
              </div>
            )}

            {/* Action */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={isSending}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-[#e91e8c] to-[#7ec850] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSending ? 'Envoi en cours...' : `Confirmer et envoyer ${semifinalistCount + nonSelectedCount} emails`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rapport d'envoi (après envoi) ─── */}
      {view === 'selection' && sendResult && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
              Rapport d&apos;envoi des notifications
            </h3>
            <span className="text-xs text-white/30">
              {new Date(sendResult.sentAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          {/* Warning simulation */}
          {sendResult.isSimulation && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-medium text-sm">Mode simulation</p>
              <p className="text-amber-400/70 text-xs mt-1">
                RESEND_API_KEY n&apos;est pas configurée. Les emails n&apos;ont pas été réellement envoyés.
                Ajoutez la clé dans .env.local pour envoyer de vrais emails.
              </p>
            </div>
          )}

          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
              <p className="text-[#7ec850] font-bold text-xl">{sendResult.selectionSent}</p>
              <p className="text-white/40 text-xs">Sélection {sendResult.isSimulation ? '(simulés)' : 'envoyés'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-center">
              <p className="text-[#e91e8c] font-bold text-xl">{sendResult.rejectionSent}</p>
              <p className="text-white/40 text-xs">Non-sélection {sendResult.isSimulation ? '(simulés)' : 'envoyés'}</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${
              sendResult.failures.length > 0
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-white/5 border border-white/10'
            }`}>
              <p className={`font-bold text-xl ${sendResult.failures.length > 0 ? 'text-red-400' : 'text-white/30'}`}>
                {sendResult.failures.length}
              </p>
              <p className="text-white/40 text-xs">Échec(s)</p>
            </div>
          </div>

          {/* Per-candidate detail */}
          <div className="space-y-1">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Détail par candidat</p>
            <div className="divide-y divide-[#2a2545] bg-[#1a1533] rounded-xl overflow-hidden">
              {sendResult.report.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Status icon */}
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    r.status === 'sent' ? 'bg-[#7ec850]/20 text-[#7ec850]'
                      : r.status === 'simulated' ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {r.status === 'sent' ? '✓' : r.status === 'simulated' ? '~' : '✕'}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{r.email}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                    r.type === 'selection'
                      ? 'bg-[#7ec850]/10 text-[#7ec850]'
                      : 'bg-[#e91e8c]/10 text-[#e91e8c]'
                  }`}>
                    {r.type === 'selection' ? 'Sélection' : 'Non-sélection'}
                  </span>

                  {/* Status text */}
                  <span className={`text-[10px] shrink-0 ${
                    r.status === 'sent' ? 'text-[#7ec850]'
                      : r.status === 'simulated' ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {r.status === 'sent' ? 'Envoyé' : r.status === 'simulated' ? 'Simulé' : 'Échec'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Failures detail */}
          {sendResult.failures.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs font-medium mb-2">{sendResult.failures.length} échec(s) détaillé(s) :</p>
              {sendResult.failures.map((f, i) => (
                <p key={i} className="text-red-400/60 text-[10px] break-all">{f}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MP3 des demi-finalistes (semifinal only) ─── */}
      {view === 'semifinal' && semifinalCandidates.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
              Playbacks MP3
            </h3>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              semifinalCandidates.filter((c) => c.mp3_url).length === semifinalCandidates.length
                ? 'bg-[#7ec850]/15 text-[#7ec850]'
                : 'bg-amber-500/15 text-amber-400'
            }`}>
              {semifinalCandidates.filter((c) => c.mp3_url).length}/{semifinalCandidates.length} reçus
            </span>
          </div>

          <div className="divide-y divide-[#2a2545]">
            {semifinalCandidates.map((c) => {
              const name = c.stage_name || `${c.first_name} ${c.last_name}`
              const hasMp3 = !!c.mp3_url
              return (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasMp3 ? 'bg-[#7ec850]' : 'bg-red-500'}`} />

                    {/* Photo */}
                    <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">🎤</div>
                      )}
                    </div>

                    {/* Name & category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      <p className="text-xs text-white/20">{c.category}</p>
                    </div>

                    {/* Actions */}
                    {hasMp3 ? (
                      <a
                        href={c.mp3_url!}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-red-400/60 shrink-0">En attente</span>
                    )}
                  </div>

                  {/* Audio player */}
                  {hasMp3 && (
                    <div className="mt-2 ml-[3.25rem]">
                      <audio controls className="w-full h-8 [&::-webkit-media-controls-panel]:bg-[#1a1533]">
                        <source src={c.mp3_url!} type="audio/mpeg" />
                      </audio>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category podiums (semifinal/final only) */}
      {!activeCategory && view !== 'selection' && (
        <div className="space-y-6 mt-8">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
            Podiums par catégorie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const catRankings = rankedByCategory.get(cat) || []
              const top3 = catRankings.slice(0, 3)

              return (
                <div key={cat} className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
                  <h3 className="font-bold text-sm text-white mb-4">{cat}</h3>
                  {top3.length > 0 ? (
                    <div className="space-y-3">
                      {top3.map((c, i) => {
                        const name = c.stage_name || `${c.first_name} ${c.last_name}`
                        const medal = ['🥇', '🥈', '🥉'][i]
                        return (
                          <div key={c.id} className="flex items-center gap-3">
                            <span className="text-lg">{medal}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{name}</p>
                            </div>
                            <span className="font-bold text-sm text-[#e91e8c] tabular-nums">
                              {c.finalScore}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-white/20 text-xs">Aucun candidat noté.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
