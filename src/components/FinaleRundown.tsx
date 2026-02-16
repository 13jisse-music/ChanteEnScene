'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/app/admin/events/actions'

interface Finalist {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  mp3_url: string | null
  song_title: string | null
  song_artist: string | null
}

interface Props {
  sessionId: string
  sessionName: string
  config: {
    age_categories?: { name: string }[]
    final_date?: string
    final_location?: string
    performance_recommended_sec?: number
    vote_duration_sec?: number
  }
  finalists: Finalist[]
}

const CATEGORY_ORDER = ['Enfant', 'Ado', 'Adulte']
const CATEGORY_COLORS: Record<string, string> = {
  Enfant: '#f5a623',
  Ado: '#7ec850',
  Adulte: '#e91e8c',
}

export default function FinaleRundown({ sessionId, sessionName, config, finalists }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  // Build category order from config or fallback
  const categoryNames = config.age_categories
    ? config.age_categories.map((c) => c.name).sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a)
        const ib = CATEGORY_ORDER.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
    : CATEGORY_ORDER

  // Group finalists by category, preserving order
  const grouped: Record<string, Finalist[]> = {}
  for (const cat of categoryNames) {
    const items = finalists.filter((f) => f.category === cat)
    if (items.length > 0) grouped[cat] = items
  }

  // State: ordered candidate IDs per category
  const [categoryOrder, setCategoryOrder] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {}
    for (const [cat, items] of Object.entries(grouped)) {
      init[cat] = items.map((f) => f.id)
    }
    return init
  })

  // DnD state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [dragCategory, setDragCategory] = useState<string | null>(null)

  // Lookup helper
  const finalistById = (id: string) => finalists.find((f) => f.id === id)!
  const displayName = (f: Finalist) => f.stage_name || `${f.first_name} ${f.last_name}`

  // Duration estimates
  const perfSec = config.performance_recommended_sec || 180
  const voteSec = config.vote_duration_sec || 60
  const perCandidateMin = (perfSec + voteSec + 30) / 60
  const totalFinalists = Object.values(categoryOrder).reduce((s, ids) => s + ids.length, 0)
  const totalMin = Math.ceil(totalFinalists * perCandidateMin + 20)

  // Format date
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return d }
  }

  // DnD handlers (same pattern as EventManager.tsx)
  function handleDragStart(e: React.DragEvent, category: string, idx: number) {
    setDragCategory(category)
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, category: string, idx: number) {
    e.preventDefault()
    if (category !== dragCategory) return
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }

  function handleDrop(e: React.DragEvent, category: string, targetIdx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx || category !== dragCategory) {
      handleDragEnd()
      return
    }
    const items = [...(categoryOrder[category] || [])]
    const [moved] = items.splice(dragIdx, 1)
    items.splice(targetIdx, 0, moved)
    setCategoryOrder((prev) => ({ ...prev, [category]: items }))
    handleDragEnd()
  }

  function handleDragEnd() {
    setDragIdx(null)
    setDragOverIdx(null)
    setDragCategory(null)
  }

  // Move up/down (fallback for touch)
  function handleMove(category: string, idx: number, direction: -1 | 1) {
    const items = [...(categoryOrder[category] || [])]
    const target = idx + direction
    if (target < 0 || target >= items.length) return
    ;[items[idx], items[target]] = [items[target], items[idx]]
    setCategoryOrder((prev) => ({ ...prev, [category]: items }))
  }

  // Create finale
  async function handleCreate() {
    setCreating(true)
    try {
      const orderedIds = categoryNames.flatMap((cat) => categoryOrder[cat] || [])
      const result = await createEvent(sessionId, 'final', orderedIds)
      if (result?.error) {
        alert(result.error)
        setCreating(false)
        return
      }
      router.refresh()
    } catch {
      setCreating(false)
    }
  }

  // Empty state
  if (finalists.length === 0) {
    return (
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-4">
          Feuille de Route — Grande Finale
        </h1>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/40 mb-2">Aucun finaliste selectionne.</p>
          <p className="text-white/25 text-sm mb-4">Selectionnez d'abord les finalistes depuis la regie demi-finale.</p>
          <a
            href="/admin/demi-finale"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c] text-sm font-medium hover:bg-[#e91e8c]/25 transition-colors"
          >
            Aller a la regie demi-finale
          </a>
        </div>
      </div>
    )
  }

  const orderedCategories = categoryNames.filter((cat) => (categoryOrder[cat] || []).length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
          Feuille de Route — Grande Finale
        </h1>
        <p className="text-white/40 text-sm">{sessionName}</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {config.final_date && (
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Date</p>
            <p className="text-white text-sm font-medium mt-1 capitalize">{formatDate(config.final_date)}</p>
          </div>
        )}
        {config.final_location && (
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Lieu</p>
            <p className="text-white text-sm font-medium mt-1">{config.final_location}</p>
          </div>
        )}
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider">Finalistes</p>
          <p className="text-white text-sm font-medium mt-1">{totalFinalists} candidats</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider">Duree estimee</p>
          <p className="text-white text-sm font-medium mt-1">~{totalMin} min</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-10">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-[#e91e8c]/40 via-[#f5a623]/30 to-[#7ec850]/40" />

        {/* Ouverture */}
        <TimelineNode color="#e91e8c" />
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 mb-6">
          <p className="text-white/60 text-sm font-medium">Ouverture / Introduction</p>
          <p className="text-white/25 text-xs mt-1">Accueil du public, presentation du jury, explication du deroulement</p>
        </div>

        {/* Per-category blocks */}
        {orderedCategories.map((cat) => {
          const ids = categoryOrder[cat] || []
          const color = CATEGORY_COLORS[cat] || '#e91e8c'
          const catMin = Math.ceil(ids.length * perCandidateMin)

          return (
            <div key={cat} className="mb-8">
              {/* Category header */}
              <TimelineNode color={color} />
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                >
                  {cat}
                </span>
                <span className="text-white/30 text-xs">{ids.length} finaliste{ids.length > 1 ? 's' : ''}</span>
                <span className="text-white/20 text-xs">~{catMin} min</span>
              </div>

              {/* Candidate cards (draggable) */}
              <div className="space-y-1 mb-4">
                {ids.map((id, idx) => {
                  const f = finalistById(id)
                  if (!f) return null
                  const isDragging = dragCategory === cat && dragIdx === idx
                  const isDragOver = dragCategory === cat && dragOverIdx === idx

                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cat, idx)}
                      onDragOver={(e) => handleDragOver(e, cat, idx)}
                      onDrop={(e) => handleDrop(e, cat, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-[#161228] border transition-all ${
                        isDragOver
                          ? 'border-t-2 border-t-[#e91e8c] bg-[#e91e8c]/5 border-[#e91e8c]/30'
                          : 'border-[#2a2545]'
                      } ${isDragging ? 'opacity-30' : ''}`}
                    >
                      {/* Drag handle */}
                      <span className="text-white/15 cursor-grab active:cursor-grabbing select-none text-sm">
                        ⠿
                      </span>

                      {/* Position */}
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-white/30 text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>

                      {/* Photo */}
                      <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                        {f.photo_url ? (
                          <img src={f.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                        )}
                      </div>

                      {/* Name + song */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{displayName(f)}</p>
                        <p className="text-xs text-white/30 truncate">
                          {f.song_title ? (
                            <>
                              <em>&laquo; {f.song_title} &raquo;</em>
                              {f.song_artist && <span> — {f.song_artist}</span>}
                            </>
                          ) : (
                            <span className="text-white/15">Chanson non renseignee</span>
                          )}
                        </p>
                      </div>

                      {/* MP3 badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          f.mp3_url
                            ? 'bg-[#7ec850]/15 text-[#7ec850] border border-[#7ec850]/25'
                            : 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/25'
                        }`}
                      >
                        MP3 {f.mp3_url ? '✓' : '⏳'}
                      </span>

                      {/* Move arrows */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => handleMove(cat, idx, -1)}
                          disabled={idx === 0}
                          className="text-white/20 hover:text-white/60 text-[10px] disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMove(cat, idx, 1)}
                          disabled={idx === ids.length - 1}
                          className="text-white/20 hover:text-white/60 text-[10px] disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Winner announcement marker */}
              <div className="flex items-center gap-3 ml-1 mb-2">
                <div className="w-5 h-px bg-[#f5a623]/30" />
                <span className="text-xs font-medium text-[#f5a623]/60">
                  🏆 Annonce du vainqueur {cat}
                </span>
              </div>
            </div>
          )
        })}

        {/* Cloture */}
        <TimelineNode color="#7ec850" />
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/60 text-sm font-medium">Remise des prix / Cloture</p>
          <p className="text-white/25 text-xs mt-1">Annonce du grand vainqueur, remise des prix, remerciements</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2545]">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
        >
          {creating ? 'Creation en cours...' : '🎬 Creer la finale et lancer la regie'}
        </button>
      </div>
    </div>
  )
}

/* Small timeline node component */
function TimelineNode({ color }: { color: string }) {
  return (
    <div
      className="absolute left-[13px] w-3 h-3 rounded-full border-2"
      style={{ backgroundColor: color, borderColor: '#161228', marginTop: '2px' }}
    />
  )
}
