'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  setSemifinalJuryPhase,
  declareFinalistsFromPriorities,
} from '@/app/admin/demi-finale/actions'

type RankedCandidate = {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  status: string
  points: number
  meanRank: number | null
  ballots: number
}

type Ranking = {
  byCategory: Record<string, RankedCandidate[]>
  jurorsSubmitted: number
  jurorsTotal: number
  topN: number
}

interface Props {
  sessionId: string
  ranking: Ranking
  categories: string[]
  currentPhase: 'vote' | 'priorities' | 'results' | 'mixed'
  notificationsSentAt: string | null
}

const PHASES: { key: 'vote' | 'priorities' | 'results'; label: string; hint: string }[] = [
  { key: 'vote', label: 'Vote live', hint: 'Slider + buzz pendant les prestations' },
  { key: 'priorities', label: 'Classement', hint: 'Les jurés classent leurs finalistes' },
  { key: 'results', label: 'Résultats', hint: 'Page de remerciement' },
]

export default function FinalistesParPriorites({
  sessionId, ranking, categories, currentPhase, notificationsSentAt,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const locked = !!notificationsSentAt

  const displayName = (c: RankedCandidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  async function handlePhase(phase: 'vote' | 'priorities' | 'results') {
    if (busy) return
    const labels = { vote: 'Vote live', priorities: 'Classement des finalistes', results: 'Résultats' }
    if (!confirm(`Basculer TOUS les jurés de demi-finale sur : ${labels[phase]} ?`)) return
    setBusy(true)
    const res = await setSemifinalJuryPhase(sessionId, phase)
    setBusy(false)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  async function handleDeclare() {
    if (busy) return
    if (!confirm(
      `Déclarer les ${ranking.topN} premiers de chaque catégorie comme finalistes ?\n\n`
      + `Basé sur les classements de ${ranking.jurorsSubmitted}/${ranking.jurorsTotal} jurés.\n`
      + `Les candidats actuellement demi-finalistes seront promus finalistes.`
    )) return
    setBusy(true)
    const res = await declareFinalistsFromPriorities(sessionId)
    setBusy(false)
    if (res?.error) { alert(res.error); return }
    if (res?.success) {
      alert(`${res.promoted.length} finaliste(s) déclaré(s) :\n` +
        res.promoted.map(p => `• ${p.name} (${p.category})`).join('\n'))
      router.refresh()
    }
  }

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-[#2a2545]">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
          Classement des finalistes (jury demi-finale)
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Agrégation des classements des jurés (méthode points de préférence) — top {ranking.topN} par catégorie.
        </p>
      </div>

      {/* Pilote de phase jury */}
      <div className="p-4 border-b border-[#2a2545]">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
          Phase des jurés de demi-finale
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PHASES.map(p => {
            const active = currentPhase === p.key
            return (
              <button
                key={p.key}
                onClick={() => handlePhase(p.key)}
                disabled={busy}
                className={`p-3 rounded-xl border text-left transition-colors disabled:opacity-50 ${
                  active
                    ? 'border-[#7ec850]/40 bg-[#7ec850]/10'
                    : 'border-[#2a2545] bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <p className={`text-sm font-bold ${active ? 'text-[#7ec850]' : 'text-white'}`}>
                  {p.label}{active ? ' ●' : ''}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">{p.hint}</p>
              </button>
            )
          })}
        </div>
        {currentPhase === 'mixed' && (
          <p className="text-[11px] text-amber-400/80 mt-2">
            Les jurés ne sont pas tous sur la même phase — cliquez pour les synchroniser.
          </p>
        )}
      </div>

      {/* Avancement des classements */}
      <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
        <p className="text-sm text-white/60">
          <strong className="text-white">{ranking.jurorsSubmitted}</strong>
          <span className="text-white/30"> / {ranking.jurorsTotal}</span> jurés ont soumis leur classement
        </p>
        <span className={`text-xs px-2 py-1 rounded-full ${
          ranking.jurorsSubmitted === ranking.jurorsTotal && ranking.jurorsTotal > 0
            ? 'bg-[#7ec850]/15 text-[#7ec850]'
            : 'bg-white/5 text-white/40'
        }`}>
          {ranking.jurorsSubmitted === ranking.jurorsTotal && ranking.jurorsTotal > 0 ? 'Complet' : 'En attente'}
        </span>
      </div>

      {/* Classement par catégorie */}
      <div className="divide-y divide-[#1e1a35]">
        {categories.map(cat => {
          const list = ranking.byCategory[cat] || []
          return (
            <div key={cat} className="p-4">
              <p className="text-sm font-bold text-white mb-3">{cat}</p>
              {list.length === 0 ? (
                <p className="text-white/20 text-sm">Aucun candidat dans cette catégorie.</p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((c, i) => {
                    const isTop = i < ranking.topN && c.points > 0
                    const isFinalist = c.status === 'finalist'
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                          isTop ? 'border-[#f5a623]/30 bg-[#f5a623]/[0.06]' : 'border-transparent bg-white/[0.02]'
                        }`}
                      >
                        <span className={`w-5 text-center text-xs font-bold ${isTop ? 'text-[#f5a623]' : 'text-white/25'}`}>
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                          {c.photo_url
                            ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-white truncate">{displayName(c)}</p>
                            {isFinalist && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5a623]/15 text-[#f5a623] shrink-0">Finaliste</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/30">
                            {c.ballots}/{ranking.jurorsTotal} classements
                            {c.meanRank !== null && ` · rang moyen ${c.meanRank.toFixed(1)}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isTop ? 'text-[#f5a623]' : 'text-white/40'}`}>{c.points}</p>
                          <p className="text-[9px] text-white/25">points</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Déclaration */}
      <div className="p-4 border-t border-[#2a2545] space-y-3">
        {locked && (
          <p className="text-xs text-[#7ec850]">
            Notifications finale déjà envoyées — finalistes verrouillés. Utilisez « Réinitialiser » ci-dessous pour modifier.
          </p>
        )}
        <button
          onClick={handleDeclare}
          disabled={busy || locked || ranking.jurorsSubmitted === 0}
          className={`w-full px-6 py-3 rounded-xl font-medium text-sm transition-colors ${
            busy || locked || ranking.jurorsSubmitted === 0
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#f5a623] to-[#e8941e] text-white hover:opacity-90'
          }`}
        >
          {locked
            ? 'Finalistes verrouillés (notifications envoyées)'
            : ranking.jurorsSubmitted === 0
              ? 'En attente des classements du jury'
              : `Déclarer les finalistes (top ${ranking.topN} par catégorie)`}
        </button>
        <p className="text-[11px] text-white/30">
          La déclaration promeut les premiers de chaque catégorie en « finaliste ». Vous pouvez ensuite
          ajuster manuellement et envoyer les emails dans le bloc « Sélection des finalistes » ci-dessous.
        </p>
      </div>
    </div>
  )
}
