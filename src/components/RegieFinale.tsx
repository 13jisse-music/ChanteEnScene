'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import { useRealtimeLiveVotes } from '@/hooks/useRealtimeLiveVotes'
import { useJuryNotifications } from '@/hooks/useJuryNotifications'
import ClassementPanel from '@/components/ClassementPanel'
import AdminPushPanel from '@/components/AdminPushPanel'
import {
  advanceToNext,
  markAbsent,
  resetJuryScores,
  reorderLineupLive,
  addReplacementCandidate,
  setReplay,
  revealWinner,
  resetWinnerReveal,
  updateScoringWeights,
} from '@/app/admin/finale/actions'
import {
  updateEventStatus,
  setCurrentCandidate,
  setCurrentCategory,
  toggleVoting,
  callToStage,
  endPerformance,
} from '@/app/admin/events/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  mp3_url: string | null
  song_title: string
  song_artist: string
  likes_count?: number
}

interface LineupItem {
  id: string
  candidate_id: string
  position: number
  status: string
  started_at?: string | null
  ended_at?: string | null
  vote_opened_at?: string | null
  vote_closed_at?: string | null
  candidates: Candidate
}

interface AvailableCandidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
}

interface LiveEvent {
  id: string
  event_type: string
  status: string
  current_candidate_id: string | null
  current_category: string | null
  is_voting_open: boolean
  winner_candidate_id?: string | null
  winner_revealed_at?: string | null
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
}

interface JuryScore {
  candidate_id: string
  total_score: number
  juror_id: string
}

interface Props {
  session: { id: string; name: string; slug: string; config: Record<string, unknown> }
  event: LiveEvent
  lineup: LineupItem[]
  availableCandidates: AvailableCandidate[]
  jurors: Juror[]
  juryScores: JuryScore[]
  liveVotes: { candidate_id: string }[]
  config: {
    jury_weight_percent?: number
    public_weight_percent?: number
    social_weight_percent?: number
    jury_criteria?: { name: string; max_score: number }[]
    age_categories?: { name: string }[]
  }
}

export default function RegieFinale({ session, event: initialEvent, lineup: initialLineup, availableCandidates, jurors, juryScores, liveVotes: initialLiveVotes, config }: Props) {
  const router = useRouter()
  const event = useRealtimeEvent(initialEvent)
  const { getVotesFor, totalVotes } = useRealtimeLiveVotes(initialEvent.id)
  const { getJuryCountForCandidate, getJuryAvgForCandidate } = useJuryNotifications({
    sessionId: session.id,
    eventType: 'final',
    jurors,
    candidates: initialLineup.map((l) => l.candidates),
    enabled: event.status === 'live' || event.status === 'paused',
  })

  const [lineup, setLineup] = useState(initialLineup)

  // Keep lineup in sync with server data after router.refresh()
  useEffect(() => {
    setLineup(initialLineup)
  }, [initialLineup])

  const [loading, setLoading] = useState<string | null>(null)
  const [showReplacementModal, setShowReplacementModal] = useState(false)
  const [showConfirmReveal, setShowConfirmReveal] = useState(false)
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null)

  // Timing config
  const recommendedSec = (config as Record<string, unknown>).performance_recommended_sec as number || 180
  const voteDurationSec = (config as Record<string, unknown>).vote_duration_sec as number || 60

  // DB-driven chronos
  const [performanceElapsed, setPerformanceElapsed] = useState(0)
  const [voteElapsed, setVoteElapsed] = useState(0)

  // Editable scoring weights
  const [localJuryW, setLocalJuryW] = useState(config.jury_weight_percent ?? 40)
  const [localPublicW, setLocalPublicW] = useState(config.public_weight_percent ?? 40)
  const [localSocialW, setLocalSocialW] = useState(config.social_weight_percent ?? 20)
  const [weightsSaving, setWeightsSaving] = useState(false)

  const sum = localJuryW + localPublicW + localSocialW
  const juryWeight = sum > 0 ? localJuryW / sum : 0.4
  const publicWeight = sum > 0 ? localPublicW / sum : 0.4
  const socialWeight = sum > 0 ? localSocialW / sum : 0.2
  const maxCriteriaScore = (config.jury_criteria || []).length * 5

  async function handleSaveWeights() {
    setWeightsSaving(true)
    try {
      const result = await updateScoringWeights(session.id, localJuryW, localPublicW, localSocialW)
      if (result?.error) alert(result.error)
    } finally {
      setWeightsSaving(false)
    }
  }

  // Categories from lineup — ordered Enfant → Ado → Adulte
  const CATEGORY_ORDER = ['Enfant', 'Ado', 'Adulte']
  const categories = useMemo(() => {
    const cats = [...new Set(lineup.map((l) => l.candidates.category))]
    return cats.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a)
      const ib = CATEGORY_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [lineup])

  // Local state for instant tab switching
  const [localCategory, setLocalCategory] = useState<string | null>(null)
  const activeCategory = localCategory || event.current_category || categories[0] || null

  // Sync local state when event.current_category changes (via Realtime)
  useEffect(() => {
    if (event.current_category) setLocalCategory(event.current_category)
  }, [event.current_category])
  const categoryLineup = lineup.filter((l) => l.candidates.category === activeCategory)
  const currentLineupItem = categoryLineup.find((l) => l.candidate_id === event.current_candidate_id)
  const currentCandidate = currentLineupItem?.candidates
  const completedInCategory = categoryLineup.filter((l) => l.status === 'completed').length
  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  // DB-driven chrono effect
  useEffect(() => {
    if (!currentLineupItem?.started_at) {
      setPerformanceElapsed(0)
      setVoteElapsed(0)
      return
    }

    const startedAt = new Date(currentLineupItem.started_at).getTime()
    const endedAt = currentLineupItem.ended_at ? new Date(currentLineupItem.ended_at).getTime() : null

    if (endedAt) {
      setPerformanceElapsed(Math.floor((endedAt - startedAt) / 1000))
    }

    const timer = setInterval(() => {
      if (!endedAt) {
        setPerformanceElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }
      if (currentLineupItem.vote_opened_at) {
        const voteStart = new Date(currentLineupItem.vote_opened_at).getTime()
        setVoteElapsed(Math.floor((Date.now() - voteStart) / 1000))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [currentLineupItem?.started_at, currentLineupItem?.ended_at, currentLineupItem?.vote_opened_at])

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const voteCountdown = voteDurationSec - voteElapsed
  const votePhase = !!currentLineupItem?.vote_opened_at && !currentLineupItem?.vote_closed_at

  const getChronoColor = (elapsed: number) => {
    if (elapsed >= recommendedSec) return 'text-red-500'
    if (elapsed >= recommendedSec * 0.8) return 'text-[#f59e0b]'
    return 'text-[#7ec850]'
  }

  const getChronoBg = (elapsed: number) => {
    if (elapsed >= recommendedSec) return 'bg-red-500'
    if (elapsed >= recommendedSec * 0.8) return 'bg-[#f59e0b]'
    return 'bg-[#7ec850]'
  }

  // Rankings for current category
  const categoryRankings = useMemo(() => {
    const candidatesInCategory = categoryLineup.map((l) => l.candidates)
    const maxVotes = Math.max(1, ...candidatesInCategory.map((c) => getVotesFor(c.id)))
    const maxLikes = Math.max(1, ...candidatesInCategory.map((c) => c.likes_count || 0))

    return candidatesInCategory.map((c) => {
      const juryAvg = getJuryAvgForCandidate(c.id)
      const juryNormalized = maxCriteriaScore > 0 ? (juryAvg / maxCriteriaScore) * 100 : 0
      const publicVotes = getVotesFor(c.id)
      const publicNormalized = (publicVotes / maxVotes) * 100
      const socialVotes = c.likes_count || 0
      const socialNormalized = (socialVotes / maxLikes) * 100
      const totalScore = juryNormalized * juryWeight + publicNormalized * publicWeight + socialNormalized * socialWeight

      return {
        candidateId: c.id,
        name: displayName(c),
        photoUrl: c.photo_url,
        category: c.category,
        juryScore: juryAvg,
        juryNormalized,
        publicVotes,
        publicNormalized,
        socialVotes,
        socialNormalized,
        totalScore,
      }
    }).sort((a, b) => b.totalScore - a.totalScore)
  }, [categoryLineup, getJuryAvgForCandidate, getVotesFor, juryWeight, publicWeight, socialWeight, maxCriteriaScore])

  // Actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleAction(action: () => Promise<any>, id: string) {
    setLoading(id)
    try {
      const result = await action()
      if (result?.error) alert(result.error)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleAdvance() {
    await handleAction(() => advanceToNext(event.id), 'advance')
  }

  async function handleStartCategory(category: string) {
    setLocalCategory(category)
    await setCurrentCategory(event.id, category)
    if (event.status !== 'live') {
      await updateEventStatus(event.id, 'live')
    }
    const first = lineup.find((l) => l.candidates.category === category && l.status === 'pending')
    if (first) {
      await setCurrentCandidate(event.id, first.candidate_id)
    }
    router.refresh()
  }

  async function handleToggleVoting() {
    await handleAction(() => toggleVoting(event.id, !event.is_voting_open), 'voting')
  }

  async function handleRevealWinner() {
    if (!selectedWinnerId) return
    const eventId = event.id
    await handleAction(() => revealWinner(eventId, selectedWinnerId), 'reveal')
    setShowConfirmReveal(false)
    setSelectedWinnerId(null)

    // Auto-advance to next uncompleted category
    const nextCategory = categories.find((cat) => {
      if (cat === activeCategory) return false
      const catItems = lineup.filter((l) => l.candidates.category === cat)
      return !catItems.every((l) => l.status === 'completed' || l.status === 'absent')
    })
    if (nextCategory) {
      await setCurrentCategory(eventId, nextCategory)
      router.refresh()
    }

    // Clean up winner fields after animation has played
    // Countdown: 5×2s=10s + confetti pause 3s + WinnerReveal display ~5s = ~18s
    setTimeout(() => {
      resetWinnerReveal(eventId)
    }, 20000)
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return
    const catItems = [...categoryLineup]
    const temp = catItems[index]
    catItems[index] = catItems[index - 1]
    catItems[index - 1] = temp
    // Rebuild full lineup preserving other categories
    const otherItems = lineup.filter((l) => l.candidates.category !== activeCategory)
    const newLineup = [...otherItems, ...catItems]
    setLineup(newLineup)
    await reorderLineupLive(event.id, newLineup.map((l) => l.candidate_id))
  }

  async function handleMoveDown(index: number) {
    if (index >= categoryLineup.length - 1) return
    const catItems = [...categoryLineup]
    const temp = catItems[index]
    catItems[index] = catItems[index + 1]
    catItems[index + 1] = temp
    const otherItems = lineup.filter((l) => l.candidates.category !== activeCategory)
    const newLineup = [...otherItems, ...catItems]
    setLineup(newLineup)
    await reorderLineupLive(event.id, newLineup.map((l) => l.candidate_id))
  }

  async function handleCallToStage(candidateId: string, lineupId: string) {
    await handleAction(() => callToStage(event.id, candidateId, lineupId), 'call')
  }

  async function handleEndPerformance(lineupId: string) {
    await handleAction(() => endPerformance(event.id, lineupId), 'end')
  }

  // First pending candidate in current category
  const firstPending = categoryLineup.find((l) => l.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Régie Grande Finale
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {currentCandidate && (
            <div className="flex items-center gap-2">
              <div className="bg-[#161228] border border-[#2a2545] rounded-xl px-4 py-2 tabular-nums text-lg font-mono">
                <span className={currentLineupItem?.ended_at ? 'text-white/50' : getChronoColor(performanceElapsed)}>
                  {formatTimer(performanceElapsed)}
                </span>
              </div>
              {votePhase && (
                <div className="bg-[#161228] border border-[#2a2545] rounded-xl px-4 py-2 tabular-nums text-lg font-mono">
                  <span className={voteCountdown <= 10 ? 'text-red-500 animate-pulse' : voteCountdown <= 30 ? 'text-[#f59e0b]' : 'text-[#7ec850]'}>
                    {formatTimer(Math.max(0, voteCountdown))}
                  </span>
                  <span className="text-white/20 text-xs ml-1">vote</span>
                </div>
              )}
            </div>
          )}
          {event.status === 'live' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              EN DIRECT
            </div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {categories.map((cat, idx) => {
          const isActive = activeCategory === cat
          const catLineup = lineup.filter((l) => l.candidates.category === cat)
          const isDone = catLineup.every((l) => l.status === 'completed' || l.status === 'absent')
          const isLocked = isDone && !isActive
          return (
            <button
              key={cat}
              onClick={() => !isLocked && handleStartCategory(cat)}
              disabled={isLocked}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                  : isLocked
                    ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850]/50 cursor-not-allowed'
                    : isDone
                      ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850]'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {isDone && '🔒 '}
              {cat}
              <span className="text-xs opacity-50">({catLineup.length})</span>
            </button>
          )
        })}
      </div>

      {/* Progress bar for current category */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">{activeCategory}</p>
          <p className="text-sm text-white tabular-nums">{completedInCategory}/{categoryLineup.length}</p>
        </div>
        <div className="w-full h-3 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${categoryLineup.length > 0 ? (completedInCategory / categoryLineup.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Main content: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lineup */}
        <div className="lg:col-span-1">
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2545]">
              <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
                {activeCategory}
              </h3>
            </div>
            <div className="divide-y divide-[#2a2545] max-h-[50vh] overflow-y-auto">
              {categoryLineup.map((item, idx) => {
                const c = item.candidates
                const isCurrent = event.current_candidate_id === item.candidate_id
                const canMove = item.status === 'pending'
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-3 ${
                      isCurrent ? 'bg-[#e91e8c]/10 border-l-2 border-l-[#e91e8c]' :
                      item.status === 'completed' ? 'opacity-40' :
                      item.status === 'absent' ? 'opacity-20' : ''
                    }`}
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-[#6b5d85] text-xs shrink-0">
                      {item.position}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isCurrent ? 'text-[#e91e8c] font-bold' : 'text-white/70'}`}>
                        {displayName(c)}
                      </p>
                    </div>

                    {/* Votes count */}
                    <span className="text-white/20 text-[10px] tabular-nums">
                      {getVotesFor(item.candidate_id)} ♥
                    </span>

                    {/* Action buttons */}
                    {item.status === 'pending' && !event.current_candidate_id && (
                      <button
                        onClick={() => handleCallToStage(item.candidate_id, item.id)}
                        disabled={loading !== null}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/25 transition-colors disabled:opacity-50"
                      >
                        Appeler
                      </button>
                    )}
                    {item.status === 'pending' && event.current_candidate_id && !isCurrent && (
                      <span className="text-white/10 text-xs">—</span>
                    )}
                    {isCurrent && (
                      <button
                        onClick={() => handleEndPerformance(item.id)}
                        disabled={loading !== null}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        Fin
                      </button>
                    )}
                    {item.status === 'completed' && <span className="text-[#7ec850] text-xs">✓</span>}
                    {item.status === 'absent' && <span className="text-red-400 text-xs">✗</span>}

                    {canMove && (
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleMoveUp(idx)} className="text-white/20 hover:text-white/60 text-[10px]" disabled={idx === 0}>▲</button>
                        <button onClick={() => handleMoveDown(idx)} className="text-white/20 hover:text-white/60 text-[10px]" disabled={idx === categoryLineup.length - 1}>▼</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Controls + Classement */}
        <div className="lg:col-span-2 space-y-4">
          {/* Call to stage CTA — when no one is on stage */}
          {event.status === 'live' && !currentCandidate && firstPending && (
            <button
              onClick={() => handleCallToStage(firstPending.candidate_id, firstPending.id)}
              disabled={loading !== null}
              className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#7ec850] to-[#6ab840] hover:shadow-lg hover:shadow-[#7ec850]/30 transition-all disabled:opacity-50 animate-pulse"
            >
              🎤 Appeler {displayName(firstPending.candidates)} sur scene
            </button>
          )}

          {/* Current candidate */}
          {currentCandidate && (
            <div className="bg-[#1a1232] border-2 border-[#e91e8c]/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-[#e91e8c] text-xs uppercase tracking-widest font-bold">Sur scène</p>
              </div>
              <div className="flex items-center gap-5 mb-4">
                <div className="w-20 h-20 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border-2 border-[#e91e8c]/40">
                  {currentCandidate.photo_url ? (
                    <img src={currentCandidate.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-white/10">🎤</div>
                  )}
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
                    {displayName(currentCandidate)}
                  </h2>
                  <p className="text-white/40 text-sm">
                    🎵 {currentCandidate.song_title} — {currentCandidate.song_artist}
                  </p>
                  <span className="text-xs text-[#e91e8c]">{currentCandidate.category}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`bg-[#161228] border rounded-xl p-3 text-center ${getJuryCountForCandidate(currentCandidate.id) >= jurors.length ? 'border-[#7ec850]/40' : 'border-[#2a2545]'}`}>
                  <p className="text-white/30 text-[10px] uppercase">Notes jury</p>
                  <p className={`font-bold text-lg ${getJuryCountForCandidate(currentCandidate.id) >= jurors.length ? 'text-[#7ec850]' : 'text-[#e91e8c]'}`}>
                    {getJuryCountForCandidate(currentCandidate.id)}<span className="text-white/30 text-sm">/{jurors.length}</span>
                  </p>
                </div>
                <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
                  <p className="text-white/30 text-[10px] uppercase">Votes public</p>
                  <p className="font-bold text-lg text-[#7ec850]">{getVotesFor(currentCandidate.id)}</p>
                </div>
                <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
                  <p className="text-white/30 text-[10px] uppercase">Total votes</p>
                  <p className="font-bold text-lg text-[#f5a623]">{totalVotes}</p>
                </div>
              </div>

              {/* Big chrono */}
              <div className="bg-[#0d0b1a] border border-[#2a2545] rounded-2xl p-5 mt-4">
                <div className="flex items-center justify-around gap-6">
                  {/* Performance chrono */}
                  <div className="text-center flex-1">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Prestation</p>
                    <div className={`text-5xl font-mono tabular-nums font-bold ${currentLineupItem?.ended_at ? 'text-white/40' : getChronoColor(performanceElapsed)}`}>
                      {formatTimer(performanceElapsed)}
                    </div>
                    <div className="h-2 rounded-full mt-3 bg-[#2a2545] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${getChronoBg(performanceElapsed)}`}
                        style={{ width: `${Math.min(100, (performanceElapsed / recommendedSec) * 100)}%` }}
                      />
                    </div>
                    <p className="text-white/20 text-[10px] mt-1">
                      conseillé : {formatTimer(recommendedSec)}
                    </p>
                  </div>

                  {/* Vote countdown */}
                  {votePhase && (
                    <div className="text-center flex-1">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Vote public</p>
                      <div className={`text-5xl font-mono tabular-nums font-bold ${voteCountdown <= 10 ? 'text-red-500 animate-pulse' : voteCountdown <= 30 ? 'text-[#f59e0b]' : 'text-[#7ec850]'}`}>
                        {voteCountdown > 0 ? formatTimer(voteCountdown) : '+' + formatTimer(Math.abs(voteCountdown))}
                      </div>
                      <div className="h-2 rounded-full mt-3 bg-[#2a2545] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${voteCountdown <= 10 ? 'bg-red-500' : 'bg-[#7ec850]'}`}
                          style={{ width: `${Math.max(0, (voteCountdown / voteDurationSec) * 100)}%` }}
                        />
                      </div>
                      <p className="text-white/20 text-[10px] mt-1">
                        durée vote : {formatTimer(voteDurationSec)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Phase-based controls */}
          {event.status === 'live' && currentLineupItem && !votePhase && !event.is_voting_open && (
            <button
              onClick={handleToggleVoting}
              disabled={loading !== null}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#7ec850] to-[#6ab840] hover:shadow-lg hover:shadow-[#7ec850]/30 transition-all disabled:opacity-50"
            >
              {loading === 'voting' ? 'Ouverture...' : '🗳 Fin chant / Ouvrir les votes public'}
            </button>
          )}

          {event.status === 'live' && votePhase && (
            <button
              onClick={() => handleEndPerformance(currentLineupItem!.id)}
              disabled={loading !== null}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
            >
              {loading === 'end' ? 'Fermeture...' : 'Fermer votes / Suivant →'}
            </button>
          )}

          {/* Incident bar */}
          {event.status === 'live' && (
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Imprévus</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAction(() => updateEventStatus(event.id, 'paused'), 'pause')}
                  disabled={loading !== null}
                  className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                >
                  ⏸ Pause
                </button>
                {currentLineupItem && (
                  <>
                    <button
                      onClick={() => handleAction(() => markAbsent(event.id, currentLineupItem.id), 'absent')}
                      disabled={loading !== null}
                      className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      🚫 Absent
                    </button>
                    <button
                      onClick={() => handleAction(() => setReplay(event.id, currentLineupItem.id), 'replay')}
                      disabled={loading !== null}
                      className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                    >
                      🔄 Rejouer
                    </button>
                  </>
                )}
                {currentCandidate && (
                  <button
                    onClick={() => { if (confirm('Réinitialiser les notes jury ?')) handleAction(() => resetJuryScores(session.id, currentCandidate.id, 'final'), 'reset') }}
                    disabled={loading !== null}
                    className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                  >
                    🗑 Reset notes
                  </button>
                )}
                <button
                  onClick={() => setShowReplacementModal(true)}
                  disabled={loading !== null}
                  className="px-3 py-2 rounded-lg bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] text-xs font-medium hover:bg-[#7ec850]/20 transition-colors disabled:opacity-50"
                >
                  ➕ Remplaçant
                </button>
              </div>
            </div>
          )}

          {/* Push notifications panel */}
          {event.status === 'live' && (
            <AdminPushPanel
              sessionId={session.id}
              slug={session.slug}
              currentCandidateName={currentCandidate ? displayName(currentCandidate) : null}
              eventType="final"
            />
          )}

          {/* Resume when paused */}
          {event.status === 'paused' && (
            <button
              onClick={() => handleAction(() => updateEventStatus(event.id, 'live'), 'resume')}
              disabled={loading !== null}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#7ec850] to-[#6ab840] hover:shadow-lg hover:shadow-[#7ec850]/30 transition-all disabled:opacity-50"
            >
              ▶ Reprendre
            </button>
          )}

          {/* Weight sliders */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Ratio de scoring</p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[80px]">
                <label className="text-[#e91e8c] text-xs font-medium block mb-1">Jury</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={localJuryW}
                    onChange={(e) => setLocalJuryW(Number(e.target.value))}
                    className="flex-1 accent-[#e91e8c]"
                  />
                  <span className="text-white text-sm tabular-nums w-10 text-right">{localJuryW}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-[80px]">
                <label className="text-[#7ec850] text-xs font-medium block mb-1">Public</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={localPublicW}
                    onChange={(e) => setLocalPublicW(Number(e.target.value))}
                    className="flex-1 accent-[#7ec850]"
                  />
                  <span className="text-white text-sm tabular-nums w-10 text-right">{localPublicW}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-[80px]">
                <label className="text-[#3b82f6] text-xs font-medium block mb-1">Réseaux</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={localSocialW}
                    onChange={(e) => setLocalSocialW(Number(e.target.value))}
                    className="flex-1 accent-[#3b82f6]"
                  />
                  <span className="text-white text-sm tabular-nums w-10 text-right">{localSocialW}%</span>
                </div>
              </div>
              <button
                onClick={handleSaveWeights}
                disabled={weightsSaving}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50 shrink-0"
              >
                {weightsSaving ? '...' : 'Sauvegarder'}
              </button>
            </div>
            {sum !== 100 && (
              <p className="text-yellow-400/60 text-[10px] mt-2">Total: {sum}% — les poids seront normalisés automatiquement</p>
            )}
          </div>

          {/* Classement */}
          <ClassementPanel
            rankings={categoryRankings}
            juryWeight={Math.round(juryWeight * 100)}
            publicWeight={Math.round(publicWeight * 100)}
            socialWeight={Math.round(socialWeight * 100)}
          />

          {/* Validate + Reveal buttons */}
          {completedInCategory === categoryLineup.length && categoryLineup.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedWinnerId(categoryRankings[0]?.candidateId || null)
                  setShowConfirmReveal(true)
                }}
                disabled={loading !== null}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#f5a623] to-[#e8732a] hover:shadow-lg hover:shadow-[#f5a623]/30 transition-all disabled:opacity-50"
              >
                🏆 Révéler le vainqueur
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm reveal modal — ranked candidate selection */}
      {showConfirmReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowConfirmReveal(false)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-lg mb-1 text-center">
              Choisir le vainqueur
            </h3>
            <p className="text-white/40 text-xs text-center mb-4">{activeCategory} — classement du meilleur au moins bon</p>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {categoryRankings.map((r, idx) => {
                const isSelected = selectedWinnerId === r.candidateId
                return (
                  <button
                    key={r.candidateId}
                    onClick={() => setSelectedWinnerId(r.candidateId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-[#f5a623]/15 border-[#f5a623]/50 shadow-md shadow-[#f5a623]/10'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Rank */}
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-[#f5a623]/20 text-[#f5a623]' :
                      idx === 1 ? 'bg-white/10 text-white/60' :
                      idx === 2 ? 'bg-orange-900/20 text-orange-400/60' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Photo */}
                    <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-lg">🎤</div>
                      )}
                    </div>

                    {/* Name + score */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#f5a623]' : 'text-white/80'}`}>
                        {r.name}
                      </p>
                      <p className="text-[10px] text-white/30">
                        Score: {r.totalScore.toFixed(1)} — Jury {r.juryNormalized.toFixed(0)} / Public {r.publicNormalized.toFixed(0)} / Social {r.socialNormalized.toFixed(0)}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-[#f5a623] bg-[#f5a623]' : 'border-white/20'
                    }`}>
                      {isSelected && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmReveal(false); setSelectedWinnerId(null) }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/40 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleRevealWinner}
                disabled={loading !== null || !selectedWinnerId}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f5a623] to-[#e8732a] text-white font-bold text-sm disabled:opacity-50"
              >
                {loading === 'reveal' ? 'Révélation...' : '🏆 Révéler le gagnant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replacement modal */}
      {showReplacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowReplacementModal(false)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-lg mb-4">
              Ajouter un remplaçant
            </h3>
            {availableCandidates.length === 0 ? (
              <p className="text-white/40 text-sm">Aucun candidat disponible.</p>
            ) : (
              <div className="space-y-2">
                {availableCandidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={async () => {
                      await handleAction(() => addReplacementCandidate(event.id, c.id, lineup.length + 1), 'replace')
                      setShowReplacementModal(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-[#e91e8c]/25 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-white">{c.stage_name || `${c.first_name} ${c.last_name}`}</p>
                      <p className="text-xs text-white/30">{c.category}</p>
                    </div>
                    <span className="text-[#7ec850] text-xs">Ajouter</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowReplacementModal(false)} className="mt-4 w-full py-2 rounded-xl bg-white/5 text-white/40 text-sm">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
