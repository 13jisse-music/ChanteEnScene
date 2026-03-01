'use client'

import { useState, useEffect, useRef } from 'react'
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

const STATUS_PRIORITY: Record<string, number> = {
  winner: 4,
  finalist: 3,
  semifinalist: 2,
  approved: 1,
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
  { key: 'semifinalist', label: 'Demi-finalistes', icon: '🥈' },
  { key: 'approved', label: 'Sélectionnés', icon: '🥉' },
]

/* ─── Single Post Card ─── */
function FeedPost({
  candidate,
  sessionId,
  sessionSlug,
}: {
  candidate: Candidate
  sessionId: string
  sessionSlug: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [likes, setLikes] = useState(candidate.likes_count)
  const [hasVoted, setHasVoted] = useState(false)
  const [voting, setVoting] = useState(false)
  const [heartPop, setHeartPop] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showVideo, setShowVideo] = useState(candidate.video_public && !!candidate.video_url)
  const [muted, setMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const accent = candidate.accent_color || '#e91e8c'
  const hasPublicVideo = candidate.video_public && candidate.video_url

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

  // IntersectionObserver for video autoplay
  useEffect(() => {
    const video = videoRef.current
    if (!video || !showVideo) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
          setIsPlaying(true)
        } else {
          video.pause()
          setIsPlaying(false)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [showVideo])

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

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  return (
    <article
      className={`bg-[#1a1232] border rounded-2xl overflow-hidden shadow-lg hover:border-[#3e3565] transition-colors ${
        candidate.status === 'winner'
          ? 'border-[#ffd700]/40 shadow-[#ffd700]/10 ring-1 ring-[#ffd700]/15'
          : candidate.status === 'finalist'
            ? 'border-[#8b5cf6]/40 shadow-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]/15'
            : candidate.status === 'semifinalist'
              ? 'border-[#7ec850]/30 shadow-black/20 ring-1 ring-[#7ec850]/10'
              : 'border-[#2e2555] shadow-black/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {/* Avatar */}
        <Link href={`/${sessionSlug}/candidats/${candidate.slug}`} className="shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 hover:scale-105 transition-transform" style={{ borderColor: accent }}>
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0d0b1a] text-lg">🎤</div>
            )}
          </div>
        </Link>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <Link href={`/${sessionSlug}/candidats/${candidate.slug}`} className="hover:underline">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-[15px] text-white truncate leading-tight flex items-center gap-1.5">
              {STATUS_LABELS[candidate.status] && (
                <span className="shrink-0" title={STATUS_LABELS[candidate.status].label}>{STATUS_LABELS[candidate.status].medal}</span>
              )}
              {displayName}
            </h3>
          </Link>
          <p className="text-[#6b5d85] text-xs truncate">
            {candidate.category} &middot; 🎵 {candidate.song_title} — {candidate.song_artist}
          </p>
        </div>

        {/* Category badge */}
        <span
          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
        >
          {candidate.category}
        </span>

        {STATUS_LABELS[candidate.status] && candidate.status !== 'approved' && (
          <span
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              background: `${STATUS_LABELS[candidate.status].color}15`,
              color: STATUS_LABELS[candidate.status].color,
              border: `1px solid ${STATUS_LABELS[candidate.status].color}30`,
            }}
          >
            {STATUS_LABELS[candidate.status].label}
          </span>
        )}
      </div>

      {/* Media */}
      <div className="relative bg-black">
        {showVideo && candidate.video_url ? (
          <div className="relative aspect-video">
            {getYouTubeId(candidate.video_url) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(candidate.video_url)}?autoplay=1&rel=0&mute=${muted ? 1 : 0}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={candidate.video_url}
                  muted={muted}
                  loop
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  onClick={togglePlay}
                />
                {/* Play/pause overlay */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                )}
              </>
            )}
            {/* Mute toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <Link href={`/${sessionSlug}/candidats/${candidate.slug}`} className="block">
            <div className="relative aspect-[4/3] overflow-hidden">
              {candidate.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={displayName}
                  className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0d0b1a] text-7xl text-white/10">
                  🎤
                </div>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Toggle photo/video */}
      {hasPublicVideo && (
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setShowVideo(false)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !showVideo
                ? 'bg-[#e91e8c]/10 text-[#e91e8c] border border-[#e91e8c]/25'
                : 'bg-white/5 text-[#6b5d85] border border-[#2e2555] hover:text-[#a899c2]'
            }`}
          >
            Photo
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showVideo
                ? 'bg-[#e91e8c]/10 text-[#e91e8c] border border-[#e91e8c]/25'
                : 'bg-white/5 text-[#6b5d85] border border-[#2e2555] hover:text-[#a899c2]'
            }`}
          >
            Vidéo
          </button>
        </div>
      )}

      {/* Bio */}
      {candidate.bio && (
        <div className="px-4 pt-3">
          <p className={`text-[#a899c2] text-sm leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {candidate.bio}
          </p>
          {candidate.bio.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs mt-1 hover:underline"
              style={{ color: accent }}
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      {/* Footer: actions */}
      <div className="flex items-center gap-1 px-4 py-3 mt-1 border-t border-[#2e2555]/50">
        {/* Vote */}
        <button
          onClick={handleVote}
          disabled={hasVoted || voting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            hasVoted
              ? 'bg-[#e91e8c]/15 text-[#e91e8c]'
              : 'hover:bg-white/5 text-[#a899c2] hover:text-[#e91e8c] active:scale-95'
          } ${heartPop ? 'animate-bounce' : ''}`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-colors ${hasVoted ? 'fill-[#e91e8c] text-[#e91e8c]' : 'fill-none text-current'}`} stroke="currentColor" strokeWidth={hasVoted ? 0 : 2}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="tabular-nums">{likes}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#a899c2] hover:bg-white/5 hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Partager
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Profile link */}
        <Link
          href={`/${sessionSlug}/candidats/${candidate.slug}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#a899c2] hover:bg-white/5 hover:text-white transition-colors"
        >
          Voir le profil
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  )
}

/* ─── Main Desktop Feed ─── */
export default function CandidateDesktopFeed({ candidates, sessionId, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'likes' | 'name'>('likes')
  const pathname = usePathname()
  const sessionSlug = pathname.split('/')[1]

  // Only show status filter options that have candidates
  const availableStatusFilters = STATUS_FILTER_OPTIONS.filter(
    (opt) => opt.key === null || candidates.some((c) => c.status === opt.key)
  )

  const filtered = candidates
    .filter((c) => !activeCategory || c.category === activeCategory)
    .filter((c) => !activeStatus || c.status === activeStatus)
    .sort((a, b) => {
      const aPriority = STATUS_PRIORITY[a.status] || 0
      const bPriority = STATUS_PRIORITY[b.status] || 0
      if (aPriority !== bPriority) return bPriority - aPriority
      if (sortBy === 'likes') return b.likes_count - a.likes_count
      const nameA = a.stage_name || `${a.first_name} ${a.last_name}`
      const nameB = b.stage_name || `${b.first_name} ${b.last_name}`
      return nameA.localeCompare(nameB)
    })

  return (
    <div className="flex gap-8 max-w-4xl mx-auto">
      {/* Main column */}
      <div className="flex-1 max-w-[650px] mx-auto space-y-6">
        {/* Status filter (horizontal pills) */}
        {availableStatusFilters.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {availableStatusFilters.map((opt) => {
              const count = opt.key === null
                ? candidates.filter((c) => !activeCategory || c.category === activeCategory).length
                : candidates.filter((c) => c.status === opt.key && (!activeCategory || c.category === activeCategory)).length
              return (
                <button
                  key={opt.key ?? 'all'}
                  onClick={() => setActiveStatus(opt.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeStatus === opt.key
                      ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                      : 'bg-white/5 text-[#a899c2] border border-[#2e2555] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Counter */}
        <p className="text-[#6b5d85] text-sm text-center">
          {filtered.length} candidat{filtered.length > 1 ? 's' : ''}
          {activeCategory ? ` dans ${activeCategory}` : ''}
          {activeStatus && STATUS_LABELS[activeStatus] ? ` — ${STATUS_LABELS[activeStatus].label}s` : ''}
        </p>

        {filtered.length > 0 ? (
          filtered.map((candidate) => (
            <FeedPost
              key={candidate.id}
              candidate={candidate}
              sessionId={sessionId}
              sessionSlug={sessionSlug}
            />
          ))
        ) : (
          <p className="text-center text-[#6b5d85] py-12">
            Aucun candidat dans cette catégorie.
          </p>
        )}
      </div>

      {/* Sidebar (sticky) */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-28 space-y-6">
          {/* Category filters */}
          <div className="bg-[#1a1232] border border-[#2e2555] rounded-2xl p-4 space-y-2">
            <p className="text-[#6b5d85] text-xs uppercase tracking-wider mb-3">Catégories</p>
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                !activeCategory
                  ? 'bg-[#e91e8c]/10 text-[#e91e8c]'
                  : 'text-[#a899c2] hover:bg-white/5'
              }`}
            >
              Tous ({candidates.length})
            </button>
            {categories.map((cat) => {
              const count = candidates.filter((c) => c.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#e91e8c]/10 text-[#e91e8c]'
                      : 'text-[#a899c2] hover:bg-white/5'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <div className="bg-[#1a1232] border border-[#2e2555] rounded-2xl p-4 space-y-2">
            <p className="text-[#6b5d85] text-xs uppercase tracking-wider mb-3">Trier par</p>
            <button
              onClick={() => setSortBy('likes')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                sortBy === 'likes'
                  ? 'bg-white/10 text-white'
                  : 'text-[#a899c2] hover:bg-white/5'
              }`}
            >
              Populaires
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-white/10 text-white'
                  : 'text-[#a899c2] hover:bg-white/5'
              }`}
            >
              A — Z
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
