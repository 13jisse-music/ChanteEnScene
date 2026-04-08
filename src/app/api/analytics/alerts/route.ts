import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PROJECT = 'CES'
const TELEGRAM_TOKEN = '8745661004:AAGJffmkzEK6GfI0wfgVj0K8XboyWDpiCRY'
const TELEGRAM_CHAT_ID = '8064044229'

const THRESHOLDS = {
  bounceRate: 70,
  jsErrors: 5,
  lcpMobile: 4000,
  minPageViews: 5,
} as const

interface Alert {
  metric: string
  value: string
  threshold: string
  page: string
}

// Envoie une notification Telegram
async function sendTelegram(alert: Alert): Promise<boolean> {
  const text = [
    `\u26a0\ufe0f [ANALYTICS ${PROJECT}]`,
    `M\u00e9trique : ${alert.metric}`,
    `Valeur : ${alert.value} (seuil : ${alert.threshold})`,
    `Page : ${alert.page}`,
  ].join('\n')

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    }
  )
  return res.ok
}

// Verifie le taux de rebond par page
async function checkBounceRate(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Alert[]> {
  const alerts: Alert[] = []
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()

  const { data: pageViews } = await supabase
    .from('analytics_events')
    .select('session_id, page_path')
    .eq('project', 'ces')
    .eq('event_type', 'pageview')
    .gte('created_at', oneHourAgo)

  if (!pageViews?.length) return alerts

  // Grouper par page
  const pageStats = new Map<
    string,
    { sessions: Set<string>; singlePage: Set<string> }
  >()

  for (const pv of pageViews) {
    const path = pv.page_path as string
    const sid = pv.session_id as string
    if (!pageStats.has(path)) {
      pageStats.set(path, { sessions: new Set(), singlePage: new Set() })
    }
    pageStats.get(path)!.sessions.add(sid)
  }

  // Compter les pages par session pour identifier les rebonds
  const sessionPages = new Map<string, Set<string>>()
  for (const pv of pageViews) {
    const sid = pv.session_id as string
    const path = pv.page_path as string
    if (!sessionPages.has(sid)) sessionPages.set(sid, new Set())
    sessionPages.get(sid)!.add(path)
  }

  for (const [path, stats] of pageStats) {
    for (const sid of stats.sessions) {
      if (sessionPages.get(sid)?.size === 1) {
        stats.singlePage.add(sid)
      }
    }
  }

  for (const [path, stats] of pageStats) {
    const total = stats.sessions.size
    if (total < THRESHOLDS.minPageViews) continue

    const bounceRate = Math.round(
      (stats.singlePage.size / total) * 100
    )
    if (bounceRate > THRESHOLDS.bounceRate) {
      alerts.push({
        metric: 'Taux de rebond',
        value: `${bounceRate}%`,
        threshold: `${THRESHOLDS.bounceRate}%`,
        page: path,
      })
    }
  }

  return alerts
}

// Verifie les erreurs JS dans la derniere heure
async function checkJsErrors(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Alert[]> {
  const alerts: Alert[] = []
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()

  const { count } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('project', 'ces')
    .eq('event_type', 'js_error')
    .gte('created_at', oneHourAgo)

  if (count && count > THRESHOLDS.jsErrors) {
    alerts.push({
      metric: 'Erreurs JS (derniere heure)',
      value: `${count}`,
      threshold: `${THRESHOLDS.jsErrors}`,
      page: '(toutes pages)',
    })
  }

  return alerts
}

// Calcule le LCP mobile (resume hebdomadaire)
async function checkLcpMobile(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Alert[]> {
  const alerts: Alert[] = []
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 3600_000
  ).toISOString()

  const { data: lcpEvents } = await supabase
    .from('analytics_events')
    .select('event_data, page_path')
    .eq('project', 'ces')
    .eq('event_type', 'web_vital')
    .eq('device_type', 'mobile')
    .gte('created_at', oneWeekAgo)

  if (!lcpEvents?.length) return alerts

  const lcpByPage = new Map<string, number[]>()
  for (const evt of lcpEvents) {
    const data = evt.event_data as Record<string, unknown>
    if (data?.name !== 'LCP') continue
    const val = Number(data?.value)
    if (isNaN(val)) continue
    const path = evt.page_path as string
    if (!lcpByPage.has(path)) lcpByPage.set(path, [])
    lcpByPage.get(path)!.push(val)
  }

  for (const [path, values] of lcpByPage) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    if (avg > THRESHOLDS.lcpMobile) {
      alerts.push({
        metric: 'LCP mobile (moyenne semaine)',
        value: `${(avg / 1000).toFixed(1)}s`,
        threshold: `${THRESHOLDS.lcpMobile / 1000}s`,
        page: path,
      })
    }
  }

  return alerts
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const [bounceAlerts, errorAlerts, lcpAlerts] = await Promise.all([
      checkBounceRate(supabase),
      checkJsErrors(supabase),
      checkLcpMobile(supabase),
    ])

    const immediateAlerts = [...bounceAlerts, ...errorAlerts]
    const sent: Alert[] = []

    for (const alert of immediateAlerts) {
      const ok = await sendTelegram(alert)
      if (ok) sent.push(alert)
    }

    return NextResponse.json({
      project: PROJECT,
      timestamp: new Date().toISOString(),
      immediate: {
        total: immediateAlerts.length,
        sent: sent.length,
        alerts: immediateAlerts,
      },
      weekly: {
        lcp_mobile: lcpAlerts,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
