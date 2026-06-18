'use client'

import { useState } from 'react'
import type { FinaleItem } from './page'

interface Props {
  token: string
  jurorName: string
  byCat: Record<string, FinaleItem[]>
  keep: Record<string, number>
  preselected: string[]
  alreadySubmitted: boolean
}

const CAT_COLOR: Record<string, string> = { Ado: '#7c3aed', Adulte: '#0369a1', Enfant: '#b45309' }
const CAT_EMOJI: Record<string, string> = { Ado: '🎤', Adulte: '🎵', Enfant: '🧒' }
const ORDER = ['Enfant', 'Ado', 'Adulte']

export default function FinaleSelect({ token, jurorName, byCat, keep, preselected, alreadySubmitted }: Props) {
  const [sel, setSel] = useState<Set<string>>(new Set(preselected))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function submit() {
    setSaving(true); setError(null)
    const picks: { id: string; cat: string }[] = []
    for (const cat of ORDER) for (const it of byCat[cat] || []) if (sel.has(it.id)) picks.push({ id: it.id, cat })
    const res = await fetch('/api/jf/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, picks }),
    }).then(r => r.json()).catch(() => ({ error: 'Problème de connexion, réessaie.' }))
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setDone(true)
  }

  if (done) {
    return (
      <main className="fixed inset-0 z-50 bg-[#0d0b1a] flex flex-col items-center justify-center text-center px-6 text-white">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Sélection enregistrée !</h1>
        <p className="text-white/60 max-w-xs">Merci {jurorName}. Tes finalistes sont bien transmis. Jean-Christophe finalise la liste ce soir.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0b1a] text-white max-w-[560px] mx-auto px-3 pt-4 pb-28">
      <div className="text-center mb-3">
        <div className="font-[family-name:var(--font-montserrat)] font-black text-xl">
          <span>Chant</span><span className="text-[#7ec850]">En</span><span className="text-[#e91e8c]">Scène</span>
        </div>
        <div className="text-white/40 text-xs tracking-widest mt-1">CHOIX DES FINALISTES</div>
      </div>

      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-sm text-white/70 mb-4 leading-relaxed">
        Bonjour <b className="text-white">{jurorName}</b>,<br />
        Une <b className="text-white">pré-sélection</b> (moyenne anonyme du jury) est déjà cochée. Revois les extraits et <b className="text-white">coche / décoche</b> selon ton ressenti, puis valide.
        {alreadySubmitted && <div className="mt-2 text-[#fde047]">Tu as déjà validé une sélection, tu peux la modifier.</div>}
      </div>

      {ORDER.map(cat => {
        const rows = byCat[cat] || []
        if (!rows.length) return null
        const c = CAT_COLOR[cat]
        const n = rows.filter(r => sel.has(r.id)).length
        return (
          <section key={cat} className="mb-5">
            <h2 className="flex items-center justify-between text-lg font-bold uppercase pl-2 mb-3" style={{ color: c, borderLeft: `5px solid ${c}` }}>
              <span>{CAT_EMOJI[cat]} {cat}</span>
              <span className="text-xs font-semibold text-white/50">{n} retenu(s) · suggéré : {keep[cat] ?? 4}</span>
            </h2>
            <div className="space-y-3">
              {rows.map((it, i) => {
                const on = sel.has(it.id)
                return (
                  <div key={it.id} className="rounded-2xl p-3 border" style={{ background: on ? '#1b1530' : '#161228', borderColor: on ? c : '#2a2545', borderWidth: on ? 2 : 1 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: on ? c : '#221c3a', color: '#fff' }}>{i + 1}</div>
                      {it.photo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={it.photo} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/10" />
                        : <div className="w-16 h-16 rounded-xl bg-[#221c3a] flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-lg leading-tight">{it.name}</div>
                        {it.real !== it.name && <div className="text-white/40 text-xs">{it.real}</div>}
                        <div className="text-white/50 text-xs mt-0.5">
                          {it.age != null ? `${it.age} ans` : ''}{it.note != null ? ` · ta note : ${it.note}/100` : ''}
                        </div>
                      </div>
                    </div>
                    {it.clip && (
                      <video controls playsInline preload="none" src={it.clip} className="w-full rounded-xl bg-black" />
                    )}
                    <button
                      onClick={() => toggle(it.id)}
                      className="w-full mt-2 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                      style={on ? { background: c, color: '#fff' } : { background: '#0d0b1a', color: '#cbd5e1', border: '1px solid #2a2545' }}
                    >
                      {on ? '✓ Retenu(e) en finale' : 'Retenir en finale'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0d0b1a] to-transparent">
        <button
          onClick={submit}
          disabled={saving}
          className="w-full max-w-[536px] mx-auto block py-4 rounded-2xl font-black text-base bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : `✓ Valider ma sélection (${sel.size})`}
        </button>
      </div>
    </main>
  )
}
