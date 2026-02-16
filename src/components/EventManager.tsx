'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  createEvent,
  updateEventStatus,
  setCurrentCandidate,
  toggleVoting,
  saveLineup,
  reorderLineup,
  updateLineupStatus,
  setCurrentCategory,
  deleteEvent,
  callToStage,
  endPerformance,
} from '@/app/admin/events/actions'
import { useJuryNotifications } from '@/hooks/useJuryNotifications'
import JuryVoteCounter from '@/components/JuryVoteCounter'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  status: string
  likes_count: number
}

interface LiveEvent {
  id: string
  event_type: string
  status: string
  current_candidate_id: string | null
  current_category: string | null
  is_voting_open: boolean
  created_at: string
}

interface LineupItem {
  id: string
  live_event_id: string
  candidate_id: string
  position: number
  status: string
  candidates: {
    id: string
    first_name: string
    last_name: string
    stage_name: string | null
    category: string
  }
}

interface Session {
  id: string
  name: string
  config?: { age_categories?: { name: string }[] }
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
}

interface Props {
  session: Session | null
  events: LiveEvent[]
  candidates: Candidate[]
  lineups: LineupItem[]
  jurors?: Juror[]
  existingScoreCount?: number
}

const EVENT_LABELS: Record<string, string> = { semifinal: 'Demi-finale', final: 'Finale' }
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#f59e0b' },
  live: { label: 'EN DIRECT', color: '#ef4444' },
  paused: { label: 'En pause', color: '#f59e0b' },
  completed: { label: 'Terminé', color: '#7ec850' },
}
const LINEUP_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#666' },
  performing: { label: 'Sur scène', color: '#e91e8c' },
  completed: { label: 'Passé', color: '#7ec850' },
  absent: { label: 'Absent', color: '#ef4444' },
}

export default function EventManager({ session, events, candidates, lineups, jurors = [], existingScoreCount = 0 }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(events[0]?.id || null)
  const [showLineupEditor, setShowLineupEditor] = useState(false)
  const [lineupCandidates, setLineupCandidates] = useState<string[]>([])
  const [showRepechage, setShowRepechage] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const activeEvent = events.find((e) => e.id === selectedEvent)
  const isLive = activeEvent?.status === 'live'
  const eventLineupItems = lineups.filter((l) => l.live_event_id === selectedEvent)

  const relevantJurors = jurors.filter((j) => {
    if (activeEvent?.event_type === 'semifinal') return ['online', 'semifinal'].includes(j.role)
    if (activeEvent?.event_type === 'final') return j.role === 'final'
    return false
  })
  const totalExpected = relevantJurors.length * eventLineupItems.length

  const { getJuryCountForCandidate } = useJuryNotifications({
    sessionId: session?.id || '',
    eventType: activeEvent?.event_type || 'semifinal',
    jurors: relevantJurors,
    candidates,
    enabled: isLive,
  })

  // Compute total jury scores across all lineup candidates
  const voteCount = eventLineupItems.reduce((sum, l) => sum + getJuryCountForCandidate(l.candidate_id), 0)

  if (!session) return <p className="text-white/30">Aucune session active.</p>

  const eventLineup = eventLineupItems.sort((a, b) => a.position - b.position)

  // Filter candidates based on event type
  const STATUS_PRIORITY: Record<string, number> = { finalist: 0, semifinalist: 1, approved: 2 }
  const eligibleCandidates = activeEvent
    ? candidates
        .filter((c) => {
          if (activeEvent.event_type === 'semifinal') {
            return c.status === 'approved' || c.status === 'semifinalist'
          }
          if (activeEvent.event_type === 'final') {
            return c.status === 'finalist' || c.status === 'semifinalist'
          }
          return true
        })
        .sort((a, b) => {
          const pa = STATUS_PRIORITY[a.status] ?? 9
          const pb = STATUS_PRIORITY[b.status] ?? 9
          if (pa !== pb) return pa - pb
          return b.likes_count - a.likes_count
        })
    : candidates

  async function handleCreate(type: string) {
    setLoading(true)
    await createEvent(session!.id, type)
    setLoading(false)
  }

  async function handleStatus(status: string) {
    if (!selectedEvent) return
    setLoading(true)
    await updateEventStatus(selectedEvent, status)
    setLoading(false)
  }

  async function handleToggleVoting() {
    if (!activeEvent) return
    setLoading(true)
    await toggleVoting(activeEvent.id, !activeEvent.is_voting_open)
    setLoading(false)
  }

  async function handleSetCurrent(candidateId: string | null) {
    if (!selectedEvent) return
    setLoading(true)
    await setCurrentCandidate(selectedEvent, candidateId)
    setLoading(false)
  }

  async function handleSaveLineup() {
    if (!selectedEvent) return
    setLoading(true)
    await saveLineup(selectedEvent, lineupCandidates)
    setShowLineupEditor(false)
    setLoading(false)
  }

  async function handleDelete() {
    if (!activeEvent) return
    const label = EVENT_LABELS[activeEvent.event_type] || activeEvent.event_type
    if (!confirm(`Supprimer l'événement "${label}" et tout son lineup ?`)) return
    setLoading(true)
    await deleteEvent(activeEvent.id)
    setSelectedEvent(null)
    setLoading(false)
  }

  async function handleLineupItemStatus(lineupId: string, status: string) {
    setLoading(true)
    await updateLineupStatus(lineupId, status)
    setLoading(false)
  }

  async function handleCallToStage(candidateId: string, lineupId: string) {
    if (!activeEvent) return
    setLoading(true)
    await callToStage(activeEvent.id, candidateId, lineupId)
    setLoading(false)
  }

  async function handleEndPerformance(lineupId: string) {
    if (!activeEvent) return
    setLoading(true)
    await endPerformance(activeEvent.id, lineupId)
    setLoading(false)
  }

  function openLineupEditor() {
    const existing = eventLineup.map((l) => l.candidate_id)
    setLineupCandidates(existing.length > 0 ? existing : [])
    setShowLineupEditor(true)
  }

  function toggleLineupCandidate(id: string) {
    setLineupCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSetCategory(category: string | null) {
    if (!activeEvent) return
    setLoading(true)
    await setCurrentCategory(activeEvent.id, category)
    setLoading(false)
  }

  function autoGroupByCategory() {
    const catOrder = session?.config?.age_categories?.map((c) => c.name) || []
    const sorted = [...lineupCandidates].sort((aId, bId) => {
      const a = candidates.find((c) => c.id === aId)
      const b = candidates.find((c) => c.id === bId)
      const ai = catOrder.indexOf(a?.category || '')
      const bi = catOrder.indexOf(b?.category || '')
      if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      return (b?.likes_count || 0) - (a?.likes_count || 0)
    })
    setLineupCandidates(sorted)
  }

  function moveLineup(index: number, direction: -1 | 1) {
    const newArr = [...lineupCandidates]
    const target = index + direction
    if (target < 0 || target >= newArr.length) return
    ;[newArr[index], newArr[target]] = [newArr[target], newArr[index]]
    setLineupCandidates(newArr)
  }

  // Drag & drop for saved lineup reordering
  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }

  function handleDragEnd() {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  async function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) {
      handleDragEnd()
      return
    }
    const items = [...eventLineup]
    const [moved] = items.splice(dragIdx, 1)
    items.splice(targetIdx, 0, moved)
    const updates = items.map((item, i) => ({ id: item.id, position: i + 1 }))
    handleDragEnd()
    setLoading(true)
    await reorderLineup(updates)
    setLoading(false)
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Create event buttons */}
      <div className="flex flex-wrap gap-3">
        {['semifinal', 'final'].map((type) => {
          const exists = events.some((e) => e.event_type === type)
          return (
            <button
              key={type}
              onClick={() => handleCreate(type)}
              disabled={exists}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              + Créer {EVENT_LABELS[type]}
              {exists && ' (existe déjà)'}
            </button>
          )
        })}
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <div className="flex gap-2">
          {events.map((e) => {
            const st = STATUS_CONFIG[e.status]
            return (
              <button
                key={e.id}
                onClick={() => setSelectedEvent(e.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedEvent === e.id
                    ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {EVENT_LABELS[e.event_type]}
                <span
                  className="ml-2 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${st.color}15`, color: st.color }}
                >
                  {st.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Active event controls */}
      {activeEvent && (
        <>
          {/* Status controls */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white">
                Contrôle {EVENT_LABELS[activeEvent.event_type]}
              </h2>
              {activeEvent.status === 'live' && (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  EN DIRECT
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {activeEvent.status !== 'live' && (
                <button
                  onClick={() => handleStatus('live')}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  🔴 Lancer le direct
                </button>
              )}
              {activeEvent.status === 'live' && (
                <button
                  onClick={() => handleStatus('paused')}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  ⏸ Pause
                </button>
              )}
              {activeEvent.status === 'paused' && (
                <button
                  onClick={() => handleStatus('live')}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  ▶ Reprendre
                </button>
              )}
              {['live', 'paused'].includes(activeEvent.status) && (
                <button
                  onClick={() => handleStatus('completed')}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
                >
                  ✅ Terminer
                </button>
              )}
              <button
                onClick={handleToggleVoting}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeEvent.is_voting_open
                    ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {activeEvent.is_voting_open ? '🟢 Votes ouverts' : '🔒 Ouvrir les votes'}
              </button>
              {activeEvent.status !== 'live' && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/5 border border-red-500/15 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                >
                  🗑 Supprimer
                </button>
              )}
            </div>

            {/* Vote counter — visible when live */}
            {isLive && totalExpected > 0 && (
              <JuryVoteCounter current={existingScoreCount + voteCount} total={totalExpected} />
            )}
          </div>

          {/* Banner: link to Régie Finale */}
          {activeEvent.event_type === 'final' && activeEvent.status === 'live' && (
            <Link
              href="/admin/finale"
              className="block bg-gradient-to-r from-[#e91e8c]/10 to-[#f5a623]/10 border border-[#e91e8c]/30 rounded-2xl p-5 hover:from-[#e91e8c]/15 hover:to-[#f5a623]/15 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
                    🎬 Regie Finale
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Timer, classement en direct, annonce du gagnant par categorie
                  </p>
                </div>
                <span className="text-[#e91e8c] text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Ouvrir →
                </span>
              </div>
            </Link>
          )}

          {/* Stage control bar — when a candidate is on stage */}
          {isLive && (() => {
            const currentLineupItem = eventLineup.find((l) => l.candidate_id === activeEvent.current_candidate_id)
            if (!currentLineupItem) return null
            const c = currentLineupItem.candidates
            const name = c.stage_name || `${c.first_name} ${c.last_name}`
            return (
              <div className="bg-[#1a1232] border-2 border-[#e91e8c]/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-[#e91e8c] text-xs uppercase tracking-widest font-bold">Sur scene</p>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">{name}</p>
                  <span className="text-xs text-white/30">{c.category}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleVoting}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeEvent.is_voting_open
                        ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850]'
                        : 'bg-white/5 border border-white/10 text-white/40'
                    }`}
                  >
                    {activeEvent.is_voting_open ? '🟢 Votes ouverts' : '🔒 Ouvrir les votes'}
                  </button>
                  <button
                    onClick={() => handleEndPerformance(currentLineupItem.id)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    ⏹ Fin de prestation
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Lineup */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2545]">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white">
                Ordre de passage
              </h2>
              <button
                onClick={openLineupEditor}
                className="px-4 py-1.5 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
              >
                {eventLineup.length > 0 ? 'Modifier' : '+ Créer le lineup'}
              </button>
            </div>

            {/* Catégorie en cours — finale seulement */}
            {activeEvent.event_type === 'final' && session?.config?.age_categories && (
              <div className="p-4 border-b border-[#2a2545]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Catégorie en cours</p>
                <div className="flex gap-2">
                  {session.config.age_categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => handleSetCategory(activeEvent.current_category === cat.name ? null : cat.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeEvent.current_category === cat.name
                          ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                          : 'bg-white/5 border border-white/10 text-white/30 hover:text-white/60'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {eventLineup.length > 0 ? (
              <div className="divide-y divide-[#2a2545]">
                {eventLineup.map((item, idx) => {
                  const c = item.candidates
                  const name = c.stage_name || `${c.first_name} ${c.last_name}`
                  const ls = LINEUP_STATUS[item.status] || LINEUP_STATUS.pending
                  const isCurrent = activeEvent.current_candidate_id === item.candidate_id
                  const prevCategory = idx > 0 ? eventLineup[idx - 1].candidates.category : null
                  const showCategoryHeader = c.category !== prevCategory
                  const isDragging = dragIdx === idx
                  const isDragOver = dragOverIdx === idx && dragIdx !== idx

                  return (
                    <div key={item.id}>
                      {showCategoryHeader && (
                        <div className="px-4 py-2 bg-[#1a1533] border-b border-[#2a2545]">
                          <p className="text-[10px] text-[#e91e8c] uppercase tracking-wider font-bold">
                            {c.category}
                          </p>
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-4 p-4 transition-all ${
                          isCurrent ? 'bg-[#e91e8c]/5' : ''
                        } ${isDragging ? 'opacity-30' : ''} ${
                          isDragOver ? 'border-t-2 border-t-[#e91e8c] bg-[#e91e8c]/5' : ''
                        }`}
                      >
                        <span className="cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 text-sm shrink-0 select-none" title="Glisser pour réordonner">⠿</span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/30 text-sm font-bold shrink-0">
                          {item.position}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {name}
                            {isCurrent && <span className="ml-2 text-[#e91e8c] text-xs">🎤 En scène</span>}
                          </p>
                          <p className="text-xs text-white/30">{c.category}</p>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ background: `${ls.color}15`, color: ls.color }}
                        >
                          {ls.label}
                        </span>
                        {/* Contextual action button */}
                        {item.status === 'pending' && !activeEvent.current_candidate_id && (
                          <button
                            onClick={() => handleCallToStage(item.candidate_id, item.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
                          >
                            Appeler
                          </button>
                        )}
                        {item.status === 'pending' && activeEvent.current_candidate_id && !isCurrent && (
                          <span className="text-xs text-white/15">—</span>
                        )}
                        {isCurrent && (
                          <button
                            onClick={() => handleEndPerformance(item.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Fin
                          </button>
                        )}
                        {item.status === 'completed' && !isCurrent && (
                          <span className="text-[#7ec850] text-sm">✓</span>
                        )}
                        {item.status === 'absent' && (
                          <span className="text-red-400 text-sm">✗</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="p-8 text-center text-white/30 text-sm">
                Aucun ordre de passage défini.
              </p>
            )}
          </div>

          {/* Lineup editor modal */}
          {showLineupEditor && (
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white">Sélectionner et ordonner les candidats</h3>
              {(() => {
                const finalistCandidates = eligibleCandidates.filter((c) => c.status === 'finalist')
                const semifinalistCandidates = eligibleCandidates.filter((c) => c.status === 'semifinalist')
                const isFinal = activeEvent?.event_type === 'final'

                return isFinal
                  ? <p className="text-xs text-white/30">{finalistCandidates.length} finaliste(s) pour la finale</p>
                  : <p className="text-xs text-white/30">{eligibleCandidates.length} candidat(s) éligibles pour la demi-finale (statut : approuvé / demi-finaliste)</p>
              })()}

              {/* Available candidates */}
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {(() => {
                  const renderCandidate = (c: Candidate) => {
                    const name = c.stage_name || `${c.first_name} ${c.last_name}`
                    const selected = lineupCandidates.includes(c.id)
                    const isFinalist = c.status === 'finalist'
                    const isSemi = c.status === 'semifinalist'
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleLineupCandidate(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          selected
                            ? 'bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-white'
                            : 'bg-white/[0.02] border border-transparent text-white/40 hover:text-white/70'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border ${selected ? 'bg-[#e91e8c] border-[#e91e8c]' : 'border-white/20'} flex items-center justify-center text-xs`}>
                          {selected && '✓'}
                        </span>
                        {name}
                        <span className="flex items-center gap-2 ml-auto">
                          <span className="text-[10px] text-white/20">{c.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isFinalist ? 'bg-[#f5a623]/15 text-[#f5a623]' : isSemi ? 'bg-[#7ec850]/15 text-[#7ec850]' : 'bg-white/5 text-white/20'
                          }`}>
                            {isFinalist ? 'Finaliste' : isSemi ? 'Demi-finaliste' : 'Approuvé'}
                          </span>
                          <span className="text-[10px] text-[#e91e8c]">{c.likes_count} ❤️</span>
                        </span>
                      </button>
                    )
                  }

                  // For finale: finalists by category + repêchage button
                  if (activeEvent?.event_type === 'final' && session?.config?.age_categories) {
                    const catOrder = session.config.age_categories.map((c) => c.name)
                    const finalistCandidates = eligibleCandidates.filter((c) => c.status === 'finalist')
                    const semifinalistCandidates = eligibleCandidates.filter((c) => c.status === 'semifinalist')
                    return (
                      <>
                        {catOrder.map((catName) => {
                          const catCandidates = finalistCandidates.filter((c) => c.category === catName)
                          if (catCandidates.length === 0) return null
                          return (
                            <div key={catName}>
                              <p className="text-[10px] text-[#f5a623] uppercase tracking-wider px-1 pt-2 pb-1 font-bold">
                                {catName} ({catCandidates.length})
                              </p>
                              {catCandidates.map(renderCandidate)}
                            </div>
                          )
                        })}

                        {semifinalistCandidates.length > 0 && (
                          <div className="pt-2">
                            <button
                              onClick={() => setShowRepechage(!showRepechage)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.03] border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
                            >
                              <span>Repêcher un demi-finaliste ({semifinalistCandidates.length})</span>
                              <span className="text-white/20">{showRepechage ? '▲' : '▼'}</span>
                            </button>
                            {showRepechage && (
                              <div className="mt-1 space-y-1">
                                {catOrder.map((catName) => {
                                  const catCandidates = semifinalistCandidates.filter((c) => c.category === catName)
                                  if (catCandidates.length === 0) return null
                                  return (
                                    <div key={`rep-${catName}`}>
                                      <p className="text-[10px] text-[#7ec850] uppercase tracking-wider px-1 pt-2 pb-1 font-bold">
                                        {catName} ({catCandidates.length})
                                      </p>
                                      {catCandidates.map(renderCandidate)}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  }

                  // For semifinal: group by status
                  const semifinalists = eligibleCandidates.filter((c) => c.status === 'semifinalist')
                  const others = eligibleCandidates.filter((c) => c.status !== 'semifinalist')
                  return (
                    <>
                      {semifinalists.length > 0 && (
                        <p className="text-[10px] text-[#7ec850] uppercase tracking-wider px-1 pt-1">
                          Demi-finalistes ({semifinalists.length})
                        </p>
                      )}
                      {semifinalists.map(renderCandidate)}
                      {others.length > 0 && semifinalists.length > 0 && (
                        <div className="border-t border-[#2a2545] my-2" />
                      )}
                      {others.length > 0 && (
                        <p className="text-[10px] text-white/20 uppercase tracking-wider px-1">
                          Remplaçants ({others.length})
                        </p>
                      )}
                      {others.map(renderCandidate)}
                    </>
                  )
                })()}
              </div>

              {/* Order */}
              {lineupCandidates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/30">Ordre de passage :</p>
                    {activeEvent?.event_type === 'final' && (
                      <button
                        onClick={autoGroupByCategory}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
                      >
                        Grouper par catégorie
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {lineupCandidates.map((cid, i) => {
                      const c = candidates.find((x) => x.id === cid)
                      if (!c) return null
                      const name = c.stage_name || `${c.first_name} ${c.last_name}`
                      return (
                        <div key={cid} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] rounded-lg text-sm">
                          <span className="text-white/20 text-xs w-5">{i + 1}.</span>
                          <span className="flex-1 text-white/70">{name}</span>
                          <button onClick={() => moveLineup(i, -1)} className="text-white/20 hover:text-white/60 text-xs" disabled={i === 0}>▲</button>
                          <button onClick={() => moveLineup(i, 1)} className="text-white/20 hover:text-white/60 text-xs" disabled={i === lineupCandidates.length - 1}>▼</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveLineup}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
                >
                  Enregistrer le lineup
                </button>
                <button
                  onClick={() => setShowLineupEditor(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/30 text-sm">Créez un événement pour commencer.</p>
        </div>
      )}
    </div>
  )
}
