'use client'

import { useState } from 'react'

export default function PresseContactForm() {
  const [form, setForm] = useState({ name: '', organization: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact-presse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setForm({ name: '', organization: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-[#7ec850]/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-[#7ec850]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-semibold text-sm">Message envoyé !</p>
        <p className="text-white/40 text-xs mt-1">Nous vous répondrons dans les meilleurs délais.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/50 text-xs mb-1">Nom *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-[#1a1232] border border-[#2a2545] rounded-lg px-3 py-2 text-white text-sm focus:border-[#e91e8c] focus:outline-none transition-colors"
            placeholder="Votre nom"
          />
        </div>
        <div>
          <label className="block text-white/50 text-xs mb-1">Média / Organisation</label>
          <input
            type="text"
            value={form.organization}
            onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
            className="w-full bg-[#1a1232] border border-[#2a2545] rounded-lg px-3 py-2 text-white text-sm focus:border-[#e91e8c] focus:outline-none transition-colors"
            placeholder="Ex : La Provence, France 3..."
          />
        </div>
      </div>
      <div>
        <label className="block text-white/50 text-xs mb-1">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full bg-[#1a1232] border border-[#2a2545] rounded-lg px-3 py-2 text-white text-sm focus:border-[#e91e8c] focus:outline-none transition-colors"
          placeholder="votre@email.com"
        />
      </div>
      <div>
        <label className="block text-white/50 text-xs mb-1">Message *</label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          className="w-full bg-[#1a1232] border border-[#2a2545] rounded-lg px-3 py-2 text-white text-sm focus:border-[#e91e8c] focus:outline-none transition-colors resize-none"
          placeholder="Votre demande (interview, partenariat, informations...)"
        />
      </div>
      <div className="text-center">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center gap-2 bg-[#e91e8c] hover:bg-[#d4177f] disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
        >
          {status === 'sending' ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Envoi...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Envoyer
            </>
          )}
        </button>
        {status === 'error' && (
          <p className="text-red-400 text-xs mt-2">Erreur lors de l&apos;envoi. Réessayez.</p>
        )}
      </div>
    </form>
  )
}
