'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'

interface Props {
  candidateId: string
  sessionId: string
  initialLikes: number
  accent: string
}

export default function CandidateVoteButton({ candidateId, sessionId, initialLikes, accent }: Props) {
  const [likes, setLikes] = useState(initialLikes)
  const [hasVoted, setHasVoted] = useState(false)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const fp = await getFingerprint()
        const supabase = createClient()
        const { data } = await supabase
          .from('votes')
          .select('id')
          .eq('candidate_id', candidateId)
          .eq('fingerprint', fp)
          .maybeSingle()
        if (data) setHasVoted(true)
      } catch {
        // ignore
      }
    }
    check()
  }, [candidateId])

  async function handleVote() {
    if (hasVoted || voting) return
    setVoting(true)
    try {
      const fp = await getFingerprint()
      const supabase = createClient()
      const { error } = await supabase.rpc('vote_for_candidate', {
        p_session_id: sessionId,
        p_candidate_id: candidateId,
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleVote}
        disabled={hasVoted || voting}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:cursor-default"
        style={
          hasVoted
            ? { background: `${accent}20`, color: accent }
            : { background: `${accent}`, color: '#fff', boxShadow: `0 4px 20px ${accent}40` }
        }
      >
        <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-colors ${hasVoted ? `fill-current` : 'fill-none stroke-current stroke-2'}`}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="tabular-nums">{likes}</span>
      </button>
    </div>
  )
}
