'use client'

import { useState } from 'react'
import { checkinCandidate } from '@/app/admin/demi-finale/actions'

interface Props {
  candidateId: string
  eventId: string | null
  eventStatus: string | null
  checkedInAt: string | null
  displayName: string
}

export default function CheckinView({ candidateId, eventId, eventStatus, checkedInAt: initialCheckedInAt, displayName }: Props) {
  const [checkedInAt, setCheckedInAt] = useState<string | null>(initialCheckedInAt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No event exists yet
  if (!eventId || !eventStatus) {
    return (
      <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-8">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-white/50 text-sm">
          La demi-finale n&apos;est pas encore ouverte.
        </p>
        <p className="text-white/25 text-xs mt-2">
          Revenez sur cette page lorsque l&apos;organisation vous le confirmera.
        </p>
      </div>
    )
  }

  // Already checked in
  if (checkedInAt) {
    const time = new Date(checkedInAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#7ec850]/30 rounded-2xl p-8 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#7ec850]/15 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <div>
          <p className="text-[#7ec850] font-bold text-lg">Vous êtes inscrit(e) !</p>
          <p className="text-white/40 text-sm mt-2">
            Arrivée enregistrée à <span className="text-white/60 font-medium">{time}</span>
          </p>
        </div>
        <div className="bg-[#7ec850]/5 rounded-xl p-4 text-left space-y-2">
          <p className="text-white/50 text-xs">
            Veuillez patienter, vous serez appelé(e) sur scène lorsque ce sera votre tour.
          </p>
          <p className="text-white/30 text-[10px]">
            L&apos;ordre de passage dépend des arrivées — pas de numéro fixe.
          </p>
        </div>
      </div>
    )
  }

  // Ready to check in
  async function handleCheckin() {
    if (!eventId) return
    setLoading(true)
    setError(null)

    const result = await checkinCandidate(eventId, candidateId)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setCheckedInAt(new Date().toISOString())
    setLoading(false)
  }

  return (
    <div className="bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-8 space-y-6">
      <div>
        <p className="text-white/60 text-sm">
          Bonjour <span className="text-white font-medium">{displayName}</span>,
        </p>
        <p className="text-white/40 text-sm mt-2">
          Confirmez votre arrivée pour la demi-finale en appuyant sur le bouton ci-dessous.
        </p>
      </div>

      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50 active:scale-[0.98]"
      >
        {loading ? 'Enregistrement...' : 'Je suis arrivé(e)'}
      </button>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <p className="text-white/20 text-[10px]">
        Vous serez automatiquement ajouté(e) à la liste d&apos;attente.
      </p>
    </div>
  )
}
