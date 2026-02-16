'use client'

import { useState } from 'react'
import { checkinCandidate } from '@/app/admin/demi-finale/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
}

interface Props {
  eventId: string | null
  eventStatus: string | null
  candidates: Candidate[]
  initialCheckedInIds: string[]
}

export default function SelfCheckin({ eventId, eventStatus, candidates, initialCheckedInIds }: Props) {
  const [search, setSearch] = useState('')
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set(initialCheckedInIds))
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!eventId || !eventStatus) {
    return (
      <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-white/50 text-sm">
          La demi-finale n&apos;est pas encore ouverte.
        </p>
        <p className="text-white/25 text-xs mt-2">
          Revenez sur cette page le jour de l&apos;événement.
        </p>
      </div>
    )
  }

  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  const normalizeSearch = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const query = normalizeSearch(search)
  const filtered = query.length > 0
    ? candidates.filter((c) => {
        const name = normalizeSearch(`${c.first_name} ${c.last_name} ${c.stage_name || ''}`)
        return name.includes(query)
      })
    : []

  async function handleCheckin(candidateId: string) {
    if (!eventId) return
    setLoadingId(candidateId)
    setError(null)

    const result = await checkinCandidate(eventId, candidateId)

    if (result.error) {
      setError(result.error)
      setLoadingId(null)
      setConfirming(null)
      return
    }

    setCheckedInIds((prev) => new Set([...prev, candidateId]))
    setLoadingId(null)
    setConfirming(null)
    setSearch('')
  }

  // Confirmation screen
  if (confirming) {
    const candidate = candidates.find((c) => c.id === confirming)
    if (!candidate) return null

    return (
      <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-6 space-y-5">
        <p className="text-white/40 text-xs text-center uppercase tracking-wider">Confirmez votre identité</p>

        <div className="flex items-center gap-4 bg-[#0d0b1a] rounded-xl p-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border-2 border-[#e91e8c]/30">
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">🎤</div>
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-white text-lg truncate">{displayName(candidate)}</p>
            <p className="text-xs text-white/40">{candidate.first_name} {candidate.last_name}</p>
            <p className="text-xs text-[#e91e8c] mt-0.5">{candidate.category}</p>
          </div>
        </div>

        <button
          onClick={() => handleCheckin(candidate.id)}
          disabled={loadingId !== null}
          className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loadingId === candidate.id ? 'Enregistrement...' : "C'est moi ! Je suis arrivé(e)"}
        </button>

        <button
          onClick={() => { setConfirming(null); setError(null) }}
          className="w-full py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          Retour
        </button>

        {error && (
          <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">{error}</p>
        )}
      </div>
    )
  }

  // Success state — show after checkin
  const justCheckedIn = candidates.find((c) => checkedInIds.has(c.id) && !initialCheckedInIds.includes(c.id))

  return (
    <div className="space-y-4">
      {justCheckedIn && (
        <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#7ec850]/30 rounded-2xl p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#7ec850]/15 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-[#7ec850] font-bold">Arrivée enregistrée !</p>
          <p className="text-white/40 text-xs">
            <span className="text-white/60 font-medium">{displayName(justCheckedIn)}</span>, vous êtes dans la liste d&apos;attente. Restez dans les environs, on vous appellera.
          </p>
        </div>
      )}

      {/* Search input */}
      <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-5 space-y-4">
        <p className="text-white/50 text-sm text-center">
          Tapez votre nom pour vous enregistrer
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Votre nom..."
          autoFocus
          className="w-full px-4 py-4 rounded-xl bg-[#0d0b1a] border border-[#2a2545] text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]/40 text-center"
        />

        {/* Results */}
        {query.length > 0 && (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-4">
                Aucun candidat trouvé pour &laquo; {search} &raquo;
              </p>
            ) : (
              filtered.map((c) => {
                const isCheckedIn = checkedInIds.has(c.id)

                return (
                  <button
                    key={c.id}
                    onClick={() => !isCheckedIn && setConfirming(c.id)}
                    disabled={isCheckedIn}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      isCheckedIn
                        ? 'bg-[#7ec850]/5 border border-[#7ec850]/20 opacity-60'
                        : 'bg-[#0d0b1a] border border-[#2a2545] hover:border-[#e91e8c]/30 active:scale-[0.98]'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border border-white/10">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{displayName(c)}</p>
                      <p className="text-[10px] text-[#e91e8c]">{c.category}</p>
                    </div>
                    {isCheckedIn ? (
                      <span className="text-[#7ec850] text-xs font-medium shrink-0">Arrivé(e) ✓</span>
                    ) : (
                      <span className="text-[#e91e8c] text-xs shrink-0">Check-in →</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}

        {query.length === 0 && (
          <p className="text-white/20 text-[10px] text-center">
            {candidates.length} candidats attendus — {checkedInIds.size} arrivés
          </p>
        )}
      </div>
    </div>
  )
}
