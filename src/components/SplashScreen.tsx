'use client'

import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const NOTES = ['♪', '♫', '♬', '🎵', '🎶', '♩']

// Deterministic positions for particles (avoid Math.random in render)
const FLOAT_NOTES = Array.from({ length: 18 }, (_, i) => ({
  note: NOTES[i % NOTES.length],
  left: (7 + (i * 5.3)) % 92,
  size: 12 + (i * 3) % 14,
  delay: (i * 0.18) % 3.2,
  duration: 2.2 + (i * 0.19) % 1.8,
}))

const ORBIT_NOTES = Array.from({ length: 8 }, (_, i) => ({
  note: NOTES[i % NOTES.length],
  size: 16 + (i * 2) % 8,
  radius: 90 + (i * 15) % 50,
  duration: 3 + (i * 0.5) % 3,
  delay: (i * 0.4) % 3,
  startAngle: (i * 45) % 360,
}))

const SPARKLES = Array.from({ length: 14 }, (_, i) => ({
  left: (10 + (i * 7.1)) % 85,
  top: (8 + (i * 7.7)) % 85,
  size: 2 + (i * 0.5) % 3,
  delay: (i * 0.3) % 3,
  duration: 1.2 + (i * 0.2) % 1.5,
}))

const RIPPLES = [0, 0.5, 1.0, 1.5]

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Only show in standalone mode (installed PWA — mobile only in practice)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) return

    // Only show once per session
    if (sessionStorage.getItem('splash-shown')) return
    sessionStorage.setItem('splash-shown', '1')

    setVisible(true)

    // Start fade out after 2.5s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500)
    // Remove after 3.3s (fade takes 0.8s)
    const removeTimer = setTimeout(() => setVisible(false), 3300)

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
      style={{ background: 'radial-gradient(ellipse at center, #2a1025 0%, #150a20 40%, #0d0b1a 70%)' }}
    >
      {/* Floating notes rising from bottom */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOAT_NOTES.map((n, i) => (
          <span
            key={`f${i}`}
            className="absolute splashFloatNote"
            style={{
              left: `${n.left}%`,
              bottom: '-20px',
              fontSize: `${n.size}px`,
              animationDelay: `${n.delay}s`,
              animationDuration: `${n.duration}s`,
              color: i % 3 === 0 ? 'rgba(233,30,140,0.3)' : i % 3 === 1 ? 'rgba(255,107,157,0.25)' : 'rgba(126,200,80,0.2)',
            }}
          >
            {n.note}
          </span>
        ))}
      </div>

      {/* Twinkling sparkles everywhere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {SPARKLES.map((s, i) => (
          <span
            key={`s${i}`}
            className="absolute rounded-full splashSparkle"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              background: i % 2 === 0 ? '#e91e8c' : '#ff6b9d',
            }}
          />
        ))}
      </div>

      {/* Sound wave ripples from center */}
      {RIPPLES.map((delay, i) => (
        <div
          key={`r${i}`}
          className="absolute rounded-full border splashRipple"
          style={{
            width: '120px',
            height: '120px',
            borderColor: 'rgba(233,30,140,0.15)',
            animationDelay: `${delay}s`,
          }}
        />
      ))}

      {/* Large soft glow behind everything */}
      <div
        className="absolute rounded-full splashGlowOuter"
        style={{
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(233,30,140,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Intense glow halo behind logo */}
      <div
        className="absolute rounded-full splashGlow"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(233,30,140,0.35) 0%, rgba(255,107,157,0.1) 50%, transparent 70%)',
        }}
      />

      {/* Orbiting music notes around logo */}
      <div className="absolute" style={{ width: '280px', height: '280px' }}>
        {ORBIT_NOTES.map((o, i) => (
          <span
            key={`o${i}`}
            className="absolute splashOrbit"
            style={{
              fontSize: `${o.size}px`,
              animationDuration: `${o.duration}s`,
              animationDelay: `${o.delay}s`,
              color: i % 2 === 0 ? 'rgba(233,30,140,0.4)' : 'rgba(255,107,157,0.35)',
              // Positioned at center, animation handles the orbit
              left: '50%',
              top: '50%',
              ['--orbit-radius' as string]: `${o.radius}px`,
              ['--start-angle' as string]: `${o.startAngle}deg`,
            }}
          >
            {o.note}
          </span>
        ))}
      </div>

      {/* Rotating decorative rings */}
      <div className="absolute w-44 h-44 rounded-full splashRingSlow" style={{ border: '1px solid rgba(233,30,140,0.12)' }} />
      <div className="absolute w-56 h-56 rounded-full splashRingFast" style={{ border: '1px solid rgba(233,30,140,0.06)' }} />
      <div className="absolute w-64 h-64 rounded-full splashRingSlow" style={{ border: '1px dashed rgba(255,107,157,0.05)', animationDirection: 'reverse' }} />

      {/* Singer illustration with dramatic entrance + sway */}
      <div className="relative splashLogoEntry" style={{ opacity: 0 }}>
      <div className="splashSway">
        {/* Glow pulse behind singer */}
        <div
          className="absolute -inset-8 splashLogoGlow"
          style={{ background: 'radial-gradient(circle, rgba(233,30,140,0.4) 0%, transparent 70%)' }}
        />
        {/* Spotlight cone from above */}
        <div
          className="absolute splashSpotlight"
          style={{
            width: '250px',
            height: '350px',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, rgba(233,30,140,0.15) 0%, rgba(255,107,157,0.05) 40%, transparent 100%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 90% 100%, 10% 100%)',
          }}
        />
        {/* Singer image — responsive for mobile */}
        <img
          src="/images/singers.png"
          alt="Chanteurs"
          className="relative w-[45vw] max-w-[200px] h-auto"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(233,30,140,0.5)) drop-shadow(0 0 50px rgba(233,30,140,0.2))',
          }}
        />
        {/* Logo overlaid on legs */}
        <img
          src="/images/pwa-icon-512.png"
          alt="Logo ChanteEnScene"
          className="absolute bottom-[20%] left-[55%] -translate-x-1/2 w-[120%] h-auto rounded-2xl"
          style={{
            filter: 'drop-shadow(0 0 15px rgba(233,30,140,0.6))',
          }}
        />
        {/* Stage floor reflection */}
        <div
          className="mx-auto mt-[-4px] rounded-full"
          style={{
            width: '80%',
            height: '6px',
            background: 'radial-gradient(ellipse, rgba(233,30,140,0.2) 0%, transparent 70%)',
          }}
        />
      </div>
      </div>

      {/* Title with gradient */}
      <h1
        className="mt-5 text-2xl font-black tracking-wide splashTitle"
        style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif', opacity: 0 }}
      >
        <span className="bg-gradient-to-r from-white via-[#ff6b9d] to-white bg-clip-text text-transparent">
          ChanteEnScène
        </span>
      </h1>

      {/* Subtitle with shimmer */}
      <p className="mt-1.5 text-sm font-medium splashShimmer" style={{ opacity: 0 }}>
        Concours de chant
      </p>

      {/* Progress bar */}
      <div
        className="mt-6 w-32 h-[2px] rounded-full bg-white/10 overflow-hidden splashFadeUp"
        style={{ opacity: 0, animationDelay: '0.8s' }}
      >
        <div className="h-full rounded-full splashProgressBar" style={{ width: 0 }}>
          <div className="w-full h-full splashProgressGlow" />
        </div>
      </div>

      {/* Version */}
      <p
        className="absolute bottom-6 text-white/15 text-[10px] tracking-wider splashFadeUp"
        style={{ opacity: 0, animationDelay: '1s' }}
      >
        v{pkg.version}
      </p>

      <style jsx>{`
        /* === Logo entrance === */
        @keyframes splashLogoEntry {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          40% { transform: scale(1.15) rotate(3deg); opacity: 1; }
          60% { transform: scale(0.95) rotate(-1deg); opacity: 1; }
          80% { transform: scale(1.03) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .splashLogoEntry {
          animation: splashLogoEntry 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* === Logo glow pulse === */
        @keyframes splashLogoGlow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        .splashLogoGlow {
          animation: splashLogoGlow 2s ease-in-out infinite;
        }

        /* === Title fade up === */
        .splashTitle {
          animation: splashFadeUp 0.8s ease-out 0.5s forwards;
        }

        /* === General fade up === */
        @keyframes splashFadeUp {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .splashFadeUp {
          animation: splashFadeUp 0.6s ease-out forwards;
        }

        /* === Floating notes rising === */
        @keyframes splashFloatNote {
          0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
          8% { opacity: 1; transform: translateY(-5vh) rotate(5deg) scale(1); }
          50% { opacity: 0.8; }
          85% { opacity: 0.6; }
          100% { transform: translateY(-105vh) rotate(25deg) scale(0.7); opacity: 0; }
        }
        .splashFloatNote {
          animation: splashFloatNote linear infinite;
        }

        /* === Orbiting notes around logo === */
        @keyframes splashOrbit {
          0% {
            transform: translate(-50%, -50%) rotate(var(--start-angle)) translateX(var(--orbit-radius)) rotate(calc(-1 * var(--start-angle)));
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translate(-50%, -50%) rotate(calc(var(--start-angle) + 360deg)) translateX(var(--orbit-radius)) rotate(calc(-1 * (var(--start-angle) + 360deg)));
            opacity: 0;
          }
        }
        .splashOrbit {
          animation: splashOrbit linear infinite;
        }

        /* === Twinkling sparkles === */
        @keyframes splashSparkle {
          0%, 100% { transform: scale(0); opacity: 0; }
          20% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.5); opacity: 0.8; }
          50% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(1.2); opacity: 1; }
          80% { transform: scale(0.5); opacity: 0.4; }
        }
        .splashSparkle {
          animation: splashSparkle ease-in-out infinite;
        }

        /* === Sound wave ripples === */
        @keyframes splashRipple {
          0% { transform: scale(1); opacity: 0.6; border-width: 2px; }
          100% { transform: scale(4); opacity: 0; border-width: 0.5px; }
        }
        .splashRipple {
          animation: splashRipple 2.5s ease-out infinite;
        }

        /* === Glow effects === */
        @keyframes splashGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .splashGlow {
          animation: splashGlow 2s ease-in-out infinite;
        }

        @keyframes splashGlowOuter {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        .splashGlowOuter {
          animation: splashGlowOuter 3s ease-in-out infinite;
        }

        /* === Rotating rings === */
        .splashRingSlow {
          animation: splashRingRotate 6s linear infinite;
        }
        .splashRingFast {
          animation: splashRingRotate 4s linear infinite reverse;
        }
        @keyframes splashRingRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* === Progress bar === */
        .splashProgressBar {
          background: linear-gradient(90deg, #e91e8c, #ff6b9d, #e91e8c);
          background-size: 200% 100%;
          animation:
            splashProgressFill 1.6s ease-in-out 0.8s forwards,
            splashProgressShine 1s linear 0.8s infinite;
        }
        @keyframes splashProgressFill {
          0% { width: 0; }
          100% { width: 100%; }
        }
        @keyframes splashProgressShine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .splashProgressGlow {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: splashProgressGlowMove 1.2s ease-in-out 1.2s infinite;
        }
        @keyframes splashProgressGlowMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* === Singer sway left-right === */
        @keyframes splashSway {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(1.5deg) translateX(3px); }
          75% { transform: rotate(-1.5deg) translateX(-3px); }
        }
        .splashSway {
          animation: splashSway 3s ease-in-out 1.2s infinite;
          transform-origin: bottom center;
        }

        /* === Spotlight effect === */
        @keyframes splashSpotlight {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .splashSpotlight {
          animation: splashSpotlight 2s ease-in-out infinite;
        }

        /* === Shimmer subtitle === */
        @keyframes splashShimmerAnim {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .splashShimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,107,157,0.7) 40%, rgba(233,30,140,0.8) 50%, rgba(255,107,157,0.7) 60%, rgba(255,255,255,0.3) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: splashShimmerAnim 1.5s linear infinite, splashFadeUp 0.8s ease-out 0.8s forwards;
        }
      `}</style>
    </div>
  )
}
