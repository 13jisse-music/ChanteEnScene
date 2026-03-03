'use client'

import { useState } from 'react'

export default function HeroBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false)
  const MAX = 70
  const isLong = bio.length > MAX
  const displayText = !isLong || expanded ? bio : bio.slice(0, MAX).trimEnd() + '…'

  return (
    <p className="text-white/60 text-xs leading-relaxed mt-1.5 whitespace-pre-line line-clamp-2"
      style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)', WebkitLineClamp: expanded ? 'unset' : 2 }}>
      {displayText}
      {isLong && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-white/90 font-medium ml-1 underline underline-offset-2 hover:text-white transition-colors"
        >
          lire la suite
        </button>
      )}
    </p>
  )
}
