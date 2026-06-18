'use client'

import { useState } from 'react'
import type { SuiviRow } from './page'

const CAT: Record<string, { color: string; emoji: string }> = {
  Enfant: { color: '#ff9d4d', emoji: '🧒' },
  Ado: { color: '#b58bff', emoji: '🎤' },
  Adulte: { color: '#39b0e6', emoji: '🎵' },
}

export default function SuiviDashboard({ token, rows }: { token: string; rows: SuiviRow[] }) {
  const [data, setData] = useState<SuiviRow[]>(rows)
  const [busy, setBusy] = useState<string | null>(null)

  const submitted = data.filter((r) => r.submitted).length
  const opened = data.filter((r) => r.mailOpened).length
  const verified = data.filter((r) => r.phoneVerified).length

  async function toggleVerify(r: SuiviRow) {
    setBusy(r.id)
    const value = !r.phoneVerified
    const res = await fetch('/api/finale/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suiviToken: token, entryId: r.id, value }),
    }).then((x) => x.json()).catch(() => ({ error: 1 }))
    setBusy(null)
    if (!res?.error) setData((p) => p.map((x) => (x.id === r.id ? { ...x, phoneVerified: value } : x)))
  }

  const song = (t: string | null, a: string | null, k: string | null) =>
    t ? `${t}${a ? ' — ' + a : ''}${k ? ' (' + k + ')' : ''}` : '—'

  return (
    <main className="min-h-screen bg-[#0d0b1a] text-white px-3 py-6">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-2xl font-black text-center">Suivi des finalistes</h1>
        <p className="text-center text-white/50 text-sm mt-1 mb-5">Chansons, téléphones et vérifications pour la finale</p>

        <div className="grid grid-cols-3 gap-2 mb-6 max-w-[520px] mx-auto">
          {[
            { l: 'Mails ouverts', v: `${opened}/${data.length}`, c: '#7dd3fc' },
            { l: 'Fiches remplies', v: `${submitted}/${data.length}`, c: '#7ec850' },
            { l: 'Tél vérifiés', v: `${verified}/${data.length}`, c: '#ffc44d' },
          ].map((s) => (
            <div key={s.l} className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
              <div className="text-2xl font-black" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[11px] text-white/50 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {data.map((r) => {
            const c = CAT[r.category] || { color: '#888', emoji: '•' }
            return (
              <div key={r.id} className="bg-[#161228] border rounded-2xl p-3.5" style={{ borderColor: r.submitted ? '#2f7d4f' : '#2a2545' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">{c.emoji}</span>
                    <span className="font-extrabold text-lg truncate" style={{ color: c.color }}>{r.nom}</span>
                    <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full" style={{ background: r.mailOpened ? '#1e3a5f' : '#2a2545', color: r.mailOpened ? '#7dd3fc' : '#fff6' }}>
                      {r.mailOpened ? '📬 ouvert' : '📭 non ouvert'}
                    </span>
                    <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full" style={{ background: r.submitted ? '#1f4d33' : '#4d1f1f', color: r.submitted ? '#7ee29a' : '#ffb3b3' }}>
                      {r.submitted ? '✅ fiche reçue' : '⏳ en attente'}
                    </span>
                  </div>
                  <button onClick={() => toggleVerify(r)} disabled={busy === r.id}
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={r.phoneVerified ? { background: '#1f9d55', color: '#fff' } : { background: '#221c3a', color: '#ffc44d', border: '1px solid #5a4a1a' }}>
                    {r.phoneVerified ? '✓ Tél vérifié' : 'Marquer tél vérifié'}
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-x-4 gap-y-1 text-sm pl-1">
                  <div><span className="text-white/40">📱 </span><a href={`tel:${r.phone || ''}`} className="text-white/90 underline decoration-white/20">{r.phone || '—'}</a></div>
                  <div><span className="text-[#ff7ac4]">⚡ </span><span className="text-white/80">{song(r.fastTitle, r.fastArtist, r.fastKey)}</span></div>
                  <div><span className="text-[#7dd3fc]">🌙 </span><span className="text-white/80">{song(r.slowTitle, r.slowArtist, r.slowKey)}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
