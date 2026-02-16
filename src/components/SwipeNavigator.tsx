'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  prevUrl: string | null
  nextUrl: string | null
  children: React.ReactNode
}

export default function SwipeNavigator({ prevUrl, nextUrl, children }: Props) {
  const router = useRouter()
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const navigatedRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (navigatedRef.current) return
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const deltaX = e.changedTouches[0].clientX - touchStartX.current

    // Only respond to clearly vertical swipes (not taps, not horizontal)
    if (Math.abs(deltaY) < 120 || Math.abs(deltaX) > Math.abs(deltaY) * 0.7) return

    if (deltaY < -120 && nextUrl) {
      // Swipe up → next candidate
      navigatedRef.current = true
      router.push(nextUrl)
    } else if (deltaY > 120 && prevUrl) {
      // Swipe down → previous candidate
      navigatedRef.current = true
      router.push(prevUrl)
    }
  }, [prevUrl, nextUrl, router])

  return (
    <div
      className="h-dvh overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}
