'use client'

import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const NOTES = ['♪', '♫', '♬', '🎵', '🎶']

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
      {/* Floating music notes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute text-[#e91e8c]/20 animate-[splashFloat_3s_linear_infinite]"
            style={{
              left: `${5 + (i * 8) % 90}%`,
              bottom: '-20px',
              fontSize: `${14 + Math.random() * 10}px`,
              animationDelay: `${i * 0.25}s`,
              animationDuration: `${2.5 + Math.random() * 1.5}s`,
            }}
          >
            {NOTES[i % NOTES.length]}
          </span>
        ))}
      </div>

      {/* Glow halo behind logo */}
      <div className="absolute w-56 h-56 rounded-full animate-[splashGlow_2s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, rgba(233,30,140,0.25) 0%, transparent 70%)' }} />

      {/* Rotating ring */}
      <div className="absolute w-48 h-48 rounded-full border border-[#e91e8c]/15 animate-[splashRing_4s_linear_infinite]" />
      <div className="absolute w-56 h-56 rounded-full border border-[#e91e8c]/8 animate-[splashRing_6s_linear_infinite_reverse]" />

      {/* Logo */}
      <div className="relative animate-[splashZoom_1s_cubic-bezier(0.34,1.56,0.64,1)_forwards]" style={{ opacity: 0 }}>
        <img
          src="/images/pwa-icon-512.png"
          alt="ChanteEnScene"
          className="w-36 h-36 rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 25px rgba(233,30,140,0.5))' }}
        />
      </div>

      {/* Title */}
      <h1
        className="mt-5 text-2xl font-black tracking-wide animate-[splashFadeUp_0.8s_ease-out_0.5s_forwards]"
        style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif', opacity: 0 }}
      >
        <span className="bg-gradient-to-r from-white via-[#ff6b9d] to-white bg-clip-text text-transparent">
          ChanteEnScène
        </span>
      </h1>

      {/* Subtitle with shimmer */}
      <p
        className="mt-1.5 text-sm font-medium animate-[splashFadeUp_0.8s_ease-out_0.8s_forwards] splashShimmer"
        style={{ opacity: 0 }}
      >
        Concours de chant
      </p>

      {/* Progress bar */}
      <div
        className="mt-6 w-32 h-[2px] rounded-full bg-white/10 overflow-hidden animate-[splashFadeUp_0.6s_ease-out_0.8s_forwards]"
        style={{ opacity: 0 }}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-[#e91e8c] to-[#ff6b9d] animate-[splashProgress_1.4s_ease-in-out_0.8s_forwards]" style={{ width: 0 }} />
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-white/15 text-[10px] tracking-wider animate-[splashFadeUp_0.6s_ease-out_1s_forwards]" style={{ opacity: 0 }}>
        v{pkg.version}
      </p>

      <style jsx>{`
        @keyframes splashZoom {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.08); opacity: 1; }
          75% { transform: scale(0.96); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashFadeUp {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes splashFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(20deg); opacity: 0; }
        }
        @keyframes splashGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes splashRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splashProgress {
          0% { width: 0; }
          100% { width: 100%; }
        }
        @keyframes splashShimmerAnim {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .splashShimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,107,157,0.6) 50%, rgba(255,255,255,0.3) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: splashShimmerAnim 2s linear infinite, splashFadeUp 0.8s ease-out 0.8s forwards;
        }
      `}</style>
    </div>
  )
}
