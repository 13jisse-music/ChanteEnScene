'use client'

import { useState } from 'react'

interface Initial {
  phone: string
  fastTitle: string; fastArtist: string; fastKey: string
  slowTitle: string; slowArtist: string; slowKey: string
}
interface Props {
  token: string
  nom: string
  category: string
  initial: Initial
  alreadySubmitted: boolean
}

export default function FinaleForm({ token, nom, initial, alreadySubmitted }: Props) {
  const [f, setF] = useState<Initial>(initial)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof Initial) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit() {
    if (!f.phone.trim()) { setError('Indique ton numéro de téléphone.'); return }
    if (!f.fastTitle.trim() || !f.slowTitle.trim()) { setError('Indique le titre de tes deux chansons.'); return }
    setSaving(true); setError(null)
    const res = await fetch('/api/finale/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...f }),
    }).then((r) => r.json()).catch(() => ({ error: 'Problème de connexion, réessaie.' }))
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setDone(true)
  }

  if (done) {
    return (
      <main className="fixed inset-0 z-[100] bg-[#0d0b1a] flex flex-col items-center justify-center text-center px-6 text-white">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">C&apos;est noté, merci {nom} !</h1>
        <p className="text-white/60 max-w-xs">Tes chansons et ton téléphone sont transmis à l&apos;organisation. Les musiciens vont pouvoir préparer ton passage. À très vite&nbsp;! 🎶</p>
      </main>
    )
  }

  const field = 'w-full bg-[#0d0b1a] border border-[#2a2545] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#e91e8c] outline-none'
  const label = 'block text-sm font-semibold text-white/70 mb-1.5'

  // Bouton actif seulement quand téléphone + les 2 chansons (titre + interprète) sont remplis
  const canSubmit = !!(f.phone.trim() && f.fastTitle.trim() && f.fastArtist.trim() && f.slowTitle.trim() && f.slowArtist.trim())

  return (
    <main className="fixed inset-0 z-[100] bg-[#0d0b1a] text-white overflow-y-auto">
      <div className="max-w-[560px] mx-auto pb-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/finalistes-hero.jpg" alt="" className="w-full block" />

        <div className="px-4 pt-5">
          <div className="text-center mb-4">
            <div className="font-[family-name:var(--font-montserrat)] font-black text-xl">
              <span>Chant</span><span className="text-[#7ec850]">En</span><span className="text-[#e91e8c]">Scène</span>
            </div>
            <div className="text-white/40 text-xs tracking-widest mt-1">MA FICHE FINALISTE</div>
          </div>

          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 text-sm text-white/75 leading-relaxed mb-5">
            Bravo <b className="text-white">{nom}</b>, tu es en finale&nbsp;! 🎉<br />
            Pour que les <b className="text-white">musiciens préparent ton passage</b>, confirme ton téléphone et choisis tes <b className="text-white">2 chansons</b> : une rapide, une lente.
            {alreadySubmitted && <div className="mt-2 text-[#fde047]">Tu as déjà rempli ta fiche, tu peux la modifier.</div>}
          </div>

          {/* Téléphone */}
          <div className="mb-6">
            <label className={label}>📱 Mon téléphone <span className="text-[#e91e8c]">*</span></label>
            <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="06 12 34 56 78" className={field} />
            <p className="text-white/35 text-xs mt-1.5">On l&apos;a pré-rempli avec ton inscription — corrige-le si ce n&apos;est pas le bon (c&apos;est pour la répétition).</p>
          </div>

          {/* Chanson rapide */}
          <div className="mb-5 rounded-2xl border border-[#3a2a55] p-4" style={{ background: 'linear-gradient(180deg,#1c1338,#161228)' }}>
            <div className="font-bold text-[#ff7ac4] mb-3 flex items-center gap-2">⚡ Chanson rapide</div>
            <div className="mb-3"><label className={label}>Titre <span className="text-[#e91e8c]">*</span></label>
              <input value={f.fastTitle} onChange={set('fastTitle')} placeholder="Titre de la chanson" className={field} /></div>
            <div className="mb-3"><label className={label}>Interprète <span className="text-[#e91e8c]">*</span></label>
              <input value={f.fastArtist} onChange={set('fastArtist')} placeholder="Artiste / groupe" className={field} /></div>
            <div><label className={label}>Tonalité <span className="text-white/30 font-normal">(si tu la connais)</span></label>
              <input value={f.fastKey} onChange={set('fastKey')} placeholder="ex : Do, Ré mineur, F#…" className={field} /></div>
          </div>

          {/* Chanson lente */}
          <div className="mb-6 rounded-2xl border border-[#2a3a55] p-4" style={{ background: 'linear-gradient(180deg,#131c30,#161228)' }}>
            <div className="font-bold text-[#7dd3fc] mb-3 flex items-center gap-2">🌙 Chanson lente</div>
            <div className="mb-3"><label className={label}>Titre <span className="text-[#e91e8c]">*</span></label>
              <input value={f.slowTitle} onChange={set('slowTitle')} placeholder="Titre de la chanson" className={field} /></div>
            <div className="mb-3"><label className={label}>Interprète <span className="text-[#e91e8c]">*</span></label>
              <input value={f.slowArtist} onChange={set('slowArtist')} placeholder="Artiste / groupe" className={field} /></div>
            <div><label className={label}>Tonalité <span className="text-white/30 font-normal">(si tu la connais)</span></label>
              <input value={f.slowKey} onChange={set('slowKey')} placeholder="ex : Do, Ré mineur, F#…" className={field} /></div>
          </div>

          <div className="bg-[#11203a] border border-[#1d3a5c] rounded-xl p-3 text-xs text-[#9fc6e8] leading-relaxed mb-4">
            🎸 Répétition unique : <b className="text-white">mercredi 8 juillet, fin d&apos;après-midi, au Commedia</b>. Plus tu remplis tôt, plus les musiciens ont le temps de préparer.
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 z-[101] bg-gradient-to-t from-[#0d0b1a] to-transparent">
        {!canSubmit && (
          <p className="text-center text-white/45 text-xs mb-2">Renseigne ton téléphone et tes 2 chansons (titre + interprète) pour valider.</p>
        )}
        <button onClick={submit} disabled={saving || !canSubmit}
          className="w-full max-w-[536px] mx-auto block py-4 rounded-2xl font-black text-base bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Enregistrement…' : '✓ Valider ma fiche'}
        </button>
      </div>
    </main>
  )
}
