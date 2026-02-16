'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Hide on localhost (dev)
    if (window.location.hostname === 'localhost') return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check if dismissed recently (24h)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    // Detect iOS (no beforeinstallprompt on Safari)
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isiOS)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom">
      <div className="bg-[#1a1232] border border-[#e91e8c]/30 rounded-2xl p-4 shadow-lg shadow-[#e91e8c]/10">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">📲</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              Installer ChanteEnScene
            </p>
            <p className="text-xs text-white/50 mt-1">
              {isIOS
                ? <>Appuyez sur <svg className="inline w-4 h-4 -mt-0.5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> puis <strong className="text-white/70">&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></>
                : 'Accédez au concours comme une vraie appli, même hors ligne !'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/20 hover:text-white/50 text-lg shrink-0"
          >
            ×
          </button>
        </div>
        {!isIOS && (
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
      </div>
    </div>
  )
}
