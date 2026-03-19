'use client'

import { useState } from 'react'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string | null
  song_artist: string | null
  status: string
}

interface VocalAnalysis {
  id: string
  candidate_id: string
  justesse_pct: number
  justesse_label: string
  tessiture_low: string | null
  tessiture_low_midi: number | null
  tessiture_high: string | null
  tessiture_high_midi: number | null
  octaves: number | null
  voice_type: string | null
  stability_pct: number | null
  vibrato_count: number | null
  total_notes: number | null
  zone_grave_pct: number | null
  zone_medium_pct: number | null
  zone_aigu_pct: number | null
  song_key: string | null
  song_key_confidence: number | null
  song_bpm: number | null
  processing_time_sec: number | null
  created_at: string
}

interface JuryScore {
  id: string
  juror_id: string
  candidate_id: string
  scores: Record<string, number> | null
  total_score: number | null
  comment: string | null
  event_type: string
  created_at: string
}

interface Juror {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  sessionId: string
  candidates: Candidate[]
  analyses: VocalAnalysis[]
  juryScores?: JuryScore[]
  jurors?: Juror[]
}

function getScoreColor(pct: number): string {
  if (pct >= 90) return '#22c55e'
  if (pct >= 80) return '#3b82f6'
  if (pct >= 70) return '#f59e0b'
  if (pct >= 60) return '#f97316'
  return '#ef4444'
}

function getScoreBg(pct: number): string {
  if (pct >= 90) return 'rgba(34,197,94,.12)'
  if (pct >= 80) return 'rgba(59,130,246,.12)'
  if (pct >= 70) return 'rgba(245,158,11,.12)'
  if (pct >= 60) return 'rgba(249,115,22,.12)'
  return 'rgba(239,68,68,.12)'
}

function ScoreRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const color = getScoreColor(pct)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset .6s' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size > 50 ? 16 : 12} fontWeight="800">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function TessitureBar({ low, high, lowMidi, highMidi }: { low: string; high: string; lowMidi: number; highMidi: number }) {
  const minMidi = 36
  const maxMidi = 84
  const range = maxMidi - minMidi
  const leftPct = Math.max(0, ((lowMidi - minMidi) / range) * 100)
  const widthPct = Math.min(100 - leftPct, ((highMidi - lowMidi) / range) * 100)

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-white/30 mb-0.5">
        <span>C2</span>
        <span>C6</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full relative overflow-hidden">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: 'linear-gradient(90deg, #e91e8c, #7ec850)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-0.5">
        <span className="text-[#e91e8c] font-semibold">{low}</span>
        <span className="text-[#7ec850] font-semibold">{high}</span>
      </div>
    </div>
  )
}

function ZoneChart({ grave, medium, aigu }: { grave: number; medium: number; aigu: number }) {
  return (
    <div className="flex gap-0.5 h-5 rounded overflow-hidden w-full">
      {grave > 0 && (
        <div
          className="flex items-center justify-center text-[8px] font-bold text-white/80"
          style={{ width: `${grave}%`, background: '#6366f1' }}
          title={`Grave ${Math.round(grave)}%`}
        >
          {grave >= 15 && `${Math.round(grave)}%`}
        </div>
      )}
      {medium > 0 && (
        <div
          className="flex items-center justify-center text-[8px] font-bold text-white/80"
          style={{ width: `${medium}%`, background: '#0d9488' }}
          title={`Medium ${Math.round(medium)}%`}
        >
          {medium >= 15 && `${Math.round(medium)}%`}
        </div>
      )}
      {aigu > 0 && (
        <div
          className="flex items-center justify-center text-[8px] font-bold text-white/80"
          style={{ width: `${aigu}%`, background: '#e91e8c' }}
          title={`Aigu ${Math.round(aigu)}%`}
        >
          {aigu >= 15 && `${Math.round(aigu)}%`}
        </div>
      )}
    </div>
  )
}

function CandidateDetailModal({ candidate, analysis, candidateJuryScores, jurorMap, onClose }: {
  candidate: Candidate
  analysis: VocalAnalysis
  candidateJuryScores: JuryScore[]
  jurorMap: Map<string, Juror>
  onClose: () => void
}) {
  const name = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const avgJury = candidateJuryScores.length > 0
    ? candidateJuryScores.reduce((s, j) => s + (j.total_score || 0), 0) / candidateJuryScores.length
    : null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[560px] sm:max-h-[85vh] bg-[#1a1232] border border-[#2a2545] rounded-2xl z-50 overflow-y-auto">
        <div className="p-5">
          {/* Header with photo */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt={name} className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-[#e91e8c]/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#e91e8c]/10 flex items-center justify-center text-[#e91e8c] text-xl font-bold flex-shrink-0">
                  {(candidate.stage_name || candidate.first_name)[0]}
                </div>
              )}
              <div>
                <h2 className="text-white font-bold text-lg">{name}</h2>
                <p className="text-white/40 text-sm">{candidate.song_title} — {candidate.song_artist}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: getScoreBg(analysis.justesse_pct), color: getScoreColor(analysis.justesse_pct) }}>
                    {analysis.justesse_label}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/30">{candidate.category}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl p-1">&#10005;</button>
          </div>

          {/* Score vocal + Jury side by side */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <ScoreRing pct={analysis.justesse_pct} size={72} />
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Score Vocal</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center">
              {avgJury != null ? (
                <>
                  <div className="text-3xl font-black text-[#a78bfa]">{avgJury.toFixed(1)}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                    Jury ({candidateJuryScores.length} vote{candidateJuryScores.length > 1 ? 's' : ''})
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-white/15">--</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Pas de vote</div>
                </>
              )}
            </div>
          </div>

          {/* Tessiture */}
          {analysis.tessiture_low_midi && analysis.tessiture_high_midi && (
            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Tessiture</span>
                <div className="flex items-center gap-2">
                  {analysis.voice_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#e91e8c]/15 text-[#e91e8c] font-semibold">
                      {analysis.voice_type}
                    </span>
                  )}
                  {analysis.octaves && (
                    <span className="text-xs text-white/60 font-bold">{analysis.octaves.toFixed(1)} oct</span>
                  )}
                </div>
              </div>
              <TessitureBar
                low={analysis.tessiture_low!}
                high={analysis.tessiture_high!}
                lowMidi={analysis.tessiture_low_midi}
                highMidi={analysis.tessiture_high_midi}
              />
            </div>
          )}

          {/* Zones vocales */}
          {analysis.zone_grave_pct != null && (
            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <span className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-2">Zones vocales</span>
              <ZoneChart
                grave={analysis.zone_grave_pct || 0}
                medium={analysis.zone_medium_pct || 0}
                aigu={analysis.zone_aigu_pct || 0}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-[#6366f1]">Grave</span>
                <span className="text-[10px] text-[#0d9488]">Medium</span>
                <span className="text-[10px] text-[#e91e8c]">Aigu</span>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{analysis.total_notes || '--'}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Notes</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{analysis.stability_pct != null ? `${Math.round(analysis.stability_pct)}%` : '--'}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Stabilite</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{analysis.vibrato_count ?? '--'}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Vibratos</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{analysis.song_bpm ? Math.round(analysis.song_bpm) : '--'}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">BPM</div>
            </div>
          </div>

          {/* Jury votes detail */}
          {candidateJuryScores.length > 0 && (
            <div className="p-3 bg-white/5 rounded-xl mb-4">
              <span className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-2">
                Votes Jury ({candidateJuryScores.length})
              </span>
              <div className="space-y-2">
                {candidateJuryScores.map(js => {
                  const juror = jurorMap.get(js.juror_id)
                  const jurorName = juror ? `${juror.first_name} ${juror.last_name}` : 'Anonyme'
                  return (
                    <div key={js.id} className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{jurorName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#a78bfa]">{js.total_score ?? '--'}</span>
                        {js.comment && (
                          <span className="text-[10px] text-white/30 max-w-[150px] truncate" title={js.comment}>
                            "{js.comment}"
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Technical info */}
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-2">Infos</span>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-white/30">Tonalite</span>
              <span className="text-white/70">{analysis.song_key || '--'} {analysis.song_key_confidence ? `(${Math.round(analysis.song_key_confidence * 100)}%)` : ''}</span>
              <span className="text-white/30">Traitement</span>
              <span className="text-white/70">{analysis.processing_time_sec ? `${Math.round(analysis.processing_time_sec)}s` : '--'}</span>
              <span className="text-white/30">Date</span>
              <span className="text-white/70">{new Date(analysis.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function VocalScoresAdmin({ sessionId, candidates, analyses, juryScores = [], jurors = [] }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'score' | 'jury' | 'mix' | 'name' | 'tessiture'>('mix')

  const analysisMap = new Map(analyses.map(a => [a.candidate_id, a]))
  const jurorMap = new Map(jurors.map(j => [j.id, j]))

  // Group jury scores by candidate
  const juryByCandidate = new Map<string, JuryScore[]>()
  for (const js of juryScores) {
    const arr = juryByCandidate.get(js.candidate_id) || []
    arr.push(js)
    juryByCandidate.set(js.candidate_id, arr)
  }

  // Merge candidates with analyses + jury
  const merged = candidates.map(c => {
    const cJury = juryByCandidate.get(c.id) || []
    const avgJury = cJury.length > 0
      ? cJury.reduce((s, j) => s + (j.total_score || 0), 0) / cJury.length
      : null
    return {
      candidate: c,
      analysis: analysisMap.get(c.id) || null,
      juryScores: cJury,
      avgJury,
      juryCount: cJury.length,
    }
  })

  // Filter
  const filtered = filterCat === 'all' ? merged : merged.filter(m => m.candidate.category === filterCat)

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.analysis?.justesse_pct ?? -1) - (a.analysis?.justesse_pct ?? -1)
    }
    if (sortBy === 'jury') {
      return (b.avgJury ?? -1) - (a.avgJury ?? -1)
    }
    if (sortBy === 'mix') {
      // Normalize: vocal score 0-100, jury score typically 0-20 → multiply by 5
      const mixA = ((a.analysis?.justesse_pct ?? 0) + (a.avgJury != null ? a.avgJury * 5 : 0)) / (a.avgJury != null ? 2 : 1)
      const mixB = ((b.analysis?.justesse_pct ?? 0) + (b.avgJury != null ? b.avgJury * 5 : 0)) / (b.avgJury != null ? 2 : 1)
      return mixB - mixA
    }
    if (sortBy === 'tessiture') {
      return (b.analysis?.octaves ?? 0) - (a.analysis?.octaves ?? 0)
    }
    const na = a.candidate.stage_name || a.candidate.last_name
    const nb = b.candidate.stage_name || b.candidate.last_name
    return na.localeCompare(nb)
  })

  // Stats
  const analyzed = merged.filter(m => m.analysis)
  const avgScore = analyzed.length > 0
    ? analyzed.reduce((sum, m) => sum + (m.analysis?.justesse_pct || 0), 0) / analyzed.length
    : 0
  const bestCandidate = analyzed.length > 0
    ? analyzed.reduce((best, m) => (m.analysis!.justesse_pct > (best.analysis?.justesse_pct || 0) ? m : best))
    : null
  const totalJuryVotes = juryScores.length
  const avgJuryGlobal = totalJuryVotes > 0
    ? juryScores.reduce((s, j) => s + (j.total_score || 0), 0) / totalJuryVotes
    : 0

  const categories = ['Enfant', 'Ado', 'Adulte']
  const catCounts = categories.map(cat => ({
    cat,
    total: candidates.filter(c => c.category === cat).length,
    analyzed: analyses.filter(a => candidates.find(c => c.id === a.candidate_id && c.category === cat)).length,
  }))

  const selectedMerged = selectedId ? merged.find(m => m.candidate.id === selectedId) : null

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-[#e91e8c]">{analyzed.length}<span className="text-white/30 text-lg">/{candidates.length}</span></div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Analyses</div>
        </div>
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-xl p-4 text-center">
          <div className="text-3xl font-black" style={{ color: avgScore > 0 ? getScoreColor(avgScore) : 'rgba(255,255,255,.2)' }}>
            {avgScore > 0 ? `${Math.round(avgScore)}%` : '--'}
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Moy. vocale</div>
        </div>
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-xl p-4 text-center">
          {bestCandidate ? (
            <>
              <div className="text-3xl font-black text-[#22c55e]">{Math.round(bestCandidate.analysis!.justesse_pct)}%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                {bestCandidate.candidate.stage_name || bestCandidate.candidate.first_name}
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-black text-white/20">--</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Meilleur</div>
            </>
          )}
        </div>
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-[#a78bfa]">{totalJuryVotes}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Votes jury</div>
        </div>
        <div className="bg-[#1a1232] border border-[#2a2545] rounded-xl p-4">
          <div className="flex flex-col gap-1">
            {catCounts.map(({ cat, total, analyzed: a }) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="text-white/40">{cat}</span>
                <span className="text-white/60 font-medium">{a}/{total}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5 text-center">Categories</div>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1">
          {['all', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-[#e91e8c]/15 text-[#e91e8c] border border-[#e91e8c]/30'
                  : 'bg-white/5 text-white/40 border border-transparent hover:text-white/60'
              }`}
            >
              {cat === 'all' ? 'Tous' : cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {([['mix', 'Mix'], ['score', 'Vocal'], ['jury', 'Jury'], ['tessiture', 'Tessiture'], ['name', 'Nom']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-white/30 border border-transparent hover:text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(({ candidate, analysis, avgJury, juryCount }, idx) => {
          const name = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
          const hasAnalysis = !!analysis

          return (
            <button
              key={candidate.id}
              onClick={() => hasAnalysis && setSelectedId(candidate.id)}
              disabled={!hasAnalysis}
              className={`text-left bg-[#1a1232] border rounded-xl p-4 transition-all ${
                hasAnalysis
                  ? 'border-[#2a2545] hover:border-[#e91e8c]/40 hover:bg-[#1a1232]/80 cursor-pointer active:scale-[.98]'
                  : 'border-[#2a2545]/50 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank + Photo */}
                <div className="relative flex-shrink-0">
                  {candidate.photo_url ? (
                    <img src={candidate.photo_url} alt={name} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                  ) : hasAnalysis ? (
                    <ScoreRing pct={analysis.justesse_pct} size={56} />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/15 text-lg font-bold flex-shrink-0">
                      {(candidate.stage_name || candidate.first_name)[0]}
                    </div>
                  )}
                  {hasAnalysis && (
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#1a1232] border border-[#2a2545] flex items-center justify-center text-[9px] font-bold text-white/60">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm truncate">{name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/30 font-medium flex-shrink-0">
                      {candidate.category}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs truncate mt-0.5">
                    {candidate.song_title} — {candidate.song_artist}
                  </p>

                  {hasAnalysis && (
                    <div className="flex items-center gap-2 mt-1.5">
                      {/* Vocal score badge */}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: getScoreBg(analysis.justesse_pct), color: getScoreColor(analysis.justesse_pct) }}>
                        {Math.round(analysis.justesse_pct)}%
                      </span>
                      {/* Jury score */}
                      {avgJury != null && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa]">
                          Jury {avgJury.toFixed(1)} ({juryCount})
                        </span>
                      )}
                      {analysis.octaves && (
                        <span className="text-[10px] text-white/30">{analysis.octaves.toFixed(1)} oct</span>
                      )}
                    </div>
                  )}

                  {hasAnalysis && analysis.tessiture_low_midi && analysis.tessiture_high_midi && (
                    <div className="mt-2">
                      <TessitureBar
                        low={analysis.tessiture_low!}
                        high={analysis.tessiture_high!}
                        lowMidi={analysis.tessiture_low_midi}
                        highMidi={analysis.tessiture_high_midi}
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-white/20">
          <p className="text-4xl mb-3">&#127908;</p>
          <p className="text-sm">Aucun candidat {filterCat !== 'all' ? `dans la categorie ${filterCat}` : ''}</p>
        </div>
      )}

      {/* Detail modal */}
      {selectedMerged?.analysis && (
        <CandidateDetailModal
          candidate={selectedMerged.candidate}
          analysis={selectedMerged.analysis}
          candidateJuryScores={selectedMerged.juryScores}
          jurorMap={jurorMap}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
