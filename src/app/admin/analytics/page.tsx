export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import AnalyticsChart from '@/components/AnalyticsChart'

interface DayBucket {
  date: string
  pageViews: number
  uniqueVisitors: number
  events: EventMarker[]
}

interface EventMarker {
  type: 'newsletter' | 'facebook' | 'instagram' | 'social' | 'inscription'
  label: string
  count?: number
}

async function getAnalyticsData() {
  const supabase = createAdminClient()

  // Get active session
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions?.length) return { session: null, days: [] }
  const session = sessions[0]

  // Fetch ALL page views for this session (paginate — Supabase returns max 1000 per request)
  const pageViews: { fingerprint: string; created_at: string }[] = []
  let from = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data: batch } = await supabase
      .from('page_views')
      .select('fingerprint, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (!batch || batch.length === 0) break
    pageViews.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  // Fetch newsletter campaigns (sent only)
  const { data: newsletters } = await supabase
    .from('email_campaigns')
    .select('subject, sent_at, total_sent')
    .eq('status', 'sent')
    .not('sent_at', 'is', null)

  // Fetch social posts
  const { data: socialPosts } = await supabase
    .from('social_posts_log')
    .select('post_type, source, message, facebook_post_id, instagram_post_id, created_at')

  // Fetch candidate inscriptions
  const { data: candidates } = await supabase
    .from('candidates')
    .select('created_at')
    .eq('session_id', session.id)

  // Build day-by-day buckets
  const dayMap = new Map<string, DayBucket>()

  // Helper to get YYYY-MM-DD in French timezone
  const toDay = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) // YYYY-MM-DD
  }

  // Process page views
  for (const pv of pageViews || []) {
    const day = toDay(pv.created_at)
    if (!dayMap.has(day)) dayMap.set(day, { date: day, pageViews: 0, uniqueVisitors: 0, events: [] })
    const bucket = dayMap.get(day)!
    bucket.pageViews++
  }

  // Count unique visitors per day
  const fingerprintsByDay = new Map<string, Set<string>>()
  for (const pv of pageViews || []) {
    const day = toDay(pv.created_at)
    if (!fingerprintsByDay.has(day)) fingerprintsByDay.set(day, new Set())
    if (pv.fingerprint) fingerprintsByDay.get(day)!.add(pv.fingerprint)
  }
  for (const [day, fps] of fingerprintsByDay) {
    if (dayMap.has(day)) dayMap.get(day)!.uniqueVisitors = fps.size
  }

  // Process newsletters
  for (const nl of newsletters || []) {
    if (!nl.sent_at) continue
    const day = toDay(nl.sent_at)
    if (!dayMap.has(day)) dayMap.set(day, { date: day, pageViews: 0, uniqueVisitors: 0, events: [] })
    dayMap.get(day)!.events.push({
      type: 'newsletter',
      label: nl.subject || 'Newsletter',
      count: nl.total_sent,
    })
  }

  // Process social posts
  for (const sp of socialPosts || []) {
    const day = toDay(sp.created_at)
    if (!dayMap.has(day)) dayMap.set(day, { date: day, pageViews: 0, uniqueVisitors: 0, events: [] })
    const bucket = dayMap.get(day)!

    if (sp.facebook_post_id) {
      bucket.events.push({ type: 'facebook', label: (sp.message || 'Post FB').slice(0, 60) })
    }
    if (sp.instagram_post_id) {
      bucket.events.push({ type: 'instagram', label: (sp.message || 'Post IG').slice(0, 60) })
    }
    if (!sp.facebook_post_id && !sp.instagram_post_id) {
      bucket.events.push({ type: 'social', label: (sp.message || 'Post social').slice(0, 60) })
    }
  }

  // Process inscriptions (group by day)
  const inscriptionsByDay = new Map<string, number>()
  for (const c of candidates || []) {
    const day = toDay(c.created_at)
    inscriptionsByDay.set(day, (inscriptionsByDay.get(day) || 0) + 1)
  }
  for (const [day, count] of inscriptionsByDay) {
    if (!dayMap.has(day)) dayMap.set(day, { date: day, pageViews: 0, uniqueVisitors: 0, events: [] })
    dayMap.get(day)!.events.push({
      type: 'inscription',
      label: `${count} inscription${count > 1 ? 's' : ''}`,
      count,
    })
  }

  // Sort by date and fill gaps
  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Fill missing days between first and last
  if (days.length > 1) {
    const filled: DayBucket[] = []
    const start = new Date(days[0].date)
    const end = new Date(days[days.length - 1].date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      const existing = days.find(x => x.date === iso)
      filled.push(existing || { date: iso, pageViews: 0, uniqueVisitors: 0, events: [] })
    }
    return { session, days: filled }
  }

  return { session, days }
}

export default async function AnalyticsPage() {
  const { session, days } = await getAnalyticsData()

  // Compute totals
  const totalViews = days.reduce((s, d) => s + d.pageViews, 0)
  const totalEvents = days.reduce((s, d) => s + d.events.length, 0)
  const peakDay = days.reduce((max, d) => (d.pageViews > max.pageViews ? d : max), days[0] || { date: '', pageViews: 0, uniqueVisitors: 0, events: [] })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
          Analyse du trafic
        </h1>
        {session && <p className="text-white/40 text-sm mt-1">{session.name} — depuis l&apos;ouverture</p>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/40 text-xs">Pages vues totales</p>
          <p className="text-2xl font-bold text-white mt-1">{totalViews.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/40 text-xs">Jours actifs</p>
          <p className="text-2xl font-bold text-white mt-1">{days.filter(d => d.pageViews > 0).length}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/40 text-xs">Pic de trafic</p>
          <p className="text-2xl font-bold text-[#e91e8c] mt-1">{peakDay?.pageViews || 0}</p>
          <p className="text-white/30 text-[10px]">{peakDay?.date ? new Date(peakDay.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
          <p className="text-white/40 text-xs">Actions trackees</p>
          <p className="text-2xl font-bold text-white mt-1">{totalEvents}</p>
        </div>
      </div>

      {/* Chart */}
      <AnalyticsChart days={JSON.parse(JSON.stringify(days))} />
    </div>
  )
}
