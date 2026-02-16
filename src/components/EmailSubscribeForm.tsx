'use client'

import { useState } from 'react'
import { subscribeEmail } from '@/app/[slug]/live/actions'

interface Props {
  sessionId: string
}

export default function EmailSubscribeForm({ sessionId }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    const result = await subscribeEmail(sessionId, email.trim())

    if (result.error) {
      setStatus('error')
      setErrorMsg(result.error)
    } else {
      setStatus('success')
      setEmail('')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-[#7ec850]/10 border border-[#7ec850]/30 rounded-xl px-4 py-3 text-center">
        <p className="text-[#7ec850] text-sm font-medium">Inscription confirmée !</p>
        <p className="text-white/40 text-xs mt-1">Vous recevrez les résultats par email.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1a1232] border border-[#2e2555] rounded-xl p-4 space-y-3">
      <p className="text-white/50 text-xs text-center">Recevez les résultats par email</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="flex-1 min-w-0 bg-[#0d0b1a] border border-[#2e2555] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c]"
          required
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/20 transition-all disabled:opacity-50 shrink-0"
        >
          {status === 'loading' ? '...' : 'OK'}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-red-400 text-xs text-center">{errorMsg}</p>
      )}
    </form>
  )
}
