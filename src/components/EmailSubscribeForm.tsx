'use client'

import { useState } from 'react'
import { subscribeEmail } from '@/app/actions/subscribe-email'
import { getFingerprint } from '@/lib/fingerprint'

interface Props {
  sessionId: string
  source?: 'footer' | 'live' | 'install_prompt' | 'mobile_fallback' | 'countdown'
  compact?: boolean
  subtitle?: string
  onSuccess?: () => void
}

export default function EmailSubscribeForm({ sessionId, source = 'footer', compact, subtitle, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    const fingerprint = await getFingerprint()
    const result = await subscribeEmail(sessionId, email.trim(), source, fingerprint)

    if (result.error) {
      setStatus('error')
      setErrorMsg(result.error)
    } else {
      setStatus('success')
      setEmail('')
      localStorage.setItem('email-subscribed', '1')
      onSuccess?.()
    }
  }

  if (status === 'success') {
    return (
      <div className={`bg-[#7ec850]/10 border border-[#7ec850]/30 rounded-xl text-center ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <p className="text-[#7ec850] text-sm font-medium">Inscription confirmee !</p>
        <p className="text-white/40 text-xs mt-1">Vous recevrez les actualites par email.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-2' : 'bg-[#1a1232] border border-[#2e2555] rounded-xl p-4 space-y-3'}>
      {subtitle && <p className="text-white/50 text-xs text-center">{subtitle}</p>}
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
