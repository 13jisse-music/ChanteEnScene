export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const PAT = process.env.SUPABASE_ACCESS_TOKEN || ''
const PROJECT_REF = 'xarrchsokuhobwqvcnkg'
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = '8064044229'
const BW_LIMIT_GB = 250 // Pro plan (25€/mois)

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

interface HourlyData {
  timestamp: string
  total_rest_requests: number
  total_storage_requests: number
  total_auth_requests: number
  total_realtime_requests: number
}

async function fetchAnalytics(interval: string): Promise<HourlyData[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/analytics/endpoints/usage.api-counts?interval=${interval}`,
    { headers: { Authorization: `Bearer ${PAT}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.result || []
}

function groupByDay(data: HourlyData[]) {
  const days: Record<string, { rest: number; storage: number; auth: number }> = {}
  for (const r of data) {
    const day = r.timestamp.substring(0, 10)
    if (!days[day]) days[day] = { rest: 0, storage: 0, auth: 0 }
    days[day].rest += r.total_rest_requests || 0
    days[day].storage += r.total_storage_requests || 0
    days[day].auth += r.total_auth_requests || 0
  }
  return days
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_TOKEN) return false
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
  })
  return res.ok
}

async function checkSiteUp(): Promise<{ up: boolean; ms: number }> {
  const start = Date.now()
  try {
    const res = await fetch('https://www.chantenscene.fr', { redirect: 'manual', cache: 'no-store' })
    return { up: res.status < 500, ms: Date.now() - start }
  } catch {
    return { up: false, ms: Date.now() - start }
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!PAT) {
    return NextResponse.json({ error: 'Missing SUPABASE_ACCESS_TOKEN' }, { status: 500 })
  }

  // Fetch data
  const [hourly, weekly, site] = await Promise.all([
    fetchAnalytics('1day'),
    fetchAnalytics('7day'),
    checkSiteUp(),
  ])

  const today = new Date().toISOString().substring(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10)
  const days = groupByDay(weekly)

  const todayData = days[today] || { rest: 0, storage: 0, auth: 0 }
  const ydayData = days[yesterday] || { rest: 0, storage: 0, auth: 0 }

  // Trend (factual, no anxiety)
  const storageDiff = todayData.storage - ydayData.storage
  const trendArrow = storageDiff < 0 ? '↓' : storageDiff > 0 ? '↑' : '→'

  // Bandwidth estimate (based on ~390KB average per storage request)
  const totalStorageWeek = Object.values(days).reduce((s, d) => s + d.storage, 0)
  const estBwGB = (totalStorageWeek * 0.00039)
  const bwPct = (estBwGB / BW_LIMIT_GB * 100).toFixed(1)

  // Current hour for the report label
  const hour = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })

  // Build daily history (last 5 days)
  const sortedDays = Object.entries(days).sort().reverse().slice(0, 5)
  const historyLines = sortedDays.map(([day, v]) => {
    const d = day.substring(5) // MM-DD
    return `${d}: S:${v.storage} R:${v.rest}`
  })

  // Status: factual, one word
  const status = !site.up ? 'ACTION REQUISE' : Number(bwPct) > 80 ? 'A surveiller' : 'Tout va bien'

  // Cost analysis: is Pro worth it?
  const proWorth = estBwGB > 5.5 ? 'Pro necessaire' : 'Pro non rentable (< 5.5 GB free tier)'

  const message = [
    `*ChanteEnScene — ${hour}*`,
    ``,
    `*Statut :* ${status}`,
    `Site : ${site.up ? 'en ligne' : 'HORS LIGNE'} (${site.ms}ms)`,
    `Bandwidth : ${estBwGB.toFixed(1)} GB / ${BW_LIMIT_GB} GB (${bwPct}%)`,
    ``,
    `*Aujourd'hui*`,
    `Storage : ${todayData.storage.toLocaleString('fr-FR')} req (${trendArrow} ${Math.abs(storageDiff).toLocaleString('fr-FR')} vs hier)`,
    `REST : ${todayData.rest.toLocaleString('fr-FR')} req`,
    `Auth : ${todayData.auth.toLocaleString('fr-FR')} req`,
    ``,
    `*7 derniers jours :*`,
    ...historyLines.map(l => `\`${l}\``),
    ``,
    `_Plan Pro 25€/mois — ${proWorth}_`,
  ].join('\n')

  const sent = await sendTelegram(message)

  return NextResponse.json({
    message: 'Bandwidth report sent',
    sent,
    data: { today: todayData, yesterday: ydayData, estBwGB, bwPct, siteUp: site.up },
  })
}
