'use client'

import { useMemo, useState } from 'react'

/* ---------- types ---------- */

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface JuryScore {
  id: string
  juror_id: string
  candidate_id: string
  event_type: string
  scores: Record<string, string | number> | null
  total_score: number
  comment: string | null
  viewed_at: string | null
  watch_seconds: number
  created_at: string
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  video_url: string | null
  mp3_url: string | null
  song_title: string
  song_artist: string
}

interface Props {
  session: { id: string; name: string }
  jurors: Juror[]
  juryScores: JuryScore[]
  candidates: Candidate[]
}

/* ---------- helpers ---------- */

const SUSPECT_THRESHOLD = 5 // seconds

function hasVote(s: JuryScore): boolean {
  const d = (s.scores as Record<string, string> | null)?.decision
  return d === 'oui' || d === 'peut-etre' || d === 'non'
}

function formatSeconds(s: number): string {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function jurorName(j: Juror): string {
  return `${j.first_name || ''} ${j.last_name || ''}`.trim() || j.email || 'Anonyme'
}

function candidateName(c: Candidate): string {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

/* ---------- component ---------- */

export default function JuryEngagementStats({ session, jurors, juryScores, candidates }: Props) {
  const [expandedJurorId, setExpandedJurorId] = useState<string | null>(null)

  const candidatesWithMedia = useMemo(
    () => new Set(candidates.filter((c) => c.video_url || c.mp3_url).map((c) => c.id)),
    [candidates],
  )
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  )

  // Actual votes (with a decision)
  const actualVotes = useMemo(() => juryScores.filter(hasVote), [juryScores])

  // Suspect votes: voted with < threshold seconds on a candidate with video/audio
  const suspiciousVotes = useMemo(
    () => actualVotes.filter((s) => candidatesWithMedia.has(s.candidate_id) && (s.watch_seconds || 0) < SUSPECT_THRESHOLD),
    [actualVotes, candidatesWithMedia],
  )

  /* ---- global stats ---- */
  const activeJurors = jurors.filter((j) => j.is_active).length
  const totalExpected = jurors.length * candidates.length
  const completionRate = totalExpected > 0 ? Math.round((actualVotes.length / totalExpected) * 100) : 0

  const votesWithMedia = actualVotes.filter((s) => candidatesWithMedia.has(s.candidate_id))
  const avgWatchSeconds = votesWithMedia.length > 0
    ? Math.round(votesWithMedia.reduce((a, s) => a + (s.watch_seconds || 0), 0) / votesWithMedia.length)
    : 0

  /* ---- engagement donut data ---- */
  const engagementData = useMemo(() => {
    let good = 0, medium = 0, suspect = 0
    for (const s of votesWithMedia) {
      const ws = s.watch_seconds || 0
      if (ws >= 10) good++
      else if (ws >= SUSPECT_THRESHOLD) medium++
      else suspect++
    }
    const notVoted = Math.max(0, totalExpected - actualVotes.length)
    return { good, medium, suspect, notVoted }
  }, [votesWithMedia, totalExpected, actualVotes.length])

  /* ---- watch time distribution buckets ---- */
  const timeBuckets = useMemo(() => {
    const buckets = [
      { label: '0-5s', min: 0, max: 5, count: 0 },
      { label: '5-15s', min: 5, max: 15, count: 0 },
      { label: '15-30s', min: 15, max: 30, count: 0 },
      { label: '30-60s', min: 30, max: 60, count: 0 },
      { label: '60s+', min: 60, max: Infinity, count: 0 },
    ]
    for (const s of votesWithMedia) {
      const ws = s.watch_seconds || 0
      const b = buckets.find((b) => ws >= b.min && ws < b.max)
      if (b) b.count++
    }
    return buckets
  }, [votesWithMedia])

  const maxBucket = Math.max(1, ...timeBuckets.map((b) => b.count))

  /* ---- timeline: votes per day ---- */
  const timeline = useMemo(() => {
    const dayMap = new Map<string, number>()
    for (const s of actualVotes) {
      const day = s.created_at.slice(0, 10)
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    const entries = [...dayMap.entries()].sort()
    const maxDay = Math.max(1, ...entries.map(([, v]) => v))
    return { entries, maxDay }
  }, [actualVotes])

  /* ---- per-juror data ---- */
  const jurorStats = useMemo(() => {
    return jurors.map((j) => {
      const scores = actualVotes.filter((s) => s.juror_id === j.id)
      const withMedia = scores.filter((s) => candidatesWithMedia.has(s.candidate_id))
      const suspectCount = withMedia.filter((s) => (s.watch_seconds || 0) < SUSPECT_THRESHOLD).length
      const avgWatch = withMedia.length > 0
        ? Math.round(withMedia.reduce((a, s) => a + (s.watch_seconds || 0), 0) / withMedia.length)
        : 0
      const firstVote = scores.length > 0
        ? scores.reduce((a, s) => (s.created_at < a ? s.created_at : a), scores[0].created_at)
        : null

      // Reliability score: 0 = red, 1 = amber, 2 = green
      let reliability = 2
      if (scores.length === 0) reliability = 0
      else if (withMedia.length > 0 && suspectCount / withMedia.length > 0.5) reliability = 0
      else if (withMedia.length > 0 && suspectCount / withMedia.length > 0.2) reliability = 1

      return {
        juror: j,
        voteCount: scores.length,
        completion: candidates.length > 0 ? Math.round((scores.length / candidates.length) * 100) : 0,
        avgWatch,
        suspectCount,
        firstVote,
        reliability,
        scores,
      }
    }).sort((a, b) => b.voteCount - a.voteCount)
  }, [jurors, actualVotes, candidatesWithMedia, candidates.length])

  const reliabilityColors = ['#ef4444', '#f59e0b', '#7ec850']

  /* ---- donut gradient ---- */
  const donutGradient = useMemo(() => {
    const total = engagementData.good + engagementData.medium + engagementData.suspect + engagementData.notVoted
    if (total === 0) return 'bg-white/5'
    const goodPct = (engagementData.good / total) * 100
    const medPct = (engagementData.medium / total) * 100
    const susPct = (engagementData.suspect / total) * 100
    return `conic-gradient(#7ec850 0% ${goodPct}%, #f59e0b ${goodPct}% ${goodPct + medPct}%, #ef4444 ${goodPct + medPct}% ${goodPct + medPct + susPct}%, #ffffff10 ${goodPct + medPct + susPct}% 100%)`
  }, [engagementData])

  /* ---- render ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl text-white">
          Fiabilité Jury En Ligne
        </h1>
        <p className="text-white/40 text-sm mt-1">{session.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👨‍⚖️" label="Jurés actifs" value={`${activeJurors}`} color="#e91e8c" />
        <StatCard icon="✅" label="Taux complétion" value={`${completionRate}%`} color="#7ec850" />
        <StatCard icon="⏱️" label="Temps moyen" value={formatSeconds(avgWatchSeconds)} color="#3b82f6" />
        <StatCard icon="⚠️" label="Votes suspects" value={`${suspiciousVotes.length}`} color="#ef4444" />
      </div>

      {/* Charts: donut + bar distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Engagement donut */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-4 text-white/70">
            Qualité des votes
          </h2>
          <div className="flex items-center gap-6">
            {(engagementData.good + engagementData.medium + engagementData.suspect + engagementData.notVoted) > 0 ? (
              <div
                className="w-28 h-28 rounded-full relative shrink-0"
                style={{ background: donutGradient }}
              >
                <div className="absolute inset-4 rounded-full bg-[#161228] flex items-center justify-center">
                  <span className="text-white/50 text-xs font-bold">{actualVotes.length}</span>
                </div>
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-white/10 text-xs">Aucun</span>
              </div>
            )}
            <div className="space-y-2 text-xs">
              <LegendItem color="#7ec850" label="Visionnage complet" count={engagementData.good} desc="> 10s" />
              <LegendItem color="#f59e0b" label="Visionnage rapide" count={engagementData.medium} desc="5-10s" />
              <LegendItem color="#ef4444" label="Suspects" count={engagementData.suspect} desc="< 5s" />
              <LegendItem color="#ffffff15" label="Non voté" count={engagementData.notVoted} desc="" />
            </div>
          </div>
        </div>

        {/* Watch time distribution */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-4 text-white/70">
            Distribution temps de visionnage
          </h2>
          <div className="flex items-end gap-3 h-36">
            {timeBuckets.map((b) => {
              const pct = maxBucket > 0 ? (b.count / maxBucket) * 100 : 0
              return (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-white/50 font-bold">{b.count}</span>
                  <div className="w-full relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-[#8b5cf6] to-[#e91e8c]"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30">{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {timeline.entries.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-4 text-white/70">
            Votes par jour
          </h2>
          <div className="space-y-2">
            {timeline.entries.map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16 shrink-0">{formatDate(day)}</span>
                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#e91e8c]"
                    style={{ width: `${(count / timeline.maxDay) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-white/50 font-bold w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Juror table */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Détail par juré</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
              <th className="px-5 py-2 text-left">Juré</th>
              <th className="px-3 py-2 text-center">Inscription</th>
              <th className="px-3 py-2 text-center">1er vote</th>
              <th className="px-3 py-2 text-center">Votes</th>
              <th className="px-3 py-2 text-center">Complét.</th>
              <th className="px-3 py-2 text-center">Temps moy.</th>
              <th className="px-3 py-2 text-center">Suspects</th>
              <th className="px-3 py-2 text-center">Fiabilité</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {jurorStats.map((js) => {
              const isExpanded = expandedJurorId === js.juror.id
              return (
                <JurorRow
                  key={js.juror.id}
                  js={js}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedJurorId(isExpanded ? null : js.juror.id)}
                  reliabilityColors={reliabilityColors}
                  candidateMap={candidateMap}
                  candidatesWithMedia={candidatesWithMedia}
                  totalCandidates={candidates.length}
                />
              )
            })}
          </tbody>
        </table>
        {jurorStats.length === 0 && (
          <p className="p-8 text-center text-white/30 text-sm">Aucun juré en ligne pour le moment.</p>
        )}
      </div>
    </div>
  )
}

/* ---------- sub-components ---------- */

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-xl" style={{ color }}>{value}</p>
      <p className="text-white/30 text-[10px]">{label}</p>
    </div>
  )
}

function LegendItem({ color, label, count, desc }: { color: string; label: string; count: number; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-white/60">{label}</span>
      <span className="text-white/30 font-bold">{count}</span>
      {desc && <span className="text-white/20">({desc})</span>}
    </div>
  )
}

function JurorRow({
  js,
  isExpanded,
  onToggle,
  reliabilityColors,
  candidateMap,
  candidatesWithMedia,
  totalCandidates,
}: {
  js: {
    juror: Juror
    voteCount: number
    completion: number
    avgWatch: number
    suspectCount: number
    firstVote: string | null
    reliability: number
    scores: JuryScore[]
  }
  isExpanded: boolean
  onToggle: () => void
  reliabilityColors: string[]
  candidateMap: Map<string, Candidate>
  candidatesWithMedia: Set<string>
  totalCandidates: number
}) {
  const { juror, voteCount, completion, avgWatch, suspectCount, firstVote, reliability, scores } = js

  return (
    <>
      <tr
        className="border-b border-[#2a2545]/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-white/70 font-medium text-xs">{jurorName(juror)}</span>
            {!juror.is_active && <span className="text-[10px] text-white/20">(inactif)</span>}
          </div>
        </td>
        <td className="px-3 py-2.5 text-center text-white/40 text-[11px]">
          {formatDate(juror.created_at)}
        </td>
        <td className="px-3 py-2.5 text-center text-white/40 text-[11px]">
          {firstVote ? formatDate(firstVote) : '—'}
        </td>
        <td className="px-3 py-2.5 text-center text-white/50 text-xs">
          {voteCount}/{totalCandidates}
        </td>
        <td className="px-3 py-2.5 text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7ec850]"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40">{completion}%</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-center text-white/50 text-xs">
          {voteCount > 0 ? formatSeconds(avgWatch) : '—'}
        </td>
        <td className="px-3 py-2.5 text-center">
          {suspectCount > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]">
              {suspectCount}
            </span>
          ) : (
            <span className="text-white/20 text-xs">0</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: reliabilityColors[reliability] }}
            title={['Peu fiable', 'Attention', 'Fiable'][reliability]}
          />
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className={`text-white/30 text-xs transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-[#0d0b1a]/50 px-5 py-3 border-b border-[#2a2545]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/20 text-[9px] uppercase tracking-wider">
                    <th className="py-1 text-left">Candidat</th>
                    <th className="py-1 text-center">Décision</th>
                    <th className="py-1 text-center">Temps</th>
                    <th className="py-1 text-center">Voté le</th>
                    <th className="py-1 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {scores
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((s) => {
                      const c = candidateMap.get(s.candidate_id)
                      const decision = (s.scores as Record<string, string> | null)?.decision
                      const hasMedia = candidatesWithMedia.has(s.candidate_id)
                      const isSuspect = hasMedia && (s.watch_seconds || 0) < SUSPECT_THRESHOLD
                      const decisionConfig: Record<string, { emoji: string; color: string }> = {
                        oui: { emoji: '👍', color: '#7ec850' },
                        'peut-etre': { emoji: '🤔', color: '#f59e0b' },
                        non: { emoji: '👎', color: '#ef4444' },
                      }
                      const dc = decision ? decisionConfig[decision] : null

                      return (
                        <tr key={s.id} className="border-t border-[#2a2545]/30">
                          <td className="py-1.5 text-white/50">
                            {c ? candidateName(c) : s.candidate_id.slice(0, 8)}
                            <span className="text-white/20 ml-1.5">{c?.category}</span>
                          </td>
                          <td className="py-1.5 text-center">
                            {dc ? (
                              <span style={{ color: dc.color }}>{dc.emoji}</span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                          <td className="py-1.5 text-center text-white/40">
                            {hasMedia ? formatSeconds(s.watch_seconds || 0) : (
                              <span className="text-white/15">n/a</span>
                            )}
                          </td>
                          <td className="py-1.5 text-center text-white/30">
                            {formatDateTime(s.created_at)}
                          </td>
                          <td className="py-1.5 text-center">
                            {isSuspect && <span title="Vote suspect">⚠️</span>}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {scores.length === 0 && (
                <p className="text-center text-white/20 text-xs py-2">Aucun vote</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
