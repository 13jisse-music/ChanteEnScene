'use client'

import { useEffect } from 'react'
import { trackJurorLogin } from '@/app/jury/actions'

export default function JuryLoginTracker({ jurorId, sessionId }: { jurorId: string; sessionId: string }) {
  useEffect(() => {
    trackJurorLogin(jurorId, sessionId).catch(() => {})
  }, [jurorId, sessionId])

  return null
}
