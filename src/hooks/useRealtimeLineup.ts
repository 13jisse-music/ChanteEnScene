'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LineupItem {
  id: string
  live_event_id: string
  candidate_id: string
  position: number
  status: string
  created_at: string
  started_at?: string | null
  ended_at?: string | null
  vote_opened_at?: string | null
  vote_closed_at?: string | null
  candidate?: {
    id: string
    first_name: string
    last_name: string
    stage_name: string | null
    category: string
    photo_url: string | null
    mp3_url: string | null
    song_title: string | null
    song_artist: string | null
  }
}

export function useRealtimeLineup(eventId: string, initialLineup: LineupItem[]) {
  const [lineup, setLineup] = useState<LineupItem[]>(initialLineup)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const prevIdsRef = useRef<string>('')

  useEffect(() => {
    // Reset if lineup IDs, statuses, or timing fields changed (avoids infinite loop from new array refs)
    const key = initialLineup.map((l) => `${l.id}:${l.status}:${l.ended_at || ''}:${l.vote_opened_at || ''}`).join(',')
    if (key !== prevIdsRef.current) {
      prevIdsRef.current = key
      setLineup(initialLineup)
    }
  }, [initialLineup])

  useEffect(() => {
    if (!eventId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`lineup-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lineup',
          filter: `live_event_id=eq.${eventId}`,
        },
        async (payload) => {
          const newRow = payload.new as LineupItem
          // Fetch candidate details for this new lineup item
          const { data: candidate } = await supabase
            .from('candidates')
            .select('id, first_name, last_name, stage_name, category, photo_url, mp3_url, song_title, song_artist')
            .eq('id', newRow.candidate_id)
            .single()

          setLineup((prev) => {
            // Prevent duplicates
            if (prev.some((item) => item.id === newRow.id)) return prev
            return [...prev, { ...newRow, candidate: candidate || undefined }]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lineup',
          filter: `live_event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as LineupItem
          setLineup((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    status: updated.status,
                    started_at: updated.started_at,
                    ended_at: updated.ended_at,
                    vote_opened_at: updated.vote_opened_at,
                    vote_closed_at: updated.vote_closed_at,
                  }
                : item
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'lineup',
          filter: `live_event_id=eq.${eventId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string }
          setLineup((prev) => prev.filter((item) => item.id !== deleted.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [eventId])

  return lineup
}
