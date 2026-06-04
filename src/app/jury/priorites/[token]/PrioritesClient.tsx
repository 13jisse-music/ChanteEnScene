'use client'

import { useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'

type Candidate = {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  video_url: string | null
  mp3_url: string | null
}

type Score = {
  total_score: number
  scores: { decision?: string; score?: number; buzzed?: boolean } | null
  candidates: Candidate
}

type ExistingPriority = {
  candidate_id: string
  category: string
  rank: number
}

type Mode = 'online' | 'semifinal'

type Props = {
  juror: { id: string; firstName: string; lastName: string }
  scores: Score[]
  existingPriorities: ExistingPriority[]
  // mode 'online' (defaut) = classement qui designe les demi-finalistes (top 10, verdict oui/peut-etre)
  // mode 'semifinal' = classement demi-finale qui designe les finalistes (top 5, pre-rempli par note slider+buzz)
  mode?: Mode
  topN?: number
  round?: 'semifinal' | 'final'
  sessionId?: string | null
}

type CandItem = {
  id: string
  fn: string
  ln: string
  vote: 'oui' | 'pe'
  score: number
  buzzed: boolean
  total: number
  photo: string
  media: string
}

const CATS = ['Ado', 'Adulte', 'Enfant'] as const
const CAT_EMOJI: Record<string, string> = { Ado: '🎤', Adulte: '🎵', Enfant: '⭐' }

function buildPool(scores: Score[], cat: string, mode: Mode): CandItem[] {
  return scores
    .filter(s => s.candidates?.category === cat)
    .map(s => {
      const buzzed = s.scores?.buzzed === true
      const score = s.scores?.score ?? (buzzed ? s.total_score - 200 : s.total_score)
      return {
        id: s.candidates.id,
        fn: s.candidates.first_name,
        ln: s.candidates.last_name,
        vote: (mode === 'online' && s.total_score === 2 ? 'oui' : 'pe') as 'oui' | 'pe',
        score,
        buzzed,
        total: s.total_score,
        photo: s.candidates.photo_url || '',
        media: s.candidates.video_url || s.candidates.mp3_url || '',
      }
    })
}

function prefill(pool: CandItem[], existing: ExistingPriority[], cat: string, mode: Mode, topN: number): CandItem[] {
  const sorted = existing
    .filter(e => e.category === cat)
    .sort((a, b) => a.rank - b.rank)
  if (sorted.length) {
    return sorted
      .map(e => pool.find(c => c.id === e.candidate_id))
      .filter(Boolean) as CandItem[]
  }
  if (mode === 'semifinal') {
    // Pre-rempli par la note du jure (slider + buzz) decroissante
    return [...pool].sort((a, b) => b.total - a.total).slice(0, topN)
  }
  return pool.filter(c => c.vote === 'oui').slice(0, topN)
}

export default function PrioritesClient({
  juror, scores, existingPriorities,
  mode = 'online', topN: topNProp, round = 'semifinal', sessionId = null,
}: Props) {
  const topN = topNProp ?? (mode === 'semifinal' ? 5 : 10)
  const alreadySubmitted = existingPriorities.length > 0
  const [screen, setScreen] = useState<'welcome' | 'main' | 'confirm' | 'readonly'>(
    alreadySubmitted ? 'readonly' : 'welcome'
  )
  const [activeTab, setActiveTab] = useState<string>('Ado')
  const [tops, setTops] = useState<Record<string, CandItem[]>>({})
  const sortableRefs = useRef<Record<string, Sortable | null>>({})

  const pools: Record<string, CandItem[]> = {}
  CATS.forEach(cat => { pools[cat] = buildPool(scores, cat, mode) })

  useEffect(() => {
    if (screen !== 'main') return
    const initial: Record<string, CandItem[]> = {}
    CATS.forEach(cat => {
      initial[cat] = prefill(pools[cat], existingPriorities, cat, mode, topN)
    })
    setTops(initial)
  }, [screen])

  const getPool = (cat: string) => {
    const topIds = new Set((tops[cat] || []).map(c => c.id))
    return pools[cat].filter(c => !topIds.has(c.id))
  }

  const allDone = CATS.every(cat => (tops[cat] || []).length === topN)
  const totalRanked = CATS.length * topN

  async function handleSubmit() {
    const priorities = CATS.flatMap(cat =>
      (tops[cat] || []).map((c, i) => ({
        juror_id: juror.id,
        candidate_id: c.id,
        category: cat,
        rank: i + 1,
      }))
    )
    const res = await fetch('/api/jury/save-priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        juror_id: juror.id,
        juror_name: `${juror.firstName} ${juror.lastName}`,
        priorities,
        round,
        session_id: sessionId,
      }),
    })
    if (res.ok) setScreen('confirm')
  }

  if (screen === 'readonly') {
    const CAT_COLORS: Record<string, string> = { Ado: '#7c3aed', Adulte: '#0369a1', Enfant: '#b45309' }
    return (
      <main className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto text-white">
        <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] px-4 py-5 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h1 className="text-lg font-bold text-white mb-1">Ma sélection — {juror.firstName} {juror.lastName}</h1>
          <p className="text-[#a78bfa] text-xs">
            ChantEnScène Aubagne 2026 · {mode === 'semifinal' ? 'Finalistes classés' : 'Priorités validées'}
          </p>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {CATS.map(cat => {
            const catPriorities = existingPriorities
              .filter(p => p.category === cat)
              .sort((a, b) => a.rank - b.rank)
            const color = CAT_COLORS[cat]
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CAT_EMOJI[cat]}</span>
                  <h2 className="font-bold text-sm" style={{ color }}>{cat}</h2>
                  <span className="text-xs text-[#475569]">({catPriorities.length} candidats classés)</span>
                </div>
                <div className="space-y-2">
                  {catPriorities.map(p => {
                    const score = scores.find(s => s.candidates?.id === p.candidate_id)
                    const cand = score?.candidates
                    if (!cand) return null
                    const name = cand.stage_name || `${cand.first_name} ${cand.last_name}`
                    return (
                      <div key={p.candidate_id} className="flex items-center gap-3 bg-[#1e293b] rounded-xl p-2.5 border border-white/7">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: p.rank <= 3 ? color : 'rgba(255,255,255,0.1)' }}>
                          {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}
                        </div>
                        {cand.photo_url ? (
                          <img src={cand.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-white/10" loading="lazy" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#334155] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#94a3b8]">{cand.first_name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{name}</p>
                          <p className="text-[10px] text-[#64748b] truncate">{cand.first_name} {cand.last_name}</p>
                        </div>
                        {(cand.video_url || cand.mp3_url) && (
                          <button
                            onClick={() => window.open((cand.video_url || cand.mp3_url)!, '_blank')}
                            className="w-7 h-7 rounded-full bg-[#7c3aed]/25 flex items-center justify-center text-[10px] flex-shrink-0"
                          >▶</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 text-center mt-4">
            <p className="text-xs text-[#86efac]">Votre sélection a bien été enregistrée. Merci pour votre participation !</p>
            <p className="text-[10px] text-[#475569] mt-1">Jean Christophe Martinez recevra vos choix pour la délibération finale.</p>
          </div>
        </div>
      </main>
    )
  }

  if (screen === 'welcome') {
    const title = mode === 'semifinal' ? 'Demi-finale — Choix des finalistes' : 'Sélection finale'
    const bullets: [string, string, string][] = mode === 'semifinal'
      ? [
          ['Vos candidats sont pré-classés selon', `vos notes du soir`, '(note + golden buzz). Réordonnez à votre guise.'],
          ['Choisissez vos', `${topN} finalistes`, `par catégorie : n°1 = votre favori, n°${topN} = votre dernier choix.`],
          ['Appuyez sur', '▶', 'pour réécouter un candidat avant de décider.'],
          ['Complétez les', '3 catégories', 'puis validez. La moyenne des jurés désignera les finalistes.'],
        ]
      : [
          ['Vos candidats OUI sont pré-chargés. Choisissez vos', `${topN} priorités`, 'parmi vos OUI et PEUT-ÊTRE.'],
          ['Ordonnez-les par préférence :', 'n°1 = votre favori absolu', `, n°${topN} = votre ${topN}ème choix.`],
          ['Appuyez sur', '▶', 'pour revoir la prestation d\'un candidat avant de décider.'],
          ['Complétez les', '3 catégories', 'puis validez.'],
        ]
    return (
      <main className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-xl font-bold text-white mb-1">Bonjour {juror.firstName} !</h1>
        <p className="text-[#a78bfa] text-sm mb-6">ChantEnScène Aubagne 2026 — {title}</p>
        <div className="bg-white/5 rounded-2xl p-5 w-full max-w-sm mb-6 text-left space-y-4">
          {bullets.map(([a, b, c], i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-[#cbd5e1] text-sm leading-relaxed">{a} <strong className="text-white">{b}</strong> {c}</p>
            </div>
          ))}
        </div>
        {alreadySubmitted && (
          <p className="text-[#fde68a] text-xs mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
            Vous avez déjà soumis votre classement — vous pouvez le modifier.
          </p>
        )}
        <button
          onClick={() => setScreen('main')}
          className="w-full max-w-sm py-4 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] rounded-2xl text-white font-bold text-base"
        >
          Commencer
        </button>
      </main>
    )
  }

  if (screen === 'confirm') {
    return (
      <main className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {mode === 'semifinal' ? 'Classement enregistré !' : 'Priorités enregistrées !'}
        </h2>
        <p className="text-[#94a3b8] text-sm leading-relaxed max-w-xs">
          Vos choix ont été sauvegardés. Jean Christophe recevra vos sélections pour la délibération finale.
        </p>
        <div className="mt-5 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 text-xs text-[#86efac]">
          3 catégories · {totalRanked} candidats classés par priorité
        </div>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto pb-24 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] px-4 pt-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#7c3aed] flex items-center justify-center text-sm font-bold flex-shrink-0">
            {juror.firstName[0]}{juror.lastName[0]}
          </div>
          <div>
            <p className="font-bold text-sm">{juror.firstName} {juror.lastName}</p>
            <p className="text-[#a78bfa] text-xs">
              {mode === 'semifinal'
                ? `Classez vos ${topN} finalistes par catégorie`
                : `Classez vos ${topN} priorités par catégorie`}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {CATS.map(cat => {
            const n = (tops[cat] || []).length
            const done = n === topN
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-1 py-2 rounded-t-lg text-xs font-bold relative transition-colors ${activeTab === cat ? 'bg-[#0f172a] text-white' : 'bg-white/5 text-[#94a3b8]'}`}
              >
                {CAT_EMOJI[cat]} {cat}
                <span className="block text-[10px] opacity-70">{n}/{topN}</span>
                {done && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panels */}
      {CATS.map(cat => (
        <div key={cat} className={`p-3 ${activeTab === cat ? 'block' : 'hidden'}`}>
          <Panel
            cat={cat}
            mode={mode}
            topN={topN}
            tops={tops[cat] || []}
            pool={getPool(cat)}
            sortableRefs={sortableRefs}
            onChange={(newTops) => setTops(prev => ({ ...prev, [cat]: newTops }))}
          />
        </div>
      ))}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0f172a] border-t border-white/10">
        <button
          onClick={handleSubmit}
          disabled={!allDone}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${allDone ? 'bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white' : 'bg-white/8 text-[#475569]'}`}
        >
          {allDone
            ? (mode === 'semifinal' ? 'Valider mon classement' : 'Valider mes priorités')
            : 'Complétez les 3 catégories pour valider'}
        </button>
      </div>
    </main>
  )
}

function Panel({
  cat, mode, topN, tops, pool, sortableRefs, onChange
}: {
  cat: string
  mode: Mode
  topN: number
  tops: CandItem[]
  pool: CandItem[]
  sortableRefs: React.MutableRefObject<Record<string, Sortable | null>>
  onChange: (tops: CandItem[]) => void
}) {
  const topRef = useRef<HTMLDivElement>(null)
  const topsRef = useRef(tops)
  topsRef.current = tops
  const allCandsRef = useRef<CandItem[]>([])
  allCandsRef.current = [...tops, ...pool]

  // Drag uniquement pour réordonner dans le top — stable, ne se recrée qu'au changement de tab
  useEffect(() => {
    if (!topRef.current) return
    try { sortableRefs.current[`top-${cat}`]?.destroy() } catch (_) {}
    sortableRefs.current[`top-${cat}`] = Sortable.create(topRef.current, {
      group: { name: cat, pull: false, put: false },
      filter: '[data-play],[data-action]',
      animation: 150,
      ghostClass: 'opacity-30',
      chosenClass: 'border-[#7c3aed]',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onSort() {
        if (!topRef.current) return
        const ids = [...topRef.current.querySelectorAll('[data-card]')].map(el => el.getAttribute('data-id')!)
        const next = ids.map(id => allCandsRef.current.find(c => c.id === id)).filter(Boolean) as CandItem[]
        onChange(next)
      },
    })
    return () => { try { sortableRefs.current[`top-${cat}`]?.destroy() } catch (_) {} }
  }, [cat])

  const n = tops.length
  const full = n >= topN

  const addToTop = (c: CandItem) => {
    if (topsRef.current.length >= topN) return
    onChange([...topsRef.current, c])
  }

  const removeFromTop = (id: string) => {
    onChange(topsRef.current.filter(c => c.id !== id))
  }

  const poolLabel = mode === 'semifinal' ? 'Autres candidats notés' : 'Autres candidats positifs'

  return (
    <div>
      <div className="bg-white/5 rounded-xl p-3 mb-3 flex items-center gap-3">
        <span className="text-xl font-bold" style={{ color: full ? '#22c55e' : '#a78bfa' }}>
          {n}<span className="text-xs text-white/40">/{topN}</span>
        </span>
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] transition-all" style={{ width: `${(n / topN) * 100}%` }} />
        </div>
        <span className="text-xs" style={{ color: full ? '#22c55e' : '#64748b' }}>
          {full ? 'Complet !' : `${topN - n} restants`}
        </span>
      </div>

      <p className="text-xs text-[#a78bfa] text-center mb-2 bg-[#7c3aed]/8 rounded-lg py-2">
        n°1 = votre favori absolu · glissez pour réordonner · ▶ pour revoir
      </p>

      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c3aed] mb-2">
        {mode === 'semifinal' ? `Mes ${topN} finalistes` : `Mes ${topN} priorités`}
      </p>
      <div ref={topRef} className="min-h-14 bg-[#7c3aed]/8 border-2 border-dashed border-[#7c3aed]/30 rounded-xl p-1.5 mb-4">
        {tops.length === 0 && (
          <p className="text-center py-4 text-[#475569] text-xs italic">Appuyez sur + pour ajouter un candidat</p>
        )}
        {tops.map((c, i) => (
          <Card key={c.id} c={c} rank={i + 1} mode={mode} onAction={() => removeFromTop(c.id)} actionType="remove" />
        ))}
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
        {poolLabel} <span className="font-normal text-[#475569]">({pool.length})</span>
      </p>
      <div className="min-h-10 bg-white/3 border border-white/7 rounded-xl p-1.5">
        {pool.length === 0 && (
          <p className="text-center py-3 text-[#475569] text-xs italic">Tous vos candidats sont sélectionnés</p>
        )}
        {pool.map(c => (
          <Card key={c.id} c={c} rank={0} mode={mode}
            onAction={full ? undefined : () => addToTop(c)}
            actionType="add"
            disabled={full}
          />
        ))}
      </div>
    </div>
  )
}

function Card({ c, rank, mode, onAction, actionType, disabled }: {
  c: CandItem
  rank: number
  mode: Mode
  onAction?: () => void
  actionType?: 'add' | 'remove'
  disabled?: boolean
}) {
  return (
    <div
      data-card
      data-id={c.id}
      className="flex items-center gap-2 bg-[#1e293b] rounded-xl p-2 mb-1.5 border border-white/7 touch-none select-none"
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${rank > 0 ? 'bg-[#7c3aed] text-white' : 'bg-white/8 text-transparent'}`}>
        {rank > 0 ? rank : '·'}
      </div>
      {c.photo ? (
        <img src={c.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white/10 bg-[#334155]" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#334155] flex-shrink-0 flex items-center justify-center text-sm font-bold text-[#94a3b8]">
          {c.fn[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{c.fn} {c.ln}</p>
        {mode === 'semifinal' ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 bg-[#7c3aed]/20 text-[#c4b5fd]">
              {c.score}/100
            </span>
            {c.buzzed && (
              <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300">⚡ Buzz</span>
            )}
          </span>
        ) : (
          <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${c.vote === 'oui' ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-300'}`}>
            {c.vote === 'oui' ? 'OUI' : 'PEUT-ÊTRE'}
          </span>
        )}
      </div>
      {c.media && (
        <button
          data-play
          onClick={() => window.open(c.media, '_blank')}
          className="w-8 h-8 rounded-full bg-[#7c3aed]/30 border border-[#7c3aed]/50 flex items-center justify-center text-xs flex-shrink-0 active:bg-[#7c3aed]/60"
        >
          ▶
        </button>
      )}
      {onAction && actionType === 'add' && (
        <button
          data-action
          onClick={onAction}
          disabled={disabled}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${disabled ? 'bg-white/5 text-white/20' : 'bg-green-500/20 border border-green-500/40 text-green-400 active:bg-green-500/40'}`}
        >
          +
        </button>
      )}
      {onAction && actionType === 'remove' && (
        <button
          data-action
          onClick={onAction}
          className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0 active:bg-red-500/30"
        >
          ×
        </button>
      )}
      {rank > 0 && <div className="text-[#475569] text-base flex-shrink-0 px-1 cursor-grab">⠿</div>}
    </div>
  )
}
