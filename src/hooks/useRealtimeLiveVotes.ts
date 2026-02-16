'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL = 5_000 // 5s fallback polling

export function useRealtimeLiveVotes(eventId: string) {
  const [votesByCandidate, setVotesByCandidate] = useState<Map<string, number>>(new Map())
  const [totalVotes, setTotalVotes] = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const lastJsonRef = useRef('')

  // Build votes map from raw data, only update state if changed
  const mergeVotes = useCallback((data: { candidate_id: string }[]) => {
    const counts = new Map<string, number>()
    data.forEach((v) => {
      counts.set(v.candidate_id, (counts.get(v.candidate_id) || 0) + 1)
    })
    const json = JSON.stringify(Array.from(counts.entries()))
    if (json !== lastJsonRef.current) {
      lastJsonRef.current = json
      setVotesByCandidate(counts)
      setTotalVotes(data.length)
    }
  }, [])

  // Load initial vote counts
  useEffect(() => {
    if (!eventId) return

    async function loadVotes() {
      const supabase = createClient()
      const { data } = await supabase
        .from('live_votes')
        .select('candidate_id')
        .eq('live_event_id', eventId)

      if (data) mergeVotes(data)
    }

    loadVotes()
  }, [eventId, mergeVotes])

  // Subscribe to new votes + polling fallback
  useEffect(() => {
    if (!eventId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`live-votes-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_votes',
          filter: `live_event_id=eq.${eventId}`,
        },
        (payload) => {
          const candidateId = (payload.new as { candidate_id: string }).candidate_id
          setVotesByCandidate((prev) => {
            const next = new Map(prev)
            next.set(candidateId, (next.get(candidateId) || 0) + 1)
            return next
          })
          setTotalVotes((prev) => prev + 1)
        }
      )
      .subscribe()

    channelRef.current = channel

    // Polling fallback (handles dropped WebSocket connections)
    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('live_votes')
        .select('candidate_id')
        .eq('live_event_id', eventId)
      if (data) mergeVotes(data)
    }

    const interval = setInterval(poll, POLL_INTERVAL)

    function handleVisibility() {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [eventId, mergeVotes])

  function getVotesFor(candidateId: string): number {
    return votesByCandidate.get(candidateId) || 0
  }

  return { votesByCandidate, totalVotes, getVotesFor }
}
