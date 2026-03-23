'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getOfflineQueue,
  markSynced,
  clearSyncedItems,
  getPendingCount,
} from '@/lib/jury-offline-queue'

export function useJuryOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine)
    setPendingCount(getPendingCount())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync pending scores when back online
  const syncPending = useCallback(async () => {
    const queue = getOfflineQueue().filter((s) => !s.synced)
    if (queue.length === 0) return

    setSyncing(true)
    const supabase = createClient()

    for (const item of queue) {
      try {
        // Try upsert — if score already exists for this juror+candidate+event, update it
        const { data: existing } = await supabase
          .from('jury_scores')
          .select('id')
          .eq('juror_id', item.juror_id)
          .eq('candidate_id', item.candidate_id)
          .eq('event_type', item.event_type)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from('jury_scores')
            .update({
              scores: item.scores,
              total_score: item.total_score,
              comment: item.comment,
              viewed_at: item.viewed_at,
              watch_seconds: item.watch_seconds,
            })
            .eq('id', existing.id)
          if (!error) markSynced(item.id)
        } else {
          const { error } = await supabase.from('jury_scores').insert({
            session_id: item.session_id,
            juror_id: item.juror_id,
            candidate_id: item.candidate_id,
            event_type: item.event_type,
            scores: item.scores,
            total_score: item.total_score,
            comment: item.comment,
            viewed_at: item.viewed_at,
            watch_seconds: item.watch_seconds,
          })
          if (!error) markSynced(item.id)
        }
      } catch {
        // Will retry on next sync
      }
    }

    clearSyncedItems()
    setPendingCount(getPendingCount())
    setSyncing(false)
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending()
    }
  }, [isOnline, pendingCount, syncPending])

  // Refresh pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingCount())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return { isOnline, pendingCount, syncing, syncPending }
}
