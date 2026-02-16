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
  // { href: '/palmares', label: 'Palmarès' }, // TODO: réactiver quand le palmarès sera prêt
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
      {/* ━━━ DESKTOP NAV (hidden below lg) ━━━ */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-10 py-4 bg-[#110d1f]/60 backdrop-blur-xl" suppressHydrationWarning>
        <div className="flex items-center gap-10">
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

        <Link href="/" className="absolute left-1/2 -translate-x-1/2 -top-1">
          <LogoRing size={130} />
        </Link>

        <div className="flex items-center gap-10">
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
        </div>
      </nav>

      {/* ━━━ MOBILE NAV (visible below lg) ━━━ */}
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

          <div className="w-10" />
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
          <div className="border-t border-white/10 pt-4">
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
