'use client'

import { useMemo } from 'react'

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
  status: string
}

interface PageView {
  id: string
  candidate_id: string | null
  page_path: string
  fingerprint: string | null
  user_agent: string | null
  referrer: string | null
  duration_seconds: number
  created_at: string
}

interface Vote {
  id: string
  candidate_id: string
  fingerprint: string
  user_agent: string | null
  created_at: string
}

interface Props {
  session: { id: string; name: string }
  candidates: Candidate[]
  pageViews: PageView[]
  votes: Vote[]
  categories: string[]
}

/* ---------- helpers ---------- */

function displayName(c: { first_name: string; last_name: string; stage_name: string | null }) {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

function classifyDevice(ua: string | null): 'mobile' | 'tablette' | 'desktop' {
  if (!ua) return 'desktop'
  const lower = ua.toLowerCase()
  if (/ipad|tablet|kindle|silk/.test(lower)) return 'tablette'
  if (/mobile|android|iphone|ipod|opera mini|iemobile|blackberry/.test(lower)) return 'mobile'
  return 'desktop'
}

function classifyReferrer(ref: string | null): string {
  if (!ref) return 'Direct'
  const lower = ref.toLowerCase()
  if (lower.includes('google')) return 'Google'
  if (lower.includes('facebook') || lower.includes('fb.')) return 'Facebook'
  if (lower.includes('instagram')) return 'Instagram'
  if (lower.includes('tiktok')) return 'TikTok'
  if (lower.includes('twitter') || lower.includes('x.com')) return 'Twitter/X'
  if (lower.includes('whatsapp')) return 'WhatsApp'
  return 'Autre'
}

/* ---------- component ---------- */

export default function StatsDemiFinale({ session, candidates, pageViews, votes, categories }: Props) {

  /* ---- global stats ---- */
  const totalViews = pageViews.length
  const uniqueVisitors = new Set(pageViews.map((p) => p.fingerprint).filter(Boolean)).size
  const totalLikes = votes.length
  const avgDuration = pageViews.length > 0
    ? Math.round(pageViews.reduce((a, p) => a + (p.duration_seconds || 0), 0) / pageViews.length)
    : 0
  const totalSemifinalists = candidates.filter((c) => c.status === 'semifinalist').length

  /* ---- per candidate stats ---- */
  const candidateStats = useMemo(() => {
    return candidates.map((c) => {
      const views = pageViews.filter((p) => p.candidate_id === c.id)
      const candidateVotes = votes.filter((v) => v.candidate_id === c.id)
      const totalViewCount = views.length
      const avgTime = views.length > 0
        ? Math.round(views.reduce((a, v) => a + (v.duration_seconds || 0), 0) / views.length)
        : 0
      const conversionRate = totalViewCount > 0 ? candidateVotes.length / totalViewCount : 0

      return {
        candidate: c,
        views: totalViewCount,
        avgTime,
        likes: candidateVotes.length,
        conversionRate,
      }
    }).sort((a, b) => b.views - a.views)
  }, [candidates, pageViews, votes])

  const maxViews = Math.max(1, ...candidateStats.map((c) => c.views))

  /* ---- timeline (views + likes by day) ---- */
  const timeline = useMemo(() => {
    const dayMap: Record<string, { views: number; likes: number }> = {}

    for (const p of pageViews) {
      const day = p.created_at?.slice(0, 10) || 'inconnu'
      if (!dayMap[day]) dayMap[day] = { views: 0, likes: 0 }
      dayMap[day].views++
    }

    for (const v of votes) {
      const day = v.created_at?.slice(0, 10) || 'inconnu'
      if (!dayMap[day]) dayMap[day] = { views: 0, likes: 0 }
      dayMap[day].likes++
    }

    return Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]))
  }, [pageViews, votes])

  const maxDayTotal = Math.max(1, ...timeline.map(([, d]) => d.views + d.likes))

  /* ---- referrer analysis ---- */
  const referrerData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of pageViews) {
      const source = classifyReferrer(p.referrer)
      map[source] = (map[source] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [pageViews])

  const totalReferrers = referrerData.reduce((a, [, v]) => a + v, 0)

  const referrerColors: Record<string, string> = {
    'Direct': '#8b5cf6',
    'Google': '#3b82f6',
    'Facebook': '#1877f2',
    'Instagram': '#e91e8c',
    'TikTok': '#000000',
    'Twitter/X': '#1da1f2',
    'WhatsApp': '#25d366',
    'Autre': '#6b7280',
  }

  /* ---- device analysis ---- */
  const deviceData = useMemo(() => {
    const map: Record<string, number> = { mobile: 0, tablette: 0, desktop: 0 }
    for (const p of pageViews) {
      const device = classifyDevice(p.user_agent)
      map[device]++
    }
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  }, [pageViews])

  const deviceColors: Record<string, string> = { mobile: '#e91e8c', tablette: '#f5a623', desktop: '#3b82f6' }
  const deviceIcons: Record<string, string> = { mobile: '📱', tablette: '📋', desktop: '💻' }
  const totalDevices = deviceData.reduce((a, [, v]) => a + v, 0)

  /* ---- per category engagement ---- */
  const categoryEngagement = useMemo(() => {
    return categories.map((cat) => {
      const catCandidates = candidates.filter((c) => c.category === cat)
      const catIds = new Set(catCandidates.map((c) => c.id))
      const catViews = pageViews.filter((p) => p.candidate_id && catIds.has(p.candidate_id))
      const catVotes = votes.filter((v) => catIds.has(v.candidate_id))
      const avgTime = catViews.length > 0
        ? Math.round(catViews.reduce((a, v) => a + (v.duration_seconds || 0), 0) / catViews.length)
        : 0

      return {
        category: cat,
        views: catViews.length,
        likes: catVotes.length,
        avgTime,
        candidates: catCandidates.length,
      }
    })
  }, [categories, candidates, pageViews, votes])

  const maxCatViews = Math.max(1, ...categoryEngagement.map((c) => c.views))

  /* ---- heatmap (hour × day of week) ---- */
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const p of pageViews) {
      try {
        const d = new Date(p.created_at)
        grid[d.getDay()][d.getHours()]++
      } catch {
        // skip invalid dates
      }
    }
    const max = Math.max(1, ...grid.flat())
    return { grid, max }
  }, [pageViews])

  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  /* ---- empty state ---- */
  if (pageViews.length === 0 && votes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">Stats Marketing</h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/40">Aucune donnée de tracking disponible.</p>
          <p className="text-white/20 text-sm mt-2">Les statistiques apparaîtront quand les visiteurs consulteront les profils candidats.</p>
        </div>
      </div>
    )
  }

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
          Stats Marketing Demi-finale
        </h1>
        <p className="text-white/40 text-sm">{session.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon="👁️" label="Vues totales" value={totalViews} color="#3b82f6" />
        <StatCard icon="👤" label="Visiteurs uniques" value={uniqueVisitors} color="#8b5cf6" />
        <StatCard icon="❤️" label="Likes totaux" value={totalLikes} color="#e91e8c" />
        <StatCard icon="⏱️" label="Durée moy. (s)" value={avgDuration} color="#f5a623" />
        <StatCard icon="⭐" label="Demi-finalistes" value={totalSemifinalists} color="#7ec850" />
      </div>

      {/* ===== Most viewed profiles ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Profils les plus consultés</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                <th className="px-4 py-2 text-left w-8">#</th>
                <th className="px-2 py-2 text-left">Candidat</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-center" style={{ color: '#3b82f6' }}>Vues</th>
                <th className="px-3 py-2 text-center" style={{ color: '#f5a623' }}>Durée moy.</th>
                <th className="px-3 py-2 text-center" style={{ color: '#e91e8c' }}>Likes</th>
                <th className="px-3 py-2 text-center">Conv.</th>
                <th className="px-3 py-2 text-left w-32">Popularité</th>
              </tr>
            </thead>
            <tbody>
              {candidateStats.slice(0, 15).map((cs, idx) => {
                const c = cs.candidate
                return (
                  <tr key={c.id} className="border-b border-[#2a2545]/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        idx === 0 ? 'bg-[#f5a623]/20 text-[#f5a623]' : idx === 1 ? 'bg-white/10 text-white/60' : idx === 2 ? 'bg-orange-900/20 text-orange-400/60' : 'text-white/20'
                      }`}>{idx + 1}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                          {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">🎤</div>}
                        </div>
                        <span className="text-white/70 text-xs font-medium truncate">{displayName(c)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-white/30 text-xs">{c.category}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: '#3b82f6' }}>{cs.views}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: '#f5a623' }}>{cs.avgTime}s</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: '#e91e8c' }}>{cs.likes}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-mono text-[10px] font-bold ${cs.conversionRate > 0.3 ? 'text-[#7ec850]' : cs.conversionRate > 0.1 ? 'text-[#f5a623]' : 'text-white/30'}`}>
                        {(cs.conversionRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="w-24 h-2 bg-[#2a2545]/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#e91e8c] rounded-full" style={{ width: `${(cs.views / maxViews) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Timeline ===== */}
      {timeline.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Timeline d&apos;engagement</h2>
          </div>
          <div className="p-4 space-y-2">
            {timeline.map(([day, data]) => {
              const total = data.views + data.likes
              const viewsPct = (data.views / maxDayTotal) * 100
              const likesPct = (data.likes / maxDayTotal) * 100
              const label = day !== 'inconnu'
                ? new Date(day + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : day
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-white/30 text-[10px] w-16 shrink-0 text-right">{label}</span>
                  <div className="flex-1 h-4 bg-[#2a2545]/50 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#3b82f6]" style={{ width: `${viewsPct}%` }} />
                    <div className="h-full bg-[#e91e8c]" style={{ width: `${likesPct}%` }} />
                  </div>
                  <span className="text-white/30 text-[10px] font-mono w-12 shrink-0">{total}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Vues</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#e91e8c]" /> Likes</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sources + Devices ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Referrer sources */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">Sources de trafic</h2>
          </div>
          <div className="p-4">
            {totalReferrers > 0 ? (
              <>
                {/* Pie chart */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-28 h-28 rounded-full relative"
                    style={{
                      background: (() => {
                        let gradient = 'conic-gradient('
                        let cumPct = 0
                        referrerData.forEach(([source, count], i) => {
                          const pct = (count / totalReferrers) * 100
                          const color = referrerColors[source] || '#6b7280'
                          gradient += `${i > 0 ? ', ' : ''}${color} ${cumPct}% ${cumPct + pct}%`
                          cumPct += pct
                        })
                        gradient += ')'
                        return gradient
                      })(),
                    }}
                  >
                    <div className="absolute inset-3.5 rounded-full bg-[#161228] flex items-center justify-center">
                      <span className="text-white/50 text-xs font-bold">{totalReferrers}</span>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-1.5">
                  {referrerData.map(([source, count]) => (
                    <div key={source} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: referrerColors[source] || '#6b7280' }} />
                      <span className="text-white/50 flex-1">{source}</span>
                      <span className="text-white/30 font-mono text-[10px]">{count}</span>
                      <span className="text-white/20 font-mono text-[10px] w-10 text-right">{Math.round((count / totalReferrers) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-white/20 text-sm text-center py-4">Pas encore de données</p>
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">Appareils</h2>
          </div>
          <div className="p-4">
            {totalDevices > 0 ? (
              <>
                {/* Pie chart */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-28 h-28 rounded-full relative"
                    style={{
                      background: (() => {
                        let gradient = 'conic-gradient('
                        let cumPct = 0
                        deviceData.forEach(([device, count], i) => {
                          const pct = (count / totalDevices) * 100
                          const color = deviceColors[device] || '#6b7280'
                          gradient += `${i > 0 ? ', ' : ''}${color} ${cumPct}% ${cumPct + pct}%`
                          cumPct += pct
                        })
                        gradient += ')'
                        return gradient
                      })(),
                    }}
                  >
                    <div className="absolute inset-3.5 rounded-full bg-[#161228] flex items-center justify-center">
                      <span className="text-white/50 text-xs font-bold">{totalDevices}</span>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-2">
                  {deviceData.map(([device, count]) => (
                    <div key={device} className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{deviceIcons[device] || '🖥️'}</span>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: deviceColors[device] || '#6b7280' }} />
                      <span className="text-white/50 flex-1 capitalize">{device}</span>
                      <span className="text-white/30 font-mono text-[10px]">{count}</span>
                      <span className="text-white/20 font-mono text-[10px] w-10 text-right">{Math.round((count / totalDevices) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-white/20 text-sm text-center py-4">Pas encore de données</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Category engagement ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Engagement par catégorie</h2>
        </div>
        <div className="p-4 space-y-4">
          {categoryEngagement.map((ce) => (
            <div key={ce.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm font-medium">{ce.category}</span>
                <span className="text-white/30 text-[10px]">{ce.candidates} candidats</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[#3b82f6] font-bold text-sm">{ce.views}</p>
                  <p className="text-white/20 text-[10px]">Vues</p>
                </div>
                <div>
                  <p className="text-[#e91e8c] font-bold text-sm">{ce.likes}</p>
                  <p className="text-white/20 text-[10px]">Likes</p>
                </div>
                <div>
                  <p className="text-[#f5a623] font-bold text-sm">{ce.avgTime}s</p>
                  <p className="text-white/20 text-[10px]">Durée moy.</p>
                </div>
              </div>
              <div className="h-2 bg-[#2a2545]/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full" style={{ width: `${(ce.views / maxCatViews) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Conversion rate ===== */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Taux de conversion vues → likes</h2>
          <p className="text-white/20 text-[10px]">Candidats qui convertissent le mieux (visiteurs → supporters)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                <th className="px-4 py-2 text-left">Candidat</th>
                <th className="px-3 py-2 text-center">Vues</th>
                <th className="px-3 py-2 text-center">Likes</th>
                <th className="px-3 py-2 text-center">Taux</th>
                <th className="px-3 py-2 text-left w-32">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {[...candidateStats]
                .filter((cs) => cs.views > 0)
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 10)
                .map((cs) => {
                  const c = cs.candidate
                  return (
                    <tr key={c.id} className="border-b border-[#2a2545]/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                            {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">🎤</div>}
                          </div>
                          <span className="text-white/60 text-xs truncate">{displayName(c)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-[#3b82f6]">{cs.views}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-[#e91e8c]">{cs.likes}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-bold ${cs.conversionRate > 0.3 ? 'text-[#7ec850]' : cs.conversionRate > 0.1 ? 'text-[#f5a623]' : 'text-white/30'}`}>
                          {(cs.conversionRate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-24 h-2 bg-[#2a2545]/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cs.conversionRate > 0.3 ? 'bg-[#7ec850]' : cs.conversionRate > 0.1 ? 'bg-[#f5a623]' : 'bg-white/20'}`}
                            style={{ width: `${Math.min(cs.conversionRate * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Heatmap ===== */}
      {pageViews.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Heures de pointe</h2>
            <p className="text-white/20 text-[10px]">Quand les visiteurs consultent les profils</p>
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex mb-1 ml-10">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[8px] text-white/20">{h}</div>
                ))}
              </div>
              {/* Grid */}
              {heatmap.grid.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-white/30 w-8 shrink-0 text-right">{dayLabels[dayIdx]}</span>
                  <div className="flex flex-1 gap-0.5">
                    {row.map((count, hourIdx) => {
                      const intensity = count / heatmap.max
                      return (
                        <div
                          key={hourIdx}
                          className="flex-1 h-4 rounded-sm"
                          style={{
                            backgroundColor: count > 0
                              ? `rgba(139, 92, 246, ${0.1 + intensity * 0.9})`
                              : 'rgba(255,255,255,0.02)',
                          }}
                          title={`${dayLabels[dayIdx]} ${hourIdx}h: ${count} vue${count !== 1 ? 's' : ''}`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-white/20">
                <span>Moins</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(139, 92, 246, ${i})` }} />
                  ))}
                </div>
                <span>Plus</span>
              </div>
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
