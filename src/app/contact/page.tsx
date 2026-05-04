'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      if (res.ok) {
        setStatus('sent')
        setName('')
        setEmail('')
        setMessage('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="font-[family-name:var(--font-montserrat)] text-3xl font-bold text-white mb-2">
          Contact
        </h1>
        <p className="text-white/50 mb-10 text-sm">
          Une question ? Un message ? &Eacute;crivez-nous.
        </p>

        {/* Infos rapides */}
        <div className="flex flex-col gap-3 mb-10">
          <div className="bg-white/5 rounded-xl px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-white text-sm font-semibold">Demi-finale — 17 juin 2026</p>
              <p className="text-white/40 text-xs">Espace des Libert&eacute;s, Aubagne &bull; Entr&eacute;e libre</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white text-sm font-semibold">Grande finale — 16 juillet 2026</p>
              <p className="text-white/40 text-xs">Cours Foch, Aubagne &bull; Plein air &bull; Entr&eacute;e libre</p>
            </div>
          </div>
          <a
            href="mailto:inscriptions@chantenscene.fr"
            className="bg-white/5 rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white/10 transition-colors"
          >
            <span className="text-2xl">✉️</span>
            <div>
              <p className="text-white text-sm font-semibold">inscriptions@chantenscene.fr</p>
              <p className="text-white/40 text-xs">R&eacute;ponse sous 48h</p>
            </div>
          </a>
        </div>

        {/* Formulaire */}
        {status === 'sent' ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <p className="text-green-400 text-lg font-semibold mb-1">Message envoy&eacute; !</p>
            <p className="text-white/50 text-sm">Nous vous r&eacute;pondrons sous 48h.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-white/60 text-xs mb-1.5 uppercase tracking-wide">Votre nom</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e91e8c]/50"
                placeholder="Pr&eacute;nom Nom"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1.5 uppercase tracking-wide">Votre email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e91e8c]/50"
                placeholder="vous@exemple.fr"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1.5 uppercase tracking-wide">Votre message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e91e8c]/50 resize-none"
                placeholder="Votre question ou message..."
              />
            </div>
            {status === 'error' && (
              <p className="text-red-400 text-sm">Une erreur est survenue. R&eacute;essayez ou &eacute;crivez directement &agrave; inscriptions@chantenscene.fr</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-[#e91e8c] hover:bg-[#e91e8c]/80 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {status === 'sending' ? 'Envoi...' : 'Envoyer le message'}
            </button>
          </form>
        )}

        {/* Liens utiles */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col gap-2">
          <p className="text-white/30 text-xs uppercase tracking-wide mb-2">Autres contacts</p>
          <Link href="/presse" className="text-white/40 text-sm hover:text-white/70 transition-colors">
            Espace presse &rarr;
          </Link>
          <Link href="/proposer-un-lieu" className="text-white/40 text-sm hover:text-white/70 transition-colors">
            Proposer un lieu d&apos;accueil &rarr;
          </Link>
        </div>
      </div>
    </main>
  )
}
