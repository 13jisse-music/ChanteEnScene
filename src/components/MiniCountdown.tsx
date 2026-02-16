'use client'

import { useState, useEffect } from 'react'

interface Props {
  targetDate: string
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

export default function MiniCountdown({ targetDate }: Props) {
  const target = new Date(targetDate + 'T00:00:00')
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calcTimeLeft> | undefined>(undefined)

  useEffect(() => {
    setTimeLeft(calcTimeLeft(target))
    const timer = setInterval(() => {
      const tl = calcTimeLeft(target)
      setTimeLeft(tl)
      if (!tl) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [target.getTime()])

  // Countdown finished — hide
  if (timeLeft === null) return null

  const blocks = timeLeft
    ? [
        { value: timeLeft.days, label: 'j' },
        { value: timeLeft.hours, label: 'h' },
        { value: timeLeft.minutes, label: 'm' },
        { value: timeLeft.seconds, label: 's' },
      ]
    : [
        { value: '--', label: 'j' },
        { value: '--', label: 'h' },
        { value: '--', label: 'm' },
        { value: '--', label: 's' },
      ]

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-xl px-3 py-1.5 mt-2">
      <span className="text-[#f5a623]/60 text-[10px] mr-0.5">⏳</span>
      {blocks.map((b) => (
        <span key={b.label} className="flex items-baseline gap-0.5">
          <span className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-[#f5a623] tabular-nums">
            {typeof b.value === 'number' ? String(b.value).padStart(2, '0') : b.value}
          </span>
          <span className="text-white/30 text-[10px]">{b.label}</span>
        </span>
      ))}
    </div>
  )
}
