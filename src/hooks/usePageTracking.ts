'use client'

import { useEffect, useRef } from 'react'
import { getFingerprint } from '@/lib/fingerprint'

interface TrackingOptions {
  sessionId: string
  candidateId?: string
  pagePath: string
}

export function usePageTracking({ sessionId, candidateId, pagePath }: TrackingOptions) {
  const startTime = useRef(Date.now())
  const fingerprintRef = useRef<string | null>(null)
  const hasSentInitial = useRef(false)

  useEffect(() => {
    let mounted = true
    startTime.current = Date.now()

    async function trackInitial() {
      try {
        const fp = await getFingerprint()
        if (!mounted) return
        fingerprintRef.current = fp

        if (hasSentInitial.current) return
        hasSentInitial.current = true

        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            candidateId: candidateId || null,
            pagePath,
            fingerprint: fp,
            referrer: document.referrer || null,
            duration: 0,
          }),
        })
      } catch {
        // Silently fail — tracking should not break the page
      }
    }

    trackInitial()

    function sendDuration() {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      if (duration < 2) return // Ignore very short visits

      const payload = JSON.stringify({
        sessionId,
        candidateId: candidateId || null,
        pagePath,
        fingerprint: fingerprintRef.current,
        referrer: document.referrer || null,
        duration,
      })

      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', sendDuration)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendDuration()
    })

    return () => {
      mounted = false
      sendDuration()
      window.removeEventListener('beforeunload', sendDuration)
    }
  }, [sessionId, candidateId, pagePath])
}
