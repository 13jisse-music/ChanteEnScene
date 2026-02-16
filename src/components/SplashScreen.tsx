'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Only show in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) return

    // Only show once per session
    if (sessionStorage.getItem('splash-shown')) return
    sessionStorage.setItem('splash-shown', '1')

    setVisible(true)

    // Start fade out after 2s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000)
    // Remove after 2.8s (fade takes 0.8s)
    const removeTimer = setTimeout(() => setVisible(false), 2800)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-800 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'radial-gradient(ellipse at center, #2a1025 0%, #0d0b1a 70%)' }}
    >
      {/* Sparkles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#e91e8c]/30 animate-pulse"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="relative animate-[splashZoom_1.2s_ease-out_forwards]">
        <img
          src="/images/pwa-icon-512.png"
          alt="ChanteEnScene"
          className="w-40 h-40 rounded-2xl drop-shadow-[0_0_30px_rgba(233,30,140,0.5)]"
        />
      </div>

      {/* Title */}
      <h1
        className="mt-6 text-2xl font-black text-white tracking-wide animate-[splashFadeUp_1s_ease-out_0.5s_forwards]"
        style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif', opacity: 0 }}
      >
        ChanteEnScène
      </h1>

      {/* Subtitle */}
      <p
        className="mt-2 text-sm text-white/40 animate-[splashFadeUp_1s_ease-out_0.8s_forwards]"
        style={{ opacity: 0 }}
      >
        Concours de chant
      </p>

      {/* Glow ring */}
      <div className="absolute w-64 h-64 rounded-full border border-[#e91e8c]/20 animate-ping" style={{ animationDuration: '3s' }} />

      <style jsx>{`
        @keyframes splashZoom {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashFadeUp {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
