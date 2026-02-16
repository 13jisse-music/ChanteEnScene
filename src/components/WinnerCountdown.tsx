'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import confetti from 'canvas-confetti'

interface Finalist {
  id: string
  name: string
  photo: string | null
}

interface Props {
  finalists: Finalist[]
  winnerId: string | null
  onComplete: () => void
}

const CONFETTI_COLORS = ['#f5a623', '#e91e8c', '#7ec850', '#FFD700', '#ff6b9d']

export default function WinnerCountdown({ finalists: propFinalists, winnerId, onComplete }: Props) {
  // Capture finalists on mount so parent re-renders don't disrupt the animation
  const [finalists] = useState(
    propFinalists.length > 0 ? propFinalists : [{ id: '', name: '?', photo: null }]
  )
  const [count, setCount] = useState(5)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [mounted, setMounted] = useState(false)
  const stableOnComplete = useCallback(onComplete, [onComplete])
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Deterministic sparkle positions (no Math.random to avoid hydration issues)
  const sparkles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        left: `${15 + ((i * 37 + 13) % 70)}%`,
        top: `${15 + ((i * 41 + 23) % 70)}%`,
        delay: `${i * 0.25}s`,
        duration: `${1.2 + (i % 5) * 0.2}s`,
      })),
    []
  )

  // Rapid photo cycling — speed slows down as countdown decreases
  useEffect(() => {
    if (stopped || finalists.length <= 1) return

    const speed = count > 3 ? 300 : count > 2 ? 450 : count > 1 ? 600 : 800

    cycleRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % finalists.length)
    }, speed)

    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current)
    }
  }, [count, stopped, finalists.length])

  // Countdown timer
  useEffect(() => {
    if (count <= 0) {
      // Stop cycling, lock on winner
      setStopped(true)
      if (cycleRef.current) clearInterval(cycleRef.current)

      const winnerIdx = finalists.findIndex((f) => f.id === winnerId)
      setCurrentIndex(winnerIdx >= 0 ? winnerIdx : 0)

      // Fire confetti bursts
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      })
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: CONFETTI_COLORS,
        })
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: CONFETTI_COLORS,
        })
      }, 400)

      // Continuous confetti rain for 3 seconds
      const rain = setInterval(() => {
        confetti({
          particleCount: 15,
          angle: 90 + (Math.random() - 0.5) * 60,
          spread: 50,
          origin: { x: Math.random(), y: 0 },
          colors: CONFETTI_COLORS,
          gravity: 1.2,
        })
      }, 200)

      // Transition to full WinnerReveal after dramatic pause
      const timer = setTimeout(() => {
        clearInterval(rain)
        stableOnComplete()
      }, 3000)

      return () => {
        clearTimeout(timer)
        clearInterval(rain)
      }
    }

    const timer = setTimeout(() => setCount((c) => c - 1), 2000)
    return () => clearTimeout(timer)
  }, [count, stableOnComplete, winnerId, finalists])

  const current = finalists[currentIndex]

  // Coin rotation speed: fast at start, slowing down toward the end
  const spinDuration = count > 3 ? '0.5s' : count > 2 ? '0.7s' : count > 1 ? '1s' : '1.4s'

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      {/* Teaser text */}
      <p
        className={`text-[#f5a623] text-sm uppercase tracking-[0.3em] font-bold mb-12 ${
          stopped ? '' : 'animate-pulse'
        }`}
      >
        {stopped ? 'VAINQUEUR' : 'Le gagnant va être révélé...'}
      </p>

      {/* 3D coin container */}
      <div className="relative" style={{ perspective: '800px' }}>
        {/* Golden glow behind the coin */}
        <div
          className={`absolute inset-[-16px] rounded-full blur-xl transition-all duration-500 ${
            stopped
              ? 'bg-[#f5a623]/50'
              : 'bg-gradient-to-r from-[#f5a623]/20 to-[#e8732a]/20 animate-pulse'
          }`}
        />

        {/* The spinning coin */}
        <div
          className={`relative w-52 h-52 rounded-full ${stopped ? 'animate-winner-lock-in' : ''}`}
          style={{
            transformStyle: 'preserve-3d',
            ...(stopped
              ? { transform: 'rotateY(0deg)' }
              : { animation: `coin-spin ${spinDuration} linear infinite` }),
          }}
        >
          {/* Front face */}
          <div
            className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              stopped
                ? 'border-[#f5a623] shadow-[0_0_80px_rgba(245,166,35,0.5)]'
                : 'border-[#f5a623]/70 shadow-[0_0_40px_rgba(245,166,35,0.2)]'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {current?.photo ? (
              <img src={current.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1a1533] flex items-center justify-center text-5xl">
                🎤
              </div>
            )}
          </div>

          {/* Back face — same image rotated 180° so coin always shows a photo */}
          <div
            className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              stopped
                ? 'border-[#f5a623] shadow-[0_0_80px_rgba(245,166,35,0.5)]'
                : 'border-[#f5a623]/70 shadow-[0_0_40px_rgba(245,166,35,0.2)]'
            }`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {current?.photo ? (
              <img src={current.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1a1533] flex items-center justify-center text-5xl">
                🎤
              </div>
            )}
          </div>
        </div>

        {/* Countdown number overlaid on the coin */}
        {count > 0 && (
          <div
            key={count}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              className="font-[family-name:var(--font-montserrat)] font-black text-[100px] leading-none text-white animate-countdown-pop"
              style={{
                textShadow:
                  '0 0 40px rgba(0,0,0,0.9), 0 4px 60px rgba(0,0,0,0.7), 0 0 100px rgba(245,166,35,0.3)',
              }}
            >
              {count}
            </span>
          </div>
        )}
      </div>

      {/* Candidate name */}
      <p
        className={`mt-10 font-[family-name:var(--font-montserrat)] font-bold transition-all duration-500 ${
          stopped ? 'text-[#f5a623] text-3xl drop-shadow-lg' : 'text-white/50 text-lg'
        }`}
      >
        {current?.name}
      </p>

      {/* Category hint when stopped */}
      {stopped && (
        <p className="text-white/30 text-xs uppercase tracking-widest mt-3 animate-fade-up">
          Félicitations !
        </p>
      )}

      {/* Decorative sparkles during countdown */}
      {!stopped && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {sparkles.map((s, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-sparkle"
              style={{
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                animationDuration: s.duration,
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
