'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Winner {
  name: string
  photo: string | null
  category: string
}

type RevealPhase = 'idle' | 'countdown' | 'revealed'

const MAX_AGE_MS = 120_000 // 2 minutes — ignore stale reveals on fresh page loads

export function useWinnerReveal(
  event: {
    id: string
    winner_candidate_id?: string | null
    winner_revealed_at?: string | null
  },
  options?: { skipCountdown?: boolean }
) {
  const [winner, setWinner] = useState<Winner | null>(null)
  const [phase, setPhase] = useState<RevealPhase>('idle')
  const prevRevealedAt = useRef<string | null>(null) // start null — not from props
  const triggeredRef = useRef(false)

  useEffect(() => {
    const currentRevealedAt = event.winner_revealed_at || null
    const candidateId = event.winner_candidate_id || null

    // Nothing to reveal
    if (!currentRevealedAt || !candidateId) {
      prevRevealedAt.current = currentRevealedAt
      return
    }

    // Already triggered for this exact timestamp
    if (currentRevealedAt === prevRevealedAt.current) return

    // Check if the reveal is recent enough
    const ageMs = Date.now() - new Date(currentRevealedAt).getTime()
    if (ageMs > MAX_AGE_MS) {
      prevRevealedAt.current = currentRevealedAt
      return
    }

    // Prevent duplicate triggers
    if (triggeredRef.current && prevRevealedAt.current === currentRevealedAt) return
    triggeredRef.current = true
    prevRevealedAt.current = currentRevealedAt

    // Start countdown or go directly to revealed
    setPhase(options?.skipCountdown ? 'revealed' : 'countdown')

    // Fetch candidate data (during countdown so no delay after)
    const supabase = createClient()
    supabase
      .from('candidates')
      .select('first_name, last_name, stage_name, photo_url, category')
      .eq('id', candidateId)
      .single()
      .then(({ data }) => {
        if (data) {
          setWinner({
            name: data.stage_name || `${data.first_name} ${data.last_name}`,
            photo: data.photo_url,
            category: data.category,
          })
        }
      })
  }, [event.winner_revealed_at, event.winner_candidate_id, options?.skipCountdown])

  function completeCountdown() {
    setPhase('revealed')
  }

  function dismiss() {
    setWinner(null)
    setPhase('idle')
    triggeredRef.current = false
  }

  return { winner, phase, completeCountdown, dismiss }
}
