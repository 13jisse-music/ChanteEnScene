import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let vapidReady = false
try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:inscriptions@chantenscene.fr',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidReady = true
  }
} catch {
  // VAPID keys invalid — push notifications disabled
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export type PushSegment =
  | 'all_candidates'
  | 'approved'
  | 'semifinalist'
  | 'finalist'
  | 'specific_candidate'

interface SendPushOptions {
  sessionId: string
  role?: 'public' | 'jury' | 'admin' | 'all'
  jurorId?: string
  endpoint?: string
  segment?: PushSegment
  candidateId?: string
  payload: PushPayload
}

export async function sendPushNotifications(options: SendPushOptions) {
  if (!vapidReady) return { sent: 0, failed: 0, expired: 0 }

  const { sessionId, role = 'all', jurorId, endpoint, segment, candidateId, payload } = options
  const supabase = createAdminClient()

  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[] | null = null

  if (segment) {
    // Segment-based targeting: find candidates by status, get fingerprints,
    // then find matching push_subscriptions
    let candidateQuery = supabase
      .from('candidates')
      .select('fingerprint')
      .eq('session_id', sessionId)
      .not('fingerprint', 'is', null)

    if (segment === 'specific_candidate' && candidateId) {
      candidateQuery = candidateQuery.eq('id', candidateId)
    } else if (segment !== 'all_candidates') {
      const statusMap: Record<string, string> = {
        approved: 'approved',
        semifinalist: 'semifinalist',
        finalist: 'finalist',
      }
      const status = statusMap[segment]
      if (status) {
        candidateQuery = candidateQuery.eq('status', status)
      }
    }

    const { data: candidates } = await candidateQuery
    const fingerprints = (candidates || [])
      .map((c) => c.fingerprint)
      .filter((f): f is string => !!f)

    if (fingerprints.length === 0) {
      return { sent: 0, failed: 0, expired: 0 }
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('session_id', sessionId)
      .in('fingerprint', fingerprints)

    if (error || !data || data.length === 0) {
      return { sent: 0, failed: 0, expired: 0 }
    }
    subscriptions = data
  } else {
    // Role-based targeting (existing behavior)
    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('session_id', sessionId)

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    } else if (role !== 'all') {
      query = query.eq('role', role)
    }
    if (jurorId) {
      query = query.eq('juror_id', jurorId)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return { sent: 0, failed: 0, expired: 0 }
    }
    subscriptions = data
  }

  const fullPayload: PushPayload = {
    icon: '/images/pwa-icon-192.png',
    badge: '/images/pwa-badge-96.png',
    ...payload,
  }

  const payloadString = JSON.stringify(fullPayload)
  const expiredIds: string[] = []
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadString,
          { TTL: 3600 }
        )
        sent++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id)
        }
        failed++
      }
    })
  )

  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds)
  }

  return { sent, failed, expired: expiredIds.length }
}
