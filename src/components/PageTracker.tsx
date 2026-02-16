'use client'

import { usePageTracking } from '@/hooks/usePageTracking'

interface Props {
  sessionId: string
  candidateId?: string
  pagePath: string
}

export default function PageTracker({ sessionId, candidateId, pagePath }: Props) {
  usePageTracking({ sessionId, candidateId, pagePath })
  return null
}
