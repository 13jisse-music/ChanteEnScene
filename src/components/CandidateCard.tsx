'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'

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
  status?: string
}

interface Props {
  candidate: Candidate
  sessionId: string
  isSemifinalist?: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string; medal: string }> = {
  winner: { label: 'Gagnant(e)', color: '#ffd700', medal: '🏆' },
  finalist: { label: 'Finaliste', color: '#8b5cf6', medal: '🥇' },
  semifinalist: { label: 'Demi-finaliste', color: '#7ec850', medal: '🥈' },
  approved: { label: 'Sélectionné(e)', color: '#e91e8c', medal: '🥉' },
}

export default function CandidateCard({ candidate, sessionId, isSemifinalist }: Props) {
  const [likes, setLikes] = useState(candidate.likes_count)
  const [hasVoted, setHasVoted] = useState(false)
  const [voting, setVoting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const pathname = usePathname()
  const sessionSlug = pathname.split('/')[1]
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const accent = candidate.accent_color || '#e91e8c'

  // Check if user already voted
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
      }
    } catch {
      // ignore
    } finally {
      setVoting(false)
    }
  }

  return (
    <div
      className={`group bg-[#1a1232] border rounded-2xl overflow-hidden hover:border-opacity-60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#e91e8c]/10 shadow-lg shadow-black/20 ${
        candidate.status === 'winner'
          ? 'border-[#ffd700]/40 ring-1 ring-[#ffd700]/15'
          : candidate.status === 'finalist'
            ? 'border-[#8b5cf6]/40 ring-1 ring-[#8b5cf6]/15'
            : isSemifinalist || candidate.status === 'semifinalist'
              ? 'border-[#7ec850]/30 ring-1 ring-[#7ec850]/10'
              : 'border-[#2e2555]'
      }`}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Photo */}
      <Link href={`/${sessionSlug}/candidats/${candidate.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-[#1a1232] cursor-pointer">
        {candidate.photo_url ? (
          <img
            src={candidate.photo_url}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-white/20">
            🎤
          </div>
        )}

        {/* Category badge */}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
        >
          {candidate.category}
        </span>

        {/* Status badge */}
        {(candidate.status && STATUS_LABELS[candidate.status]) && (
          <span
            className="absolute top-3 right-12 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
            style={{
              background: `${STATUS_LABELS[candidate.status].color}20`,
              color: STATUS_LABELS[candidate.status].color,
              border: `1px solid ${STATUS_LABELS[candidate.status].color}40`,
            }}
          >
            {STATUS_LABELS[candidate.status].label}
          </span>
        )}

        {/* Video play button */}
        {candidate.video_url && (
          <button
            type="button"
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(candidate.video_url!, '_blank', 'noopener,noreferrer') }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1a1232] to-transparent" />
      </Link>

      {/* Info */}
      <div className="p-4 -mt-4 relative">
        <Link href={`/${sessionSlug}/candidats/${candidate.slug}`} className="hover:underline">
          <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-lg leading-tight mb-1 truncate flex items-center gap-1.5">
            {candidate.status && STATUS_LABELS[candidate.status] && (
              <span className="shrink-0">{STATUS_LABELS[candidate.status].medal}</span>
            )}
            {displayName}
          </h3>
        </Link>
        <p className="text-[#6b5d85] text-sm truncate">
          🎵 {candidate.song_title} — {candidate.song_artist}
        </p>

        {/* Bio (expandable) */}
        {candidate.bio && (
          <div className="mt-3">
            <p className={`text-[#6b5d85] text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {candidate.bio}
            </p>
            {candidate.bio.length > 100 && (
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

        {/* Vote button */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2e2555]">
          <button
            onClick={handleVote}
            disabled={hasVoted || voting}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              hasVoted
                ? 'bg-[#e91e8c]/15 text-[#e91e8c] cursor-default'
                : 'bg-white/5 border border-[#2e2555] hover:bg-[#e91e8c]/10 hover:border-[#e91e8c]/30 hover:text-[#e91e8c] active:scale-95'
            }`}
          >
            <span className={`transition-transform ${hasVoted ? 'scale-110' : ''}`}>
              {hasVoted ? '❤️' : '🤍'}
            </span>
            {hasVoted ? 'Voté !' : 'Voter'}
          </button>

          <span className="text-[#6b5d85] text-sm font-medium tabular-nums">
            {likes} {likes <= 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>
    </div>
  )
}
