'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL = 8_000 // 8s — lighter than the 5s hooks since this triggers a full server re-render

export default function LiveEventWatcher({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const lastHashRef = useRef('')

  useEffect(() => {
    const supabase = createClient()

    // Realtime subscription (instant when WebSocket works)
    const channel = supabase
      .channel(`live-watcher-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_events',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    // Polling fallback — check if event state changed, only refresh if it did
    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('live_events')
        .select('id, status, current_candidate_id, is_voting_open, winner_candidate_id, winner_revealed_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        const hash = JSON.stringify(data)
        if (hash !== lastHashRef.current) {
          lastHashRef.current = hash
          router.refresh()
        }
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)

    function handleVisibility() {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [sessionId, router])

  return null
}
