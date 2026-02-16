'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import RouteSheet from '@/components/RouteSheet'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  status: string
  mp3_url: string | null
  song_title: string
  song_artist: string
  photo_url: string | null
}

interface LineupItem {
  candidate_id: string
  position: number
}

interface Props {
  session: { id: string; name: string; config: { semifinal_date?: string; final_date?: string; semifinal_location?: string; final_location?: string } }
  candidates: Candidate[]
  semifinalLineup: LineupItem[]
  finalLineup: LineupItem[]
}

type Tab = 'semifinal' | 'final' | 'all'

function sanitizeFilename(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export default function ExportMp3Manager({ session, candidates, semifinalLineup, finalLineup }: Props) {
  const [tab, setTab] = useState<Tab>('semifinal')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showRouteSheet, setShowRouteSheet] = useState(false)

  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  // Order candidates by lineup position or fallback to alphabetical
  function getOrderedCandidates(filterTab: Tab): (Candidate & { position: number })[] {
    let filtered = candidates
    let lineup: LineupItem[] = []

    if (filterTab === 'semifinal') {
      filtered = candidates.filter((c) => ['semifinalist', 'finalist', 'winner'].includes(c.status))
      lineup = semifinalLineup
    } else if (filterTab === 'final') {
      filtered = candidates.filter((c) => ['finalist', 'winner'].includes(c.status))
      lineup = finalLineup
    }

    const positionMap = new Map(lineup.map((l) => [l.candidate_id, l.position]))

    return filtered
      .map((c) => ({ ...c, position: positionMap.get(c.id) || 999 }))
      .sort((a, b) => a.position - b.position || a.last_name.localeCompare(b.last_name))
  }

  const ordered = getOrderedCandidates(tab)
  const withMp3 = ordered.filter((c) => c.mp3_url)
  const withoutMp3 = ordered.filter((c) => !c.mp3_url)

  async function handleDownloadZip() {
    if (withMp3.length === 0) return
    setDownloading(true)
    setProgress(0)

    try {
      const zip = new JSZip()

      for (let i = 0; i < withMp3.length; i++) {
        const c = withMp3[i]
        const num = String(i + 1).padStart(2, '0')
        const name = sanitizeFilename(displayName(c))
        const song = sanitizeFilename(c.song_title)
        const filename = `${num}_${name}_${song}.mp3`

        const response = await fetch(c.mp3_url!)
        const blob = await response.blob()
        zip.file(filename, blob)

        setProgress(((i + 1) / withMp3.length) * 100)
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `ChanteEnScene_MP3_${tab}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erreur lors de la creation du ZIP.')
    } finally {
      setDownloading(false)
      setProgress(0)
    }
  }

  function handleDownloadSingle(c: Candidate) {
    if (!c.mp3_url) return
    const a = document.createElement('a')
    a.href = c.mp3_url
    a.download = `${sanitizeFilename(displayName(c))}_${sanitizeFilename(c.song_title)}.mp3`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handlePrintRouteSheet() {
    setShowRouteSheet(true)
    setTimeout(() => window.print(), 300)
  }

  if (showRouteSheet) {
    return (
      <div>
        <div className="no-print mb-4">
          <button
            onClick={() => setShowRouteSheet(false)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 transition-colors"
          >
            ← Retour
          </button>
        </div>
        <RouteSheet
          sessionName={session.name}
          eventType={tab === 'final' ? 'Finale' : 'Demi-finale'}
          eventDate={tab === 'final' ? session.config.final_date : session.config.semifinal_date}
          eventLocation={tab === 'final' ? session.config.final_location : session.config.semifinal_location}
          candidates={ordered}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
          Export MP3
        </h1>
        <p className="text-white/40 text-sm">{session.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'semifinal' as Tab, label: 'Demi-finale' },
          { key: 'final' as Tab, label: 'Finale' },
          { key: 'all' as Tab, label: 'Tous' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">MP3 reçus</p>
          <p className="text-sm text-white tabular-nums">
            <span className={withMp3.length === ordered.length ? 'text-[#7ec850]' : 'text-[#f5a623]'}>
              {withMp3.length}
            </span>
            <span className="text-white/30">/{ordered.length}</span>
          </p>
        </div>
        <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${ordered.length > 0 ? (withMp3.length / ordered.length) * 100 : 0}%` }}
          />
        </div>
        {withoutMp3.length > 0 && (
          <p className="text-[#f5a623] text-xs mt-2">
            {withoutMp3.length} candidat{withoutMp3.length > 1 ? 's' : ''} sans MP3 : {withoutMp3.map((c) => displayName(c)).join(', ')}
          </p>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadZip}
          disabled={downloading || withMp3.length === 0}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
        >
          {downloading ? `Création du ZIP... ${Math.round(progress)}%` : `Télécharger tout en ZIP (${withMp3.length} fichiers)`}
        </button>
        <button
          onClick={handlePrintRouteSheet}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
        >
          Feuille de régie
        </button>
      </div>

      {/* Progress bar during download */}
      {downloading && (
        <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e91e8c] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Candidate table */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2545] text-white/30 text-xs">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Candidat</th>
                <th className="px-4 py-3 text-left">Chanson</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-center">MP3</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2545]">
              {ordered.map((c, idx) => (
                <tr key={c.id} className={!c.mp3_url ? 'bg-red-500/5' : ''}>
                  <td className="px-4 py-3 text-white/30">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                        )}
                      </div>
                      <span className="text-white/80 truncate">{displayName(c)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/60 truncate">{c.song_title}</p>
                    <p className="text-white/30 text-xs truncate">{c.song_artist}</p>
                  </td>
                  <td className="px-4 py-3 text-white/40">{c.category}</td>
                  <td className="px-4 py-3 text-center">
                    {c.mp3_url ? (
                      <span className="text-[#7ec850]">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.mp3_url ? (
                      <button
                        onClick={() => handleDownloadSingle(c)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Télécharger
                      </button>
                    ) : (
                      <span className="text-white/20 text-xs">Manquant</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
