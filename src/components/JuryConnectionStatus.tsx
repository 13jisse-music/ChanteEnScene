'use client'

import { useJuryOfflineSync } from '@/hooks/useJuryOfflineSync'

export default function JuryConnectionStatus() {
  const { isOnline, pendingCount, syncing } = useJuryOfflineSync()

  if (isOnline && pendingCount === 0) return null

  return (
    <div
      className={`fixed top-2 right-2 z-[90] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
        isOnline
          ? syncing
            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
            : 'bg-[#f5a623]/20 border border-[#f5a623]/30 text-[#f5a623]'
          : 'bg-red-500/20 border border-red-500/30 text-red-300'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? (syncing ? 'bg-blue-400 animate-pulse' : 'bg-[#f5a623]') : 'bg-red-400 animate-pulse'
        }`}
      />
      {!isOnline && 'Hors ligne'}
      {isOnline && syncing && 'Synchronisation...'}
      {isOnline && !syncing && pendingCount > 0 && `${pendingCount} note(s) en attente`}
    </div>
  )
}
