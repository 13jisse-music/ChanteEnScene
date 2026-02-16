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
    <div className="flex items-center gap-4">
      <button
        onClick={handleVote}
        disabled={hasVoted || voting}
        className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:cursor-default"
        style={
          hasVoted
            ? { background: `${accent}20`, color: accent }
            : { background: `${accent}`, color: '#fff', boxShadow: `0 4px 20px ${accent}40` }
        }
      >
        <span className="text-lg">{hasVoted ? '❤️' : '🤍'}</span>
        {hasVoted ? 'Merci pour votre vote !' : 'Voter pour ce candidat'}
      </button>
      <span className="text-[#6b5d85] text-sm font-medium tabular-nums">
        {likes} {likes <= 1 ? 'vote' : 'votes'}
      </span>
    </div>
  )
}
