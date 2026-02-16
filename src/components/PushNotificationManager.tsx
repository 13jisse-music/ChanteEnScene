'use client'

import { useState } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'

interface Props {
  sessionId: string
  role?: 'public' | 'jury' | 'admin'
  jurorId?: string
}

export default function PushNotificationManager({ sessionId, role = 'public', jurorId }: Props) {
  const { permission, isSubscribed, isLoading, isSupported, subscribe } = usePushSubscription({
    sessionId,
    role,
    jurorId,
    autoSubscribe: true,
  })
  const [dismissed, setDismissed] = useState(false)

  if (!isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom">
      <div className="bg-[#1a1232] border border-[#e91e8c]/30 rounded-2xl p-4 shadow-lg shadow-[#e91e8c]/10">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">&#x1f514;</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              Restez inform&eacute; en direct !
            </p>
            <p className="text-xs text-white/50 mt-1">
              Recevez une notification quand le vote ouvre, quand un candidat monte sur sc&egrave;ne, et plus encore.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/20 hover:text-white/50 text-lg shrink-0"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold disabled:opacity-50"
          >
            {isLoading ? 'Activation...' : 'Activer les notifications'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-sm"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
