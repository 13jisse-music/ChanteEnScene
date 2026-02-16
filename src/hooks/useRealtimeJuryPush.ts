'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL = 5_000 // 5s fallback polling

interface JuryPushState {
  currentCandidateId: string | null
  currentCategory: string | null
  isVotingOpen: boolean
  eventStatus: string
  winnerCandidateId: string | null
  winnerRevealedAt: string | null
}

const INITIAL_STATE: JuryPushState = {
  currentCandidateId: null,
  currentCategory: null,
  isVotingOpen: false,
  eventStatus: 'pending',
  winnerCandidateId: null,
  winnerRevealedAt: null,
}

export function useRealtimeJuryPush(eventId: string | null, sessionId?: string) {
  const [activeEventId, setActiveEventId] = useState<string | null>(eventId)
  const [state, setState] = useState<JuryPushState>(INITIAL_STATE)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const discoverRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const lastJsonRef = useRef('')

  // Only update state if the data actually changed
  const updateIfChanged = useCallback((newState: JuryPushState) => {
    const json = JSON.stringify(newState)
    if (json !== lastJsonRef.current) {
      lastJsonRef.current = json
      setState(newState)
    }
  }, [])

  // Sync with prop changes
  useEffect(() => {
    if (eventId) setActiveEventId(eventId)
  }, [eventId])

  // Auto-discover event when none provided (page loaded before event existed)
  useEffect(() => {
    if (activeEventId || !sessionId) return

    const supabase = createClient()
    let cancelled = false

    async function checkExisting() {
      const { data } = await supabase
        .from('live_events')
        .select('id')
        .eq('session_id', sessionId!)
        .in('status', ['pending', 'live', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (data) {
        setActiveEventId(data.id)
        return
      }

      // No event yet — subscribe to INSERT events for this session
      const channel = supabase
        .channel(`discover-event-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_events',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const row = payload.new as { id: string }
            setActiveEventId(row.id)
          }
        )
        .subscribe()

      discoverRef.current = channel
    }

    checkExisting()

    return () => {
      cancelled = true
      if (discoverRef.current) {
        supabase.removeChannel(discoverRef.current)
        discoverRef.current = null
      }
    }
  }, [activeEventId, sessionId])

  // Clean up discovery channel once we have an event
  useEffect(() => {
    if (activeEventId && discoverRef.current) {
      const supabase = createClient()
      supabase.removeChannel(discoverRef.current)
      discoverRef.current = null
    }
  }, [activeEventId])

  // Load initial state
  useEffect(() => {
    if (!activeEventId) return

    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('live_events')
        .select('current_candidate_id, current_category, is_voting_open, status, winner_candidate_id, winner_revealed_at')
        .eq('id', activeEventId!)
        .single()

      if (data) {
        updateIfChanged({
          currentCandidateId: data.current_candidate_id,
          currentCategory: data.current_category,
          isVotingOpen: data.is_voting_open,
          eventStatus: data.status,
          winnerCandidateId: data.winner_candidate_id || null,
          winnerRevealedAt: data.winner_revealed_at || null,
        })
      }
    }

    load()
  }, [activeEventId, updateIfChanged])

  // Subscribe to changes + polling fallback
  useEffect(() => {
    if (!activeEventId) return

    const supabase = createClient()

    // Realtime subscription
    const channel = supabase
      .channel(`jury-push-${activeEventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_events',
          filter: `id=eq.${activeEventId}`,
        },
        (payload) => {
          const row = payload.new as {
            current_candidate_id: string | null
            current_category: string | null
            is_voting_open: boolean
            status: string
            winner_candidate_id: string | null
            winner_revealed_at: string | null
          }
          updateIfChanged({
            currentCandidateId: row.current_candidate_id,
            currentCategory: row.current_category,
            isVotingOpen: row.is_voting_open,
            eventStatus: row.status,
            winnerCandidateId: row.winner_candidate_id || null,
            winnerRevealedAt: row.winner_revealed_at || null,
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    // Polling fallback (handles mobile browsers where WebSocket is unreliable)
    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('live_events')
        .select('current_candidate_id, current_category, is_voting_open, status, winner_candidate_id, winner_revealed_at')
        .eq('id', activeEventId!)
        .single()

      if (data) {
        updateIfChanged({
          currentCandidateId: data.current_candidate_id,
          currentCategory: data.current_category,
          isVotingOpen: data.is_voting_open,
          eventStatus: data.status,
          winnerCandidateId: data.winner_candidate_id || null,
          winnerRevealedAt: data.winner_revealed_at || null,
        })
      }
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
  }, [activeEventId, updateIfChanged])

  return state
}
