'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS: { href: string; label: string; icon: string; section?: string }[] = [
  // Préparation
  { href: '/admin', label: 'Dashboard', icon: '📊', section: 'Préparation' },
  { href: '/admin/config', label: 'Configuration', icon: '⚙️' },
  { href: '/admin/sessions', label: 'Sessions', icon: '📁' },
  { href: '/admin/jury', label: 'Jury', icon: '⭐' },
  // Inscriptions
  { href: '/admin/candidats', label: 'Candidats', icon: '🎤', section: 'Inscriptions' },
  // Phase En Ligne
  { href: '/admin/jury-en-ligne', label: 'Régie En Ligne', icon: '📱', section: 'Phase En Ligne' },
  { href: '/admin/stats-en-ligne', label: 'Stats En Ligne', icon: '📉' },
  { href: '/admin/stats-jury', label: 'Fiabilité Jury', icon: '🔍' },
  // Sélection
  { href: '/admin/suivi-mp3', label: 'Suivi MP3', icon: '🎵', section: 'Sélection' },
  // Demi-finale
  { href: '/admin/demi-finale', label: 'Régie Demi-finale', icon: '🎬', section: 'Demi-finale' },
  { href: '/admin/demi-finale/checkin', label: 'Check-in', icon: '📋' },
  { href: '/admin/stats-demi-finale', label: 'Stats Marketing', icon: '📈' },
  // Finale
  { href: '/admin/finale', label: 'Régie Finale', icon: '🏟️', section: 'Finale' },
  { href: '/admin/finale/stats', label: 'Stats Finale', icon: '🏅' },
  // Post-compétition
  { href: '/admin/resultats', label: 'Résultats', icon: '🏆', section: 'Post-compétition' },
  { href: '/admin/palmares', label: 'Palmarès', icon: '🥇' },
  { href: '/admin/export-mp3', label: 'Export MP3', icon: '💾' },
  { href: '/admin/photos', label: 'Photos', icon: '📸' },
  { href: '/admin/editions', label: 'Editions', icon: '🎞️' },
  { href: '/admin/sponsors', label: 'Sponsors', icon: '🤝' },
  { href: '/admin/chatbot', label: 'Chatbot FAQ', icon: '💬' },
  { href: '/admin/social', label: 'Réseaux sociaux', icon: '📣' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: '📧' },
  // Dev
  { href: '/admin/seed', label: 'Données test', icon: '🧪', section: 'Dev' },
  { href: '/admin/infra', label: 'Infrastructure', icon: '🔧' },
  // Aide
  { href: '/admin/guide', label: "Mode d'emploi", icon: '📖', section: 'Aide' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Hide entire sidebar on login page
  const isLoginPage = pathname === '/admin/login'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  if (isLoginPage) return null

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2.5 rounded-xl bg-[#1a1232] border border-[#2a2545] text-white/70 hover:text-white active:scale-95 transition-all"
        aria-label="Ouvrir le menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-[#0a0818] border-r border-[#2a2545] flex flex-col w-64 h-screen
          ${mobileOpen ? 'fixed inset-y-0 left-0 z-[56]' : 'hidden'}
          md:relative md:flex md:z-auto`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label="Fermer le menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="p-5 border-b border-[#2a2545]">
          <Link href="/" className="block">
            <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
              <span className="text-white">Chant</span>
              <span className="text-[#7ec850]">En</span>
              <span className="text-[#e91e8c]">Scène</span>
            </h1>
            <p className="text-white/30 text-xs mt-0.5">Administration</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const exactMatch = ['/admin', '/admin/finale', '/admin/jury', '/admin/demi-finale', '/admin/config', '/admin/sessions']
            const isActive = exactMatch.includes(item.href)
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <div key={item.href}>
                {item.section && (
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold px-3 pt-4 pb-1.5 first:pt-0">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e91e8c]/10 text-[#e91e8c]'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#2a2545]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors w-full"
          >
            <span>🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
