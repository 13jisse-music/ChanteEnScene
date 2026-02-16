'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import confetti from 'canvas-confetti'

interface Props {
  candidateName: string
  candidatePhoto: string | null
  category: string
  onDismiss: () => void
}

const COLORS = ['#f5a623', '#e91e8c', '#7ec850', '#FFD700', '#ff6b9d']

export default function WinnerReveal({ candidateName, candidatePhoto, category, onDismiss }: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Initial burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: COLORS,
      disableForReducedMotion: true,
    })

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: COLORS,
      })
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: COLORS,
      })
    }, 300)

    // Continuous rain for 5 seconds
    intervalRef.current = setInterval(() => {
      confetti({
        particleCount: 20,
        angle: 90 + (Math.random() - 0.5) * 60,
        spread: 60,
        origin: { x: Math.random(), y: 0 },
        colors: COLORS,
        gravity: 1.2,
        disableForReducedMotion: true,
      })
    }, 200)

    const timeout = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearTimeout(timeout)
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-fade-up"
      onClick={onDismiss}
    >
      <div className="text-center px-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Winner badge */}
        <div className="mb-6">
          <span className="text-6xl">🏆</span>
        </div>

        {/* Title */}
        <h1 className="font-[family-name:var(--font-montserrat)] font-black text-4xl text-gradient-gold mb-2 drop-shadow-lg">
          VAINQUEUR
        </h1>
        <p className="text-white/40 text-sm uppercase tracking-widest mb-6">{category}</p>

        {/* Photo */}
        <div className="w-36 h-36 rounded-full mx-auto mb-6 overflow-hidden border-4 border-[#f5a623] shadow-lg shadow-[#f5a623]/30 animate-pulse-glow">
          {candidatePhoto ? (
            <img src={candidatePhoto} alt={candidateName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1533] text-5xl">🎤</div>
          )}
        </div>

        {/* Name */}
        <h2 className="font-[family-name:var(--font-montserrat)] font-black text-3xl text-white mb-8 drop-shadow-lg">
          {candidateName}
        </h2>

        {/* Dismiss hint */}
        <p className="text-white/20 text-xs">Touchez pour fermer</p>
      </div>
    </div>,
    document.body
  )
}
