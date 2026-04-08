import { createAdminClient } from '@/lib/supabase/admin'

// --- Types publics ---

export interface AnalyticsReport {
  period: { from: string; to: string; days: number }
  summary: {
    totalPageViews: number
    uniqueVisitors: number
    totalSessions: number
    avgSessionDuration: number
    avgPagesPerSession: number
    bounceRate: number
    avgScrollDepth: number
    returningVisitorRate: number
    authVsAnon: { authenticated: number; anonymous: number }
  }
  performance: {
    avgLcp: number
    avgCls: number
    lcpRating: string     // bon / moyen / mauvais
    jsErrors: number
    topErrors: { message: string; count: number; page: string }[]
  }
  content: {
    topPages: { path: string; views: number; avgDuration: number }[]
    topTools: { name: string; path: string; views: number }[]
    exitPages: { path: string; exits: number }[]
    lowEngagement: { path: string; views: number; avgScroll: number }[]
  }
  acquisition: {
    topReferrers: { source: string; visits: number }[]
    topCities: { city: string; visits: number }[]
    topCountries: { country: string; visits: number }[]
    utmCampaigns: { campaign: string; visits: number }[]
  }
  devices: {
    types: { type: string; count: number; pct: number }[]
    browsers: { name: string; count: number }[]
    oses: { name: string; count: number }[]
  }
  engagement: {
    topClicks: { label: string; count: number }[]
    scrollMilestones: { depth: number; sessions: number; pct: number }[]
    sessionsByPageCount: { pages: string; count: number }[]
  }
  insights: string[]   // recommandations en francais
  generatedAt: string
}

// --- Noms lisibles pour les pages CES ---
const TOOL_NAMES: Record<string, string> = {
  '/': 'Accueil',
  '/blog': 'Blog',
  '/comment-ca-marche': 'Comment ca marche',
  '/editions': 'Editions',
  '/palmares': 'Palmares',
  '/presse': 'Presse',
  '/proposer-un-lieu': 'Proposer un lieu',
  '/soutenir': 'Soutenir',
  '/reglement': 'Reglement',
}

// --- Fetcher paginee ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(table: string, columns: string, since?: string): Promise<any[]> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = []
  let from = 0
  const size = 1000
  while (true) {
    let query = supabase.from(table).select(columns).order('created_at', { ascending: true })
    if (since) query = query.gte('created_at', since)
    const { data } = await query.range(from, from + size - 1)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < size) break
    from += size
  }
  return rows
}

// --- Generateur de rapport ---
export async function generateReport(daysBack = 30, project = 'ces'): Promise<AnalyticsReport> {
  const since = new Date(Date.now() - daysBack * 86400000).toISOString()
  const now = new Date().toISOString()

  const allEvents = await fetchAll(
    'analytics_events',
    'session_id, fingerprint, user_id, is_authenticated, event_type, event_data, page_path, device_type, browser, os, city, country, language, created_at, project',
    since
  )
  // Filtrer par projet
  const events = allEvents.filter((e: { project?: string }) => e.project === project)

  // --- Regroupements ---
  const pageViews = events.filter(e => e.event_type === 'page_view')
  const pageExits = events.filter(e => e.event_type === 'page_exit')
  const scrolls = events.filter(e => e.event_type === 'scroll')
  const clicks = events.filter(e => e.event_type === 'click')
  const errors = events.filter(e => e.event_type === 'error')
  const sessionEnds = events.filter(e => e.event_type === 'session_end')
  const perfEvents = events.filter(e => e.event_type === 'performance')

  // Sessions uniques
  const sessionIds = new Set(events.map(e => e.session_id))
  const fingerprints = new Set(pageViews.filter(e => e.fingerprint).map(e => e.fingerprint))

  // --- Summary ---
  const durations = sessionEnds.map(e => e.event_data?.duration_seconds || 0).filter((d: number) => d > 0)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
    : 0

  const pagesPerSession = new Map<string, number>()
  for (const ev of pageViews) {
    pagesPerSession.set(ev.session_id, (pagesPerSession.get(ev.session_id) || 0) + 1)
  }
  const avgPages = pagesPerSession.size > 0
    ? Math.round((Array.from(pagesPerSession.values()).reduce((a, b) => a + b, 0) / pagesPerSession.size) * 10) / 10
    : 0

  const bounceSessions = Array.from(pagesPerSession.values()).filter(c => c === 1).length
  const bounceRate = pagesPerSession.size > 0 ? Math.round((bounceSessions / pagesPerSession.size) * 100) : 0

  // Scroll moyen
  const scrollDepths = scrolls.map(e => e.event_data?.depth_percent || 0)
  const avgScroll = scrollDepths.length > 0
    ? Math.round(scrollDepths.reduce((a: number, b: number) => a + b, 0) / scrollDepths.length)
    : 0

  // Returning visitors
  const firstVisits = pageViews.filter(e => e.event_data?.is_first_visit === true).length
  const returningRate = pageViews.length > 0
    ? Math.round(((pageViews.length - firstVisits) / pageViews.length) * 100)
    : 0

  const authViews = pageViews.filter(e => e.is_authenticated).length

  // --- Performance ---
  const lcpValues = perfEvents.filter(e => e.event_data?.metric === 'lcp').map(e => e.event_data?.value || 0)
  const avgLcp = lcpValues.length > 0
    ? Math.round(lcpValues.reduce((a: number, b: number) => a + b, 0) / lcpValues.length)
    : 0
  const clsValues = perfEvents.filter(e => e.event_data?.metric === 'cls').map(e => e.event_data?.value || 0)
  const avgCls = clsValues.length > 0
    ? Math.round((clsValues.reduce((a: number, b: number) => a + b, 0) / clsValues.length) * 1000) / 1000
    : 0

  const errorsByMsg = new Map<string, { count: number; page: string }>()
  for (const e of errors) {
    const msg = (e.event_data?.message as string) || 'Inconnu'
    const existing = errorsByMsg.get(msg)
    if (existing) existing.count++
    else errorsByMsg.set(msg, { count: 1, page: e.page_path })
  }

  // --- Content ---
  const pageViewCounts = new Map<string, number>()
  for (const ev of pageViews) pageViewCounts.set(ev.page_path, (pageViewCounts.get(ev.page_path) || 0) + 1)

  // Duree moyenne par page (depuis page_exit)
  const pageDurations = new Map<string, number[]>()
  for (const ev of pageExits) {
    const d = ev.event_data?.duration_seconds as number
    if (d > 0) {
      if (!pageDurations.has(ev.page_path)) pageDurations.set(ev.page_path, [])
      pageDurations.get(ev.page_path)!.push(d)
    }
  }

  const topPages = Array.from(pageViewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, views]) => {
      const durs = pageDurations.get(path) || []
      const avg = durs.length > 0 ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0
      return { path, views, avgDuration: avg }
    })

  // Pages publiques CES (pas de /dashboard/ sur CES, mais des pages edition/candidats)
  const toolViewCounts = new Map<string, number>()
  for (const ev of pageViews) {
    const p = ev.page_path
    // Compter les pages significatives (pas les pages admin)
    if (p && !p.startsWith('/admin') && p !== '/') {
      toolViewCounts.set(p, (toolViewCounts.get(p) || 0) + 1)
    }
  }
  const topTools = Array.from(toolViewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ name: TOOL_NAMES[path] || path, path, views }))

  // Pages de sortie
  const exitCounts = new Map<string, number>()
  for (const ev of sessionEnds) exitCounts.set(ev.page_path, (exitCounts.get(ev.page_path) || 0) + 1)
  const exitPages = Array.from(exitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, exits]) => ({ path, exits }))

  // Pages a faible engagement (vues mais peu scrollees)
  const pageScrolls = new Map<string, number[]>()
  for (const ev of scrolls) {
    if (!pageScrolls.has(ev.page_path)) pageScrolls.set(ev.page_path, [])
    pageScrolls.get(ev.page_path)!.push(ev.event_data?.depth_percent as number || 0)
  }
  const lowEngagement = Array.from(pageViewCounts.entries())
    .filter(([path, views]) => views >= 3 && pageScrolls.has(path))
    .map(([path, views]) => {
      const depths = pageScrolls.get(path) || []
      const avg = depths.length > 0 ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : 0
      return { path, views, avgScroll: avg }
    })
    .filter(p => p.avgScroll < 40)
    .sort((a, b) => a.avgScroll - b.avgScroll)
    .slice(0, 5)

  // --- Acquisition ---
  const refCounts = new Map<string, number>()
  for (const ev of pageViews) {
    const ref = ev.event_data?.referrer as string
    if (!ref) continue
    try {
      const host = new URL(ref).hostname.replace('www.', '')
      if (!host.includes('chantenscene')) refCounts.set(host, (refCounts.get(host) || 0) + 1)
    } catch { /* url invalide */ }
  }

  const cityCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  const citySession = new Set<string>()
  for (const ev of events) {
    if (citySession.has(ev.session_id)) continue
    citySession.add(ev.session_id)
    if (ev.city) cityCounts.set(ev.city, (cityCounts.get(ev.city) || 0) + 1)
    if (ev.country) countryCounts.set(ev.country, (countryCounts.get(ev.country) || 0) + 1)
  }

  const utmCounts = new Map<string, number>()
  for (const ev of pageViews) {
    const camp = ev.event_data?.utm_campaign as string
    if (camp) utmCounts.set(camp, (utmCounts.get(camp) || 0) + 1)
  }

  // --- Devices ---
  const deviceCounts = new Map<string, number>()
  const browserCounts = new Map<string, number>()
  const osCounts = new Map<string, number>()
  const devSessions = new Set<string>()
  for (const ev of events) {
    if (devSessions.has(ev.session_id)) continue
    devSessions.add(ev.session_id)
    if (ev.device_type) deviceCounts.set(ev.device_type, (deviceCounts.get(ev.device_type) || 0) + 1)
    if (ev.browser) browserCounts.set(ev.browser, (browserCounts.get(ev.browser) || 0) + 1)
    if (ev.os) osCounts.set(ev.os, (osCounts.get(ev.os) || 0) + 1)
  }
  const deviceTotal = Array.from(deviceCounts.values()).reduce((a, b) => a + b, 0) || 1

  // --- Engagement ---
  const clickLabels = new Map<string, number>()
  for (const ev of clicks) {
    const label = (ev.event_data?.track_name as string)
      || (ev.event_data?.text as string)?.slice(0, 50)
      || 'inconnu'
    clickLabels.set(label, (clickLabels.get(label) || 0) + 1)
  }

  // Scroll milestones
  const scrollMilestoneCount = new Map<number, Set<string>>()
  for (const ev of scrolls) {
    const depth = ev.event_data?.depth_percent as number
    if (!scrollMilestoneCount.has(depth)) scrollMilestoneCount.set(depth, new Set())
    scrollMilestoneCount.get(depth)!.add(ev.session_id)
  }
  const totalSessionsForScroll = sessionIds.size || 1

  // Pages par session
  const pageBuckets = new Map<string, number>()
  for (const [, count] of pagesPerSession) {
    const bucket = count >= 6 ? '6+' : String(count)
    pageBuckets.set(bucket, (pageBuckets.get(bucket) || 0) + 1)
  }

  // --- Insights automatiques ---
  const insights: string[] = []

  if (bounceRate > 60) {
    insights.push(`Taux de rebond eleve (${bounceRate}%) : beaucoup de visiteurs quittent apres 1 page. Verifier que la landing page donne envie d'explorer.`)
  }
  if (bounceRate < 30 && pageViews.length > 20) {
    insights.push(`Excellent taux de rebond (${bounceRate}%) : les visiteurs explorent le site.`)
  }

  if (avgLcp > 2500) {
    insights.push(`Performance degradee : LCP moyen de ${avgLcp}ms (objectif < 2500ms). Les pages mettent trop de temps a s'afficher.`)
  }

  if (errors.length > 10) {
    insights.push(`${errors.length} erreurs JS detectees. La plus frequente : "${Array.from(errorsByMsg.entries())[0]?.[0]?.slice(0, 60)}". A corriger.`)
  }

  const mobileCount = deviceCounts.get('mobile') || 0
  const mobilePct = Math.round((mobileCount / deviceTotal) * 100)
  if (mobilePct > 60) {
    insights.push(`${mobilePct}% du trafic vient du mobile. L'experience mobile est prioritaire.`)
  }

  if (topTools.length > 0) {
    insights.push(`Page la plus visitee : ${topTools[0].name} (${topTools[0].views} vues). ${topTools.length > 1 ? `Suivie de ${topTools[1].name}.` : ''}`)
  }

  if (exitPages.length > 0 && exitPages[0].path !== '/') {
    insights.push(`Page de sortie principale : ${exitPages[0].path} (${exitPages[0].exits} departs). Verifier si c'est normal ou si quelque chose fait fuir.`)
  }

  if (lowEngagement.length > 0) {
    const worst = lowEngagement[0]
    insights.push(`"${worst.path}" a ${worst.views} vues mais seulement ${worst.avgScroll}% de scroll moyen. Le contenu ne capte pas l'attention.`)
  }

  if (avgDuration > 0 && avgDuration < 30) {
    insights.push(`Duree de session moyenne courte (${avgDuration}s). Les visiteurs ne restent pas longtemps.`)
  }

  if (returningRate > 50) {
    insights.push(`${returningRate}% de visiteurs de retour, bonne fidelisation.`)
  } else if (pageViews.length > 30 && returningRate < 20) {
    insights.push(`Seulement ${returningRate}% de visiteurs de retour. Travailler la retention (newsletter, notifications).`)
  }

  const authPct = pageViews.length > 0 ? Math.round((authViews / pageViews.length) * 100) : 0
  if (authPct < 30 && pageViews.length > 20) {
    insights.push(`${authPct}% des visites sont de comptes connectes. Beaucoup de trafic anonyme - pousser l'inscription.`)
  }

  return {
    period: { from: since.slice(0, 10), to: now.slice(0, 10), days: daysBack },
    summary: {
      totalPageViews: pageViews.length,
      uniqueVisitors: fingerprints.size,
      totalSessions: sessionIds.size,
      avgSessionDuration: avgDuration,
      avgPagesPerSession: avgPages,
      bounceRate,
      avgScrollDepth: avgScroll,
      returningVisitorRate: returningRate,
      authVsAnon: { authenticated: authViews, anonymous: pageViews.length - authViews },
    },
    performance: {
      avgLcp,
      avgCls,
      lcpRating: avgLcp === 0 ? 'inconnu' : avgLcp < 2500 ? 'bon' : avgLcp < 4000 ? 'moyen' : 'mauvais',
      jsErrors: errors.length,
      topErrors: Array.from(errorsByMsg.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([message, { count, page }]) => ({ message, count, page })),
    },
    content: { topPages, topTools, exitPages, lowEngagement },
    acquisition: {
      topReferrers: Array.from(refCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([source, visits]) => ({ source, visits })),
      topCities: Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, visits]) => ({ city, visits })),
      topCountries: Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, visits]) => ({ country, visits })),
      utmCampaigns: Array.from(utmCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([campaign, visits]) => ({ campaign, visits })),
    },
    devices: {
      types: Array.from(deviceCounts.entries()).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count, pct: Math.round((count / deviceTotal) * 100) })),
      browsers: Array.from(browserCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      oses: Array.from(osCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    },
    engagement: {
      topClicks: Array.from(clickLabels.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, count]) => ({ label, count })),
      scrollMilestones: [25, 50, 75, 100].map(depth => {
        const sessions = scrollMilestoneCount.get(depth)?.size || 0
        return { depth, sessions, pct: Math.round((sessions / totalSessionsForScroll) * 100) }
      }),
      sessionsByPageCount: ['1', '2', '3', '4', '5', '6+']
        .map(pages => ({ pages, count: pageBuckets.get(pages) || 0 }))
        .filter(b => b.count > 0),
    },
    insights,
    generatedAt: now,
  }
}
