export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { healthCheckEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export interface CheckResult {
  category: string
  label: string
  status: 'ok' | 'warn' | 'ko'
  value: string
  detail?: string
}

const SUPABASE_PROJECT_REF = 'xarrchsokuhobwqvcnkg'

async function runSQL<T>(query: string): Promise<T[]> {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return []
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function checkPage(url: string, expectedStatus = 200): Promise<{ ok: boolean; status: number; ms: number }> {
  const start = Date.now()
  try {
    const res = await fetch(url, { redirect: 'manual', cache: 'no-store' })
    return { ok: res.status === expectedStatus, status: res.status, ms: Date.now() - start }
  } catch {
    return { ok: false, status: 0, ms: Date.now() - start }
  }
}

export async function runHealthCheck() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const supabase = createAdminClient()
  const checks: CheckResult[] = []

  // ── 1. Pages publiques ──
  const pages = [
    { path: '/', label: 'Accueil' },
    { path: '/palmares', label: 'Palmar\u00e8s' },
    { path: '/editions', label: '\u00c9ditions' },
    { path: '/presse', label: 'Presse' },
    { path: '/mentions-legales', label: 'Mentions l\u00e9gales' },
    { path: '/reglement', label: 'R\u00e8glement' },
    { path: '/confidentialite', label: 'Confidentialit\u00e9' },
  ]

  const pageResults = await Promise.all(
    pages.map(p => checkPage(`${siteUrl}${p.path}`))
  )
  const adminResult = await checkPage(`${siteUrl}/admin`, 307)

  for (let i = 0; i < pages.length; i++) {
    const r = pageResults[i]
    checks.push({
      category: 'Pages',
      label: pages[i].label,
      status: r.ok ? 'ok' : 'ko',
      value: `HTTP ${r.status}`,
      detail: `${r.ms}ms`,
    })
  }
  checks.push({
    category: 'Pages',
    label: 'Admin (redirect)',
    status: adminResult.ok ? 'ok' : (adminResult.status === 200 ? 'ok' : 'ko'),
    value: `HTTP ${adminResult.status}`,
    detail: `${adminResult.ms}ms`,
  })

  // ── 2. APIs (s\u00e9curit\u00e9) ──
  const apiChecks = [
    { path: '/api/cron/admin-report', label: 'Cron admin-report', expected: 401 },
    { path: '/api/cron/backup', label: 'Cron backup', expected: 401 },
    { path: '/api/cron/social-post', label: 'Cron social-post', expected: 401 },
    { path: '/api/admin/upload-image', label: 'Admin upload-image', expected: 401 },
  ]

  const apiResults = await Promise.all(
    apiChecks.map(a => checkPage(`${siteUrl}${a.path}`, a.expected))
  )

  for (let i = 0; i < apiChecks.length; i++) {
    const r = apiResults[i]
    checks.push({
      category: 'APIs',
      label: apiChecks[i].label,
      status: r.ok ? 'ok' : 'ko',
      value: `HTTP ${r.status}`,
      detail: r.ok ? 'Prot\u00e9g\u00e9' : `Attendu ${apiChecks[i].expected}`,
    })
  }

  // ── 3. Supabase BDD ──
  const DB_LIMIT = 500 * 1024 * 1024
  const STORAGE_LIMIT = 1024 * 1024 * 1024

  const [dbSizeRows, tables, buckets, lastBackup] = await Promise.all([
    runSQL<{ db_size_bytes: string }>(`SELECT pg_database_size('postgres') as db_size_bytes`),
    runSQL<{ table_name: string; row_count: string }>(
      `SELECT relname as table_name, n_live_tup as row_count FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC`
    ),
    runSQL<{ bucket_id: string; file_count: string; total_bytes: string }>(
      `SELECT bucket_id, count(*) as file_count, coalesce(sum((metadata->>'size')::bigint), 0) as total_bytes FROM storage.objects WHERE metadata->>'size' IS NOT NULL GROUP BY bucket_id ORDER BY total_bytes DESC`
    ),
    runSQL<{ created_at: string }>(
      `SELECT created_at FROM storage.objects WHERE bucket_id = 'backups' ORDER BY created_at DESC LIMIT 1`
    ),
  ])

  const dbSizeBytes = parseInt(dbSizeRows[0]?.db_size_bytes || '0')
  const dbPct = dbSizeBytes > 0 ? (dbSizeBytes / DB_LIMIT * 100).toFixed(1) : '?'
  const formatMB = (b: number) => (b / (1024 * 1024)).toFixed(1)

  checks.push({
    category: 'Supabase',
    label: 'Base de donn\u00e9es',
    status: dbSizeBytes === 0 ? 'ko' : (dbSizeBytes / DB_LIMIT > 0.8 ? 'warn' : 'ok'),
    value: `${formatMB(dbSizeBytes)} MB / 500 MB (${dbPct}%)`,
  })

  const totalRows = tables.reduce((s, t) => s + parseInt(t.row_count), 0)
  checks.push({
    category: 'Supabase',
    label: 'Tables',
    status: 'ok',
    value: `${tables.length} tables, ${totalRows.toLocaleString('fr-FR')} lignes`,
  })

  // Storage
  const totalStorageBytes = buckets.reduce((s, b) => s + parseInt(b.total_bytes), 0)
  const storagePct = (totalStorageBytes / STORAGE_LIMIT * 100).toFixed(1)

  checks.push({
    category: 'Supabase',
    label: 'Storage',
    status: totalStorageBytes / STORAGE_LIMIT > 0.8 ? 'warn' : 'ok',
    value: `${formatMB(totalStorageBytes)} MB / 1 GB (${storagePct}%)`,
  })

  for (const b of buckets) {
    const bytes = parseInt(b.total_bytes)
    checks.push({
      category: 'Supabase',
      label: `Bucket: ${b.bucket_id}`,
      status: 'ok',
      value: `${parseInt(b.file_count)} fichiers \u2014 ${formatMB(bytes)} MB`,
    })
  }

  // Backup
  if (lastBackup[0]) {
    const daysAgo = Math.floor((Date.now() - new Date(lastBackup[0].created_at).getTime()) / 86400000)
    checks.push({
      category: 'Supabase',
      label: 'Dernier backup',
      status: daysAgo <= 8 ? 'ok' : 'warn',
      value: `Il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}`,
      detail: daysAgo > 8 ? 'Backup trop ancien !' : undefined,
    })
  } else {
    checks.push({
      category: 'Supabase',
      label: 'Dernier backup',
      status: 'ko',
      value: 'Aucun backup trouv\u00e9',
    })
  }

  // ── 4. Push notifications ──
  const { data: pushSubs } = await supabase.from('push_subscriptions').select('role')
  const pushByRole: Record<string, number> = {}
  for (const s of pushSubs || []) {
    pushByRole[s.role] = (pushByRole[s.role] || 0) + 1
  }
  const totalPush = (pushSubs || []).length

  checks.push({
    category: 'Push',
    label: 'Abonn\u00e9s push',
    status: totalPush > 0 ? 'ok' : 'warn',
    value: `${totalPush} total`,
    detail: Object.entries(pushByRole).map(([r, c]) => `${c} ${r}`).join(', '),
  })

  // VAPID
  const vapidOk = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
  checks.push({
    category: 'Push',
    label: 'Cl\u00e9s VAPID',
    status: vapidOk ? 'ok' : 'ko',
    value: vapidOk ? 'Pr\u00e9sentes' : 'Manquantes !',
  })

  // Service Worker
  const swResult = await checkPage(`${siteUrl}/sw.js`)
  checks.push({
    category: 'Push',
    label: 'Service Worker',
    status: swResult.ok ? 'ok' : 'ko',
    value: `HTTP ${swResult.status}`,
  })

  // ── 5. Emails ──
  const { count: emailCount } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  checks.push({
    category: 'Emails',
    label: 'Abonn\u00e9s email actifs',
    status: (emailCount || 0) > 0 ? 'ok' : 'warn',
    value: `${emailCount || 0}`,
  })

  const { data: lastCampaign } = await supabase
    .from('email_campaigns')
    .select('subject, status, sent_count, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (lastCampaign && lastCampaign[0]) {
    checks.push({
      category: 'Emails',
      label: 'Derni\u00e8re campagne',
      status: lastCampaign[0].status === 'sent' ? 'ok' : 'warn',
      value: `${lastCampaign[0].subject}`,
      detail: `${lastCampaign[0].sent_count} envoy\u00e9s \u2014 ${lastCampaign[0].status}`,
    })
  }

  // ── Verdict ──
  const koCount = checks.filter(c => c.status === 'ko').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const okCount = checks.filter(c => c.status === 'ok').length
  const globalStatus = koCount > 0 ? 'ko' : warnCount > 0 ? 'warn' : 'ok'

  return {
    checks,
    globalStatus,
    summary: { ok: okCount, warn: warnCount, ko: koCount, total: checks.length },
    dbSizeBytes,
    dbLimitBytes: DB_LIMIT,
    totalStorageBytes,
    storageLimitBytes: STORAGE_LIMIT,
    pushByRole,
    emailCount: emailCount || 0,
    tables: tables.map(t => ({ name: t.table_name, rows: parseInt(t.row_count) })).slice(0, 10),
    buckets: buckets.map(b => ({ id: b.bucket_id, files: parseInt(b.file_count), bytes: parseInt(b.total_bytes) })),
  }
}

export async function sendHealthCheckReport(result: Awaited<ReturnType<typeof runHealthCheck>>) {
  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'

  // Get session for email + push
  let { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, config')
    .eq('is_active', true)

  if (!sessions || sessions.length === 0) {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('id, name, config')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessions = fallback
  }

  const session = sessions?.[0]
  const reportEmail = (session?.config as Record<string, unknown>)?.report_email as string || ''

  // Send email
  let emailSent = false
  if (reportEmail) {
    const { subject, html } = healthCheckEmail({
      checks: result.checks,
      summary: result.summary,
      globalStatus: result.globalStatus as 'ok' | 'warn' | 'ko',
      dbSizeBytes: result.dbSizeBytes,
      dbLimitBytes: result.dbLimitBytes,
      totalStorageBytes: result.totalStorageBytes,
      storageLimitBytes: result.storageLimitBytes,
      tables: result.tables,
      buckets: result.buckets,
      pushByRole: result.pushByRole,
      emailCount: result.emailCount,
      adminUrl: `${siteUrl}/admin/infra`,
    })

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: reportEmail,
        subject,
        html,
      })
      emailSent = true
    } catch {
      // Email failed
    }
  }

  // Send push
  let pushSent = 0
  if (session) {
    const statusEmoji = result.globalStatus === 'ok' ? '\u2705' : result.globalStatus === 'warn' ? '\u26a0\ufe0f' : '\u274c'
    const pushResult = await sendPushNotifications({
      sessionId: session.id,
      role: 'admin',
      payload: {
        title: `${statusEmoji} Checkup ${result.globalStatus === 'ok' ? 'OK' : 'attention'}`,
        body: `${result.summary.ok}/${result.summary.total} OK${result.summary.warn > 0 ? `, ${result.summary.warn} warnings` : ''}${result.summary.ko > 0 ? `, ${result.summary.ko} erreurs` : ''}. Rapport envoy\u00e9 par email.`,
        url: `${siteUrl}/admin/infra`,
      },
    })
    pushSent = pushResult.sent
  }

  return { emailSent, pushSent }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runHealthCheck()
  const { emailSent, pushSent } = await sendHealthCheckReport(result)

  return NextResponse.json({
    message: 'Health check complete',
    globalStatus: result.globalStatus,
    summary: result.summary,
    emailSent,
    pushSent,
  })
}
