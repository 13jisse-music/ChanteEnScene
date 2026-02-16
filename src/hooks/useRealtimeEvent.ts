'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL = 5_000 // 5s fallback polling
const EVENT_FIELDS = 'id, event_type, status, current_candidate_id, current_category, is_voting_open, winner_candidate_id, winner_revealed_at'

interface LiveEvent {
  id: string
  event_type: string
  status: string
  current_candidate_id: string | null
  current_category: string | null
  is_voting_open: boolean
  winner_candidate_id?: string | null
  winner_revealed_at?: string | null
}

export function useRealtimeEvent(initialEvent: LiveEvent) {
  const [event, setEvent] = useState<LiveEvent>(initialEvent)
  const eventIdRef = useRef(initialEvent.id)
  const lastJsonRef = useRef(JSON.stringify(initialEvent))

  // Only update state if the event actually changed (avoids unnecessary re-renders)
  const updateIfChanged = useCallback((data: LiveEvent) => {
    const json = JSON.stringify(data)
    if (json !== lastJsonRef.current) {
      lastJsonRef.current = json
      setEvent(data)
    }
  }, [])

  // Sync state when server provides updated props (via router.refresh())
  useEffect(() => {
    eventIdRef.current = initialEvent.id
    updateIfChanged(initialEvent)
  }, [initialEvent, updateIfChanged])

  useEffect(() => {
    if (!initialEvent?.id) return

    const supabase = createClient()

    // Realtime subscription (instant when WebSocket works)
    const channel = supabase
      .channel(`live-event-${initialEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_events',
          filter: `id=eq.${initialEvent.id}`,
        },
        (payload) => {
          updateIfChanged(payload.new as LiveEvent)
        }
      )
      .subscribe()

    // Polling fallback (handles mobile browsers where WebSocket is unreliable)
    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('live_events')
        .select(EVENT_FIELDS)
        .eq('id', eventIdRef.current)
        .single()
      if (data) updateIfChanged(data as LiveEvent)
    }

    const interval = setInterval(poll, POLL_INTERVAL)

    // Also poll immediately when page regains visibility
    function handleVisibility() {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [initialEvent.id, updateIfChanged])

  return event
}
