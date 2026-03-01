'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  photo_url: string | null
  song_title: string
  song_artist: string
  category: string
  bio: string | null
  accent_color: string
  slug: string
  likes_count: number
  video_url: string | null
  video_public: boolean
  status: string
}

interface Props {
  candidates: Candidate[]
  sessionId: string
  categories: string[]
}

const STATUS_LABELS: Record<string, { label: string; color: string; medal: string }> = {
  winner: { label: 'Gagnant(e)', color: '#ffd700', medal: '🏆' },
  finalist: { label: 'Finaliste', color: '#8b5cf6', medal: '🥇' },
  semifinalist: { label: 'Demi-finaliste', color: '#7ec850', medal: '🥈' },
  approved: { label: 'Sélectionné(e)', color: '#e91e8c', medal: '🥉' },
}

const STATUS_FILTER_OPTIONS = [
  { key: null as string | null, label: 'Tous', icon: '🎤' },
  { key: 'winner', label: 'Gagnants', icon: '🏆' },
  { key: 'finalist', label: 'Finalistes', icon: '🥇' },
  { key: 'semifinalist', label: 'Demi-fin.', icon: '🥈' },
  { key: 'approved', label: 'Sélectionnés', icon: '🥉' },
]

/* ─── Single Slide ─── */
function SwipeSlide({
  candidate,
  sessionId,
  sessionSlug,
  isActive,
  globalMuted,
  onToggleMute,
}: {
  candidate: Candidate
  sessionId: string
  sessionSlug: string
  isActive: boolean
  globalMuted: boolean
  onToggleMute: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const bgVideoRef = useRef<HTMLVideoElement>(null)
  const [likes, setLikes] = useState(candidate.likes_count)
  const [hasVoted, setHasVoted] = useState(false)
  const [voting, setVoting] = useState(false)
  const [heartPop, setHeartPop] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  const displayName = candidate.stage_name || candidate.first_name
  const accent = candidate.accent_color || '#e91e8c'
  const showVideo = candidate.video_public && candidate.video_url

  // Check existing vote
  useEffect(() => {
    async function checkVote() {
      try {
        const fp = await getFingerprint()
        const supabase = createClient()
        const { data } = await supabase
          .from('votes')
          .select('id')
          .eq('candidate_id', candidate.id)
          .eq('fingerprint', fp)
          .maybeSingle()
        if (data) setHasVoted(true)
      } catch {
        // ignore
      }
    }
    checkVote()
  }, [candidate.id])

  // Detect landscape video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    function onMeta() {
      if (video!.videoWidth > video!.videoHeight) setIsLandscape(true)
    }
    video.addEventListener('loadedmetadata', onMeta)
    // If already loaded
    if (video.videoWidth > 0 && video.videoWidth > video.videoHeight) setIsLandscape(true)
    return () => video.removeEventListener('loadedmetadata', onMeta)
  }, [])

  // Autoplay/pause based on visibility
  useEffect(() => {
    const video = videoRef.current
    const bgVideo = bgVideoRef.current
    if (!video) return
    if (isActive) {
      video.play().catch(() => {})
      bgVideo?.play().catch(() => {})
    } else {
      video.pause()
      bgVideo?.pause()
    }
  }, [isActive])

  // Sync mute (bg video always muted)
  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = globalMuted
  }, [globalMuted])

  // Sync bg video time with main video
  useEffect(() => {
    const video = videoRef.current
    const bgVideo = bgVideoRef.current
    if (!video || !bgVideo || !isLandscape) return
    function onSeek() { if (bgVideo) bgVideo.currentTime = video!.currentTime }
    video.addEventListener('seeked', onSeek)
    return () => video.removeEventListener('seeked', onSeek)
  }, [isLandscape])

  async function handleVote() {
    if (hasVoted || voting) return
    setVoting(true)
    try {
      const fp = await getFingerprint()
      const supabase = createClient()
      const { error } = await supabase.rpc('vote_for_candidate', {
        p_session_id: sessionId,
        p_candidate_id: candidate.id,
        p_fingerprint: fp,
      })
      if (!error) {
        setLikes((prev) => prev + 1)
        setHasVoted(true)
        setHeartPop(true)
        setTimeout(() => setHeartPop(false), 600)
      }
    } catch {
      // ignore
    } finally {
      setVoting(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/${sessionSlug}/candidats/${candidate.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} — ChanteEnScene`, url })
      } catch {
        // cancelled
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="h-full w-full snap-start relative flex-shrink-0 bg-black">
      {/* Media */}
      {showVideo ? (
        getYouTubeId(candidate.video_url!) ? (
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(candidate.video_url!)}?autoplay=1&rel=0&mute=${globalMuted ? 1 : 0}&playsinline=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <>
            {/* Blurred background for landscape videos */}
            {isLandscape && (
              <video
                ref={bgVideoRef}
                src={candidate.video_url!}
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl brightness-50"
                aria-hidden="true"
              />
            )}
            {/* Main video */}
            <video
              ref={videoRef}
              src={candidate.video_url!}
              muted={globalMuted}
              loop
              playsInline
              className={`absolute inset-0 w-full h-full ${isLandscape ? 'object-contain' : 'object-cover'}`}
            />
          </>
        )
      ) : candidate.photo_url ? (
        <img
          src={candidate.photo_url}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0d0b1a] text-8xl text-white/10">
          🎤
        </div>
      )}

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Bottom gradient + info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-32 pb-6 px-5">
        {/* Category + status badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
            style={{ background: `${accent}30`, color: accent, border: `1px solid ${accent}50` }}
          >
            {candidate.category}
          </span>
          {STATUS_LABELS[candidate.status] && (
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"
              style={{
                background: `${STATUS_LABELS[candidate.status].color}25`,
                color: STATUS_LABELS[candidate.status].color,
                border: `1px solid ${STATUS_LABELS[candidate.status].color}50`,
              }}
            >
              {STATUS_LABELS[candidate.status].label}
            </span>
          )}
        </div>

        {/* Name */}
        <h2 className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-white leading-tight mb-1 drop-shadow-lg flex items-center gap-2">
          {STATUS_LABELS[candidate.status] && (
            <span>{STATUS_LABELS[candidate.status].medal}</span>
          )}
          {displayName}
        </h2>

        {/* Song */}
        <p className="text-white/70 text-sm mb-2 drop-shadow">
          🎵 {candidate.song_title} — {candidate.song_artist}
        </p>

        {/* Bio */}
        {candidate.bio && (
          <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-1 max-w-[80%]">
            {candidate.bio}
          </p>
        )}
      </div>

      {/* Right sidebar buttons (TikTok style) */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {/* Vote */}
        <button
          onClick={handleVote}
          disabled={hasVoted || voting}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
            hasVoted
              ? 'bg-[#e91e8c]/30 scale-110'
              : 'bg-white/10 active:scale-90'
          } ${heartPop ? 'animate-bounce' : ''}`}>
            <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors ${hasVoted ? 'fill-[#e91e8c] text-[#e91e8c]' : 'fill-none text-white'}`} stroke="currentColor" strokeWidth={hasVoted ? 0 : 2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold tabular-nums drop-shadow">{likes}</span>
        </button>

        {/* Profile link */}
        <Link
          href={`/${sessionSlug}/candidats/${candidate.slug}`}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md active:scale-90 transition-transform">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className="text-white/60 text-[10px]">Profil</span>
        </Link>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md active:scale-90 transition-transform">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <span className="text-white/60 text-[10px]">Partager</span>
        </button>
      </div>

      {/* Mute/unmute (only for video slides) */}
      {showVideo && (
        <button
          onClick={onToggleMute}
          className="absolute top-14 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
        >
          {globalMuted ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}

/* ─── Main Feed ─── */
export default function CandidateSwipeFeed({ candidates, sessionId, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const sessionSlug = pathname.split('/')[1]

  const availableStatusFilters = STATUS_FILTER_OPTIONS.filter(
    (opt) => opt.key === null || candidates.some((c) => c.status === opt.key)
  )

  const filtered = candidates
    .filter((c) => !activeCategory || c.category === activeCategory)
    .filter((c) => !activeStatus || c.status === activeStatus)

  // Intersection Observer to track active slide
  const observerRef = useRef<IntersectionObserver | null>(null)

  const slideRefs = useCallback(
    (node: HTMLDivElement | null) => {
      // handled by the observer setup below
      if (!node) return
    },
    []
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!isNaN(idx)) setActiveIndex(idx)
          }
        }
      },
      { root: container, threshold: 0.6 }
    )

    const slides = container.querySelectorAll('[data-index]')
    slides.forEach((slide) => observerRef.current?.observe(slide))

    return () => observerRef.current?.disconnect()
  }, [filtered])

  function handleCategoryChange(cat: string | null) {
    setActiveCategory(cat)
    setActiveIndex(0)
    containerRef.current?.scrollTo({ top: 0 })
  }

  function handleStatusChange(status: string | null) {
    setActiveStatus(status)
    setActiveIndex(0)
    containerRef.current?.scrollTo({ top: 0 })
  }

  return (
    <div className="fixed inset-0 z-20 bg-black">
      {/* Category filter (sticky top, pt-14 clears the fixed nav) */}
      <div className="absolute top-0 inset-x-0 z-30 px-4 pt-14 pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors backdrop-blur-sm ${
              !activeCategory
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-white/50 border border-white/10'
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors backdrop-blur-sm ${
                activeCategory === cat
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Status medal filter (vertical, top-left below category filters) */}
      {availableStatusFilters.length > 2 && (
        <div className="absolute left-3 top-24 z-25 flex flex-col items-center gap-2">
          {availableStatusFilters.filter((opt) => opt.key !== null).map((opt) => (
            <button
              key={opt.key ?? 'all'}
              onClick={() => handleStatusChange(activeStatus === opt.key ? null : opt.key)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all backdrop-blur-sm ${
                activeStatus === opt.key
                  ? 'bg-white/25 border-2 border-white/50 scale-110'
                  : 'bg-black/30 border border-white/10 opacity-60'
              }`}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable feed */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {filtered.length > 0 ? (
          filtered.map((candidate, idx) => (
            <div
              key={candidate.id}
              data-index={idx}
              ref={slideRefs}
              className="h-full snap-start"
            >
              <SwipeSlide
                candidate={candidate}
                sessionId={sessionId}
                sessionSlug={sessionSlug}
                isActive={idx === activeIndex}
                globalMuted={muted}
                onToggleMute={() => setMuted(!muted)}
              />
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/40 text-sm">Aucun candidat dans cette catégorie.</p>
          </div>
        )}
      </div>

      {/* Progress dots (right side) */}
      {filtered.length > 1 && filtered.length <= 20 && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
          {filtered.map((_, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all ${
                idx === activeIndex ? 'h-4 bg-white' : 'h-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
