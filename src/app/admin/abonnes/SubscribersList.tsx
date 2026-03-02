'use client'

import { useState } from 'react'
import { deleteSubscriber } from './actions'

interface Subscriber {
  id: string
  email: string
  source: string | null
  is_active: boolean
  created_at: string
}

function isRecent(date: string): boolean {
  return Date.now() - new Date(date).getTime() < 7 * 24 * 60 * 60 * 1000
}

const SOURCE_LABELS: Record<string, string> = {
  inscription: 'Inscription',
  landing: 'Landing page',
  newsletter: 'Newsletter',
  manual: 'Manuel',
}

export default function SubscribersList({
  initialSubscribers,
  sessionId,
}: {
  initialSubscribers: Subscriber[]
  sessionId: string
}) {
  const [subscribers, setSubscribers] = useState(initialSubscribers)
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = subscribers
    .filter(s => {
      if (filter === 'active' && !s.is_active) return false
      if (filter === 'unsubscribed' && s.is_active) return false
      if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Supprimer ${email} de la liste ?`)) return
    setDeletingId(id)
    const result = await deleteSubscriber(id)
    if (result.success) {
      setSubscribers(prev => prev.filter(s => s.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(['all', 'active', 'unsubscribed'] as const).map(f => {
          const labels = { all: 'Tous', active: 'Actifs', unsubscribed: 'Désabonnés' }
          const count = f === 'all' ? subscribers.length : f === 'active' ? subscribers.filter(s => s.is_active).length : subscribers.filter(s => !s.is_active).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#ec4899]/15 border border-[#ec4899]/40 text-[#ec4899]'
                  : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {labels[f]} ({count})
            </button>
          )
        })}

        <button
          onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
          className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-colors"
        >
          {sortOrder === 'newest' ? '↓ Récents' : '↑ Anciens'}
        </button>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un email..."
          className="ml-auto bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ec4899] w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {filtered.map(s => (
              <div
                key={s.id}
                className={`flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors ${deletingId === s.id ? 'opacity-50' : ''}`}
              >
                {/* Email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{s.email}</p>
                    {isRecent(s.created_at) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7ec850]/15 text-[#7ec850] shrink-0">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {s.source && <span className="ml-2 text-white/20">via {SOURCE_LABELS[s.source] || s.source}</span>}
                  </p>
                </div>

                {/* Status */}
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    background: s.is_active ? '#7ec85015' : '#ef444415',
                    color: s.is_active ? '#7ec850' : '#ef4444',
                  }}
                >
                  {s.is_active ? 'Actif' : 'Désabonné'}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(s.id, s.email)}
                  className="text-white/20 hover:text-red-400 transition-colors text-sm shrink-0"
                  title="Supprimer"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-white/30 text-sm">
            {search ? 'Aucun résultat.' : 'Aucun abonné.'}
          </p>
        )}
      </div>
    </div>
  )
}
