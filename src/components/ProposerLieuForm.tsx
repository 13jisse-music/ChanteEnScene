'use client'

import { useState } from 'react'

const INPUT =
  'w-full bg-[#1a1232]/80 border border-[#2e2555] rounded-xl px-4 py-3 text-sm text-[#f0eaf7] placeholder:text-[#6b5d85] focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors'

export default function ProposerLieuForm() {
  const [ville, setVille] = useState('')
  const [region, setRegion] = useState('')
  const [nom, setNom] = useState('')
  const [fonction, setFonction] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ville.trim() || !nom.trim() || !email.trim()) return

    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/proposer-lieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ville: ville.trim(),
          region: region.trim(),
          nom: nom.trim(),
          fonction: fonction.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          message: message.trim(),
        }),
      })

      if (!res.ok) throw new Error('Erreur envoi')
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-[#7ec850] font-semibold text-lg">Merci pour votre proposition !</p>
        <p className="text-white/50 text-sm mt-2">
          Nous étudions votre demande et reviendrons vers vous rapidement.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-white/50 text-xs block mb-1">Ville / Commune *</label>
          <input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ex : Marseille, Aix-en-Provence..."
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">Région / Département</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Ex : Bouches-du-Rhône"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-white/50 text-xs block mb-1">Votre nom *</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Prénom Nom"
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">Fonction</label>
          <input
            value={fonction}
            onChange={(e) => setFonction(e.target.value)}
            placeholder="Ex : Élu(e), directeur culturel..."
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-white/50 text-xs block mb-1">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">Téléphone</label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06..."
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs block mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Parlez-nous de votre ville, d'un lieu potentiel, de votre motivation à accueillir le concours..."
          rows={4}
          className={`${INPUT} resize-none`}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 bg-[#e91e8c] hover:bg-[#d4177f] text-white font-semibold text-sm px-8 py-3 rounded-full transition-colors disabled:opacity-50"
        >
          {sending ? 'Envoi...' : 'Envoyer ma proposition'}
        </button>
      </div>
    </form>
  )
}
