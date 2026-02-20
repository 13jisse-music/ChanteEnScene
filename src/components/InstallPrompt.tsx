'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'
import EmailSubscribeForm from './EmailSubscribeForm'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Phase = 'install' | 'notify' | 'email'

function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'desktop'
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
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [phase, setPhase] = useState<Phase>('install')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const isAdmin = pathname?.startsWith('/admin')

  // Fetch the active session for push subscription
  useEffect(() => {
    createClient()
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setSessionId(data.id)
      })
  }, [])

  useEffect(() => {
    // Skip on admin pages — admin has its own install flow
    if (isAdmin) return
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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // If already installed as PWA, track and skip to notification phase
    if (isStandalone) {
      if (sessionId && !localStorage.getItem('pwa-install-tracked')) {
        trackInstall(sessionId, detectPlatform(), 'standalone_detected')
        localStorage.setItem('pwa-install-tracked', '1')
      }
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
  }, [sessionId, isAdmin])

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
    if (phase === 'install') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    } else if (phase === 'notify') {
      localStorage.setItem('pwa-notify-dismissed', Date.now().toString())
    } else {
      localStorage.setItem('email-subscribe-dismissed', Date.now().toString())
    }
  }

  if (isAdmin) return null
  if (dismissed) return null
  if (phase === 'install' && !deferredPrompt && !isIOS) return null
  if (phase === 'notify' && (!('Notification' in window) || !('PushManager' in window))) {
    // Push not supported → will switch to email on next render
    return null
  }

  return (
    <div className={`fixed z-[60] animate-in slide-in-from-bottom ${
      isDesktop
        ? 'bottom-24 right-6 w-96'
        : 'bottom-6 left-4 right-4 mx-auto max-w-md'
    }`}>
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
                ? isIOS
                  ? <>Appuyez sur <svg className="inline w-4 h-4 -mt-0.5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> puis <strong className="text-white/70">&quot;Sur l&apos;&eacute;cran d&apos;accueil&quot;</strong></>
                  : 'Acc\u00e9dez au concours comme une vraie appli, m\u00eame hors ligne !'
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
        {phase === 'install' && isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold"
            >
              J&apos;ai compris
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
    </div>
  )
}
