'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

const CONTEXT_MESSAGES: Record<string, string> = {
  'inscription-j5': 'Les inscriptions ouvrent dans 5 jours\u00a0!',
  'inscription-j0': 'Les inscriptions sont ouvertes\u00a0!',
  'newsletter': 'D\u00e9couvrez les derni\u00e8res actualit\u00e9s',
  'approved': 'Votre candidature a \u00e9t\u00e9 approuv\u00e9e\u00a0!',
  'profile': 'Consultez votre profil candidat',
}
const DEFAULT_MESSAGE = 'Retrouvez ChanteEnSc\u00e8ne'

function isMobileUA() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

function GoPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showCard, setShowCard] = useState(false)
  const [showInstallTip, setShowInstallTip] = useState(false)

  const rawTo = searchParams.get('to') || '/'
  const ctx = searchParams.get('ctx') || ''

  // Validate: only relative paths, no protocol injection
  const safeTo = (rawTo.startsWith('/') && !rawTo.startsWith('//')) ? rawTo : '/'
  const message = CONTEXT_MESSAGES[ctx] || DEFAULT_MESSAGE

  useEffect(() => {
    // Desktop or already in PWA → redirect immediately
    if (!isMobileUA() || isStandalone()) {
      router.replace(safeTo)
      return
    }
    setShowCard(true)
  }, [router, safeTo])

  const handleOpenApp = () => {
    // Navigate with absolute URL — on Android, may open the installed PWA
    const absoluteUrl = new URL(safeTo, window.location.origin).href
    window.location.href = absoluteUrl
  }

  const handleContinueBrowser = () => {
    router.replace(safeTo)
  }

  if (!showCard) {
    return <div className="fixed inset-0 z-[100] bg-[#110d1f]" />
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#110d1f] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Sc&egrave;ne</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2">
            {message}
          </p>
          <p className="text-white/40 text-sm mb-8">
            Pour une meilleure exp&eacute;rience, ouvrez l&apos;application.
          </p>

          {/* Open app button */}
          <button
            onClick={handleOpenApp}
            className="w-full px-6 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all mb-3"
          >
            Ouvrir l&apos;application
          </button>

          {/* Install tip toggle */}
          {!showInstallTip ? (
            <button
              onClick={() => setShowInstallTip(true)}
              className="text-[#7ec850] text-sm font-medium hover:underline mb-4 block mx-auto"
            >
              Pas encore install&eacute;e ?
            </button>
          ) : (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-4 text-left">
              {isIOS() ? (
                <div className="space-y-2">
                  <p className="text-white/60 text-xs font-bold">Sur iPhone / iPad :</p>
                  <p className="text-white/40 text-xs">1. Ouvrez chantenscene.fr dans <strong className="text-white/60">Safari</strong></p>
                  <p className="text-white/40 text-xs">2. Appuyez sur le bouton <strong className="text-white/60">Partager</strong> (carr&eacute; avec fl&egrave;che)</p>
                  <p className="text-white/40 text-xs">3. Choisissez <strong className="text-white/60">&laquo;&nbsp;Sur l&apos;&eacute;cran d&apos;accueil&nbsp;&raquo;</strong></p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-white/60 text-xs font-bold">Sur Android :</p>
                  <p className="text-white/40 text-xs">1. Ouvrez <strong className="text-white/60">chantenscene.fr</strong> dans Chrome</p>
                  <p className="text-white/40 text-xs">2. Chrome proposera automatiquement l&apos;installation</p>
                  <p className="text-white/40 text-xs">3. Ou appuyez sur <strong className="text-white/60">&#8942; &gt; Installer l&apos;appli</strong></p>
                </div>
              )}
            </div>
          )}

          {/* Continue in browser */}
          <button
            onClick={handleContinueBrowser}
            className="text-white/25 text-xs hover:text-white/40 transition-colors"
          >
            Continuer dans le navigateur &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#110d1f]" />}>
      <GoPageContent />
    </Suspense>
  )
}
