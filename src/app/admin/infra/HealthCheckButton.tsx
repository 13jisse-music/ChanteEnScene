'use client'

import { useState } from 'react'
import { triggerHealthCheck } from './actions'

export default function HealthCheckButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    globalStatus: string
    summary: { ok: number; warn: number; ko: number; total: number }
    emailSent: boolean
    pushSent: number
  } | null>(null)

  async function handleClick() {
    setLoading(true)
    setResult(null)
    try {
      const res = await triggerHealthCheck()
      setResult(res)
    } catch {
      setResult({ globalStatus: 'ko', summary: { ok: 0, warn: 0, ko: 1, total: 1 }, emailSent: false, pushSent: 0 })
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    ok: 'text-green-400',
    warn: 'text-yellow-400',
    ko: 'text-red-400',
  }

  return (
    <div className="bg-[#1a1232] rounded-2xl p-5 border border-[#2a2545]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
            Checkup du site
          </h2>
          <p className="text-xs text-white/30 mt-1">
            V\u00e9rifie pages, APIs, BDD, Storage, push, emails. Envoie le rapport par email + push admin.
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={loading}
          className="px-4 py-2 bg-[#e91e8c] hover:bg-[#d11a7d] disabled:opacity-50 disabled:cursor-wait text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checkup en cours...
            </span>
          ) : (
            'Lancer un checkup'
          )}
        </button>
      </div>

      {result && (
        <div className={`mt-3 p-3 rounded-xl ${result.globalStatus === 'ok' ? 'bg-green-500/10 border border-green-500/20' : result.globalStatus === 'warn' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${statusColors[result.globalStatus] || 'text-white'}`}>
              {result.globalStatus === 'ok' ? '\u2705' : result.globalStatus === 'warn' ? '\u26a0\ufe0f' : '\u274c'}
              {' '}{result.summary.ok}/{result.summary.total} OK
              {result.summary.warn > 0 && `, ${result.summary.warn} warnings`}
              {result.summary.ko > 0 && `, ${result.summary.ko} erreurs`}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-2">
            {result.emailSent ? 'Rapport envoy\u00e9 par email' : 'Email non envoy\u00e9'}
            {' \u2022 '}
            {result.pushSent > 0 ? `${result.pushSent} push envoy\u00e9${result.pushSent > 1 ? 's' : ''}` : 'Pas de push'}
          </p>
        </div>
      )}

      <p className="text-xs text-white/20 mt-3">
        Cron automatique : le 1er de chaque mois \u00e0 9h
      </p>
    </div>
  )
}
