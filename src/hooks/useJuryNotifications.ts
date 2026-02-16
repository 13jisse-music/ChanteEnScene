'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ToastProvider'

const POLL_INTERVAL = 5_000 // 5s fallback polling

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
}

interface JuryScoreEntry {
  jurorId: string
  totalScore: number
}

interface UseJuryNotificationsOptions {
  sessionId: string
  eventType: string
  jurors: Juror[]
  candidates: Candidate[]
  enabled: boolean
}

function buildMap(data: { juror_id: string; candidate_id: string; total_score: number }[]) {
  const map: Record<string, JuryScoreEntry[]> = {}
  for (const s of data) {
    if (!map[s.candidate_id]) map[s.candidate_id] = []
    const existing = map[s.candidate_id].find((e) => e.jurorId === s.juror_id)
    if (existing) {
      existing.totalScore = s.total_score
    } else {
      map[s.candidate_id].push({ jurorId: s.juror_id, totalScore: s.total_score })
    }
  }
  return map
}

export function useJuryNotifications({
  sessionId,
  eventType,
  jurors,
  candidates,
  enabled,
}: UseJuryNotificationsOptions) {
  const { addToast } = useToast()
  // Map: candidateId → array of { jurorId, totalScore }
  const [candidateJurorMap, setCandidateJurorMap] = useState<Record<string, JuryScoreEntry[]>>({})
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const initialLoadDone = useRef(false)
  const lastJsonRef = useRef('')

  // Merge fetched data into state (only if changed)
  const mergeIfChanged = useCallback((data: { juror_id: string; candidate_id: string; total_score: number }[]) => {
    const map = buildMap(data)
    const json = JSON.stringify(map)
    if (json !== lastJsonRef.current) {
      lastJsonRef.current = json
      setCandidateJurorMap(map)
    }
  }, [])

  // Load existing jury scores on mount
  useEffect(() => {
    if (!enabled || !sessionId) return

    async function loadExisting() {
      const supabase = createClient()
      const { data } = await supabase
        .from('jury_scores')
        .select('juror_id, candidate_id, total_score')
        .eq('session_id', sessionId)
        .eq('event_type', eventType)

      if (data) {
        mergeIfChanged(data)
      }
      initialLoadDone.current = true
    }

    loadExisting()
  }, [sessionId, eventType, enabled, mergeIfChanged])

  // Subscribe to real-time INSERT + UPDATE on jury_scores + polling fallback
  useEffect(() => {
    if (!enabled || !sessionId) return

    const supabase = createClient()
    const channel = supabase
      .channel('jury-votes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jury_scores',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as {
              juror_id?: string
              candidate_id?: string
              total_score?: number
              event_type?: string
            }

            // Only track scores for the current event type
            if (row.event_type && row.event_type !== eventType) return

            // Toast notification (only after initial load to avoid flooding)
            if (initialLoadDone.current) {
              const juror = jurors.find((j) => j.id === row.juror_id)
              const candidate = candidates.find((c) => c.id === row.candidate_id)
              const jurorName = juror
                ? `${juror.first_name || ''} ${juror.last_name || ''}`.trim() || 'Jure'
                : 'Jure'
              const candidateName = candidate
                ? candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
                : 'Candidat'

              addToast({
                message: `${jurorName} a note ${candidateName} — ${row.total_score ?? '?'} pts`,
                emoji: '🎯',
              })
            }

            // Update candidate-juror map
            if (row.juror_id && row.candidate_id) {
              setCandidateJurorMap((prev) => {
                const current = [...(prev[row.candidate_id!] || [])]
                const idx = current.findIndex((e) => e.jurorId === row.juror_id!)
                if (idx >= 0) {
                  current[idx] = { jurorId: row.juror_id!, totalScore: row.total_score || 0 }
                } else {
                  current.push({ jurorId: row.juror_id!, totalScore: row.total_score || 0 })
                }
                return { ...prev, [row.candidate_id!]: current }
              })
            }
          }

          // Handle DELETE (e.g., reset jury scores)
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { candidate_id?: string }
            if (old.candidate_id) {
              setCandidateJurorMap((prev) => {
                const updated = { ...prev }
                delete updated[old.candidate_id!]
                return updated
              })
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    // Polling fallback (handles dropped WebSocket connections)
    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('jury_scores')
        .select('juror_id, candidate_id, total_score')
        .eq('session_id', sessionId)
        .eq('event_type', eventType)
      if (data) mergeIfChanged(data)
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
  }, [sessionId, eventType, enabled, jurors, candidates, addToast, mergeIfChanged])

  // Helper: get jury scores for a specific candidate
  const getJuryScoresForCandidate = useCallback(
    (candidateId: string): JuryScoreEntry[] => {
      return candidateJurorMap[candidateId] || []
    },
    [candidateJurorMap]
  )

  // Helper: get jury count for a specific candidate
  const getJuryCountForCandidate = useCallback(
    (candidateId: string): number => {
      return (candidateJurorMap[candidateId] || []).length
    },
    [candidateJurorMap]
  )

  // Helper: get jury total score for a specific candidate
  const getJuryTotalForCandidate = useCallback(
    (candidateId: string): number => {
      const entries = candidateJurorMap[candidateId] || []
      return entries.reduce((sum, e) => sum + e.totalScore, 0)
    },
    [candidateJurorMap]
  )

  // Helper: get jury average score for a specific candidate
  const getJuryAvgForCandidate = useCallback(
    (candidateId: string): number => {
      const entries = candidateJurorMap[candidateId] || []
      if (entries.length === 0) return 0
      return entries.reduce((sum, e) => sum + e.totalScore, 0) / entries.length
    },
    [candidateJurorMap]
  )

  return {
    candidateJurorMap,
    getJuryScoresForCandidate,
    getJuryCountForCandidate,
    getJuryTotalForCandidate,
    getJuryAvgForCandidate,
  }
}
