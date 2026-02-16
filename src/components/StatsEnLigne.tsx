'use client'

import { useMemo, Fragment } from 'react'

/* ---------- types ---------- */

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
  likes_count: number
  shares_count: number
  status: string
}

interface JuryScore {
  id: string
  candidate_id: string
  juror_id: string
  total_score: number
  scores: Record<string, string | number> | null
  comment: string | null
  created_at: string
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
}

interface Vote {
  id: string
  candidate_id: string
  created_at: string
}

interface Share {
  id: string
  candidate_id: string
  platform: string
  created_at: string
}

interface Props {
  session: { id: string; name: string }
  candidates: Candidate[]
  juryScores: JuryScore[]
  jurors: Juror[]
  votes: Vote[]
  shares: Share[]
  categories: string[]
  juryWeightPercent: number
  publicWeightPercent: number
}

/* ---------- helpers ---------- */

type Decision = 'oui' | 'peut-etre' | 'non'

const DC: Record<Decision, { label: string; color: string }> = {
  oui: { label: 'Oui', color: '#7ec850' },
  'peut-etre': { label: 'Peut-être', color: '#f59e0b' },
  non: { label: 'Non', color: '#ef4444' },
}

function displayName(c: { first_name: string; last_name: string; stage_name: string | null }) {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

function getDecision(s: JuryScore): Decision | null {
  const d = (s.scores as Record<string, string> | null)?.decision
  if (d === 'oui' || d === 'peut-etre' || d === 'non') return d
  return null
}

/* ---------- component ---------- */

export default function StatsEnLigne({
  session, candidates, juryScores, jurors, votes, shares, categories, juryWeightPercent, publicWeightPercent,
}: Props) {
  const jw = juryWeightPercent
  const pw = publicWeightPercent

  /* ---- global stats ---- */
  const totalCandidates = candidates.length
  const totalJuryVotes = juryScores.length
  const activeJurors = jurors.filter((j) => j.is_active).length
  const totalLikes = votes.length
  const totalShares = shares.length
  const totalSemifinalists = candidates.filter((c) => c.status === 'semifinalist').length

  /* ---- shares by platform ---- */
  const sharesByPlatform = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of shares) {
      map[s.platform] = (map[s.platform] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [shares])

  const platformMeta: Record<string, { label: string; color: string }> = {
    whatsapp: { label: 'WhatsApp', color: '#25D366' },
    facebook: { label: 'Facebook', color: '#1877F2' },
    x: { label: 'X', color: '#a3a3a3' },
    copy: { label: 'Lien copié', color: '#8b5cf6' },
    native: { label: 'Natif', color: '#e91e8c' },
  }

  /* ---- category data ---- */
  const categoryData = useMemo(() => {
    return categories.map((cat) => {
      const catCandidates = candidates.filter((c) => c.category === cat)

      const rankings = catCandidates.map((c) => {
        const scores = juryScores.filter((s) => s.candidate_id === c.id)
        let oui = 0, peutEtre = 0, non = 0
        for (const s of scores) {
          const d = getDecision(s)
          if (d === 'oui') oui++
          else if (d === 'peut-etre') peutEtre++
          else if (d === 'non') non++
        }
        const total = scores.length
        const ouiPercent = total > 0 ? oui / total : 0

        return { candidate: c, oui, peutEtre, non, total, ouiPercent, scores }
      }).sort((a, b) => b.ouiPercent - a.ouiPercent || (b.candidate.likes_count - a.candidate.likes_count))

      // Aggregate votes for category
      const allDecisions: Decision[] = []
      for (const r of rankings) {
        for (const s of r.scores) {
          const d = getDecision(s)
          if (d) allDecisions.push(d)
        }
      }

      const ouiTotal = allDecisions.filter((d) => d === 'oui').length
      const peTotal = allDecisions.filter((d) => d === 'peut-etre').length
      const nonTotal = allDecisions.filter((d) => d === 'non').length
      const votesTotal = allDecisions.length

      const catLikes = catCandidates.reduce((a, c) => a + (c.likes_count || 0), 0)
      const avgLikes = catCandidates.length > 0 ? Math.round(catLikes / catCandidates.length) : 0
      const topLiked = catCandidates.length > 0
        ? [...catCandidates].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0]
        : null

      const catShares = catCandidates.reduce((a, c) => a + (c.shares_count || 0), 0)
      const topShared = catCandidates.length > 0
        ? [...catCandidates].sort((a, b) => (b.shares_count || 0) - (a.shares_count || 0))[0]
        : null

      return { category: cat, rankings, ouiTotal, peTotal, nonTotal, votesTotal, catLikes, avgLikes, topLiked, catShares, topShared }
    })
  }, [categories, candidates, juryScores])

  /* ---- juror activity ---- */
  const jurorActivity = useMemo(() => {
    return jurors.map((j) => {
      const scores = juryScores.filter((s) => s.juror_id === j.id)
      let oui = 0, peutEtre = 0, non = 0
      for (const s of scores) {
        const d = getDecision(s)
        if (d === 'oui') oui++
        else if (d === 'peut-etre') peutEtre++
        else if (d === 'non') non++
      }
      const total = scores.length
      return {
        name: `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Juré',
        isActive: j.is_active,
        total,
        oui,
        peutEtre,
        non,
        ouiPercent: total > 0 ? oui / total : 0,
      }
    }).sort((a, b) => b.total - a.total)
  }, [jurors, juryScores])

  /* ---- consensus analysis ---- */
  const consensusData = useMemo(() => {
    return candidates.map((c) => {
      const scores = juryScores.filter((s) => s.candidate_id === c.id)
      if (scores.length < 2) return null
      const decisions = scores.map(getDecision).filter(Boolean) as Decision[]
      if (decisions.length < 2) return null

      const counts = { oui: 0, 'peut-etre': 0, non: 0 }
      for (const d of decisions) counts[d]++
      const maxCount = Math.max(counts.oui, counts['peut-etre'], counts.non)
      const unanimity = maxCount / decisions.length

      return { candidate: c, unanimity, decisions: counts, total: decisions.length }
    }).filter(Boolean).sort((a, b) => a!.unanimity - b!.unanimity) as {
      candidate: Candidate; unanimity: number; decisions: Record<Decision, number>; total: number
    }[]
  }, [candidates, juryScores])

  const mostControversial = consensusData.slice(0, 5)
  const mostUnanimous = [...consensusData].sort((a, b) => b.unanimity - a.unanimity).slice(0, 5)

  /* ---- timeline ---- */
  const timeline = useMemo(() => {
    const dayMap: Record<string, { jury: number; likes: number; shares: number }> = {}
    for (const s of juryScores) {
      const day = s.created_at?.slice(0, 10) || 'inconnu'
      if (!dayMap[day]) dayMap[day] = { jury: 0, likes: 0, shares: 0 }
      dayMap[day].jury++
    }
    for (const v of votes) {
      const day = v.created_at?.slice(0, 10) || 'inconnu'
      if (!dayMap[day]) dayMap[day] = { jury: 0, likes: 0, shares: 0 }
      dayMap[day].likes++
    }
    for (const s of shares) {
      const day = s.created_at?.slice(0, 10) || 'inconnu'
      if (!dayMap[day]) dayMap[day] = { jury: 0, likes: 0, shares: 0 }
      dayMap[day].shares++
    }
    return Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]))
  }, [juryScores, votes, shares])

  const maxDayTotal = Math.max(1, ...timeline.map(([, v]) => v.jury + v.likes + v.shares))

  /* ---- jury vs public comparison ---- */
  const comparison = useMemo(() => {
    const juryRanked = [...candidates].sort((a, b) => {
      const scoresA = juryScores.filter((s) => s.candidate_id === a.id)
      const scoresB = juryScores.filter((s) => s.candidate_id === b.id)
      const ouiA = scoresA.filter((s) => getDecision(s) === 'oui').length
      const ouiB = scoresB.filter((s) => getDecision(s) === 'oui').length
      const pctA = scoresA.length > 0 ? ouiA / scoresA.length : 0
      const pctB = scoresB.length > 0 ? ouiB / scoresB.length : 0
      return pctB - pctA
    }).slice(0, 5)

    const publicRanked = [...candidates].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 5)

    // Find surprises: high likes but low jury, or vice versa
    const juryScoreMap: Record<string, number> = {}
    for (const c of candidates) {
      const scores = juryScores.filter((s) => s.candidate_id === c.id)
      const oui = scores.filter((s) => getDecision(s) === 'oui').length
      juryScoreMap[c.id] = scores.length > 0 ? oui / scores.length : 0
    }

    const maxLikes = Math.max(1, ...candidates.map((c) => c.likes_count || 0))
    const surprises = candidates.filter((c) => {
      const juryPct = juryScoreMap[c.id] || 0
      const likesPct = (c.likes_count || 0) / maxLikes
      return Math.abs(juryPct - likesPct) > 0.3
    }).slice(0, 5)

    return { juryRanked, publicRanked, surprises, juryScoreMap, maxLikes }
  }, [candidates, juryScores])

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
          Stats Phase En Ligne
        </h1>
        <p className="text-white/40 text-sm">{session.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard icon="🎤" label="Candidats" value={totalCandidates} color="#e91e8c" />
        <StatCard icon="🗳️" label="Votes jury" value={totalJuryVotes} color="#7ec850" />
        <StatCard icon="👨‍⚖️" label="Jurés actifs" value={activeJurors} color="#3b82f6" />
        <StatCard icon="❤️" label="Likes" value={totalLikes} color="#f5a623" />
        <StatCard icon="🔗" label="Partages" value={totalShares} color="#8b5cf6" />
        <StatCard icon="⭐" label="Demi-finalistes" value={totalSemifinalists} color="#f59e0b" />
      </div>

      {/* Weight bar */}
      <div className="flex rounded-lg overflow-hidden h-5 text-[10px] font-bold">
        <div className="flex items-center justify-center" style={{ width: `${jw}%`, backgroundColor: '#e91e8c' }}>
          Jury {jw}%
        </div>
        <div className="flex items-center justify-center" style={{ width: `${pw}%`, backgroundColor: '#7ec850' }}>
          Public {pw}%
        </div>
      </div>

      {/* ===== Per-category pie charts + top 3 ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Verdicts jury par catégorie</h2>
        </div>
        <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, 1fr)` }}>
          {categoryData.map(({ category, rankings, ouiTotal, peTotal, nonTotal, votesTotal, catLikes, avgLikes, topLiked, catShares, topShared }) => {
            const ouiPct = votesTotal > 0 ? (ouiTotal / votesTotal) * 100 : 0
            const pePct = votesTotal > 0 ? (peTotal / votesTotal) * 100 : 0

            return (
              <div key={category} className="p-4 rounded-xl bg-white/[0.02] border border-[#2a2545]/50 space-y-4">
                <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-center">{category}</h3>

                {/* Pie chart */}
                <div className="flex flex-col items-center gap-3">
                  {votesTotal > 0 ? (
                    <div
                      className="w-24 h-24 rounded-full relative"
                      style={{
                        background: `conic-gradient(#7ec850 0% ${ouiPct}%, #f59e0b ${ouiPct}% ${ouiPct + pePct}%, #ef4444 ${ouiPct + pePct}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-3 rounded-full bg-[#161228] flex items-center justify-center">
                        <span className="text-white/50 text-xs font-bold">{votesTotal}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-white/10 text-xs">Aucun</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#7ec850]" /><span className="text-white/50">{ouiTotal} oui</span></span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /><span className="text-white/50">{peTotal} ~</span></span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /><span className="text-white/50">{nonTotal} non</span></span>
                  </div>
                </div>

                {/* Top 3 */}
                <div className="space-y-1.5 pt-3 border-t border-[#2a2545]/50">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Top 3 jury</p>
                  {rankings.slice(0, 3).map((r, idx) => (
                    <div key={r.candidate.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 text-right font-bold ${idx === 0 ? 'text-[#f5a623]' : 'text-white/20'}`}>{idx + 1}</span>
                      <span className="text-white/60 truncate flex-1">{displayName(r.candidate)}</span>
                      <span className="text-[#7ec850] font-bold text-[10px]">{Math.round(r.ouiPercent * 100)}%</span>
                    </div>
                  ))}
                </div>

                {/* Likes */}
                <div className="space-y-1.5 pt-3 border-t border-[#2a2545]/50">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Likes</span>
                    <span className="text-[#e91e8c] font-bold">❤️ {catLikes}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Moyenne</span>
                    <span className="text-white/50 font-bold">{avgLikes}</span>
                  </div>
                  {topLiked && (topLiked.likes_count || 0) > 0 && (
                    <div className="flex items-center justify-between text-[10px] gap-1">
                      <span className="text-white/30 shrink-0">Top</span>
                      <span className="text-[#e91e8c]/70 font-medium truncate text-right">
                        {displayName(topLiked)} ({topLiked.likes_count})
                      </span>
                    </div>
                  )}
                </div>

                {/* Shares */}
                <div className="space-y-1.5 pt-3 border-t border-[#2a2545]/50">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Partages</span>
                    <span className="text-[#8b5cf6] font-bold">🔗 {catShares}</span>
                  </div>
                  {topShared && (topShared.shares_count || 0) > 0 && (
                    <div className="flex items-center justify-between text-[10px] gap-1">
                      <span className="text-white/30 shrink-0">Top</span>
                      <span className="text-[#8b5cf6]/70 font-medium truncate text-right">
                        {displayName(topShared)} ({topShared.shares_count})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== Juror activity ===== */}
      {jurorActivity.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Activité des jurés</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                <th className="px-5 py-2 text-left">Juré</th>
                <th className="px-3 py-2 text-center">Votes</th>
                <th className="px-3 py-2 text-left w-40">Répartition</th>
                <th className="px-3 py-2 text-center" style={{ color: DC.oui.color }}>Oui</th>
                <th className="px-3 py-2 text-center" style={{ color: DC['peut-etre'].color }}>~</th>
                <th className="px-3 py-2 text-center" style={{ color: DC.non.color }}>Non</th>
                <th className="px-3 py-2 text-left">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {jurorActivity.map((j) => {
                const globalOuiPct = jurorActivity.length > 0
                  ? jurorActivity.reduce((a, x) => a + x.ouiPercent, 0) / jurorActivity.length
                  : 0
                const diff = j.ouiPercent - globalOuiPct
                return (
                  <tr key={j.name} className="border-b border-[#2a2545]/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 font-medium text-xs">{j.name}</span>
                        {!j.isActive && <span className="text-[10px] text-white/20">(inactif)</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-white/50 text-xs">{j.total}</td>
                    <td className="px-3 py-2.5">
                      {j.total > 0 && (
                        <div className="flex rounded-full overflow-hidden h-2.5">
                          {j.oui > 0 && <div style={{ width: `${(j.oui / j.total) * 100}%`, backgroundColor: DC.oui.color }} />}
                          {j.peutEtre > 0 && <div style={{ width: `${(j.peutEtre / j.total) * 100}%`, backgroundColor: DC['peut-etre'].color }} />}
                          {j.non > 0 && <div style={{ width: `${(j.non / j.total) * 100}%`, backgroundColor: DC.non.color }} />}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: DC.oui.color }}>{j.oui}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: DC['peut-etre'].color }}>{j.peutEtre}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: DC.non.color }}>{j.non}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {j.total === 0 ? (
                        <span className="text-white/20">—</span>
                      ) : Math.abs(diff) < 0.1 ? (
                        <span className="text-white/20">Neutre</span>
                      ) : diff > 0 ? (
                        <span className="text-[#7ec850]">Généreux (+{Math.round(diff * 100)}%)</span>
                      ) : (
                        <span className="text-[#e91e8c]">Sévère ({Math.round(diff * 100)}%)</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Consensus ===== */}
      {consensusData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Most controversial */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2a2545]">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">Les plus controversés</h2>
              <p className="text-white/20 text-[10px]">Jurés les moins d&apos;accord</p>
            </div>
            <div className="p-3 space-y-2">
              {mostControversial.map((c) => (
                <div key={c.candidate.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                    {c.candidate.photo_url ? (
                      <img src={c.candidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs font-medium truncate">{displayName(c.candidate)}</p>
                    <div className="flex rounded-full overflow-hidden h-1.5 mt-1">
                      <div style={{ width: `${(c.decisions.oui / c.total) * 100}%`, backgroundColor: DC.oui.color }} />
                      <div style={{ width: `${(c.decisions['peut-etre'] / c.total) * 100}%`, backgroundColor: DC['peut-etre'].color }} />
                      <div style={{ width: `${(c.decisions.non / c.total) * 100}%`, backgroundColor: DC.non.color }} />
                    </div>
                  </div>
                  <span className="text-white/30 text-[10px] font-mono shrink-0">{Math.round(c.unanimity * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most unanimous */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2a2545]">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">Les plus unanimes</h2>
              <p className="text-white/20 text-[10px]">Jurés les plus d&apos;accord</p>
            </div>
            <div className="p-3 space-y-2">
              {mostUnanimous.map((c) => (
                <div key={c.candidate.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                    {c.candidate.photo_url ? (
                      <img src={c.candidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs font-medium truncate">{displayName(c.candidate)}</p>
                    <div className="flex rounded-full overflow-hidden h-1.5 mt-1">
                      <div style={{ width: `${(c.decisions.oui / c.total) * 100}%`, backgroundColor: DC.oui.color }} />
                      <div style={{ width: `${(c.decisions['peut-etre'] / c.total) * 100}%`, backgroundColor: DC['peut-etre'].color }} />
                      <div style={{ width: `${(c.decisions.non / c.total) * 100}%`, backgroundColor: DC.non.color }} />
                    </div>
                  </div>
                  <span className="text-[#7ec850] text-[10px] font-mono font-bold shrink-0">{Math.round(c.unanimity * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Timeline ===== */}
      {timeline.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545] flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Timeline d&apos;activité</h2>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#e91e8c]" /><span className="text-white/40">Jury</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" /><span className="text-white/40">Likes</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /><span className="text-white/40">Partages</span></span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {timeline.map(([day, counts]) => {
              const total = counts.jury + counts.likes + counts.shares
              const label = day !== 'inconnu'
                ? new Date(day + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : day
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-white/30 text-[10px] w-16 shrink-0 text-right">{label}</span>
                  <div className="flex-1 h-4 bg-[#2a2545]/50 rounded-full overflow-hidden flex">
                    {counts.jury > 0 && (
                      <div className="h-full bg-[#e91e8c]" style={{ width: `${(counts.jury / maxDayTotal) * 100}%` }} />
                    )}
                    {counts.likes > 0 && (
                      <div className="h-full bg-[#f5a623]" style={{ width: `${(counts.likes / maxDayTotal) * 100}%` }} />
                    )}
                    {counts.shares > 0 && (
                      <div className="h-full bg-[#8b5cf6]" style={{ width: `${(counts.shares / maxDayTotal) * 100}%` }} />
                    )}
                  </div>
                  <span className="text-white/50 text-[10px] font-mono w-8 shrink-0">{total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== Jury vs Public vs Partages ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Jury vs Public vs Partages</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Top 5 Jury */}
          <div className="space-y-2">
            <p className="text-[#e91e8c] text-[10px] uppercase tracking-wider font-bold">Top 5 — Jury</p>
            {comparison.juryRanked.map((c, idx) => {
              const ouiPct = comparison.juryScoreMap[c.id] || 0
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <span className={`w-4 text-right text-[10px] font-bold ${idx === 0 ? 'text-[#f5a623]' : 'text-white/20'}`}>{idx + 1}</span>
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                    {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">🎤</div>}
                  </div>
                  <span className="text-white/60 text-xs truncate flex-1">{displayName(c)}</span>
                  <span className="text-[#7ec850] text-[10px] font-bold shrink-0">{Math.round(ouiPct * 100)}%</span>
                </div>
              )
            })}
          </div>

          {/* Top 5 Public */}
          <div className="space-y-2">
            <p className="text-[#f5a623] text-[10px] uppercase tracking-wider font-bold">Top 5 — Likes</p>
            {comparison.publicRanked.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className={`w-4 text-right text-[10px] font-bold ${idx === 0 ? 'text-[#f5a623]' : 'text-white/20'}`}>{idx + 1}</span>
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                  {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">🎤</div>}
                </div>
                <span className="text-white/60 text-xs truncate flex-1">{displayName(c)}</span>
                <span className="text-[#e91e8c] text-[10px] font-bold shrink-0">❤️ {c.likes_count || 0}</span>
              </div>
            ))}
          </div>

          {/* Top 5 Partagés */}
          <div className="space-y-2">
            <p className="text-[#8b5cf6] text-[10px] uppercase tracking-wider font-bold">Top 5 — Partages</p>
            {[...candidates].sort((a, b) => (b.shares_count || 0) - (a.shares_count || 0)).slice(0, 5).map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className={`w-4 text-right text-[10px] font-bold ${idx === 0 ? 'text-[#f5a623]' : 'text-white/20'}`}>{idx + 1}</span>
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                  {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">🎤</div>}
                </div>
                <span className="text-white/60 text-xs truncate flex-1">{displayName(c)}</span>
                <span className="text-[#8b5cf6] text-[10px] font-bold shrink-0">🔗 {c.shares_count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Surprises */}
        {comparison.surprises.length > 0 && (
          <div className="px-5 py-3 border-t border-[#2a2545]">
            <p className="text-[#f5a623] text-[10px] uppercase tracking-wider font-bold mb-2">Divergences jury/public</p>
            <div className="flex flex-wrap gap-2">
              {comparison.surprises.map((c) => {
                const juryPct = comparison.juryScoreMap[c.id] || 0
                const likesPct = (c.likes_count || 0) / comparison.maxLikes
                const isPublicFav = likesPct > juryPct
                return (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-[10px]">
                    <span className="text-white/60">{displayName(c)}</span>
                    <span className={isPublicFav ? 'text-[#7ec850]' : 'text-[#e91e8c]'}>
                      {isPublicFav ? 'Public > Jury' : 'Jury > Public'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== Partages par plateforme ===== */}
      {totalShares > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Partages par plateforme</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 p-5">
            {/* Donut */}
            <div className="flex flex-col items-center gap-4">
              {(() => {
                let offset = 0
                const segments = sharesByPlatform.map(([p, count]) => {
                  const pct = (count / totalShares) * 100
                  const start = offset
                  offset += pct
                  const color = platformMeta[p]?.color || '#6b7280'
                  return `${color} ${start}% ${offset}%`
                })
                return (
                  <div
                    className="w-32 h-32 rounded-full relative"
                    style={{ background: `conic-gradient(${segments.join(', ')})` }}
                  >
                    <div className="absolute inset-5 rounded-full bg-[#161228] flex items-center justify-center">
                      <span className="text-white/60 text-sm font-bold">{totalShares}</span>
                    </div>
                  </div>
                )
              })()}
              <div className="flex flex-wrap justify-center gap-3">
                {sharesByPlatform.map(([p]) => (
                  <span key={p} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: platformMeta[p]?.color || '#6b7280' }} />
                    <span className="text-white/50">{platformMeta[p]?.label || p}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Barres */}
            <div className="space-y-3 flex flex-col justify-center">
              {sharesByPlatform.map(([p, count]) => {
                const pct = (count / sharesByPlatform[0][1]) * 100
                const meta = platformMeta[p] || { label: p, color: '#6b7280' }
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{meta.label}</span>
                      <span className="text-white/40 font-mono text-[10px]">{count} ({Math.round((count / totalShares) * 100)}%)</span>
                    </div>
                    <div className="h-3 bg-[#2a2545]/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- sub-components ---------- */

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-xl" style={{ color }}>{value}</p>
      <p className="text-white/30 text-[10px]">{label}</p>
    </div>
  )
}
