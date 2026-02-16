'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFingerprint } from '@/lib/fingerprint'

interface UsePushSubscriptionOptions {
  sessionId: string
  role?: 'public' | 'jury' | 'admin'
  jurorId?: string
  autoSubscribe?: boolean
}

export function usePushSubscription({
  sessionId,
  role = 'public',
  jurorId,
  autoSubscribe = false,
}: UsePushSubscriptionOptions) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'PushManager' in window &&
    'serviceWorker' in navigator

  useEffect(() => {
    if (!isSupported) return
    setPermission(Notification.permission)

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported) return false
    setIsLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setIsLoading(false)
        return false
      }

      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const rawKeys = subscription.toJSON()
      const fingerprint = await getFingerprint()

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          endpoint: rawKeys.endpoint,
          p256dh: rawKeys.keys!.p256dh,
          auth: rawKeys.keys!.auth,
          role,
          jurorId: jurorId || null,
          fingerprint,
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        setIsLoading(false)
        return true
      }
    } catch (err) {
      console.error('Push subscription failed:', err)
    }

    setIsLoading(false)
    return false
  }, [sessionId, role, jurorId, isSupported])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, endpoint: subscription.endpoint }),
        })
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    }
    setIsLoading(false)
  }, [sessionId])

  // Auto re-subscribe if permission already granted
  useEffect(() => {
    if (autoSubscribe && permission === 'granted' && !isSubscribed && isSupported) {
      subscribe()
    }
  }, [autoSubscribe, permission, isSubscribed, isSupported, subscribe])

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  }
}
