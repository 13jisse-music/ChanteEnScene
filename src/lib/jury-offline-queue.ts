/**
 * Jury Offline Queue — localStorage-based queue for jury scores
 * when the network is unavailable during live events.
 */

export interface PendingScore {
  id: string
  session_id: string
  juror_id: string
  candidate_id: string
  event_type: string
  scores: Record<string, unknown>
  total_score: number
  comment: string | null
  viewed_at?: string
  watch_seconds?: number
  timestamp: number
  synced: boolean
}

const STORAGE_KEY = 'ces_jury_offline_queue'

export function getOfflineQueue(): PendingScore[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToOfflineQueue(score: Omit<PendingScore, 'id' | 'timestamp' | 'synced'>): void {
  const queue = getOfflineQueue()

  // Replace existing score for same candidate+event_type (update, not duplicate)
  const existingIdx = queue.findIndex(
    (s) => s.candidate_id === score.candidate_id && s.event_type === score.event_type && !s.synced
  )

  const entry: PendingScore = {
    ...score,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    synced: false,
  }

  if (existingIdx >= 0) {
    queue[existingIdx] = entry
  } else {
    queue.push(entry)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function markSynced(id: string): void {
  const queue = getOfflineQueue()
  const item = queue.find((s) => s.id === id)
  if (item) {
    item.synced = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  }
}

export function getPendingCount(): number {
  return getOfflineQueue().filter((s) => !s.synced).length
}

export function clearSyncedItems(): void {
  const queue = getOfflineQueue().filter((s) => !s.synced)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}
