'use client'

import { useState } from 'react'
import {
  createSession,
  setActiveSession,
  duplicateSession,
  archiveSession,
  deleteSession,
  updateSession,
} from '@/app/admin/sessions/actions'

interface Session {
  id: string
  name: string
  slug: string
  city: string
  year: number
  status: string
  is_active: boolean
  created_at: string
}

import { SESSION_STATUSES, STATUS_CONFIG, type SessionStatus } from '@/lib/phases'

const STATUS_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  SESSION_STATUSES.map(s => [s, { label: STATUS_CONFIG[s].label, color: STATUS_CONFIG[s].color }])
)

export default function SessionManager({ sessions: initialSessions }: { sessions: Session[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await createSession(form)
    if (result.error) {
      setError(result.error)
    } else {
      setShowCreate(false)
      window.location.reload()
    }
    setLoading(false)
  }

  async function handleAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setLoading(true)
    setError(null)
    const result = await action()
    if (result.error) {
      setError(result.error)
    } else {
      window.location.reload()
    }
    setLoading(false)
  }

  async function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await updateSession(id, form)
    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Gestion des sessions
          </h1>
          <p className="text-white/40 text-sm">Créez, dupliquez et gérez vos éditions du concours</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          + Nouvelle session
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6">
          <h2 className="font-bold text-base mb-4">Nouvelle session</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-xs block mb-1">Nom</label>
              <input
                name="name"
                placeholder="ChanteEnScène Aubagne 2027"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Slug (URL)</label>
              <input
                name="slug"
                placeholder="aubagne-2027"
                required
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Ville</label>
              <input
                name="city"
                placeholder="Aubagne"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Année</label>
              <input
                name="year"
                type="number"
                placeholder="2027"
                required
                min={2024}
                max={2100}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 bg-white/5 border border-white/10 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((s) => {
          const st = STATUS_LABELS[s.status] || { label: s.status, color: '#666' }
          const isEditing = editingId === s.id

          return (
            <div
              key={s.id}
              className={`bg-[#161228] border rounded-2xl p-5 transition-colors ${
                s.is_active ? 'border-[#e91e8c]/40 bg-[#e91e8c]/5' : 'border-[#2a2545]'
              }`}
            >
              {isEditing ? (
                <form onSubmit={(e) => handleUpdate(s.id, e)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-white/40 text-xs block mb-1">Nom</label>
                      <input
                        name="name"
                        defaultValue={s.name}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block mb-1">Ville</label>
                      <input
                        name="city"
                        defaultValue={s.city}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block mb-1">Statut</label>
                      <select
                        name="status"
                        defaultValue={s.status}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
                      >
                        {Object.entries(STATUS_LABELS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 bg-white/5 border border-white/10"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-[#e91e8c] disabled:opacity-50"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white truncate">{s.name}</h3>
                        {s.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e91e8c]/20 text-[#e91e8c] shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/30 text-xs">/{s.slug}</span>
                        <span className="text-white/30 text-xs">{s.city}</span>
                        <span className="text-white/30 text-xs">{s.year}</span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${st.color}15`, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!s.is_active && s.status !== 'archived' && (
                      <button
                        onClick={() => handleAction(() => setActiveSession(s.id))}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#e91e8c]/10 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors disabled:opacity-50"
                        title="Définir comme session active"
                      >
                        Activer
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(s.id)}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleAction(() => duplicateSession(s.id))}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                      title="Dupliquer pour l'année suivante"
                    >
                      Dupliquer
                    </button>
                    {s.status !== 'archived' && (
                      <button
                        onClick={() => {
                          if (confirm('Archiver cette session ?')) {
                            handleAction(() => archiveSession(s.id))
                          }
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-[#f59e0b] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        Archiver
                      </button>
                    )}
                    {s.status === 'draft' && (
                      <button
                        onClick={() => {
                          if (confirm('Supprimer définitivement cette session ? (uniquement si aucun candidat)')) {
                            handleAction(() => deleteSession(s.id))
                          }
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 bg-white/5 border border-white/10 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {sessions.length === 0 && (
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-12 text-center">
            <p className="text-white/30 text-sm">Aucune session. Créez votre première édition du concours.</p>
          </div>
        )}
      </div>
    </div>
  )
}
