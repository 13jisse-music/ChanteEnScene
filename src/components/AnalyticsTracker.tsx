'use client'
import { usePathname } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useEffect } from 'react'
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const { trackPage } = useAnalytics()
  useEffect(() => {
    const cleanup = trackPage(pathname)
    return cleanup || undefined
  }, [pathname, trackPage])
  return null
}
