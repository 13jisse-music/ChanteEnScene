'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoRing from './LogoRing'

const SESSION_SLUG = 'aubagne-2026'

const LEFT_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '#concours', label: 'Le Concours' },
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: `/${SESSION_SLUG}/inscription`, label: "S'inscrire" },
]

const RIGHT_LINKS = [
  { href: `/${SESSION_SLUG}/candidats`, label: 'Candidats' },
  { href: `/${SESSION_SLUG}/galerie`, label: 'Galerie' },
  { href: `/${SESSION_SLUG}/partenaires`, label: 'Partenaires' },
  { href: `/${SESSION_SLUG}/live`, label: 'Live / Votes' },
  { href: '/palmares', label: 'Palmarès' },
]

const ALL_LINKS = [...LEFT_LINKS, ...RIGHT_LINKS]

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Hide on admin, jury, upload pages
  const hidden =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/jury') ||
    pathname.startsWith('/upload-mp3')

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (hidden) return null

  const isActive = (href: string) => {
    if (href.startsWith('#')) return false
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ━━━ DESKTOP NAV (hidden below xl) ━━━ */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-10 py-4 bg-[#110d1f]/60 backdrop-blur-xl" suppressHydrationWarning>
        <div className="flex items-center gap-8">
          {LEFT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-base font-semibold tracking-wide transition-colors ${
                isActive(link.href)
                  ? 'text-[#f5a623]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Réserve l'espace central pour le logo */}
        <div className="min-w-[140px] shrink-0" />

        <Link href="/" className="absolute left-[42%] -translate-x-1/2 -top-1">
          <LogoRing size={130} />
        </Link>

        <div className="flex items-center gap-8">
          {RIGHT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-base font-semibold tracking-wide transition-colors ${
                isActive(link.href)
                  ? 'text-[#f5a623]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 ml-2">
            <a href="https://www.facebook.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-[#1877F2]/80 transition-all" title="Facebook">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888] transition-all" title="Instagram">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ━━━ MOBILE NAV (visible below xl) ━━━ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" suppressHydrationWarning>
        <div className="flex items-center justify-between px-4 py-2 bg-[#110d1f] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg"
            aria-label="Menu"
          >
            <span
              className={`block w-6 h-0.5 bg-white/80 rounded-full transition-all duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white/80 rounded-full transition-all duration-300 ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white/80 rounded-full transition-all duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 -top-1">
            <LogoRing size={70} />
          </Link>

          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10" title="Facebook">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </a>
            <a href="https://www.instagram.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10" title="Instagram">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
            </a>
          </div>
        </div>
        {/* Gradient fade below nav to hide pink bokeh band */}
        <div className="h-4 bg-gradient-to-b from-[#110d1f] to-transparent pointer-events-none" />
      </div>

      {/* ━━━ MOBILE OVERLAY ━━━ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ━━━ MOBILE SLIDE-IN PANEL ━━━ */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-[#110d1f]/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ease-out flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        suppressHydrationWarning
      >
        <div className="pt-20 px-6 flex-1 overflow-y-auto">
          <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs uppercase tracking-[0.3em] text-white/30 mb-6">
            Navigation
          </p>
          <nav className="space-y-1 pb-4">
            {ALL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[#f5a623]/10 text-[#f5a623]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="px-6 pb-8 pt-4 shrink-0">
          <div className="border-t border-white/10 pt-4 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <a href="https://www.facebook.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2] transition-transform active:scale-90" title="Facebook">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] transition-transform active:scale-90" title="Instagram">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs text-center">
              <span className="text-white">Chant</span>
              <span className="text-[#7ec850]">En</span>
              <span className="text-[#e91e8c]">Scène</span>
            </p>
          </div>
        </div>
      </div>

      {/* Spacer for fixed nav + logo */}
      <div className="h-16 lg:h-32" />
    </>
  )
}
