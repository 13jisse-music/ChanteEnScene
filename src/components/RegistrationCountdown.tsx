'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  targetDate: string
  sessionSlug: string
}

function calcTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function RegistrationCountdown({ targetDate, sessionSlug }: Props) {
  const target = new Date(targetDate + 'T00:00:00')
  // Initialize as undefined to avoid hydration mismatch (Date.now() differs server/client)
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calcTimeLeft> | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    // Set initial value on client only
    setTimeLeft(calcTimeLeft(target))
    const timer = setInterval(() => {
      const tl = calcTimeLeft(target)
      setTimeLeft(tl)
      if (!tl) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [target.getTime()])

  const formattedDate = target.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Loading state (SSR + first client render)
  if (timeLeft === undefined) {
    return (
      <div className="text-center py-8 animate-fade-up">
        <div className="text-4xl mb-4">⏳</div>
        <p
          className="text-white text-lg font-medium mb-2"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
        >
          Les inscriptions ouvrent bient&ocirc;t !
        </p>
        <p
          className="text-white/60 text-sm mb-8"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
        >
          Ouverture le {formattedDate}
        </p>
        <div className="flex justify-center gap-3 sm:gap-5">
          {['Jours', 'Heures', 'Minutes', 'Secondes'].map((label) => (
            <div
              key={label}
              className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[70px] sm:min-w-[90px]"
            >
              <span className="block font-[family-name:var(--font-montserrat)] font-black text-3xl sm:text-4xl text-white tabular-nums">
                --
              </span>
              <span className="block text-white/40 text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Countdown finished
  if (!timeLeft) {
    return (
      <div className="text-center py-12 animate-fade-up">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-white text-xl font-bold mb-2" style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}>
          Les inscriptions sont ouvertes !
        </p>
        <button
          onClick={() => router.refresh()}
          className="mt-6 px-8 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          S&apos;inscrire maintenant
        </button>
      </div>
    )
  }

  const blocks = [
    { value: timeLeft.days, label: 'Jours' },
    { value: timeLeft.hours, label: 'Heures' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Secondes' },
  ]

  return (
    <div className="text-center py-8 animate-fade-up">
      <div className="text-4xl mb-4">⏳</div>
      <p
        className="text-white text-lg font-medium mb-2"
        style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
      >
        Les inscriptions ouvrent bient&ocirc;t !
      </p>
      <p
        className="text-white/60 text-sm mb-8"
        style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
      >
        Ouverture le {formattedDate}
      </p>

      {/* Countdown blocks */}
      <div className="flex justify-center gap-3 sm:gap-5">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[70px] sm:min-w-[90px]"
          >
            <span className="block font-[family-name:var(--font-montserrat)] font-black text-3xl sm:text-4xl text-white tabular-nums">
              {String(b.value).padStart(2, '0')}
            </span>
            <span className="block text-white/40 text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-1">
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {/* Pulsing dot */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <span className="w-2 h-2 rounded-full bg-[#e91e8c] animate-pulse" />
        <span className="text-white/40 text-xs">Compte &agrave; rebours en direct</span>
      </div>
    </div>
  )
}
