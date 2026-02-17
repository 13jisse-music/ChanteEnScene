'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePushSubscription } from '@/hooks/usePushSubscription'

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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()

  // Fetch session ID for push subscription
  useEffect(() => {
    createClient()
      .from('sessions')
      .select('id')
      .eq('slug', sessionSlug)
      .single()
      .then(({ data }) => {
        if (data) setSessionId(data.id)
      })
  }, [sessionSlug])

  const { isSubscribed, isLoading, isSupported, subscribe } = usePushSubscription({
    sessionId: sessionId || '',
    role: 'public',
  })

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

      {/* Notify me */}
      {sessionId && isSupported && (
        <div className="mt-10 flex flex-col items-center gap-3">
          {isSubscribed ? (
            <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#7ec850]/10 border border-[#7ec850]/20">
              <span className="text-lg">🔔</span>
              <span className="text-[#7ec850] text-sm font-medium">
                Vous serez pr&eacute;venu &agrave; l&apos;ouverture !
              </span>
            </div>
          ) : (
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
            >
              <span className="text-lg">🔔</span>
              {isLoading ? 'Activation...' : 'Me pr\u00e9venir \u00e0 l\u0027ouverture'}
            </button>
          )}
          <p className="text-white/30 text-xs">
            Recevez une notification d&egrave;s que les inscriptions ouvrent
          </p>
        </div>
      )}

      {/* Social links */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-white/40 text-xs">Suivez-nous en attendant</p>
        <div className="flex items-center gap-3">
          <a href="https://www.facebook.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2] hover:scale-110 transition-transform" title="Facebook">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a href="https://www.instagram.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] hover:scale-110 transition-transform" title="Instagram">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Pulsing dot */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-2 h-2 rounded-full bg-[#e91e8c] animate-pulse" />
        <span className="text-white/40 text-xs">Compte &agrave; rebours en direct</span>
      </div>
    </div>
  )
}
