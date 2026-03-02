export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

interface PageViewRow {
  page_path: string
  fingerprint: string | null
  user_agent: string | null
  referrer: string | null
  duration_seconds: number | null
  created_at: string
  candidate_id: string | null
}

function detectDevice(ua: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!ua) return 'desktop'
  const lower = ua.toLowerCase()
  if (/iphone|android.*mobile|windows phone/.test(lower)) return 'mobile'
  if (/ipad|android(?!.*mobile)|tablet/.test(lower)) return 'tablet'
  return 'desktop'
}

function detectBrowser(ua: string | null): string {
  if (!ua) return 'Inconnu'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera'
  if (ua.includes('Chrome') && !ua.includes('Edg/')) return 'Chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Autre'
}

function extractSource(referrer: string | null): string {
  if (!referrer) return 'Direct'
  try {
    const host = new URL(referrer).hostname.replace('www.', '')
    if (host.includes('google')) return 'Google'
    if (host.includes('facebook') || host.includes('fb.')) return 'Facebook'
    if (host.includes('instagram')) return 'Instagram'
    if (host.includes('tiktok')) return 'TikTok'
    if (host.includes('twitter') || host.includes('x.com')) return 'X/Twitter'
    if (host.includes('linkedin')) return 'LinkedIn'
    if (host.includes('chantenscene')) return 'Interne'
    return host
  } catch {
    return 'Autre'
  }
}

async function getVisitorData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)

  let sessionId = sessions?.[0]?.id
  if (!sessionId) {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('id')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessionId = fallback?.[0]?.id
  }

  if (!sessionId) return { views: [], stats: { total: 0, unique: 0, today: 0, avgDuration: 0, devices: {}, browsers: {}, sources: {}, topPages: [] } }

  const { data: views } = await supabase
    .from('page_views')
    .select('page_path, fingerprint, user_agent, referrer, duration_seconds, created_at, candidate_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(500)

  const allViews = (views || []) as PageViewRow[]
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const uniqueFingerprints = new Set(allViews.map(v => v.fingerprint).filter(Boolean))
  const todayViews = allViews.filter(v => new Date(v.created_at) >= todayStart)
  const durations = allViews.map(v => v.duration_seconds || 0).filter(d => d > 0)
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  // Appareils
  const devices: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 }
  // Navigateurs
  const browsers: Record<string, number> = {}
  // Sources
  const sources: Record<string, number> = {}
  // Pages les plus vues
  const pageCounts: Record<string, number> = {}

  for (const v of allViews) {
    const device = detectDevice(v.user_agent)
    devices[device]++

    const browser = detectBrowser(v.user_agent)
    browsers[browser] = (browsers[browser] || 0) + 1

    const source = extractSource(v.referrer)
    sources[source] = (sources[source] || 0) + 1

    pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1
  }

  const topPages = Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  return {
    views: allViews.slice(0, 20),
    stats: {
      total: allViews.length,
      unique: uniqueFingerprints.size,
      today: todayViews.length,
      avgDuration,
      devices,
      browsers,
      sources,
      topPages,
    },
  }
}

const DEVICE_ICONS: Record<string, string> = {
  mobile: '📱',
  tablet: '📋',
  desktop: '💻',
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
}

export default async function AdminVisiteursPage() {
  const { views, stats } = await getVisitorData()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-white/30 text-xs hover:text-white/50 transition-colors">← Dashboard</Link>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white mt-1">
            Visiteurs
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#3b82f615', color: '#3b82f6' }}>
            {stats.total} vue{stats.total > 1 ? 's' : ''}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#7ec85015', color: '#7ec850' }}>
            {stats.unique} unique{stats.unique > 1 ? 's' : ''}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#E91E8C15', color: '#E91E8C' }}>
            {stats.today} aujourd&apos;hui
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Appareils */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
          <h3 className="text-xs text-white/40 mb-3 font-medium">Appareils</h3>
          <div className="space-y-2">
            {Object.entries(stats.devices)
              .sort(([, a], [, b]) => b - a)
              .map(([device, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={device} className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{DEVICE_ICONS[device]} {DEVICE_LABELS[device] || device}</span>
                    <span className="text-xs font-medium text-white">{pct}%</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Navigateurs */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
          <h3 className="text-xs text-white/40 mb-3 font-medium">Navigateurs</h3>
          <div className="space-y-2">
            {Object.entries(stats.browsers)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([browser, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={browser} className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{browser}</span>
                    <span className="text-xs font-medium text-white">{pct}%</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Sources */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
          <h3 className="text-xs text-white/40 mb-3 font-medium">Sources</h3>
          <div className="space-y-2">
            {Object.entries(stats.sources)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([source, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{source}</span>
                    <span className="text-xs font-medium text-white">{count} ({pct}%)</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Durée moyenne */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
          <h3 className="text-xs text-white/40 mb-3 font-medium">Engagement</h3>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgDuration}s</p>
              <p className="text-[10px] text-white/30">durée moyenne</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {stats.unique > 0 ? (stats.total / stats.unique).toFixed(1) : '0'}
              </p>
              <p className="text-[10px] text-white/30">pages / visiteur</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages les plus vues */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden mb-6">
        <div className="p-4 border-b border-[#2a2545]">
          <h3 className="text-sm text-white font-medium">Pages les plus vues</h3>
        </div>
        {stats.topPages.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {stats.topPages.map(({ path, count }) => {
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={path} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-mono">{path}</p>
                  </div>
                  <div className="hidden sm:block w-24 lg:w-40">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-white/60 shrink-0 w-12 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="p-6 text-center text-white/30 text-sm">Aucune donnée.</p>
        )}
      </div>

      {/* Dernières visites */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2545]">
          <h3 className="text-sm text-white font-medium">Dernières visites</h3>
        </div>
        {views.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {views.map((v, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-sm shrink-0">{DEVICE_ICONS[detectDevice(v.user_agent)]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-mono">{v.page_path}</p>
                  <p className="text-[10px] text-white/25">
                    {extractSource(v.referrer)}
                    {v.duration_seconds ? ` · ${v.duration_seconds}s` : ''}
                  </p>
                </div>
                <span className="text-[10px] text-white/30 shrink-0">
                  {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-white/30 text-sm">Aucune visite enregistrée.</p>
        )}
      </div>
    </div>
  )
}
