'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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
}

interface LineupItem {
  id: string
  candidate_id: string
  position: number
  status: string
  started_at: string | null
  ended_at: string | null
  candidates: Candidate
}

interface JuryScore {
  id: string
  juror_id: string
  candidate_id: string
  scores: Record<string, number | string>
  total_score: number
  comment: string | null
}

interface LiveVote {
  id: string
  candidate_id: string
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
}

interface Winner {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
}

interface Config {
  jury_weight_percent?: number
  public_weight_percent?: number
  social_weight_percent?: number
  jury_criteria?: { name: string; max_score: number }[]
  age_categories?: { name: string }[]
}

interface Props {
  session: { id: string; name: string; slug: string }
  event: { id: string; event_type: string; status: string; created_at: string }
  lineup: LineupItem[]
  juryScores: JuryScore[]
  liveVotes: LiveVote[]
  jurors: Juror[]
  winners: Winner[]
  config: Config
}

/* ---------- colors ---------- */

const C = { jury: '#e91e8c', public: '#7ec850', social: '#3b82f6', gold: '#f5a623', forced: '#ef4444' }

function displayName(c: { first_name: string; last_name: string; stage_name: string | null }) {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

/* ---------- component ---------- */

export default function FinaleStats({ session, event, lineup, juryScores, liveVotes, jurors, winners, config }: Props) {
  /* ---- weights ---- */
  const jw = config.jury_weight_percent ?? 40
  const pw = config.public_weight_percent ?? 40
  const sw = config.social_weight_percent ?? 20
  const wSum = jw + pw + sw
  const juryWeight = wSum > 0 ? jw / wSum : 0.4
  const publicWeight = wSum > 0 ? pw / wSum : 0.4
  const socialWeight = wSum > 0 ? sw / wSum : 0.2
  const maxCriteriaScore = (config.jury_criteria || []).length * 5

  /* ---- vote counts ---- */
  const voteCounts = useMemo(() => {
    const map: Record<string, number> = {}
    liveVotes.forEach((v) => { map[v.candidate_id] = (map[v.candidate_id] || 0) + 1 })
    return map
  }, [liveVotes])

  /* ---- categories ---- */
  const categories = useMemo(() => {
    const catOrder = (config.age_categories || []).map((c) => c.name)
    const found = [...new Set(lineup.map((l) => l.candidates.category))]
    return found.sort((a, b) => {
      const ia = catOrder.indexOf(a)
      const ib = catOrder.indexOf(b)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  }, [lineup, config.age_categories])

  /* ---- rankings per category ---- */
  const categoryData = useMemo(() => {
    return categories.map((cat) => {
      const catLineup = lineup.filter((l) => l.candidates.category === cat)
      const candidates = catLineup.map((l) => ({ ...l.candidates, lineupStatus: l.status, position: l.position, started_at: l.started_at, ended_at: l.ended_at }))
      const maxVotes = Math.max(1, ...candidates.map((c) => voteCounts[c.id] || 0))
      const maxLikes = Math.max(1, ...candidates.map((c) => c.likes_count || 0))

      const rankings = candidates.map((c) => {
        const scores = juryScores.filter((s) => s.candidate_id === c.id)
        const juryTotal = scores.reduce((a, s) => a + s.total_score, 0)
        const juryAvg = scores.length > 0 ? juryTotal / scores.length : 0
        const juryNormalized = maxCriteriaScore > 0 ? (juryAvg / maxCriteriaScore) * 100 : 0
        const publicVotes = voteCounts[c.id] || 0
        const publicNormalized = (publicVotes / maxVotes) * 100
        const socialVotes = c.likes_count || 0
        const socialNormalized = (socialVotes / maxLikes) * 100
        const totalScore = juryNormalized * juryWeight + publicNormalized * publicWeight + socialNormalized * socialWeight

        // Duration in seconds (null if no timestamps)
        const durationSec = c.started_at && c.ended_at
          ? Math.round((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 1000)
          : null

        return {
          candidateId: c.id,
          name: displayName(c),
          photoUrl: c.photo_url,
          songTitle: c.song_title,
          songArtist: c.song_artist,
          category: c.category,
          lineupStatus: c.lineupStatus,
          juryAvg,
          juryNormalized,
          juryCount: scores.length,
          publicVotes,
          publicNormalized,
          socialVotes,
          socialNormalized,
          totalScore,
          juryContribution: juryNormalized * juryWeight,
          publicContribution: publicNormalized * publicWeight,
          socialContribution: socialNormalized * socialWeight,
          durationSec,
        }
      }).sort((a, b) => b.totalScore - a.totalScore)

      const winner = winners.find((w) => w.category === cat)
      const isForced = winner && rankings.length > 0 && rankings[0].candidateId !== winner.id
      const totalVotes = catLineup.reduce((a, l) => a + (voteCounts[l.candidate_id] || 0), 0)
      const totalDurationSec = rankings.reduce((a, r) => a + (r.durationSec || 0), 0)

      return { category: cat, rankings, winner, isForced, totalVotes, totalDurationSec }
    })
  }, [categories, lineup, juryScores, voteCounts, winners, juryWeight, publicWeight, socialWeight, maxCriteriaScore])

  /* ---- juror activity ---- */
  const jurorActivity = useMemo(() => {
    return jurors.map((j) => {
      const scores = juryScores.filter((s) => s.juror_id === j.id)
      const avg = scores.length > 0 ? scores.reduce((a, s) => a + s.total_score, 0) / scores.length : 0
      return {
        name: `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Juré',
        count: scores.length,
        avg,
      }
    }).sort((a, b) => b.count - a.count)
  }, [jurors, juryScores])

  /* ---- global insights ---- */
  const allRankings = useMemo(() => categoryData.flatMap((c) => c.rankings.map((r) => ({ ...r, cat: c.category }))), [categoryData])

  const eventDate = new Date(event.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl text-gradient-gold">
            Récap Finale
          </h1>
          <p className="text-white/40 text-sm">{session.name} — {eventDate}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10">
          {event.status === 'live' ? (
            <><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> En direct</>
          ) : event.status === 'completed' ? (
            <><span className="w-2 h-2 bg-[#7ec850] rounded-full" /> Terminée</>
          ) : (
            <><span className="w-2 h-2 bg-yellow-500 rounded-full" /> En pause</>
          )}
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon="🎤" label="Finalistes" value={lineup.length} color={C.jury} />
        <StatCard icon="📁" label="Catégories" value={categories.length} color="#8b5cf6" />
        <StatCard icon="❤️" label="Votes" value={liveVotes.length} color={C.public} />
        <StatCard icon="⭐" label="Notes" value={juryScores.length} color={C.social} />
        <StatCard icon="👨‍⚖️" label="Jurés" value={jurors.length} color={C.gold} />
      </div>

      {/* Weight bar */}
      <div className="flex rounded-lg overflow-hidden h-5 text-[10px] font-bold">
        <div className="flex items-center justify-center" style={{ width: `${jw}%`, backgroundColor: C.jury }}>
          Jury {Math.round(juryWeight * 100)}%
        </div>
        <div className="flex items-center justify-center" style={{ width: `${pw}%`, backgroundColor: C.public }}>
          Public {Math.round(publicWeight * 100)}%
        </div>
        <div className="flex items-center justify-center" style={{ width: `${sw}%`, backgroundColor: C.social }}>
          Réseaux {Math.round(socialWeight * 100)}%
        </div>
      </div>

      {/* ===== Per-category tables ===== */}
      {categoryData.map(({ category, rankings, winner, isForced, totalVotes, totalDurationSec }) => {
        const winnerRanking = winner ? rankings.find((r) => r.candidateId === winner.id) : null

        return (
          <div key={category} className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2545]">
              <div className="flex items-center gap-3">
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">{category}</h2>
                {winner && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isForced
                      ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                      : 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/25'
                  }`}>
                    {isForced ? '⚠ Forcé' : '🏆 Validé'}
                  </span>
                )}
              </div>
              <span className="text-white/30 text-xs">
                {rankings.length} candidats · {totalVotes} votes
                {totalDurationSec > 0 && <> · {Math.floor(totalDurationSec / 60)}:{(totalDurationSec % 60).toString().padStart(2, '0')}</>}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                    <th className="px-4 py-2 text-left w-8">#</th>
                    <th className="px-2 py-2 text-left">Candidat</th>
                    <th className="px-3 py-2 text-center" style={{ color: C.jury }}>Jury</th>
                    <th className="px-3 py-2 text-center" style={{ color: C.public }}>Public</th>
                    <th className="px-3 py-2 text-center" style={{ color: C.social }}>Réseaux</th>
                    <th className="px-3 py-2 text-center text-white/50">Total</th>
                    <th className="px-3 py-2 text-center text-white/30">Durée</th>
                    <th className="px-3 py-2 text-center w-16">Score</th>
                    <th className="px-3 py-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, idx) => {
                    const isWinner = winner && r.candidateId === winner.id
                    const isForcedWinner = isWinner && isForced

                    return (
                      <tr
                        key={r.candidateId}
                        className={`border-b border-[#2a2545]/50 transition-colors ${
                          isForcedWinner
                            ? 'bg-red-500/[0.07]'
                            : isWinner
                              ? 'bg-[#f5a623]/[0.07]'
                              : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-[#f5a623]/20 text-[#f5a623]' :
                            idx === 1 ? 'bg-white/10 text-white/60' :
                            idx === 2 ? 'bg-orange-900/20 text-orange-400/60' :
                            'text-white/20'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* Photo + Name + Song */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 ${
                              isForcedWinner ? 'border-red-500' : isWinner ? 'border-[#f5a623]' : 'border-transparent'
                            }`}>
                              {r.photoUrl ? (
                                <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#1a1533] flex items-center justify-center text-white/10 text-sm">🎤</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${
                                isForcedWinner ? 'text-red-400' : isWinner ? 'text-[#f5a623]' : 'text-white/80'
                              }`}>
                                {r.name}
                              </p>
                              <p className="text-white/20 text-[10px] truncate">{r.songTitle} — {r.songArtist}</p>
                            </div>
                          </div>
                        </td>

                        {/* Jury */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs" style={{ color: C.jury }}>{r.juryNormalized.toFixed(0)}</span>
                          <span className="text-white/15 text-[10px] ml-1">({r.juryCount})</span>
                        </td>

                        {/* Public votes */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs" style={{ color: C.public }}>{r.publicVotes}</span>
                          <span className="text-white/15 text-[10px] ml-1">({r.publicNormalized.toFixed(0)})</span>
                        </td>

                        {/* Social */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs" style={{ color: C.social }}>{r.socialVotes}</span>
                          <span className="text-white/15 text-[10px] ml-1">({r.socialNormalized.toFixed(0)})</span>
                        </td>

                        {/* Total score */}
                        <td className="px-3 py-3 text-center">
                          <span className={`font-mono font-bold text-sm ${
                            isForcedWinner ? 'text-red-400' : isWinner ? 'text-[#f5a623]' : 'text-white/60'
                          }`}>
                            {r.totalScore.toFixed(1)}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-3 text-center">
                          {r.durationSec != null ? (
                            <span className="font-mono text-xs text-white/40">
                              {Math.floor(r.durationSec / 60)}:{(r.durationSec % 60).toString().padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="text-white/10 text-xs">—</span>
                          )}
                        </td>

                        {/* Mini score bar */}
                        <td className="px-3 py-3">
                          <div className="flex rounded-full overflow-hidden h-2.5 w-14">
                            <div style={{ width: `${r.juryContribution}%`, backgroundColor: C.jury }} />
                            <div style={{ width: `${r.publicContribution}%`, backgroundColor: C.public }} />
                            <div style={{ width: `${r.socialContribution}%`, backgroundColor: C.social }} />
                          </div>
                        </td>

                        {/* Winner badge */}
                        <td className="px-3 py-3 text-center">
                          {isForcedWinner && <span className="text-red-400 text-xs font-bold">⚠</span>}
                          {isWinner && !isForced && <span className="text-[#f5a623]">🏆</span>}
                          {r.lineupStatus === 'absent' && <span className="text-white/20 text-[10px]">ABS</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Winner pie chart (compact, inline) */}
            {winnerRanking && (
              <div className="flex items-center gap-4 px-5 py-3 border-t border-[#2a2545] bg-white/[0.01]">
                <div className="w-16 h-16 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: parseFloat(winnerRanking.juryContribution.toFixed(1)) },
                          { value: parseFloat(winnerRanking.publicContribution.toFixed(1)) },
                          { value: parseFloat(winnerRanking.socialContribution.toFixed(1)) },
                        ]}
                        cx="50%" cy="50%" innerRadius={16} outerRadius={28}
                        paddingAngle={2} dataKey="value" stroke="none"
                      >
                        <Cell fill={C.jury} />
                        <Cell fill={C.public} />
                        <Cell fill={C.social} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-white/40">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: C.jury }} />Jury {winnerRanking.juryContribution.toFixed(1)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: C.public }} />Public {winnerRanking.publicContribution.toFixed(1)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: C.social }} />Réseaux {winnerRanking.socialContribution.toFixed(1)}</span>
                  {isForced && (
                    <span className="text-red-400 font-bold ml-2">Gagnant choisi manuellement (pas le 1er au classement)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ===== Récap global — tous candidats ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Classement global</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                <th className="px-4 py-2 text-left w-8">#</th>
                <th className="px-2 py-2 text-left">Candidat</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-center" style={{ color: C.jury }}>Jury</th>
                <th className="px-3 py-2 text-center" style={{ color: C.public }}>Public</th>
                <th className="px-3 py-2 text-center" style={{ color: C.social }}>Réseaux</th>
                <th className="px-3 py-2 text-center text-white/50">Total</th>
                <th className="px-3 py-2 text-center text-white/30">Durée</th>
                <th className="px-3 py-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody>
              {allRankings.sort((a, b) => b.totalScore - a.totalScore).map((r, idx) => {
                const isWinner = winners.some((w) => w.id === r.candidateId)
                return (
                  <tr key={r.candidateId} className={`border-b border-[#2a2545]/50 ${isWinner ? 'bg-[#f5a623]/[0.05]' : ''}`}>
                    <td className="px-4 py-2.5 text-white/20 text-xs">{idx + 1}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 border ${isWinner ? 'border-[#f5a623]' : 'border-transparent'}`}>
                          {r.photoUrl ? (
                            <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#1a1533] flex items-center justify-center text-white/10 text-xs">🎤</div>
                          )}
                        </div>
                        <span className={`text-xs font-medium truncate ${isWinner ? 'text-[#f5a623]' : 'text-white/70'}`}>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-white/30 text-xs">{r.cat}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: C.jury }}>{r.juryNormalized.toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: C.public }}>{r.publicVotes}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: C.social }}>{r.socialVotes}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-xs" style={{ color: isWinner ? C.gold : 'rgba(255,255,255,0.5)' }}>{r.totalScore.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-white/30">
                      {r.durationSec != null ? `${Math.floor(r.durationSec / 60)}:${(r.durationSec % 60).toString().padStart(2, '0')}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">{isWinner && '🏆'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Jury activity table ===== */}
      {jurorActivity.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Activité jury</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                <th className="px-5 py-2 text-left">Juré</th>
                <th className="px-3 py-2 text-center">Notes données</th>
                <th className="px-3 py-2 text-center">Score moyen</th>
                <th className="px-3 py-2 text-left">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {jurorActivity.map((j) => {
                const globalAvg = jurorActivity.length > 0
                  ? jurorActivity.reduce((a, x) => a + x.avg, 0) / jurorActivity.length
                  : 0
                const diff = j.avg - globalAvg
                return (
                  <tr key={j.name} className="border-b border-[#2a2545]/50">
                    <td className="px-5 py-2.5 text-white/70 font-medium text-xs">{j.name}</td>
                    <td className="px-3 py-2.5 text-center text-white/50 text-xs">{j.count}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: C.gold }}>{j.avg.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {Math.abs(diff) < 0.5 ? (
                        <span className="text-white/20">Neutre</span>
                      ) : diff > 0 ? (
                        <span className="text-[#7ec850]">+{diff.toFixed(1)} Généreux</span>
                      ) : (
                        <span className="text-[#e91e8c]">{diff.toFixed(1)} Sévère</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
