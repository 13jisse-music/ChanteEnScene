'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  sessionSlug?: string
}

export default function MobileMenu({ sessionSlug = 'aubagne-2026' }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Hide on admin, jury, and upload pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/jury') || pathname.startsWith('/upload-mp3')) {
    return null
  }

  const links = [
    { href: '/', label: 'Accueil' },
    { href: `/${sessionSlug}/candidats`, label: 'Candidats' },
    { href: `/${sessionSlug}/inscription`, label: 'Inscription' },
    { href: `/${sessionSlug}/live`, label: 'Live' },
  ]

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-50 w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all"
        aria-label="Menu"
      >
        <span
          className={`block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300 ${
            open ? 'rotate-45 translate-y-2' : ''
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300 ${
            open ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300 ${
            open ? '-rotate-45 -translate-y-2' : ''
          }`}
        />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="pt-20 px-6">
          <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">
            Navigation
          </p>
          <nav className="space-y-1">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e91e8c]/10 text-[#e91e8c]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Soutenir / Partenaires */}
        <div className="mt-8 px-6">
          <div className="border-t border-gray-100 pt-5">
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
              Nous soutenir
            </p>
            <nav className="space-y-1">
              <Link
                href="/soutenir"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm text-[#b8860b] hover:bg-[#f5a623]/10 transition-colors"
              >
                Faire un don
              </Link>
              <Link
                href="/aubagne-2026/partenaires"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Devenir partenaire
              </Link>
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-6 right-6">
          <div className="border-t border-gray-100 pt-4">
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs text-center">
              <span>Chant</span>
              <span className="text-[#7ec850]">En</span>
              <span className="text-[#e91e8c]">Scène</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
