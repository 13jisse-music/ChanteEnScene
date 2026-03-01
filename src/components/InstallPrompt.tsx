'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'
import EmailSubscribeForm from './EmailSubscribeForm'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Phase = 'install' | 'notify' | 'email' | 'open-browser'

function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'desktop'
}

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || ''
  // Facebook, Instagram, LinkedIn, Twitter, Snapchat, etc.
  return /FBAN|FBAV|Instagram|LinkedInApp|Twitter|Snapchat|Line\//i.test(ua)
}

async function trackInstall(sessionId: string | null, platform: string, installSource: string) {
  if (!sessionId) return
  try {
    const fingerprint = await getFingerprint()
    await fetch('/api/pwa/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fingerprint, platform, installSource }),
    })
  } catch {
    // Silent fail - tracking should not block UX
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [phase, setPhase] = useState<Phase>('install')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // Fetch the active session for push subscription + status (for iOS tutorial phase tracking)
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sessions')
      .select('id, status')
      .eq('is_active', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSessionId(data.id)
          setSessionStatus(data.status)
        } else {
          // Fallback: most recent non-archived session (same pattern as crons)
          supabase
            .from('sessions')
            .select('id, status')
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data: fallback }) => {
              if (fallback) {
                setSessionId(fallback.id)
                setSessionStatus(fallback.status)
              }
            })
        }
      })
  }, [])

  // Dedicated standalone detection — runs independently of UI flow
  // This catches iOS installs that the main flow might miss (email-subscribed, desktop early returns)
  // No localStorage guard: upsert is idempotent, and old localStorage flags may block
  // tracking after database migrations
  useEffect(() => {
    if (!sessionId) return
    if (window.location.hostname === 'localhost') return

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true // iOS Safari

    if (isStandalone) {
      trackInstall(sessionId, detectPlatform(), 'standalone_detected')
      localStorage.setItem('pwa-install-tracked', '1')
    }
  }, [sessionId])

  useEffect(() => {
    // Hide on localhost (dev)
    if (window.location.hostname === 'localhost') return

    const desktop = window.innerWidth >= 1024

    // Already subscribed via email
    if (localStorage.getItem('email-subscribed')) return

    if (desktop) {
      // Desktop: show email subscription prompt after delay
      const emailDismissed = localStorage.getItem('email-subscribe-dismissed')
      if (emailDismissed && Date.now() - parseInt(emailDismissed) < 7 * 24 * 60 * 60 * 1000) return

      setIsDesktop(true)
      setPhase('email')
      return
    }

    // Mobile flow below

    // In-app browser (Facebook, Instagram, etc.) — prompt to open in real browser
    if (isInAppBrowser()) {
      const inAppDismissed = localStorage.getItem('pwa-inapp-dismissed')
      if (inAppDismissed && Date.now() - parseInt(inAppDismissed) < 1 * 60 * 60 * 1000) return
      setPhase('open-browser')
      return
    }

    // Already tracked as installed (Android or standalone detected)
    if (localStorage.getItem('pwa-install-tracked')) return

    // iOS: dismiss is per session phase — tutorial reappears when concours advances
    const iosDismissedPhase = localStorage.getItem('pwa-ios-dismissed-phase')
    if (iosDismissedPhase && iosDismissedPhase === sessionStatus) return

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true // iOS Safari

    // If already installed as PWA, skip to notification phase
    if (isStandalone) {
      if ('Notification' in window && Notification.permission === 'granted') return
      if ('Notification' in window && Notification.permission === 'denied') {
        // Push denied → try email
        const emailDismissed = localStorage.getItem('email-subscribe-dismissed')
        if (emailDismissed && Date.now() - parseInt(emailDismissed) < 7 * 24 * 60 * 60 * 1000) return
        setPhase('email')
        return
      }

      const notifyDismissed = localStorage.getItem('pwa-notify-dismissed')
      if (notifyDismissed && Date.now() - parseInt(notifyDismissed) < 7 * 24 * 60 * 60 * 1000) return

      setPhase('notify')
      return
    }

    // Check if dismissed install prompt recently (24h)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isiOS)

    // iOS: don't track banner display as install — only standalone_detected counts

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const appInstalledHandler = () => {
      if (!localStorage.getItem('pwa-install-tracked')) {
        trackInstall(sessionId, detectPlatform(), 'prompt')
        localStorage.setItem('pwa-install-tracked', '1')
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', appInstalledHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [sessionId, sessionStatus])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        trackInstall(sessionId, detectPlatform(), 'prompt')
        localStorage.setItem('pwa-install-tracked', '1')
        // After install, propose notifications
        if ('Notification' in window && Notification.permission === 'default') {
          setPhase('notify')
        } else {
          setDismissed(true)
        }
      }
    }
  }

  const handleEnableNotifications = useCallback(async () => {
    if (!sessionId) return
    setNotifyLoading(true)

    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        // Push denied → offer email as fallback
        setPhase('email')
        setNotifyLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const rawKeys = subscription.toJSON()
      const fingerprint = await getFingerprint()

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          endpoint: rawKeys.endpoint,
          p256dh: rawKeys.keys!.p256dh,
          auth: rawKeys.keys!.auth,
          role: 'public',
          fingerprint,
        }),
      })
    } catch (err) {
      console.error('Push subscription failed:', err)
      // Push failed → offer email
      setPhase('email')
      setNotifyLoading(false)
      return
    }

    setDismissed(true)
    setNotifyLoading(false)
  }, [sessionId])

  const handleDismiss = () => {
    setDismissed(true)
    if (phase === 'open-browser') {
      localStorage.setItem('pwa-inapp-dismissed', Date.now().toString())
    } else if (phase === 'install') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
      if (isIOS && sessionStatus) {
        // iOS: dismiss until session phase changes — tutorial reappears at each new phase
        localStorage.setItem('pwa-ios-dismissed-phase', sessionStatus)
      }
    } else if (phase === 'notify') {
      localStorage.setItem('pwa-notify-dismissed', Date.now().toString())
    } else {
      localStorage.setItem('email-subscribe-dismissed', Date.now().toString())
    }
  }

  if (dismissed) return null
  if (phase === 'install' && !deferredPrompt && !isIOS) return null
  if (phase === 'open-browser') {
    // In-app browser detected — show prompt to open in real browser
    const platform = detectPlatform()
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://chantenscene.fr'

    const handleOpenInBrowser = () => {
      if (platform === 'android') {
        // Try intent:// to force Chrome on Android
        const path = window.location.pathname + window.location.search
        const intentUrl = `intent://${window.location.host}${path}#Intent;scheme=https;package=com.android.chrome;end`
        window.location.href = intentUrl
        // Fallback: if intent doesn't work after 2s, copy URL
        setTimeout(() => {
          navigator.clipboard?.writeText(currentUrl)
        }, 2000)
      } else {
        // iOS + other: copy URL to clipboard
        navigator.clipboard?.writeText(currentUrl).then(() => {
          alert('Lien copié ! Ouvrez Safari et collez le lien dans la barre d\'adresse.')
        }).catch(() => {
          // Fallback for older browsers
          prompt('Copiez ce lien et ouvrez-le dans Safari :', currentUrl)
        })
      }
    }

    return (
      <div className="fixed z-[60] bottom-0 left-0 right-0 animate-in slide-in-from-bottom">
        <div className="bg-[#1a1232] border-t border-[#e91e8c]/30 rounded-t-2xl p-5 pb-8 shadow-lg shadow-[#e91e8c]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📲</span>
              <p className="text-sm font-bold text-white">Installez l&apos;appli ChanteEnScene !</p>
            </div>
            <button onClick={handleDismiss} className="text-white/20 hover:text-white/50 text-lg">&times;</button>
          </div>
          <p className="text-xs text-white/60 mb-4">
            Pour profiter pleinement de l&apos;expérience (notifications des résultats, accès rapide, mode hors-ligne), ouvrez cette page dans {platform === 'ios' ? 'Safari' : 'Chrome'}.
          </p>

          {/* Bouton principal — ouvrir dans le navigateur */}
          <button
            onClick={handleOpenInBrowser}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold mb-4 active:scale-95 transition-transform"
          >
            {platform === 'ios' ? '📋 Copier le lien (puis ouvrir Safari)' : '🌐 Ouvrir dans Chrome'}
          </button>

          {/* Instructions manuelles si le bouton ne marche pas */}
          <p className="text-[10px] text-white/30 text-center mb-2">Si le bouton ne fonctionne pas :</p>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white text-xs font-bold shrink-0">1</span>
              <p className="text-xs text-white/70">
                Appuyez sur <strong className="text-white">⋮</strong> ou <strong className="text-white">…</strong> en haut à droite
              </p>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white text-xs font-bold shrink-0">2</span>
              <p className="text-xs text-white/70">
                Choisissez <strong className="text-white">&quot;Ouvrir dans {platform === 'ios' ? 'Safari' : 'le navigateur'}&quot;</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (phase === 'notify' && (!('Notification' in window) || !('PushManager' in window))) {
    // Push not supported → will switch to email on next render
    return null
  }

  // iOS install tutorial: animated share icon
  const ShareIcon = () => (
    <svg className="inline w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )

  // iOS install tutorial: mock Safari toolbar to show where the share button is
  const SafariToolbarMockup = () => (
    <div className="relative mt-4">
      {/* Bouncing arrow pointing to share icon */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
        <svg className="w-5 h-5 text-[#e91e8c] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
      {/* Label */}
      <p className="text-[10px] text-white/40 text-center mb-2">Cherchez cette barre en bas de votre écran :</p>
      {/* Safari-like bottom bar */}
      <div className="bg-[#2a2a2e] rounded-xl px-4 py-2.5 flex items-center justify-between border border-white/10">
        {/* Back arrow */}
        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {/* Forward arrow */}
        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {/* Share button — highlighted with pulse */}
        <div className="relative">
          <div className="absolute inset-0 -m-2 rounded-full bg-[#e91e8c]/20 animate-ping" />
          <div className="absolute inset-0 -m-1.5 rounded-full bg-[#e91e8c]/30 animate-pulse" />
          <svg className="relative w-6 h-6 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        {/* Book/tabs icon */}
        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {/* Tabs icon */}
        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>
      <p className="text-[10px] text-center mt-1.5 text-[#e91e8c]/70 font-medium animate-pulse">Appuyez ici !</p>
    </div>
  )

  return (
    <div className={`fixed z-[60] animate-in slide-in-from-bottom ${
      isDesktop
        ? 'bottom-24 right-6 w-96'
        : phase === 'install' && isIOS
          ? 'bottom-0 left-0 right-0'
          : 'bottom-6 left-4 right-4 mx-auto max-w-md'
    }`}>
      {/* iOS install tutorial — full-width bottom sheet */}
      {phase === 'install' && isIOS ? (
        <div className="bg-[#1a1232] border-t border-[#e91e8c]/30 rounded-t-2xl p-5 pb-8 shadow-lg shadow-[#e91e8c]/10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">Installer ChanteEnScene</p>
            <button
              onClick={handleDismiss}
              className="text-white/20 hover:text-white/50 text-lg"
            >
              &times;
            </button>
          </div>

          {/* 3 animated steps */}
          <div className="space-y-3">
            {/* Step 1 — with Safari toolbar mockup */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e91e8c] text-white text-xs font-bold shrink-0">1</span>
                <p className="text-xs text-white/70 flex-1">
                  En bas de votre écran, appuyez sur cette icône :
                </p>
              </div>
              {/* Mini Safari toolbar */}
              <div className="mt-2.5 ml-10">
                <div className="bg-[#2a2a2e] rounded-lg px-3 py-2 flex items-center justify-between border border-white/10">
                  <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {/* Share button — white pulsing circle like a tap indicator */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-9 h-9 rounded-full border-2 border-white/60 animate-ping" />
                    <div className="absolute w-8 h-8 rounded-full border border-white/40 animate-pulse" />
                    <svg className="relative w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e91e8c] text-white text-xs font-bold shrink-0">2</span>
              <p className="text-xs text-white/70 flex-1">
                Faites défiler et choisissez <strong className="text-white">&quot;Sur l&apos;écran d&apos;accueil&quot;</strong>
              </p>
              <svg className="w-5 h-5 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            {/* Step 3 */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e91e8c] text-white text-xs font-bold shrink-0">3</span>
              <p className="text-xs text-white/70 flex-1">
                Confirmez en appuyant <strong className="text-white">&quot;Ajouter&quot;</strong>
              </p>
              <svg className="w-5 h-5 text-[#007AFF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

        </div>
      ) : (
      <div className="bg-[#1a1232] border border-[#e91e8c]/30 rounded-2xl p-4 shadow-lg shadow-[#e91e8c]/10">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">
            {phase === 'install' ? '\uD83D\uDCF2' : phase === 'notify' ? '\uD83D\uDD14' : '\uD83D\uDCE7'}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {phase === 'install'
                ? 'Installer ChanteEnScene'
                : phase === 'notify'
                  ? 'Activer les notifications'
                  : 'Restez inform\u00e9'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {phase === 'install'
                ? 'Acc\u00e9dez au concours comme une vraie appli, m\u00eame hors ligne !'
                : phase === 'notify'
                  ? 'Soyez pr\u00e9venu des votes, r\u00e9sultats et \u00e9v\u00e9nements en direct !'
                  : 'Recevez les dates et r\u00e9sultats du concours par email.'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/20 hover:text-white/50 text-lg shrink-0"
          >
            &times;
          </button>
        </div>
        {phase === 'install' && !isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold"
            >
              Installer l&apos;appli
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-sm"
            >
              Plus tard
            </button>
          </div>
        )}
        {phase === 'notify' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              disabled={notifyLoading}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold disabled:opacity-50"
            >
              {notifyLoading ? 'Activation...' : 'Activer les notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-sm"
            >
              Plus tard
            </button>
          </div>
        )}
        {phase === 'email' && sessionId && (
          <div className="mt-3">
            <EmailSubscribeForm
              sessionId={sessionId}
              source={isDesktop ? 'install_prompt' : 'mobile_fallback'}
              compact
              onSuccess={() => setDismissed(true)}
            />
          </div>
        )}
      </div>
      )}
    </div>
  )
}
