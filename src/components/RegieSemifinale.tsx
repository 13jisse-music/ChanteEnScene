'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import { useRealtimeLineup } from '@/hooks/useRealtimeLineup'
import { useJuryNotifications } from '@/hooks/useJuryNotifications'
import AudioPlayer from '@/components/AudioPlayer'
import AdminPushPanel from '@/components/AdminPushPanel'
import {
  checkinCandidate,
  callToStage,
  openVoting,
  finishPerformance,
  replayCandidate,
  markAbsent,
  resetJuryScores,
  updateSemifinaleStatus,
  getJuryScoreCount,
} from '@/app/admin/demi-finale/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  mp3_url: string | null
  song_title: string | null
  song_artist: string | null
}

interface LineupItemRaw {
  id: string
  candidate_id: string
  position: number
  status: string
  created_at: string
  started_at?: string | null
  ended_at?: string | null
  vote_opened_at?: string | null
  vote_closed_at?: string | null
  candidates: Candidate
}

interface LiveEvent {
  id: string
  event_type: string
  status: string
  current_candidate_id: string | null
  current_category: string | null
  is_voting_open: boolean
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
  juror_id: string
  total_score: number
}

interface Props {
  session: { id: string; name: string; slug: string; config: Record<string, unknown> }
  event: LiveEvent
  lineup: LineupItemRaw[]
  allSemifinalists: Candidate[]
  jurors: Juror[]
  juryScores: JuryScore[]
}

export default function RegieSemifinale({ session, event: initialEvent, lineup: initialLineup, allSemifinalists, jurors, juryScores: initialScores }: Props) {
  const router = useRouter()
  const event = useRealtimeEvent(initialEvent)

  // Normalize lineup for realtime hook — memoize to avoid infinite re-render loop
  const normalizedLineup = useMemo(() =>
    initialLineup.map((l) => ({
      id: l.id,
      live_event_id: event.id,
      candidate_id: l.candidate_id,
      position: l.position,
      status: l.status,
      created_at: l.created_at,
      started_at: l.started_at,
      ended_at: l.ended_at,
      vote_opened_at: l.vote_opened_at,
      vote_closed_at: l.vote_closed_at,
      candidate: l.candidates,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialLineup]
  )
  const lineup = useRealtimeLineup(event.id, normalizedLineup)

  const { candidateJurorMap, getJuryCountForCandidate } = useJuryNotifications({
    sessionId: session.id,
    eventType: 'semifinal',
    jurors,
    candidates: allSemifinalists,
    enabled: event.status === 'live',
  })

  const [loading, setLoading] = useState<string | null>(null)
  const [showCheckinModal, setShowCheckinModal] = useState(false)

  // Timing config
  const recommendedSec = (session.config.performance_recommended_sec as number) || 180
  const voteDurationSec = (session.config.vote_duration_sec as number) || 60

  // Scores helpers (defined early for chrono logic)
  const getScoresForCandidate = (candidateId: string) =>
    initialScores.filter((s) => s.candidate_id === candidateId)
  const getAvgStars = (candidateId: string) => {
    const scores = getScoresForCandidate(candidateId)
    if (scores.length === 0) return null
    return scores.reduce((a, s) => a + s.total_score, 0) / scores.length
  }

  // DB-driven chronos
  const [performanceElapsed, setPerformanceElapsed] = useState(0)
  const [voteElapsed, setVoteElapsed] = useState(0)
  const performingItem = lineup.find((l) => l.status === 'performing')
  const votePhase = !!performingItem?.vote_opened_at && !performingItem?.vote_closed_at

  // Poll jury scores count every 3s when candidate is on stage (server action bypasses RLS)
  const [polledScoreCount, setPolledScoreCount] = useState(0)
  const currentCandidateId = performingItem?.candidate_id || null

  useEffect(() => {
    if (!currentCandidateId) {
      setPolledScoreCount(0)
      return
    }

    let active = true
    const poll = async () => {
      const { count } = await getJuryScoreCount(session.id, currentCandidateId, 'semifinal')
      if (active) setPolledScoreCount(count)
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => { active = false; clearInterval(interval) }
  }, [currentCandidateId, session.id])

  // Detect when all jurors have voted for current candidate
  const initialScoreCount = currentCandidateId ? getScoresForCandidate(currentCandidateId).length : 0
  const realtimeScoreCount = currentCandidateId ? getJuryCountForCandidate(currentCandidateId) : 0
  const juryVotedCount = Math.max(initialScoreCount, realtimeScoreCount, polledScoreCount)
  const allJuryVoted = jurors.length > 0 && juryVotedCount >= jurors.length && votePhase
  const allJuryVotedRef = useRef(false)
  allJuryVotedRef.current = allJuryVoted

  useEffect(() => {
    if (!performingItem?.started_at) {
      setPerformanceElapsed(0)
      setVoteElapsed(0)
      return
    }

    const startedAt = new Date(performingItem.started_at).getTime()
    const endedAt = performingItem.ended_at ? new Date(performingItem.ended_at).getTime() : null

    if (endedAt) {
      // Performance ended — show frozen duration
      setPerformanceElapsed(Math.floor((endedAt - startedAt) / 1000))
    }

    const timer = setInterval(() => {
      if (!endedAt) {
        setPerformanceElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }
      if (performingItem.vote_opened_at && !allJuryVotedRef.current) {
        const voteStart = new Date(performingItem.vote_opened_at).getTime()
        setVoteElapsed(Math.floor((Date.now() - voteStart) / 1000))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [performingItem?.started_at, performingItem?.ended_at, performingItem?.vote_opened_at])

  // Derived data
  const waiting = lineup.filter((l) => l.status === 'pending')
  const performing = lineup.find((l) => l.status === 'performing')
  const completed = lineup.filter((l) => l.status === 'completed')
  const absent = lineup.filter((l) => l.status === 'absent')
  const checkedInIds = new Set(lineup.map((l) => l.candidate_id))
  const notCheckedIn = allSemifinalists.filter((c) => !checkedInIds.has(c.id))

  const currentCandidate = performing?.candidate || null
  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  // Chrono helpers
  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const voteCountdown = voteDurationSec - voteElapsed

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

  async function handleCall(candidateId: string) {
    await handleAction(() => callToStage(event.id, candidateId), `call-${candidateId}`)
  }

  async function handleOpenVoting() {
    await handleAction(() => openVoting(event.id), 'open-voting')
  }

  async function handleFinish() {
    await handleAction(() => finishPerformance(event.id), 'finish')
  }

  async function handleCheckin(candidateId: string) {
    await handleAction(() => checkinCandidate(event.id, candidateId), `checkin-${candidateId}`)
    setShowCheckinModal(false)
  }

  async function handleStart() {
    await handleAction(() => updateSemifinaleStatus(event.id, 'live'), 'start')
  }

  // Star rendering helper
  const renderStars = (avg: number | null, size: 'sm' | 'lg' = 'sm') => {
    if (avg === null) return <span className="text-white/20 text-xs">—</span>
    const px = size === 'lg' ? 'text-lg' : 'text-sm'
    return (
      <span className={`${px} tracking-wide`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= Math.round(avg) ? 'text-[#f5a623]' : 'text-white/15'}>
            ★
          </span>
        ))}
        <span className="text-white/40 text-xs ml-1">{avg.toFixed(1)}</span>
      </span>
    )
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  // ═══ Compact summary when event completed ═══
  if (event.status === 'completed') {
    return (
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
              Regie Demi-finale
            </h1>
            <p className="text-white/40 text-sm">{session.name} — Huis clos</p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] text-sm">
            Terminee
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
            <p className="text-[#7ec850] font-bold text-xl">{completed.length}</p>
            <p className="text-white/40 text-xs">Passes</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-white font-bold text-xl">{lineup.length}</p>
            <p className="text-white/40 text-xs">Total lineup</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-red-400 font-bold text-xl">{absent.length}</p>
            <p className="text-white/40 text-xs">Absents</p>
          </div>
          <div className="p-3 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-center">
            <p className="text-[#f5a623] font-bold text-xl">{jurors.length}</p>
            <p className="text-white/40 text-xs">Jures</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Régie Demi-finale
          </h1>
          <p className="text-white/40 text-sm">{session.name} — Huis clos</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Chrono header */}
          {performing && (
            <div className="flex items-center gap-2">
              <div className="bg-[#161228] border border-[#2a2545] rounded-xl px-4 py-2 tabular-nums text-lg font-mono">
                <span className={performingItem?.ended_at ? 'text-white/50' : getChronoColor(performanceElapsed)}>
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

          {/* Event status badge */}
          {event.status === 'live' ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              EN DIRECT
            </div>
          ) : event.status === 'paused' ? (
            <div className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-sm">
              ⏸ En pause
            </div>
          ) : event.status === 'completed' ? (
            <div className="px-3 py-2 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] text-sm">
              Terminé
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
              En attente
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
          <p className="text-sm text-white tabular-nums">
            {completed.length}<span className="text-white/30">/{lineup.length}</span>
          </p>
        </div>
        <div className="w-full h-3 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${lineup.length > 0 ? (completed.length / lineup.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-[#7ec850]">{completed.length} passés</span>
          <span className="text-[#e91e8c]">{performing ? '1 sur scène' : '0 sur scène'}</span>
          <span className="text-[#3b82f6]">{waiting.length} en attente</span>
          <span className="text-white/20">{notCheckedIn.length} non arrivés</span>
          {absent.length > 0 && <span className="text-red-400/50">{absent.length} absents</span>}
        </div>
      </div>

      {/* Launch button */}
      {event.status === 'pending' && (
        <button
          onClick={handleStart}
          disabled={loading !== null}
          className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
        >
          {loading === 'start' ? 'Lancement...' : 'Ouvrir la demi-finale'}
        </button>
      )}

      {/* Resume button when paused */}
      {event.status === 'paused' && (
        <button
          onClick={() => handleAction(() => updateSemifinaleStatus(event.id, 'live'), 'resume')}
          disabled={loading !== null}
          className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#7ec850] to-[#6ab840] hover:shadow-lg hover:shadow-[#7ec850]/30 transition-all disabled:opacity-50"
        >
          ▶ Reprendre
        </button>
      )}

      {/* ═══ Section 1 : Sur scène ═══ */}
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

          {/* MP3 Player */}
          {currentCandidate.mp3_url && (
            <AudioPlayer
              src={currentCandidate.mp3_url}
              candidateName={`${currentCandidate.song_title} — ${currentCandidate.song_artist}`}
            />
          )}

          {/* Big chrono */}
          <div className="bg-[#0d0b1a] border border-[#2a2545] rounded-2xl p-5 mt-4">
            <div className="flex items-center justify-around gap-6">
              {/* Performance chrono */}
              <div className="text-center flex-1">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Prestation</p>
                <div className={`text-5xl font-mono tabular-nums font-bold ${performingItem?.ended_at ? 'text-white/40' : getChronoColor(performanceElapsed)}`}>
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
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Vote jury</p>
                  {allJuryVoted ? (
                    <>
                      <div className="text-5xl font-mono tabular-nums font-bold text-[#7ec850]">
                        {formatTimer(voteElapsed)}
                      </div>
                      <div className="h-2 rounded-full mt-3 bg-[#7ec850] overflow-hidden">
                        <div className="h-full w-full rounded-full bg-[#7ec850]" />
                      </div>
                      <p className="text-[#7ec850] text-[10px] mt-1 font-bold">
                        Tous les jurés ont voté !
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* All jury voted banner */}
          {allJuryVoted && (
            <div className="mt-4 p-4 rounded-2xl bg-[#7ec850]/10 border-2 border-[#7ec850]/40 text-center animate-pulse">
              <p className="text-[#7ec850] font-bold text-lg">Tous les jurés ont voté !</p>
              <p className="text-[#7ec850]/60 text-xs mt-1">Vous pouvez passer au candidat suivant</p>
            </div>
          )}

          {/* Jury stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className={`rounded-xl p-3 text-center ${allJuryVoted ? 'bg-[#7ec850]/10 border-2 border-[#7ec850]/40' : 'bg-[#161228] border border-[#2a2545]'}`}>
              <p className="text-white/30 text-[10px] uppercase">Votes jury</p>
              <p className={`font-bold text-lg ${allJuryVoted ? 'text-[#7ec850]' : 'text-[#e91e8c]'}`}>
                {juryVotedCount}/{jurors.length}
              </p>
            </div>
            <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
              <p className="text-white/30 text-[10px] uppercase">Étoiles</p>
              <div className="mt-1">{renderStars(getAvgStars(currentCandidate.id), 'lg')}</div>
            </div>
            <div className={`bg-[#161228] border rounded-xl p-3 text-center ${currentCandidateId && getJuryCountForCandidate(currentCandidateId) >= jurors.length ? 'border-[#7ec850]/40' : 'border-[#2a2545]'}`}>
              <p className="text-white/30 text-[10px] uppercase">Jury</p>
              <p className={`font-bold text-lg ${currentCandidateId && getJuryCountForCandidate(currentCandidateId) >= jurors.length ? 'text-[#7ec850]' : 'text-[#e91e8c]'}`}>
                {currentCandidateId ? getJuryCountForCandidate(currentCandidateId) : 0}<span className="text-white/30 text-sm">/{jurors.length}</span>
              </p>
            </div>
          </div>

          {/* Action buttons — depends on phase */}
          <div className="flex flex-wrap gap-2 mt-4">
            {!votePhase ? (
              <>
                {/* Phase 1: Performing — main action is to open voting */}
                <button
                  onClick={handleOpenVoting}
                  disabled={loading !== null}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[#7ec850] to-[#6ab840] hover:shadow-lg hover:shadow-[#7ec850]/30 transition-all disabled:opacity-50"
                >
                  {loading === 'open-voting' ? 'Ouverture...' : '🗳 Fin chant / Ouvrir votes'}
                </button>
              </>
            ) : (
              <>
                {/* Phase 2: Voting — main action is to close and move on */}
                <button
                  onClick={handleFinish}
                  disabled={loading !== null}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
                >
                  {loading === 'finish' ? 'Passage...' : 'Fermer votes / Suivant →'}
                </button>
              </>
            )}
            <button
              onClick={() => handleAction(() => updateSemifinaleStatus(event.id, 'paused'), 'pause')}
              disabled={loading !== null}
              className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
            >
              ⏸ Pause
            </button>
            <button
              onClick={() => handleAction(() => markAbsent(event.id, currentCandidate.id), 'absent')}
              disabled={loading !== null}
              className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              🚫 Absent
            </button>
            <button
              onClick={() => handleAction(() => replayCandidate(event.id, currentCandidate.id), 'replay')}
              disabled={loading !== null}
              className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              🔄 Rejouer
            </button>
            <button
              onClick={() => {
                if (confirm('Réinitialiser les notes jury pour ce candidat ?')) {
                  handleAction(() => resetJuryScores(session.id, currentCandidate.id, 'semifinal'), 'reset')
                }
              }}
              disabled={loading !== null}
              className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50"
            >
              🗑 Reset notes
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
          eventType="semifinal"
        />
      )}

      {/* No candidate on stage message */}
      {!performing && event.status === 'live' && completed.length > 0 && waiting.length === 0 && notCheckedIn.length === 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/40 text-lg mb-4">Tous les candidats sont passés !</p>
          <button
            onClick={() => {
              if (confirm('Terminer la demi-finale ?\n\nCette action passera l\'événement en statut « Terminé » et affichera la section de sélection des finalistes.')) {
                handleAction(() => updateSemifinaleStatus(event.id, 'completed'), 'complete')
              }
            }}
            disabled={loading !== null}
            className="px-6 py-3 rounded-xl bg-[#7ec850] text-white font-bold hover:bg-[#6ab840] transition-colors"
          >
            {loading === 'complete' ? 'Terminaison...' : 'Terminer la demi-finale'}
          </button>
        </div>
      )}

      {/* ═══ Section 2 : En attente ═══ */}
      {(event.status === 'live' || event.status === 'paused') && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
              En attente ({waiting.length})
            </h3>
            <button
              onClick={() => setShowCheckinModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] text-xs font-medium hover:bg-[#7ec850]/20 transition-colors"
            >
              + Ajouter candidat
            </button>
          </div>

          {waiting.length > 0 ? (
            <div className="divide-y divide-[#2a2545] max-h-[40vh] overflow-y-auto">
              {waiting.map((item) => {
                const c = item.candidate
                if (!c) return null
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{displayName(c)}</p>
                      <p className="text-[10px] text-white/30">{c.category} — {c.song_title}</p>
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0">{formatTime(item.created_at)}</span>
                    {c.mp3_url && <span className="text-white/20 text-xs shrink-0">♪</span>}
                    <button
                      onClick={() => handleCall(item.candidate_id)}
                      disabled={loading !== null || !!performing}
                      className="px-3 py-1.5 rounded-lg bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c] text-xs font-medium hover:bg-[#e91e8c]/25 transition-colors disabled:opacity-30 shrink-0"
                    >
                      Appeler
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-white/20 text-sm">Aucun candidat en attente.</p>
              <p className="text-white/10 text-xs mt-1">Les candidats apparaissent ici quand ils font leur check-in.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Section 3 : Passés ═══ */}
      {completed.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2545]">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
              Passés ({completed.length})
            </h3>
          </div>
          <div className="divide-y divide-[#2a2545] max-h-[40vh] overflow-y-auto">
            {completed.map((item) => {
              const c = item.candidate
              if (!c) return null
              const avg = getAvgStars(item.candidate_id)
              const scoreCount = getScoresForCandidate(item.candidate_id).length
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 opacity-70">
                  <span className="text-[#7ec850] text-xs shrink-0">✓</span>
                  <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{displayName(c)}</p>
                    <p className="text-[10px] text-white/20">{c.category}</p>
                  </div>
                  <div className="shrink-0">{renderStars(avg)}</div>
                  <span className="text-[10px] text-white/20 shrink-0">{scoreCount}/{jurors.length}</span>
                  {event.status === 'live' && (
                    <button
                      onClick={() => handleAction(() => replayCandidate(event.id, item.candidate_id), `replay-${item.candidate_id}`)}
                      disabled={loading !== null || !!performing}
                      className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-30 shrink-0"
                    >
                      Rejouer
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Admin check-in modal ═══ */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCheckinModal(false)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-lg mb-4">
              Check-in manuel
            </h3>
            {notCheckedIn.length === 0 ? (
              <p className="text-white/40 text-sm">Tous les demi-finalistes sont enregistrés.</p>
            ) : (
              <div className="space-y-2">
                {notCheckedIn.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCheckin(c.id)}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-[#7ec850]/25 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{displayName(c)}</p>
                      <p className="text-xs text-white/30">{c.category}</p>
                    </div>
                    <span className="text-[#7ec850] text-xs shrink-0">Check-in →</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowCheckinModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-white/5 text-white/40 text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
