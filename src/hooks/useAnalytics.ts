'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getFingerprint } from '@/lib/fingerprint'

// --- Types ---
interface AnalyticsEvent {
  event_type: string
  event_data?: Record<string, unknown>
  page_path: string
  page_title?: string
}

// --- Session ID (persiste par onglet) ---
function getSessionId(): string {
  const key = 'ces_analytics_session'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(key, sid)
  }
  return sid
}

// --- Detection device ---
function getDeviceType(): string {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function parseBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Autre'
}

function parseOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Linux')) return 'Linux'
  return 'Autre'
}

// --- UTM extraction ---
function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  return utm
}

// --- Buffer d'events (batch) ---
const eventBuffer: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let sessionId = ''
let fingerprint = ''
let deviceInfo: Record<string, unknown> = {}
let utmParams: Record<string, string> = {}

function flushEvents() {
  if (eventBuffer.length === 0) return
  const events = [...eventBuffer]
  eventBuffer.length = 0

  const payload = JSON.stringify({
    session_id: sessionId,
    fingerprint,
    device: deviceInfo,
    utm: utmParams,
    events,
  })

  // sendBeacon pour fiabilite (fonctionne meme en quittant la page)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}

function queueEvent(event: AnalyticsEvent) {
  eventBuffer.push(event)
  if (flushTimer) clearTimeout(flushTimer)
  // Flush toutes les 3 secondes ou a 10 events
  if (eventBuffer.length >= 10) {
    flushEvents()
  } else {
    flushTimer = setTimeout(flushEvents, 3000)
  }
}

// --- Tracking des clics sur boutons/liens ---
function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const el = target.closest('a, button, [data-track]') as HTMLElement | null
  if (!el) return

  const trackName = el.getAttribute('data-track')
  const isLink = el.tagName === 'A'
  const href = isLink ? (el as HTMLAnchorElement).href : undefined
  const text = el.textContent?.trim().slice(0, 80) || ''

  queueEvent({
    event_type: 'click',
    event_data: {
      element: el.tagName.toLowerCase(),
      text,
      href,
      track_name: trackName,
      classes: el.className?.toString().slice(0, 100),
    },
    page_path: window.location.pathname,
  })
}

// --- Tracking erreurs JS ---
function handleError(e: ErrorEvent) {
  queueEvent({
    event_type: 'error',
    event_data: {
      message: e.message?.slice(0, 200),
      source: e.filename,
      line: e.lineno,
      col: e.colno,
    },
    page_path: window.location.pathname,
  })
}

function handleUnhandledRejection(e: PromiseRejectionEvent) {
  queueEvent({
    event_type: 'error',
    event_data: {
      message: String(e.reason).slice(0, 200),
      type: 'unhandled_promise',
    },
    page_path: window.location.pathname,
  })
}

// --- Fonction standalone pour events business ---
export function trackBusinessEvent(
  eventType: string,
  data?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  queueEvent({
    event_type: eventType,
    event_data: data,
    page_path: window.location.pathname,
    page_title: document.title,
  })
}

// --- Hook principal ---
export function useAnalytics() {
  const startTime = useRef(Date.now())
  const maxScroll = useRef(0)
  const scrollMilestones = useRef(new Set<number>())
  const pagePathRef = useRef('')
  const initialized = useRef(false)

  // Envoyer un event custom depuis n'importe quel composant
  const trackEvent = useCallback((eventType: string, data?: Record<string, unknown>) => {
    queueEvent({
      event_type: eventType,
      event_data: data,
      page_path: window.location.pathname,
      page_title: document.title,
    })
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Initialiser session
    sessionId = getSessionId()
    utmParams = getUTMParams()
    deviceInfo = {
      device_type: getDeviceType(),
      browser: parseBrowser(),
      os: parseOS(),
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language,
    }

    // Fingerprint async
    getFingerprint().then(fp => { fingerprint = fp }).catch(() => {})

    // Listeners globaux (une seule fois)
    document.addEventListener('click', handleClick, { passive: true })
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Performance (LCP, CLS) apres chargement
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        // LCP
        const lcpObs = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
          if (last) {
            queueEvent({
              event_type: 'performance',
              event_data: { metric: 'lcp', value: Math.round(last.startTime) },
              page_path: window.location.pathname,
            })
          }
        })
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })

        // CLS
        let clsValue = 0
        const clsObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
            if (!shift.hadRecentInput) clsValue += shift.value
          }
        })
        clsObs.observe({ type: 'layout-shift', buffered: true })

        // Envoyer CLS quand la page est cachee
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden' && clsValue > 0) {
            queueEvent({
              event_type: 'performance',
              event_data: { metric: 'cls', value: Math.round(clsValue * 1000) / 1000 },
              page_path: window.location.pathname,
            })
          }
        }, { once: true })
      } catch {
        // PerformanceObserver non supporte
      }
    }

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Tracking par page (se re-execute a chaque changement de route)
  const trackPage = useCallback((pathname: string) => {
    // Eviter de tracker les pages admin
    if (pathname.startsWith('/admin')) return

    const isNewPage = pagePathRef.current !== pathname

    // Si on change de page, envoyer d'abord les stats de la page precedente
    if (isNewPage && pagePathRef.current) {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      if (duration >= 2) {
        queueEvent({
          event_type: 'page_exit',
          event_data: {
            duration_seconds: duration,
            max_scroll_percent: maxScroll.current,
          },
          page_path: pagePathRef.current,
        })
      }
    }

    pagePathRef.current = pathname
    startTime.current = Date.now()
    maxScroll.current = 0
    scrollMilestones.current = new Set()

    // Page view
    queueEvent({
      event_type: 'page_view',
      event_data: {
        referrer: document.referrer || null,
        is_first_visit: !localStorage.getItem('ces_returning'),
      },
      page_path: pathname,
      page_title: document.title,
    })

    // Marquer comme visiteur de retour
    localStorage.setItem('ces_returning', '1')

    // Scroll tracking pour cette page
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const percent = Math.round((window.scrollY / docHeight) * 100)
      if (percent > maxScroll.current) maxScroll.current = percent

      // Milestones 25, 50, 75, 100
      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone)
          queueEvent({
            event_type: 'scroll',
            event_data: { depth_percent: milestone },
            page_path: pathname,
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Session end sur fermeture
    const handleUnload = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      queueEvent({
        event_type: 'session_end',
        event_data: {
          duration_seconds: duration,
          max_scroll_percent: maxScroll.current,
          total_pages: parseInt(sessionStorage.getItem('ces_page_count') || '1'),
        },
        page_path: pathname,
      })
      flushEvents()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload()
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    // Compter les pages vues dans la session
    const count = parseInt(sessionStorage.getItem('ces_page_count') || '0') + 1
    sessionStorage.setItem('ces_page_count', String(count))

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return { trackPage, trackEvent }
}
