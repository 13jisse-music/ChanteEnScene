'use client'

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
  { href: '/admin/sponsors', label: 'Sponsors', icon: '🤝' },
  { href: '/admin/chatbot', label: 'Chatbot FAQ', icon: '💬' },
  { href: '/admin/social', label: 'Réseaux sociaux', icon: '📣' },
  // Dev
  { href: '/admin/seed', label: 'Données test', icon: '🧪', section: 'Dev' },
  // Aide
  { href: '/admin/guide', label: "Mode d'emploi", icon: '📖', section: 'Aide' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-[#0a0818] border-r border-[#2a2545] min-h-screen flex flex-col">
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
  )
}
