'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PublicFooter() {
  const pathname = usePathname()

  // Hide on admin, jury, upload, checkin pages
  const hidden =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/jury') ||
    pathname.startsWith('/upload-mp3') ||
    pathname.startsWith('/checkin')

  if (hidden) return null

  return (
    <footer className="relative z-10 py-12 px-4 border-t border-white/10">
      <div className="max-w-5xl mx-auto text-center">
        <p
          className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-2"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
        >
          <span className="text-white">Chant</span>
          <span className="text-[#7ec850]">En</span>
          <span className="text-[#e91e8c]">Sc&egrave;ne</span>
        </p>
        <p
          className="text-white/50 text-xs mb-4"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          Concours de chant — Aubagne 2026
        </p>
        <div className="flex items-center justify-center gap-4 text-white/30 text-xs">
          <Link href="/mentions-legales" className="hover:text-white/60 transition-colors">
            Mentions l&eacute;gales
          </Link>
          <span>|</span>
          <Link href="/reglement" className="hover:text-white/60 transition-colors">
            R&egrave;glement
          </Link>
          <span>|</span>
          <Link href="/confidentialite" className="hover:text-white/60 transition-colors">
            Confidentialit&eacute;
          </Link>
        </div>
        <p className="text-white/15 text-[10px] mt-6">
          &copy; {new Date().getFullYear()} Jean-Christophe Martinez. Tous droits r&eacute;serv&eacute;s.
        </p>
      </div>
    </footer>
  )
}
