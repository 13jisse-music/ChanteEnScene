'use client'

import { useState, useEffect } from 'react'

export default function HeroBio({ bio, name }: { bio: string; name?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/70 text-xs font-medium mt-1.5 underline underline-offset-2 hover:text-white transition-colors"
        style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
      >
        Lire ma bio
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] bg-[#161228] border border-[#2a2545] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2545] shrink-0">
              <h3 className="text-white font-semibold text-sm">
                {name ? `${name}` : 'Bio'}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Bio content — scrollable */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
