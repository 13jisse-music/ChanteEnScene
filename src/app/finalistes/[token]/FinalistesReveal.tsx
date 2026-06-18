'use client'

import { useState, useEffect } from 'react'
import type { FinaliteItem } from './page'

interface Props {
  token: string
  isOlivier: boolean
  byCat: Record<string, FinaliteItem[]>
}

const CATS: Record<string, { color: string; emoji: string; label: string }> = {
  Enfant: { color: '#ff9d4d', emoji: '🧒', label: 'Enfants' },
  Ado: { color: '#b58bff', emoji: '🎤', label: 'Ados' },
  Adulte: { color: '#39b0e6', emoji: '🎵', label: 'Adultes' },
}
const ORDER = ['Enfant', 'Ado', 'Adulte']

// Met une majuscule a chaque mot (gere les traits d'union), pour un rendu propre
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.split('-').map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join('-'))
    .join(' ')
}

export default function FinalistesReveal({ token, isOlivier, byCat }: Props) {
  const [validated, setValidated] = useState(false)
  const [saving, setSaving] = useState(false)

  // Notifie l'admin (Telegram) qu'Olivier a ouvert la page, une seule fois par session
  useEffect(() => {
    if (!isOlivier) return
    if (sessionStorage.getItem('ces_fin_open')) return
    sessionStorage.setItem('ces_fin_open', '1')
    fetch('/api/finalistes/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [isOlivier, token])

  async function validate() {
    setSaving(true)
    await fetch('/api/finalistes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
    setSaving(false)
    setValidated(true)
  }

  return (
    <main className="fixed inset-0 z-[100] text-white overflow-y-auto pb-20" style={{ background: 'radial-gradient(1100px 560px at 50% -8%, #2a1840 0%, transparent 60%), radial-gradient(800px 460px at 88% 16%, #3a1030 0%, transparent 55%), #0d0b1a' }}>
      {/* Image héros */}
      <div className="max-w-[820px] mx-auto px-4 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/finalistes-hero.jpg" alt="Résultats des finalistes 2026" className="w-full rounded-[20px] shadow-2xl border border-white/10" />
      </div>

      {/* Titre */}
      <div className="max-w-[760px] mx-auto px-4 text-center mt-8 mb-10">
        <div className="inline-block text-[11px] tracking-[3px] font-bold uppercase text-[#ffc44d] border border-[#ffc44d55] rounded-full px-4 py-1.5 mb-4">
          ★ Sélection du jury ★
        </div>
        <div className="font-[family-name:var(--font-montserrat)] font-black text-3xl sm:text-4xl leading-none">
          <span>Chant</span><span className="text-[#7ec850]">En</span><span className="text-[#e91e8c]">Scène</span>
        </div>
        <div className="font-black text-3xl sm:text-4xl mt-3 text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#ffc44d,#ff7ac4,#ffc44d)' }}>
          Les Finalistes
        </div>
        <div className="text-white/90 text-[15px] mt-2 tracking-wide">Aubagne 2026</div>
        <div className="w-[60px] h-[3px] mx-auto mt-4 rounded" style={{ background: 'linear-gradient(90deg,#e91e8c,#ffc44d)' }} />
      </div>

      {/* Catégories */}
      <div className="max-w-[760px] mx-auto px-4">
        {ORDER.map((cat) => {
          const rows = byCat[cat] || []
          if (!rows.length) return null
          const c = CATS[cat]
          return (
            <section key={cat} className="mb-11">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2.5 text-xl font-extrabold uppercase tracking-[2px]" style={{ color: c.color }}>
                  {c.emoji} {c.label}
                </div>
                <div className="max-w-[260px] h-px mx-auto mt-3 opacity-40" style={{ background: `linear-gradient(90deg,transparent,${c.color},transparent)` }} />
              </div>
              <div className={`grid gap-5 justify-items-center ${rows.length === 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-[600px] mx-auto' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {rows.map((it) => (
                  <div key={it.id} className="text-center w-full max-w-[170px]">
                    <div className="relative w-32 h-32 mx-auto mb-3 rounded-full p-1" style={{ background: `linear-gradient(135deg,${c.color},#ffffff22)` }}>
                      {it.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photo} alt="" className="w-full h-full rounded-full object-cover border-[3px] border-[#0d0b1a] bg-[#221c3a]" />
                      ) : (
                        <div className="w-full h-full rounded-full border-[3px] border-[#0d0b1a] bg-[#221c3a]" />
                      )}
                    </div>
                    <div className="text-lg font-extrabold leading-tight">{titleCase(it.nom)}</div>
                    <div className="text-[12.5px] text-white/60 mt-0.5">{titleCase(it.real)}</div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Validation réservée à Olivier */}
      {isOlivier && (
        <div className="max-w-[520px] mx-auto px-4">
          <div className="bg-[#16122a] border border-[#2a2545] rounded-[18px] p-6 text-center">
            {validated ? (
              <>
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-lg font-bold mb-1">Merci Olivier !</h3>
                <p className="text-sm text-white/70">Ta validation est transmise à Jean-Christophe. Il diffuse l’annonce au jury.</p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold mb-1.5">👉 Réservé à Olivier</h3>
                <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                  Si cette annonce te convient, valide-la d’un clic. Jean-Christophe est prévenu, puis le lien est envoyé à tout le jury.
                </p>
                <button
                  onClick={validate}
                  disabled={saving}
                  className="inline-block font-extrabold text-base text-white px-8 py-4 rounded-2xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg,#e91e8c,#7c3aed)' }}
                >
                  {saving ? 'Envoi…' : '✅ Je valide l’annonce'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-10 text-white/40 text-xs">
        ChantEnScène · Aubagne 2026
      </div>
    </main>
  )
}
