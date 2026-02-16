'use client'

import { useState } from 'react'

interface Props {
  sessionId: string
  slug: string
  currentCandidateName?: string | null
  eventType: 'semifinal' | 'final'
}

type TargetRole = 'all' | 'public' | 'jury'

interface PresetNotification {
  label: string
  emoji: string
  title: string
  body: string
  role: TargetRole
  tag: string
}

export default function AdminPushPanel({ sessionId, slug, currentCandidateName, eventType }: Props) {
  const [customTitle, setCustomTitle] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [targetRole, setTargetRole] = useState<TargetRole>('all')
  const [sending, setSending] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null)

  const liveUrl = `/${slug}/live`

  const presets: PresetNotification[] = [
    {
      label: 'Vote ouvert',
      emoji: '\u{1F5F3}',
      title: 'Le vote est ouvert !',
      body: currentCandidateName
        ? `Votez maintenant pour ${currentCandidateName} !`
        : 'Votez maintenant pour votre candidat !',
      role: 'public',
      tag: 'vote-open',
    },
    {
      label: 'Vote ferm\u00e9',
      emoji: '\u{1F512}',
      title: 'Le vote est ferm\u00e9',
      body: 'Merci pour vos votes ! R\u00e9sultats bient\u00f4t...',
      role: 'public',
      tag: 'vote-close',
    },
    {
      label: 'Sur sc\u00e8ne',
      emoji: '\u{1F3A4}',
      title: currentCandidateName
        ? `${currentCandidateName} monte sur sc\u00e8ne !`
        : 'Prochain candidat sur sc\u00e8ne !',
      body: eventType === 'final'
        ? 'Regardez la finale en direct !'
        : 'Regardez la demi-finale en direct !',
      role: 'public',
      tag: 'on-stage',
    },
    {
      label: 'Jury : \u00e0 vous !',
      emoji: '\u{1F3AF}',
      title: "C'est \u00e0 vous de noter !",
      body: currentCandidateName
        ? `${currentCandidateName} a termin\u00e9. Notez maintenant !`
        : 'Le candidat a termin\u00e9. Notez maintenant !',
      role: 'jury',
      tag: 'jury-score',
    },
  ]

  async function sendNotification(payload: { title: string; body: string; tag?: string }, role: TargetRole) {
    setSending(payload.tag || 'custom')
    setLastResult(null)

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role: role === 'all' ? 'all' : role,
          payload: { ...payload, url: liveUrl },
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setLastResult({ sent: result.sent, failed: result.failed })
      }
    } catch {
      // Admin will see the result counter
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
      <p className="text-white/30 text-xs uppercase tracking-wider mb-3">
        Notifications push
      </p>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.tag}
            onClick={() => sendNotification(
              { title: preset.title, body: preset.body, tag: preset.tag },
              preset.role
            )}
            disabled={sending !== null}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              preset.role === 'jury'
                ? 'bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20'
                : 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20'
            }`}
          >
            {sending === preset.tag ? '...' : `${preset.emoji} ${preset.label}`}
          </button>
        ))}
      </div>

      {/* Custom notification */}
      <div className="space-y-2">
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Titre de la notification"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]/40"
        />
        <textarea
          value={customBody}
          onChange={(e) => setCustomBody(e.target.value)}
          placeholder="Message personnalis\u00e9..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]/40 resize-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as TargetRole)}
            className="px-3 py-2 rounded-lg bg-[#1a1232] border border-white/10 text-white text-sm focus:outline-none"
          >
            <option value="all" className="bg-[#1a1232] text-white">Tous</option>
            <option value="public" className="bg-[#1a1232] text-white">Public uniquement</option>
            <option value="jury" className="bg-[#1a1232] text-white">Jury uniquement</option>
          </select>
          <button
            onClick={() => {
              if (customTitle.trim() && customBody.trim()) {
                sendNotification(
                  { title: customTitle, body: customBody, tag: 'custom' },
                  targetRole
                )
                setCustomTitle('')
                setCustomBody('')
              }
            }}
            disabled={sending !== null || !customTitle.trim() || !customBody.trim()}
            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold disabled:opacity-50"
          >
            {sending === 'custom' ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>

      {/* Result feedback */}
      {lastResult && (
        <p className="text-xs text-white/30 mt-2">
          Envoy&eacute; : {lastResult.sent} | &Eacute;checs : {lastResult.failed}
        </p>
      )}
    </div>
  )
}
