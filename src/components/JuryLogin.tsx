'use client'

import { useState } from 'react'
import { loginJuror } from '@/app/jury/actions'

export default function JuryLogin() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const result = await loginJuror(email.trim().toLowerCase())
    // If we get here, redirect didn't happen → error
    if (result?.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0b1a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">Espace Jury</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jury-email" className="block text-xs text-white/40 mb-1.5">
              Votre adresse email
            </label>
            <input
              id="jury-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jury@exemple.com"
              required
              autoFocus
              className="w-full bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[#e91e8c] text-white hover:bg-[#d4177d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Accéder à mon espace jury'}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-8">
          Contactez l&apos;organisateur si vous n&apos;avez pas reçu vos accès.
        </p>
      </div>
    </div>
  )
}
