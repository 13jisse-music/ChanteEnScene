'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Semifinalist {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  status: string
  photo_url: string | null
  mp3_url: string | null
  song_title: string | null
  song_artist: string | null
  slug: string
}

interface Props {
  semifinalists: Semifinalist[]
  mp3Count: number
  config: {
    semifinal_date: string | null
    semifinal_time: string | null
    semifinal_location: string | null
    selection_notifications_sent_at: string | null
  }
  semifinalEvent: { id: string; status: string } | null
}

export default function SemifinalPrep({ semifinalists, mp3Count, config, semifinalEvent }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const total = semifinalists.length
  const allMp3Received = mp3Count === total && total > 0
  const notificationsSent = !!config.selection_notifications_sent_at

  // Group by category
  const categories = [...new Set(semifinalists.map((c) => c.category))]
  const filtered = activeCategory
    ? semifinalists.filter((c) => c.category === activeCategory)
    : semifinalists

  // Compute days until semifinal
  const semifinalDate = config.semifinal_date ? new Date(config.semifinal_date + 'T00:00:00') : null
  const daysUntil = semifinalDate
    ? Math.ceil((semifinalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  function copyUploadLink(candidateId: string) {
    const url = `${window.location.origin}/upload-mp3/${candidateId}`
    navigator.clipboard.writeText(url)
    setCopiedId(candidateId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Checklist items
  const steps = [
    { label: 'Notifications envoyées', done: notificationsSent, link: '/admin/resultats' },
    { label: `MP3 reçus (${mp3Count}/${total})`, done: allMp3Received, link: null },
    { label: 'Événement demi-finale créé', done: !!semifinalEvent, link: '/admin/events' },
    { label: 'Lineup défini', done: semifinalEvent?.status === 'ready' || semifinalEvent?.status === 'live' || semifinalEvent?.status === 'completed', link: '/admin/events' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
          Préparation Demi-Finale
        </h2>
        <Link
          href="/admin/resultats"
          className="text-xs text-[#e91e8c] hover:underline"
        >
          Résultats détaillés →
        </Link>
      </div>

      {/* Top row: Progress + Checklist + Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MP3 Progress */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Playbacks MP3</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              allMp3Received
                ? 'bg-[#7ec850]/15 text-[#7ec850]'
                : 'bg-amber-500/15 text-amber-400'
            }`}>
              {mp3Count}/{total}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allMp3Received ? 'bg-[#7ec850]' : 'bg-amber-400'
              }`}
              style={{ width: `${total > 0 ? (mp3Count / total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-white/30 text-xs">
            {allMp3Received
              ? 'Tous les playbacks sont prêts !'
              : `${total - mp3Count} playback(s) en attente`
            }
          </p>
        </div>

        {/* Checklist */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wide block mb-3">Checklist</span>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  step.done
                    ? 'bg-[#7ec850] text-white'
                    : 'bg-white/5 border border-white/15 text-white/20'
                }`}>
                  {step.done ? '✓' : i + 1}
                </span>
                {step.link && !step.done ? (
                  <Link href={step.link} className="text-xs text-white/60 hover:text-[#e91e8c] transition-colors">
                    {step.label}
                  </Link>
                ) : (
                  <span className={`text-xs ${step.done ? 'text-white/40 line-through' : 'text-white/60'}`}>
                    {step.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Date info */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wide block mb-3">Demi-Finale</span>
          {semifinalDate ? (
            <div>
              <p className="text-white font-medium text-sm">
                {semifinalDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {config.semifinal_time && (
                <p className="text-white/40 text-xs mt-1">{config.semifinal_time}</p>
              )}
              {config.semifinal_location && (
                <p className="text-white/40 text-xs mt-0.5">{config.semifinal_location}</p>
              )}
              {daysUntil !== null && (
                <p className={`text-xs font-medium mt-3 ${
                  daysUntil <= 0 ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-white/30'
                }`}>
                  {daysUntil <= 0 ? 'Aujourd\'hui ou passée' : `J-${daysUntil}`}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-white/30 text-xs">Date non définie</p>
              <Link href="/admin/config" className="text-xs text-[#e91e8c] hover:underline mt-1 inline-block">
                Configurer →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !activeCategory
              ? 'bg-[#e91e8c]/15 text-[#e91e8c] border border-[#e91e8c]/25'
              : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
          }`}
        >
          Tous ({total})
        </button>
        {categories.map((cat) => {
          const count = semifinalists.filter((c) => c.category === cat).length
          const mp3InCat = semifinalists.filter((c) => c.category === cat && c.mp3_url).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[#e91e8c]/15 text-[#e91e8c] border border-[#e91e8c]/25'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
              }`}
            >
              {cat} ({mp3InCat}/{count})
            </button>
          )
        })}
      </div>

      {/* Semifinalists list */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[#2a2545]">
          {filtered.map((c) => {
            const name = c.stage_name || `${c.first_name} ${c.last_name}`
            const hasMp3 = !!c.mp3_url
            const isCopied = copiedId === c.id

            return (
              <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                {/* MP3 status indicator */}
                <span className={`w-3 h-3 rounded-full shrink-0 ${hasMp3 ? 'bg-[#7ec850]' : 'bg-red-500/60'}`} />

                {/* Photo */}
                <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 text-lg">🎤</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-white/30 truncate">
                    {c.category}
                    {c.song_title && (
                      <> — &laquo; {c.song_title} &raquo; {c.song_artist && <>de {c.song_artist}</>}</>
                    )}
                  </p>
                </div>

                {/* MP3 badge */}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                  hasMp3
                    ? 'bg-[#7ec850]/15 text-[#7ec850]'
                    : 'bg-red-500/10 text-red-400/60'
                }`}>
                  {hasMp3 ? '🎵 MP3' : '⏳ MP3'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasMp3 ? (
                    <a
                      href={c.mp3_url!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
                    >
                      Écouter
                    </a>
                  ) : (
                    <button
                      onClick={() => copyUploadLink(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        isCopied
                          ? 'bg-[#7ec850]/15 border border-[#7ec850]/25 text-[#7ec850]'
                          : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                      }`}
                    >
                      {isCopied ? 'Copié !' : 'Copier lien'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
