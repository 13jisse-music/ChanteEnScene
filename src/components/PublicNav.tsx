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
  { href: `/${SESSION_SLUG}/live`, label: 'Live / Votes' },
  { href: '/palmares', label: 'Palmarès' },
  { href: '/editions', label: 'Editions' },
  { href: '/blog', label: 'Blog' },
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
            <a href="https://whatsapp.com/channel/0029Vb7aEcVDOQIXPLHWJh1k" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-[#25D366]/80 transition-all" title="WhatsApp">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ━━━ MOBILE NAV (visible below xl) ━━━ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 overflow-visible" suppressHydrationWarning>
        <div className="flex items-center justify-between px-4 py-2 bg-[#110d1f] backdrop-blur-xl overflow-visible">
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

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 top-[6px] z-[60]">
            <LogoRing size={85} />
          </Link>

          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/chantenscene" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10" title="Facebook">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </a>
            <a href="https://whatsapp.com/channel/0029Vb7aEcVDOQIXPLHWJh1k" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10" title="WhatsApp">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </a>
          </div>
        </div>
        {/* Soft gradient fade below nav — no visible line */}
        <div className="h-10 bg-gradient-to-b from-[#110d1f] to-transparent pointer-events-none" />
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

          {/* L'affiche — mobile only */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <Link
              href="/#affiche"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#e91e8c]/70 hover:text-[#e91e8c] hover:bg-[#e91e8c]/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              L&apos;affiche 2026
            </Link>
          </div>

          {/* Nous soutenir */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-xs uppercase tracking-[0.3em] text-white/30 mb-3 px-4">
              Nous soutenir
            </p>
            <Link
              href="/soutenir"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              Faire un don
            </Link>
            <Link
              href={`/${SESSION_SLUG}/partenaires`}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              Devenir partenaire
            </Link>
          </div>
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
              <a href="https://whatsapp.com/channel/0029Vb7aEcVDOQIXPLHWJh1k" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366] transition-transform active:scale-90" title="WhatsApp">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
