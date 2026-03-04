'use client'

import { useState, useEffect, useRef } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Only show in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) return

    // Only show once per session
    if (sessionStorage.getItem('splash-shown')) return
    sessionStorage.setItem('splash-shown', '1')

    setVisible(true)
  }, [])

  const handleEnd = () => {
    setFadeOut(true)
    setTimeout(() => setVisible(false), 1000)
  }

  const handleSkip = () => {
    if (videoRef.current) videoRef.current.pause()
    handleEnd()
  }

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleEnd}
        className="w-[min(85vw,400px)] h-[min(85vw,400px)] object-contain"
      >
        <source src="/images/logo.mp4" type="video/mp4" />
      </video>
      <button
        onClick={handleSkip}
        className="mt-8 text-white/30 text-sm hover:text-white/60 transition-colors"
      >
        Passer &rarr;
      </button>
    </div>
  )
}
