'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeJuryPush } from '@/hooks/useRealtimeJuryPush'
import { useWinnerReveal } from '@/hooks/useWinnerReveal'
import JuryWinnerBanner from '@/components/JuryWinnerBanner'

interface Criterion {
  name: string
  max_score: number
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  video_url: string | null
  mp3_url: string | null
  song_title: string
  song_artist: string
}

interface ExistingScore {
  id: string
  candidate_id: string
  event_type: string
  scores: Record<string, number | string>
  total_score: number
  comment: string | null
  viewed_at?: string | null
  watch_seconds?: number
}

interface Juror {
  id: string
  role: string
  session_id: string
}

interface Session {
  id: string
  name: string
}

interface Props {
  juror: Juror
  session: Session
  candidates: Candidate[]
  existingScores: ExistingScore[]
  criteria: Criterion[]
  liveEventId?: string | null
}

type Decision = 'oui' | 'peut-etre' | 'non'

const DECISION_CONFIG: Record<Decision, { label: string; emoji: string; color: string; score: number }> = {
  oui: { label: 'Oui', emoji: '👍', color: '#7ec850', score: 2 },
  'peut-etre': { label: 'Peut-être', emoji: '🤔', color: '#f59e0b', score: 1 },
  non: { label: 'Non', emoji: '👎', color: '#ef4444', score: 0 },
}

const SCORE_LABELS = [
  { value: 1, label: 'Raté',  emoji: '😬', color: '#ef4444' },
  { value: 2, label: 'Moyen', emoji: '😐', color: '#f59e0b' },
  { value: 3, label: 'Bien',  emoji: '🙂', color: '#3b82f6' },
  { value: 4, label: 'Super', emoji: '😃', color: '#7ec850' },
  { value: 5, label: 'Top',   emoji: '🤩', color: '#e91e8c' },
] as const

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

// ─── TikTok-style feed for online jurors ───
function TikTokFeed({
  juror,
  session,
  candidates,
  existingScores,
}: {
  juror: Juror
  session: Session
  candidates: Candidate[]
  existingScores: ExistingScore[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(existingScores.map((s) => s.candidate_id))
  )
  const [showComment, setShowComment] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    existingScores.forEach((s) => {
      if (s.comment) initial[s.candidate_id] = s.comment
    })
    return initial
  })
  const [voteAnimation, setVoteAnimation] = useState<Decision | null>(null)
  const [showSummary, setShowSummary] = useState(() => {
    // Show summary if all candidates already voted
    const alreadyVoted = new Set(existingScores.map((s) => s.candidate_id))
    return candidates.length > 0 && candidates.every((c) => alreadyVoted.has(c.id))
  })
  const [viewMode, setViewMode] = useState<'feed' | 'votes'>('feed')
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const touchDeltaY = useRef(0)
  const isScrolling = useRef(false)

  // Sort candidates: un-voted first, then already voted
  const sortedCandidates = useMemo(() => {
    const voted = new Set(existingScores.map((s) => s.candidate_id))
    const unvoted = candidates.filter((c) => !voted.has(c.id))
    const alreadyVoted = candidates.filter((c) => voted.has(c.id))
    return [...unvoted, ...alreadyVoted]
  }, [candidates, existingScores])

  const unvotedCount = useMemo(() => {
    const voted = new Set(existingScores.map((s) => s.candidate_id))
    return candidates.filter((c) => !voted.has(c.id)).length
  }, [candidates, existingScores])

  // Video watch tracking
  const slideStartTime = useRef<number>(Date.now())
  const accumulatedSeconds = useRef<Map<string, number>>(new Map())
  const slideViewedAt = useRef<Map<string, string>>(new Map())

  const eventType = 'online'
  const candidate = sortedCandidates[currentIndex]
  const displayName = candidate?.stage_name || `${candidate?.first_name} ${candidate?.last_name}`

  function getExistingDecision(candidateId: string): Decision | null {
    const existing = existingScores.find(
      (s) => s.candidate_id === candidateId && s.event_type === eventType
    )
    if (!existing?.scores) return null
    return (existing.scores.decision as Decision) || null
  }

  const currentDecision = candidate ? getExistingDecision(candidate.id) : null

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < sortedCandidates.length) {
      setCurrentIndex(index)
      setShowComment(false)
    }
  }, [sortedCandidates.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showComment) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(currentIndex + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(currentIndex - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, showComment, goTo])

  // Track time spent on each candidate slide
  useEffect(() => {
    if (!candidate) return
    // Record viewed_at for the new slide
    if (!slideViewedAt.current.has(candidate.id)) {
      slideViewedAt.current.set(candidate.id, new Date().toISOString())
    }
    slideStartTime.current = Date.now()

    return () => {
      // On slide exit, accumulate elapsed time
      const elapsed = Math.round((Date.now() - slideStartTime.current) / 1000)
      if (candidate) {
        const prev = accumulatedSeconds.current.get(candidate.id) || 0
        accumulatedSeconds.current.set(candidate.id, prev + elapsed)
      }
    }
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Touch swipe handling
  function handleTouchStart(e: React.TouchEvent) {
    if (showComment) return
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
    isScrolling.current = true
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isScrolling.current || showComment) return
    touchDeltaY.current = touchStartY.current - e.touches[0].clientY
  }

  function handleTouchEnd() {
    if (!isScrolling.current || showComment) return
    isScrolling.current = false
    const threshold = 80
    if (touchDeltaY.current > threshold) {
      goTo(currentIndex + 1)
    } else if (touchDeltaY.current < -threshold) {
      goTo(currentIndex - 1)
    }
  }

  async function handleVote(decision: Decision) {
    if (!candidate || saving) return
    setSaving(true)
    setVoteAnimation(decision)

    try {
      const supabase = createClient()
      const totalScore = DECISION_CONFIG[decision].score
      const candidateComment = comments[candidate.id] || null

      // Calculate watch time including current viewing session
      const currentElapsed = Math.round((Date.now() - slideStartTime.current) / 1000)
      const prevAccumulated = accumulatedSeconds.current.get(candidate.id) || 0
      const watchSeconds = prevAccumulated + currentElapsed
      const viewedAt = slideViewedAt.current.get(candidate.id) || new Date().toISOString()

      const existing = existingScores.find(
        (s) => s.candidate_id === candidate.id && s.event_type === eventType
      )

      const payload = {
        scores: { decision },
        total_score: totalScore,
        comment: candidateComment,
      }

      const trackingData = {
        viewed_at: viewedAt,
        watch_seconds: watchSeconds,
      }

      if (existing) {
        const { error } = await supabase.from('jury_scores').update({ ...payload, ...trackingData }).eq('id', existing.id)
        if (error) throw new Error(error.message)
        existing.scores = payload.scores
        existing.total_score = payload.total_score
        existing.comment = payload.comment
        existing.viewed_at = viewedAt
        existing.watch_seconds = watchSeconds
      } else {
        const { error } = await supabase.from('jury_scores').insert({
          session_id: session.id,
          juror_id: juror.id,
          candidate_id: candidate.id,
          event_type: eventType,
          ...payload,
          ...trackingData,
        })
        if (error) throw new Error(error.message)
        existingScores.push({
          id: crypto.randomUUID(),
          candidate_id: candidate.id,
          event_type: eventType,
          ...payload,
          ...trackingData,
        })
      }

      setSavedIds((prev) => new Set([...prev, candidate.id]))

      // Auto-advance after voting (with delay for animation)
      setTimeout(() => {
        setVoteAnimation(null)
        if (currentIndex < sortedCandidates.length - 1) {
          goTo(currentIndex + 1)
        } else {
          // Last candidate voted — show summary
          setShowSummary(true)
        }
      }, 600)
    } catch {
      setVoteAnimation(null)
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // ─── "Mes votes" view ───
  if (viewMode === 'votes') {
    const myScores = existingScores.filter((s) => s.event_type === eventType)
    const votedCandidates = candidates.filter((c) => savedIds.has(c.id))

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#1a1533] to-[#0d0b1a] z-50 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
              Mes votes ({savedIds.size}/{candidates.length})
            </h2>
            <button
              onClick={() => setViewMode('feed')}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#e91e8c]/15 text-[#e91e8c] border border-[#e91e8c]/25 hover:bg-[#e91e8c]/25 transition-colors"
            >
              {unvotedCount > 0 ? `Voter (${unvotedCount} restants)` : 'Retour au feed'}
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
            />
          </div>

          {/* Un-voted reminder */}
          {unvotedCount > 0 && (
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/25 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-[#f59e0b]">
                {unvotedCount} candidat{unvotedCount > 1 ? 's' : ''} en attente de votre vote
              </p>
            </div>
          )}

          {/* Voted candidates list */}
          {votedCandidates.length > 0 ? (
            <div className="space-y-2">
              {votedCandidates.map((c) => {
                const name = c.stage_name || `${c.first_name} ${c.last_name}`
                const score = myScores.find((s) => s.candidate_id === c.id)
                const decision = score?.scores?.decision as Decision | undefined

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      const idx = sortedCandidates.findIndex((sc) => sc.id === c.id)
                      if (idx >= 0) {
                        setCurrentIndex(idx)
                        setViewMode('feed')
                      }
                    }}
                    className="w-full flex items-center gap-3 bg-[#161228] border border-[#2a2545] rounded-xl p-3 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      <p className="text-xs text-white/30 truncate">{c.song_title} — {c.song_artist}</p>
                    </div>
                    {decision && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{
                          background: `${DECISION_CONFIG[decision].color}20`,
                          color: DECISION_CONFIG[decision].color,
                        }}
                      >
                        {DECISION_CONFIG[decision].emoji} {DECISION_CONFIG[decision].label}
                      </div>
                    )}
                    <span className="text-[10px] text-white/20 shrink-0">Modifier</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-white/30 text-sm">
              Vous n&apos;avez pas encore vote.
            </div>
          )}

          {/* Branding */}
          <p className="text-center text-white/20 text-xs pt-4">
            <span className="text-white/30">Chant</span>
            <span className="text-[#7ec850]/50">En</span>
            <span className="text-[#e91e8c]/50">Scène</span>
          </p>
        </div>
      </div>
    )
  }

  // ─── Summary screen when all candidates are voted ───
  if (showSummary && savedIds.size >= candidates.length) {
    const myScores = existingScores.filter(
      (s) => s.event_type === eventType
    )
    let ouiCount = 0, peutEtreCount = 0, nonCount = 0
    for (const s of myScores) {
      const d = s.scores?.decision as Decision | undefined
      if (d === 'oui') ouiCount++
      else if (d === 'peut-etre') peutEtreCount++
      else if (d === 'non') nonCount++
    }
    const total = ouiCount + peutEtreCount + nonCount
    const ouiPct = total > 0 ? Math.round((ouiCount / total) * 100) : 0
    const peutEtrePct = total > 0 ? Math.round((peutEtreCount / total) * 100) : 0
    const nonPct = total > 0 ? Math.round((nonCount / total) * 100) : 0

    const favoris = candidates.filter((c) => {
      const s = myScores.find((sc) => sc.candidate_id === c.id)
      return s?.scores?.decision === 'oui'
    })

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#1a1533] to-[#0d0b1a] z-50 overflow-auto">
        <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 animate-fade-up">
            <div className="text-6xl">🎉</div>
            <h1 className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-white">
              Merci pour vos votes !
            </h1>
            <p className="text-white/50 text-sm">
              Vos votes ont été enregistrés et seront pris en compte pour la sélection des demi-finalistes.
            </p>
          </div>

          {/* Stats */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider">Résumé de vos votes</p>

            {/* Bar */}
            <div className="h-4 rounded-full overflow-hidden flex">
              {ouiPct > 0 && (
                <div style={{ width: `${ouiPct}%`, background: '#7ec850' }} className="transition-all" />
              )}
              {peutEtrePct > 0 && (
                <div style={{ width: `${peutEtrePct}%`, background: '#f59e0b' }} className="transition-all" />
              )}
              {nonPct > 0 && (
                <div style={{ width: `${nonPct}%`, background: '#ef4444' }} className="transition-all" />
              )}
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#7ec850]/10 rounded-xl p-3">
                <p className="text-2xl font-bold text-[#7ec850]">{ouiCount}</p>
                <p className="text-xs text-white/40 mt-1">👍 Oui</p>
              </div>
              <div className="bg-[#f59e0b]/10 rounded-xl p-3">
                <p className="text-2xl font-bold text-[#f59e0b]">{peutEtreCount}</p>
                <p className="text-xs text-white/40 mt-1">🤔 Peut-être</p>
              </div>
              <div className="bg-[#ef4444]/10 rounded-xl p-3">
                <p className="text-2xl font-bold text-[#ef4444]">{nonCount}</p>
                <p className="text-xs text-white/40 mt-1">👎 Non</p>
              </div>
            </div>
          </div>

          {/* Favorites list */}
          {favoris.length > 0 && (
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">
                Vos coups de coeur ({favoris.length})
              </p>
              <div className="space-y-2">
                {favoris.map((c) => {
                  const name = c.stage_name || `${c.first_name} ${c.last_name}`
                  return (
                    <div key={c.id} className="flex items-center gap-3 bg-[#7ec850]/5 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">🎤</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{name}</p>
                        <p className="text-xs text-white/30">{c.song_title} — {c.song_artist}</p>
                      </div>
                      <span className="text-xs text-[#7ec850]">{c.category}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowSummary(false)
                setViewMode('votes')
              }}
              className="w-full py-3.5 rounded-xl font-medium text-sm bg-[#e91e8c]/15 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/25 transition-colors"
            >
              Voir et modifier mes votes
            </button>
            <button
              onClick={() => {
                setShowSummary(false)
                goTo(0)
              }}
              className="w-full py-3.5 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Revoir le feed
            </button>
          </div>

          {/* Branding */}
          <p className="text-center text-white/20 text-xs">
            <span className="text-white/30">Chant</span>
            <span className="text-[#7ec850]/50">En</span>
            <span className="text-[#e91e8c]/50">Scène</span>
          </p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b1a] text-white/40">
        Aucun candidat à évaluer.
      </div>
    )
  }

  const ytId = candidate.video_url ? getYouTubeId(candidate.video_url) : null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video background */}
      <div className="absolute inset-0">
        {ytId ? (
          <iframe
            key={candidate.id}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          />
        ) : candidate.video_url ? (
          <video
            key={candidate.id}
            src={candidate.video_url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : candidate.mp3_url ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1533] to-[#0d0b1a]">
            <div className="w-32 h-32 rounded-full bg-[#1a1533] border-2 border-[#2a2545] overflow-hidden mb-6 animate-pulse">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">🎤</div>
              )}
            </div>
            <audio src={candidate.mp3_url} controls autoPlay className="w-64" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1533] to-[#0d0b1a]">
            <p className="text-white/20 text-lg">Aucun média</p>
          </div>
        )}
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Top bar: Photo + Progress */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-top">
        {/* Progress bar */}
        <div className="flex gap-1 px-3 pt-3">
          {sortedCandidates.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-0.5 rounded-full transition-colors cursor-pointer"
              style={{
                background: i === currentIndex ? '#e91e8c' : i < currentIndex ? 'rgba(126,200,80,0.6)' : 'rgba(255,255,255,0.15)',
              }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* Counter + Mes votes button */}
        <div className="flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-3">
            {/* Circular profile photo */}
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1533] text-lg">🎤</div>
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight drop-shadow-lg">{displayName}</p>
              <p className="text-white/60 text-xs drop-shadow">{candidate.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('votes')}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-sm text-white/70 hover:bg-white/20 transition-colors"
            >
              Mes votes ({savedIds.size})
            </button>
            <div className="text-white/50 text-xs font-medium tabular-nums drop-shadow">
              {currentIndex + 1}/{sortedCandidates.length}
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Vote buttons (TikTok style) */}
      <div className="absolute right-3 bottom-48 z-10 flex flex-col items-center gap-5">
        {(Object.entries(DECISION_CONFIG) as [Decision, typeof DECISION_CONFIG[Decision]][]).map(([key, cfg]) => {
          const isActive = currentDecision === key
          const isAnimating = voteAnimation === key
          return (
            <button
              key={key}
              onClick={() => handleVote(key)}
              disabled={saving}
              className={`flex flex-col items-center gap-1 transition-all ${
                isAnimating ? 'scale-125' : 'active:scale-110'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                  isActive ? 'ring-2 ring-offset-2 ring-offset-black' : ''
                }`}
                style={{
                  background: isActive ? cfg.color : 'rgba(255,255,255,0.15)',
                  backdropFilter: isActive ? 'none' : 'blur(8px)',
                  WebkitBackdropFilter: isActive ? 'none' : 'blur(8px)',
                  '--tw-ring-color': cfg.color,
                } as React.CSSProperties}
              >
                {cfg.emoji}
              </div>
              <span
                className="text-[10px] font-bold drop-shadow-lg"
                style={{ color: isActive ? cfg.color : 'rgba(255,255,255,0.7)' }}
              >
                {cfg.label}
              </span>
            </button>
          )
        })}

        {/* Comment button */}
        <button
          onClick={() => setShowComment(true)}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{
              background: comments[candidate.id] ? 'rgba(233,30,140,0.3)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            💬
          </div>
          <span className="text-[10px] font-bold text-white/70 drop-shadow-lg">Note</span>
        </button>
      </div>

      {/* Bottom: Song info + navigation hint */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 px-4 safe-bottom">
        <div className="mb-4">
          <p className="text-white font-bold text-base drop-shadow-lg">🎵 {candidate.song_title}</p>
          <p className="text-white/60 text-sm drop-shadow">{candidate.song_artist}</p>
        </div>

        {/* Voted indicator */}
        {currentDecision && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{
              background: `${DECISION_CONFIG[currentDecision].color}25`,
              color: DECISION_CONFIG[currentDecision].color,
              border: `1px solid ${DECISION_CONFIG[currentDecision].color}40`,
            }}
          >
            {DECISION_CONFIG[currentDecision].emoji} Voté : {DECISION_CONFIG[currentDecision].label}
          </div>
        )}

        {/* Navigation dots + swipe hint */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1.5">
            {sortedCandidates.map((c, i) => (
              <div
                key={c.id}
                className="w-1.5 h-1.5 rounded-full transition-all cursor-pointer"
                style={{
                  background: i === currentIndex
                    ? '#e91e8c'
                    : savedIds.has(c.id)
                      ? 'rgba(126,200,80,0.5)'
                      : 'rgba(255,255,255,0.2)',
                  transform: i === currentIndex ? 'scale(1.5)' : 'scale(1)',
                }}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <p className="text-white/30 text-[10px]">
            Swipez ↑↓ ou utilisez les flèches
          </p>
        </div>

        {/* Global progress */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${sortedCandidates.length > 0 ? (savedIds.size / sortedCandidates.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-white/40 text-[10px] tabular-nums">{savedIds.size}/{sortedCandidates.length}</span>
        </div>
      </div>

      {/* Vote animation overlay */}
      {voteAnimation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-8xl animate-bounce">
            {DECISION_CONFIG[voteAnimation].emoji}
          </div>
        </div>
      )}

      {/* Comment bottom sheet */}
      {showComment && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setShowComment(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full bg-[#1a1533] rounded-t-2xl p-5 pb-8 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <p className="text-white/50 text-sm mb-3">Commentaire pour {displayName}</p>
            <textarea
              value={comments[candidate.id] || ''}
              onChange={(e) => setComments({ ...comments, [candidate.id]: e.target.value })}
              rows={3}
              maxLength={300}
              className="w-full bg-[#0d0b1a] border border-[#2a2545] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] resize-none"
              placeholder="Remarques sur la prestation..."
              autoFocus
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setShowComment(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-medium"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  // Save comment to existing score if vote exists
                  const existing = existingScores.find(
                    (s) => s.candidate_id === candidate.id && s.event_type === eventType
                  )
                  if (existing) {
                    const supabase = createClient()
                    supabase
                      .from('jury_scores')
                      .update({ comment: comments[candidate.id] || null })
                      .eq('id', existing.id)
                      .then(() => {
                        existing.comment = comments[candidate.id] || null
                      })
                  }
                  setShowComment(false)
                }}
                className="flex-1 py-3 rounded-xl bg-[#e91e8c] text-white text-sm font-bold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation arrows (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={() => goTo(currentIndex - 1)}
          className="absolute left-1/2 top-20 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors hidden md:flex"
        >
          ↑
        </button>
      )}
      {currentIndex < sortedCandidates.length - 1 && (
        <button
          onClick={() => goTo(currentIndex + 1)}
          className="absolute left-1/2 bottom-44 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors hidden md:flex"
        >
          ↓
        </button>
      )}
    </div>
  )
}

// ─── Main component ───
export default function JuryScoring({ juror, session, candidates, existingScores, criteria, liveEventId }: Props) {
  // Online jurors get the TikTok feed
  if (juror.role === 'online') {
    return (
      <TikTokFeed
        juror={juror}
        session={session}
        candidates={candidates}
        existingScores={existingScores}
      />
    )
  }

  // Semifinal jurors get the star rating view
  if (juror.role === 'semifinal') {
    return (
      <StarRatingView
        juror={juror}
        session={session}
        candidates={candidates}
        existingScores={existingScores}
        liveEventId={liveEventId}
      />
    )
  }

  // Final jurors: criteria sliders
  return (
    <CriteriaScoringView
      juror={juror}
      session={session}
      candidates={candidates}
      existingScores={existingScores}
      criteria={criteria}
      liveEventId={liveEventId}
    />
  )
}

// ─── Star rating for semifinal jurors ───
const STAR_LABELS = [
  { value: 1, label: 'Raté',  color: '#ef4444' },
  { value: 2, label: 'Moyen', color: '#f59e0b' },
  { value: 3, label: 'Bien',  color: '#3b82f6' },
  { value: 4, label: 'Super', color: '#7ec850' },
  { value: 5, label: 'Top',   color: '#e91e8c' },
] as const

function StarRatingView({
  juror,
  session,
  candidates,
  existingScores,
  liveEventId,
}: Omit<Props, 'criteria'>) {
  const juryPush = useRealtimeJuryPush(liveEventId || null, session.id)
  const winnerEvent = useMemo(() => ({
    id: liveEventId || '',
    winner_candidate_id: juryPush.winnerCandidateId,
    winner_revealed_at: juryPush.winnerRevealedAt,
  }), [liveEventId, juryPush.winnerCandidateId, juryPush.winnerRevealedAt])
  const { winner: revealedWinner, phase: winnerPhase, dismiss: dismissWinner } = useWinnerReveal(winnerEvent, { skipCountdown: true })
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(existingScores.map((s) => s.candidate_id))
  )
  const [justSavedId, setJustSavedId] = useState<string | null>(null)
  const prevPushedRef = useRef<string | null>(null)

  const eventType = 'semifinal'

  // Reset scoringId if the candidate no longer exists in the list
  useEffect(() => {
    if (scoringId && !candidates.some((c) => c.id === scoringId)) {
      setScoringId(null)
    }
  }, [scoringId, candidates])

  // Auto-open scoring when admin opens voting (not when candidate first appears on stage)
  const prevVotingOpenRef = useRef(false)
  useEffect(() => {
    const currentId = juryPush.currentCandidateId
    const votingJustOpened = juryPush.isVotingOpen && !prevVotingOpenRef.current
    prevVotingOpenRef.current = juryPush.isVotingOpen

    if (currentId && votingJustOpened) {
      setJustSavedId(null)
      const candidateInList = candidates.some((c) => c.id === currentId)
      if (candidateInList) {
        const existing = existingScores.find(
          (s) => s.candidate_id === currentId && s.event_type === eventType
        )
        if (existing) {
          setStars((existing.scores?.stars as number) || existing.total_score || 0)
          setComment(existing.comment || '')
        } else {
          setStars(0)
          setComment('')
        }
        setScoringId(currentId)
      }
    }
    if (!currentId) {
      prevPushedRef.current = null
      setJustSavedId(null)
    }
  }, [juryPush.currentCandidateId, juryPush.isVotingOpen, existingScores, candidates])

  function startScoring(candidateId: string) {
    const existing = existingScores.find(
      (s) => s.candidate_id === candidateId && s.event_type === eventType
    )
    if (existing) {
      setStars((existing.scores?.stars as number) || existing.total_score || 0)
      setComment(existing.comment || '')
    } else {
      setStars(0)
      setComment('')
    }
    setJustSavedId(null)
    setScoringId(candidateId)
  }

  function getExistingStars(candidateId: string): number | null {
    const existing = existingScores.find(
      (s) => s.candidate_id === candidateId && s.event_type === eventType
    )
    if (!existing) return null
    return (existing.scores?.stars as number) || existing.total_score || 0
  }

  async function handleSaveStars() {
    if (!scoringId || stars === 0) {
      alert('Veuillez sélectionner une note avant de valider.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const existing = existingScores.find(
        (s) => s.candidate_id === scoringId && s.event_type === eventType
      )

      const payload = {
        scores: { stars },
        total_score: stars,
        comment: comment || null,
      }

      if (existing) {
        const { error } = await supabase.from('jury_scores').update(payload).eq('id', existing.id)
        if (error) throw new Error(error.message)
        existing.scores = payload.scores
        existing.total_score = payload.total_score
        existing.comment = payload.comment
      } else {
        const { data, error } = await supabase.from('jury_scores').insert({
          session_id: session.id,
          juror_id: juror.id,
          candidate_id: scoringId,
          event_type: eventType,
          ...payload,
        }).select('id').single()
        if (error) throw new Error(error.message)
        existingScores.push({
          id: data?.id || crypto.randomUUID(),
          candidate_id: scoringId,
          event_type: eventType,
          ...payload,
        })
      }

      setSavedIds((prev) => new Set([...prev, scoringId]))
      setJustSavedId(scoringId)
      setScoringId(null)
    } catch {
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // Scored candidates for the recap list
  const scoredCandidates = candidates.filter((c) => savedIds.has(c.id))

  // ─── Winner revealed — show banner instantly ───
  if (winnerPhase === 'revealed' && revealedWinner) {
    return (
      <div className="space-y-6">
        <JuryWinnerBanner
          candidateName={revealedWinner.name}
          candidatePhoto={revealedWinner.photo}
          category={revealedWinner.category}
          onDismiss={dismissWinner}
        />
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
            <p className="text-sm text-white">
              {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
            </p>
          </div>
          <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Scoring screen ───
  if (scoringId) {
    const candidate = candidates.find((c) => c.id === scoringId)
    if (!candidate) return null
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
    const activeLabel = STAR_LABELS.find((l) => l.value === stars)
    const isOnStage = juryPush.currentCandidateId === candidate.id

    return (
      <div className="space-y-6">
        {/* Live indicator */}
        {isOnStage && (
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[#e91e8c] text-xs uppercase tracking-widest font-bold">Sur scène maintenant</span>
          </div>
        )}

        {/* Candidate card */}
        <div className="flex items-center gap-4 bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border-2 border-[#e91e8c]/40">
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">🎤</div>
            )}
          </div>
          <div>
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-white text-lg">{displayName}</p>
            <p className="text-white/40 text-sm">🎵 {candidate.song_title} — {candidate.song_artist}</p>
            <span className="text-xs text-[#e91e8c]">{candidate.category}</span>
          </div>
        </div>

        {/* Star rating */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 text-center space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-wider">Votre note</p>

          {/* Stars */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setStars(value)}
                className={`text-4xl sm:text-5xl transition-all active:scale-110 ${
                  value <= stars ? '' : 'opacity-20'
                }`}
                style={{ color: value <= stars ? '#f5a623' : undefined }}
              >
                ★
              </button>
            ))}
          </div>

          {/* Label */}
          <div className="h-8">
            {activeLabel && (
              <span
                className="text-sm font-bold px-4 py-1.5 rounded-full"
                style={{ color: activeLabel.color, background: `${activeLabel.color}15` }}
              >
                {activeLabel.label}
              </span>
            )}
          </div>

          {/* Star labels for reference */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {STAR_LABELS.map((l) => (
              <span
                key={l.value}
                className="text-[9px] w-11 sm:w-14 text-center"
                style={{ color: stars === l.value ? l.color : 'rgba(255,255,255,0.2)' }}
              >
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm text-white/50 mb-1.5">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] resize-none"
            placeholder="Remarques sur la prestation..."
          />
        </div>

        {/* Validate */}
        <button
          onClick={handleSaveStars}
          disabled={saving || stars === 0}
          className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/20 transition-all disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Valider la note'}
        </button>
      </div>
    )
  }

  // ─── Confirmation after saving (candidate still on stage) ───
  if (justSavedId && juryPush.currentCandidateId === justSavedId) {
    const candidate = candidates.find((c) => c.id === justSavedId)
    const savedStars = getExistingStars(justSavedId)
    const displayName = candidate
      ? candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
      : ''

    return (
      <div className="space-y-6">
        {/* Confirmation */}
        <div className="bg-[#7ec850]/10 border border-[#7ec850]/30 rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            Note enregistrée !
          </h2>
          <p className="text-white/50 text-sm">{displayName}</p>
          {savedStars && (
            <p className="text-2xl tracking-wider">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= savedStars ? 'text-[#f5a623]' : 'text-white/15'}>
                  ★
                </span>
              ))}
            </p>
          )}
          <p className="text-white/30 text-xs">En attente du prochain candidat...</p>
        </div>

        {/* Edit button */}
        <button
          onClick={() => startScoring(justSavedId)}
          className="w-full py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          Modifier ma note
        </button>

        {/* Progress */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
            <p className="text-sm text-white">
              {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
            </p>
          </div>
          <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Performance in progress (candidate on stage, voting not yet open) ───
  if (juryPush.currentCandidateId && juryPush.eventStatus === 'live' && !juryPush.isVotingOpen) {
    const performingCandidate = candidates.find((c) => c.id === juryPush.currentCandidateId)
    if (performingCandidate) {
      const pName = performingCandidate.stage_name || `${performingCandidate.first_name} ${performingCandidate.last_name}`
      return (
        <div className="space-y-6">
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 text-center space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[#e91e8c] text-xs uppercase tracking-widest font-bold">Sur scene maintenant</span>
            </div>
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#e91e8c]/30">
              {performingCandidate.photo_url ? (
                <img src={performingCandidate.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#161228] flex items-center justify-center text-2xl text-white/20">🎤</div>
              )}
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">{pName}</h2>
              <p className="text-white/40 text-sm">🎵 {performingCandidate.song_title} — {performingCandidate.song_artist}</p>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-[#e91e8c]/15 text-[#e91e8c]">{performingCandidate.category}</span>
            </div>
            <div className="bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-xl p-4 mt-2">
              <p className="text-[#f5a623] text-sm font-medium">Performance en cours...</p>
              <p className="text-white/30 text-xs mt-1">Le vote s&apos;ouvrira apres la prestation</p>
            </div>
          </div>
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
              <p className="text-sm text-white">{savedIds.size}<span className="text-white/30">/{candidates.length}</span></p>
            </div>
            <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all" style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )
    }
  }

  // ─── Waiting screen (no candidate on stage) ───
  return (
    <div className="space-y-6">
      {/* Waiting message */}
      {juryPush.eventStatus === 'live' ? (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e91e8c]/10 flex items-center justify-center">
            <span className="text-3xl">🎤</span>
          </div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
            En attente du prochain candidat
          </h2>
          <p className="text-white/30 text-sm">
            Le candidat apparaitra automatiquement quand l&apos;admin l&apos;appellera sur scene.
          </p>
        </div>
      ) : juryPush.eventStatus === 'paused' ? (
        <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-8 text-center space-y-3">
          <div className="text-3xl">⏸</div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-yellow-400">
            Demi-finale en pause
          </h2>
          <p className="text-white/30 text-sm">Veuillez patienter...</p>
        </div>
      ) : juryPush.eventStatus === 'completed' ? (
        <div className="bg-[#7ec850]/10 border border-[#7ec850]/25 rounded-2xl p-8 text-center space-y-3">
          <div className="text-3xl">🎉</div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-[#7ec850]">
            Demi-finale terminée
          </h2>
          <p className="text-white/30 text-sm">Merci pour vos notes !</p>
        </div>
      ) : (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e91e8c]/10 flex items-center justify-center">
            <span className="text-3xl">🎤</span>
          </div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
            En attente du lancement
          </h2>
          <p className="text-white/30 text-sm">La page se mettra a jour automatiquement des que l&apos;evenement commencera.</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
          <p className="text-sm text-white">
            {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
          </p>
        </div>
        <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Scored candidates recap */}
      {scoredCandidates.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2545]">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
              Mes notes ({scoredCandidates.length})
            </h3>
          </div>
          <div className="divide-y divide-[#2a2545]">
            {scoredCandidates.map((c) => {
              const displayName = c.stage_name || `${c.first_name} ${c.last_name}`
              const existingStarsVal = getExistingStars(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => startScoring(c.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{displayName}</p>
                    <p className="text-[10px] text-white/20">{c.category}</p>
                  </div>
                  {existingStarsVal && (
                    <span className="text-sm tracking-wide shrink-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={i <= existingStarsVal ? 'text-[#f5a623]' : 'text-white/15'}>
                          ★
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] text-white/20 shrink-0">Modifier</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Criteria scoring for final jurors ───
function CriteriaScoringView({
  juror,
  session,
  candidates,
  existingScores,
  criteria,
  liveEventId,
}: Props) {
  const juryPush = useRealtimeJuryPush(liveEventId || null, session.id)
  const winnerEvent = useMemo(() => ({
    id: liveEventId || '',
    winner_candidate_id: juryPush.winnerCandidateId,
    winner_revealed_at: juryPush.winnerRevealedAt,
  }), [liveEventId, juryPush.winnerCandidateId, juryPush.winnerRevealedAt])
  const { winner: revealedWinner, phase: winnerPhase, dismiss: dismissWinner } = useWinnerReveal(winnerEvent, { skipCountdown: true })
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number | string>>({})
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(existingScores.map((s) => s.candidate_id))
  )
  const [justSavedId, setJustSavedId] = useState<string | null>(null)
  const prevPushedRef = useRef<string | null>(null)

  const eventType = juror.role
  const maxTotal = criteria.length * 5

  // Reset scoringId if the candidate no longer exists in the list
  useEffect(() => {
    if (scoringId && !candidates.some((c) => c.id === scoringId)) {
      setScoringId(null)
    }
  }, [scoringId, candidates])

  // Auto-open scoring when admin opens voting (not during performance)
  const prevVotingOpenRef = useRef(false)
  useEffect(() => {
    const currentId = juryPush.currentCandidateId
    const votingJustOpened = juryPush.isVotingOpen && !prevVotingOpenRef.current
    prevVotingOpenRef.current = juryPush.isVotingOpen

    if (currentId && votingJustOpened) {
      setJustSavedId(null)
      const candidateInList = candidates.some((c) => c.id === currentId)
      if (!scoringId && candidateInList) {
        const existing = existingScores.find(
          (s) => s.candidate_id === currentId && s.event_type === eventType
        )
        if (existing) {
          setScores(existing.scores || {})
          setComment(existing.comment || '')
        } else {
          const initial: Record<string, number> = {}
          criteria.forEach((c) => { initial[c.name] = 0 })
          setScores(initial)
          setComment('')
        }
        setScoringId(currentId)
      }
    }
    if (!currentId) {
      prevPushedRef.current = null
    }
  }, [juryPush.currentCandidateId, juryPush.isVotingOpen, existingScores, scoringId, eventType, criteria, candidates])

  function startScoring(candidateId: string) {
    const existing = existingScores.find(
      (s) => s.candidate_id === candidateId && s.event_type === eventType
    )
    if (existing) {
      setScores(existing.scores || {})
      setComment(existing.comment || '')
    } else {
      const initial: Record<string, number> = {}
      criteria.forEach((c) => { initial[c.name] = 0 })
      setScores(initial)
      setComment('')
    }
    setJustSavedId(null)
    setScoringId(candidateId)
  }

  function getExistingTotal(candidateId: string): number | null {
    const existing = existingScores.find(
      (s) => s.candidate_id === candidateId && s.event_type === eventType
    )
    return existing ? existing.total_score : null
  }

  async function handleSaveCriteria() {
    if (!scoringId) return

    const allScored = criteria.every((c) => (scores[c.name] as number) > 0)
    if (!allScored) {
      alert('Veuillez noter tous les criteres avant de valider.')
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      const totalScore = Object.values(scores).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0)

      const existing = existingScores.find(
        (s) => s.candidate_id === scoringId && s.event_type === eventType
      )

      const payload = {
        scores,
        total_score: totalScore,
        comment: comment || null,
      }

      if (existing) {
        const { error } = await supabase
          .from('jury_scores')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw new Error(error.message)
        existing.scores = payload.scores
        existing.total_score = payload.total_score
        existing.comment = payload.comment
      } else {
        const { data, error } = await supabase.from('jury_scores').insert({
          session_id: session.id,
          juror_id: juror.id,
          candidate_id: scoringId,
          event_type: eventType,
          ...payload,
        }).select('id').single()
        if (error) throw new Error(error.message)
        existingScores.push({
          id: data?.id || crypto.randomUUID(),
          candidate_id: scoringId,
          event_type: eventType,
          ...payload,
        })
      }

      setSavedIds((prev) => new Set([...prev, scoringId]))
      setJustSavedId(scoringId)
      setScoringId(null)
    } catch {
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const scoredCandidates = candidates.filter((c) => savedIds.has(c.id))

  // ─── Winner revealed — show banner instantly ───
  if (winnerPhase === 'revealed' && revealedWinner) {
    return (
      <div className="space-y-6">
        <JuryWinnerBanner
          candidateName={revealedWinner.name}
          candidatePhoto={revealedWinner.photo}
          category={revealedWinner.category}
          onDismiss={dismissWinner}
        />
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
            <p className="text-sm text-white">
              {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
            </p>
          </div>
          <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Scoring screen ───
  if (scoringId) {
    const candidate = candidates.find((c) => c.id === scoringId)
    if (!candidate) return null
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
    const total = Object.values(scores).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    const isOnStage = juryPush.currentCandidateId === candidate.id

    return (
      <div className="space-y-5">
        {/* Live indicator */}
        {isOnStage && juryPush.eventStatus === 'live' && (
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[#e91e8c] text-xs uppercase tracking-widest font-bold">Sur scene maintenant</span>
          </div>
        )}

        {/* Candidate card */}
        <div className="flex items-center gap-4 bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border-2 border-[#e91e8c]/40">
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">🎤</div>
            )}
          </div>
          <div>
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-white text-lg">{displayName}</p>
            <p className="text-white/40 text-sm">🎵 {candidate.song_title} — {candidate.song_artist}</p>
            <span className="text-xs text-[#e91e8c]">{candidate.category}</span>
          </div>
        </div>

        {/* Criteria scoring - star rating for mobile */}
        <div className="space-y-4">
          {criteria.map((criterion) => {
            const value = (scores[criterion.name] as number) || 0
            const label = SCORE_LABELS.find((l) => l.value === value)
            return (
              <div key={criterion.name} className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{criterion.name}</p>
                  {label && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: label.color, background: `${label.color}15` }}>
                      {label.label}
                    </span>
                  )}
                </div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setScores({ ...scores, [criterion.name]: star })}
                      className="p-1 transition-transform active:scale-125"
                    >
                      <span
                        className="text-4xl leading-none"
                        style={{ color: star <= value ? '#f5a623' : 'rgba(255,255,255,0.12)' }}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm text-white/50 mb-1.5">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] resize-none"
            placeholder="Remarques sur la prestation..."
          />
        </div>

        {/* Total + Validate - bigger button */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 text-center space-y-3">
          <div>
            <p className="text-white/30 text-xs uppercase tracking-wider">Total</p>
            <p className="font-[family-name:var(--font-montserrat)] font-black text-3xl text-[#e91e8c]">
              {total}<span className="text-white/20 text-lg">/{maxTotal}</span>
            </p>
          </div>
          <button
            onClick={handleSaveCriteria}
            disabled={saving}
            className="w-full py-5 rounded-xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/20 transition-all disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Valider la note'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Confirmation after saving ───
  if (justSavedId && juryPush.currentCandidateId === justSavedId) {
    const candidate = candidates.find((c) => c.id === justSavedId)
    const savedTotal = getExistingTotal(justSavedId)
    const displayName = candidate
      ? candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
      : ''

    return (
      <div className="space-y-6">
        {/* Confirmation */}
        <div className="bg-[#7ec850]/10 border border-[#7ec850]/30 rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            Note enregistree !
          </h2>
          <p className="text-white/50 text-sm">{displayName}</p>
          {savedTotal !== null && (
            <p className="font-[family-name:var(--font-montserrat)] font-black text-3xl text-[#7ec850]">
              {savedTotal}<span className="text-white/20 text-lg">/{maxTotal}</span>
            </p>
          )}
          <p className="text-white/30 text-xs">En attente du prochain candidat...</p>
        </div>

        {/* Edit button */}
        <button
          onClick={() => startScoring(justSavedId)}
          className="w-full py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          Modifier ma note
        </button>

        {/* Progress */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
            <p className="text-sm text-white">
              {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
            </p>
          </div>
          <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
              style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  const pushedCandidate = juryPush.currentCandidateId
    ? candidates.find((c) => c.id === juryPush.currentCandidateId)
    : null

  // ─── Focus view: current candidate or waiting ───
  return (
    <div className="space-y-6">
      {/* Candidate on stage */}
      {pushedCandidate && juryPush.eventStatus === 'live' ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs uppercase tracking-widest font-bold">Sur scene maintenant</span>
          </div>

          {/* Large photo */}
          <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-[#e91e8c]/30 shadow-xl shadow-[#e91e8c]/10">
            {pushedCandidate.photo_url ? (
              <img src={pushedCandidate.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#161228] flex items-center justify-center text-3xl text-white/20">🎤</div>
            )}
          </div>

          <div className="text-center space-y-1">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
              {pushedCandidate.stage_name || `${pushedCandidate.first_name} ${pushedCandidate.last_name}`}
            </h2>
            <p className="text-white/40 text-sm">
              🎵 {pushedCandidate.song_title} — {pushedCandidate.song_artist}
            </p>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#e91e8c]/15 text-[#e91e8c]">
              {pushedCandidate.category}
            </span>
          </div>

          {/* Score or Note button — gated by voting state */}
          {!juryPush.isVotingOpen ? (
            <div className="bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-xl p-4 text-center">
              <p className="text-[#f5a623] text-sm font-medium">Performance en cours...</p>
              <p className="text-white/30 text-xs mt-1">Le vote s&apos;ouvrira apres la prestation</p>
            </div>
          ) : savedIds.has(pushedCandidate.id) ? (
            <div className="text-center space-y-3">
              <p className="text-[#7ec850] text-sm font-medium">Deja note</p>
              {getExistingTotal(pushedCandidate.id) !== null && (
                <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-[#7ec850]">
                  {getExistingTotal(pushedCandidate.id)}<span className="text-white/20 text-sm">/{maxTotal}</span>
                </p>
              )}
              <button
                onClick={() => startScoring(pushedCandidate.id)}
                className="w-full py-4 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                Modifier ma note
              </button>
            </div>
          ) : (
            <button
              onClick={() => startScoring(pushedCandidate.id)}
              className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 active:scale-[0.98] transition-all"
            >
              Noter ce candidat
            </button>
          )}
        </div>
      ) : (
        /* Waiting message */
        <>
          {juryPush.eventStatus === 'live' ? (
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#e91e8c]/10 flex items-center justify-center">
                <span className="text-3xl">🎤</span>
              </div>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
                En attente du prochain candidat
              </h2>
              <p className="text-white/30 text-sm">
                Le candidat apparaitra automatiquement quand l&apos;admin l&apos;appellera sur scene.
              </p>
            </div>
          ) : juryPush.eventStatus === 'paused' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-8 text-center space-y-3">
              <div className="text-3xl">⏸</div>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-yellow-400">
                Finale en pause
              </h2>
              <p className="text-white/30 text-sm">Veuillez patienter...</p>
            </div>
          ) : juryPush.eventStatus === 'completed' ? (
            <div className="bg-[#7ec850]/10 border border-[#7ec850]/25 rounded-2xl p-8 text-center space-y-3">
              <div className="text-3xl">🎉</div>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-[#7ec850]">
                Finale terminee
              </h2>
              <p className="text-white/30 text-sm">Merci pour vos notes !</p>
            </div>
          ) : (
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#e91e8c]/10 flex items-center justify-center">
                <span className="text-3xl">🎤</span>
              </div>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
                En attente du lancement
              </h2>
              <p className="text-white/30 text-sm">La page se mettra a jour automatiquement des que l&apos;evenement commencera.</p>
            </div>
          )}
        </>
      )}

      {/* Progress */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Progression</p>
          <p className="text-sm text-white">
            {savedIds.size}<span className="text-white/30">/{candidates.length}</span>
          </p>
        </div>
        <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${candidates.length > 0 ? (savedIds.size / candidates.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Collapsible scored recap */}
      {scoredCandidates.length > 0 && (
        <details className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <summary className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors list-none">
            <div className="flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
                Mes notes ({scoredCandidates.length}/{candidates.length})
              </h3>
              <span className="text-white/30 text-xs">Voir ▾</span>
            </div>
          </summary>
          <div className="divide-y divide-[#2a2545] border-t border-[#2a2545]">
            {scoredCandidates.map((c) => {
              const displayName = c.stage_name || `${c.first_name} ${c.last_name}`
              const existingTotal = getExistingTotal(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => startScoring(c.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{displayName}</p>
                    <p className="text-[10px] text-white/20">{c.category}</p>
                  </div>
                  {existingTotal !== null && (
                    <span className="text-xs font-bold text-[#7ec850] tabular-nums shrink-0">
                      {existingTotal}/{maxTotal}
                    </span>
                  )}
                  <span className="text-[10px] text-white/20 shrink-0">Modifier</span>
                </button>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
