export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { adminReportEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

const FREQUENCY_MS: Record<string, number> = {
  daily: 23 * 60 * 60 * 1000,     // 23h to allow some margin
  weekly: 6.5 * 24 * 60 * 60 * 1000, // 6.5 days
  monthly: 29 * 24 * 60 * 60 * 1000, // 29 days
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'quotidien',
  weekly: 'hebdomadaire',
  monthly: 'mensuel',
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'

  // Get active session (is_active flag, fallback to most recent non-archived)
  let { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, status, config')
    .eq('is_active', true)

  if (!sessions || sessions.length === 0) {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('id, name, slug, status, config')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessions = fallback
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No active sessions', sent: false })
  }

  const session = sessions[0]
  const config = (session.config || {}) as Record<string, unknown>
  const frequency = (config.report_frequency as string) || 'disabled'
  const reportEmail = (config.report_email as string) || ''

  if (frequency === 'disabled' || !reportEmail) {
    return NextResponse.json({ message: 'Reports disabled or no email configured', sent: false })
  }

  // Check if it's time to send
  const lastSent = config.last_report_sent_at as string | undefined
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime()
    const minInterval = FREQUENCY_MS[frequency]
    if (minInterval && elapsed < minInterval) {
      return NextResponse.json({ message: 'Too soon for next report', sent: false })
    }
  }

  // Determine the "since" date based on frequency
  const sinceMs = FREQUENCY_MS[frequency] || 24 * 60 * 60 * 1000
  const sinceDate = new Date(Date.now() - sinceMs).toISOString()

  // ── Collect all stats in parallel ──
  const [
    { count: totalCandidates },
    { count: totalVotes },
    { count: pwaInstalls },
    { count: pushSubscriptions },
    { count: emailSubscribers },
    { count: newCandidatesCount },
    { count: newVotesCount },
    { count: newPwaInstalls },
    { count: newPushSubs },
    { count: newEmailSubs },
    { count: totalPageViews },
    { data: visitorsData },
    { data: pageViewsData },
    { data: recentCandidates },
    { data: allCandidates },
    { data: pwaByPlatform },
    { data: pushByRole },
  ] = await Promise.all([
    // Totals
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
    supabase.from('votes').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
    supabase.from('pwa_installs').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('session_id', session.id).eq('role', 'public'),
    supabase.from('email_subscribers').select('*', { count: 'exact', head: true }).eq('session_id', session.id).eq('is_active', true),
    // New since last report
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('session_id', session.id).gte('created_at', sinceDate),
    supabase.from('votes').select('*', { count: 'exact', head: true }).eq('session_id', session.id).gte('created_at', sinceDate),
    supabase.from('pwa_installs').select('*', { count: 'exact', head: true }).eq('session_id', session.id).gte('created_at', sinceDate),
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('session_id', session.id).eq('role', 'public').gte('created_at', sinceDate),
    supabase.from('email_subscribers').select('*', { count: 'exact', head: true }).eq('session_id', session.id).eq('is_active', true).gte('created_at', sinceDate),
    // Total page views J-1
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('session_id', session.id).gte('created_at', sinceDate),
    // Unique visitors J-1 (fingerprints)
    supabase.from('page_views').select('fingerprint').eq('session_id', session.id).gte('created_at', sinceDate).not('fingerprint', 'is', null),
    // Top pages J-1
    supabase.from('page_views').select('page_path').eq('session_id', session.id).gte('created_at', sinceDate),
    // Recent candidates
    supabase.from('candidates').select('first_name, last_name, stage_name, category, status').eq('session_id', session.id).gte('created_at', sinceDate).order('created_at', { ascending: false }).limit(10),
    // All candidates for status breakdown
    supabase.from('candidates').select('status').eq('session_id', session.id),
    // PWA installs by platform
    supabase.from('pwa_installs').select('platform').eq('session_id', session.id),
    // Push subscriptions by role (all roles)
    supabase.from('push_subscriptions').select('role').eq('session_id', session.id),
  ])

  const newVisitors = visitorsData
    ? new Set(visitorsData.map((r) => r.fingerprint)).size
    : 0

  // Top 5 pages
  const pageCounts: Record<string, number> = {}
  for (const pv of pageViewsData || []) {
    const path = pv.page_path || '/'
    pageCounts[path] = (pageCounts[path] || 0) + 1
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }))

  // Candidate status breakdown
  const statusBreakdown: Record<string, number> = {}
  for (const c of allCandidates || []) {
    statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1
  }

  // PWA platform breakdown
  const platformBreakdown: Record<string, number> = {}
  for (const p of pwaByPlatform || []) {
    const platform = p.platform || 'unknown'
    platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1
  }

  // Push role breakdown
  const pushRoleBreakdown: Record<string, number> = {}
  for (const p of pushByRole || []) {
    pushRoleBreakdown[p.role] = (pushRoleBreakdown[p.role] || 0) + 1
  }

  const period = FREQUENCY_LABELS[frequency] || frequency
  const adminUrl = `${siteUrl}/admin`
  const sessionStatus = (session as { status?: string }).status || 'draft'

  // Fetch recent GitHub commits (last 24h)
  let recentCommits: string[] = []
  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/13jisse-music/ChanteEnScene/commits?since=${sinceDate}&per_page=10`,
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ChanteEnScene-Cron' } }
    )
    if (ghRes.ok) {
      const commits = await ghRes.json() as { commit: { message: string } }[]
      recentCommits = commits.map(c => c.commit.message.split('\n')[0])
    }
  } catch {
    // GitHub API unavailable — skip
  }

  // Build email
  const { subject, html } = adminReportEmail({
    sessionName: session.name,
    sessionStatus,
    period,
    totalCandidates: totalCandidates || 0,
    newCandidates: newCandidatesCount || 0,
    totalVotes: totalVotes || 0,
    newVotes: newVotesCount || 0,
    pwaInstalls: pwaInstalls || 0,
    newPwaInstalls: newPwaInstalls || 0,
    pushSubscriptions: pushSubscriptions || 0,
    newPushSubs: newPushSubs || 0,
    emailSubscribers: emailSubscribers || 0,
    newEmailSubs: newEmailSubs || 0,
    newVisitors,
    totalPageViews: totalPageViews || 0,
    topPages,
    statusBreakdown,
    platformBreakdown,
    pushRoleBreakdown,
    recentCandidateNames: (recentCandidates || []).map((c) => ({
      name: c.stage_name || `${c.first_name} ${c.last_name}`,
      category: c.category,
    })),
    recentCommits,
    config,
    adminUrl,
  })

  // Build push body — only show what's new in last 24h
  const pushParts: string[] = []
  if (newVisitors > 0) pushParts.push(`👀 ${newVisitors} visiteur${newVisitors > 1 ? 's' : ''}`)
  if ((newCandidatesCount || 0) > 0) pushParts.push(`🎤 ${newCandidatesCount} inscription${(newCandidatesCount || 0) > 1 ? 's' : ''}`)
  if ((newVotesCount || 0) > 0) pushParts.push(`❤️ ${newVotesCount} vote${(newVotesCount || 0) > 1 ? 's' : ''}`)
  if ((newPwaInstalls || 0) > 0) pushParts.push(`📲 ${newPwaInstalls} install${(newPwaInstalls || 0) > 1 ? 's' : ''}`)
  if ((newPushSubs || 0) > 0) pushParts.push(`🔔 ${newPushSubs} abo push`)
  if ((newEmailSubs || 0) > 0) pushParts.push(`📧 ${newEmailSubs} abo email`)

  const activityLine = pushParts.length > 0
    ? `Hier : ${pushParts.join(', ')}`
    : 'Aucune activité hier'

  const deployLine = recentCommits.length > 0
    ? `\n🚀 ${recentCommits.length} mise${recentCommits.length > 1 ? 's' : ''} à jour : ${recentCommits[0]}${recentCommits.length > 1 ? ` (+${recentCommits.length - 1})` : ''}`
    : ''

  const pushBody = activityLine + deployLine

  // Send push notification to admin subscribers
  const pushResult = await sendPushNotifications({
    sessionId: session.id,
    role: 'admin',
    payload: {
      title: `Rapport ${period}`,
      body: pushBody,
      url: adminUrl,
    },
  })

  // Send email
  let emailSent = false
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: reportEmail,
      subject,
      html,
    })
    emailSent = true
  } catch {
    // Email sending failed
  }

  // Update last_report_sent_at
  await supabase
    .from('sessions')
    .update({
      config: { ...config, last_report_sent_at: new Date().toISOString() },
    })
    .eq('id', session.id)

  return NextResponse.json({
    message: 'Report sent',
    emailSent,
    pushSent: pushResult.sent,
    stats: {
      totalCandidates: totalCandidates || 0,
      newCandidates: newCandidatesCount || 0,
      totalVotes: totalVotes || 0,
      pwaInstalls: pwaInstalls || 0,
      pushSubscriptions: pushSubscriptions || 0,
    },
  })
}
