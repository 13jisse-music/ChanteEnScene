import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { adminReportEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
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

  // Get active session
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, config')
    .eq('is_active', true)

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

  // Collect stats
  const { count: totalCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const { count: newCandidatesCount } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .gte('created_at', sinceDate)

  const { count: totalVotes } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const { count: newVotesCount } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .gte('created_at', sinceDate)

  const { count: pwaInstalls } = await supabase
    .from('pwa_installs')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const { count: pushSubscriptions } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('role', 'public')

  // Recent candidates for the list
  const { data: recentCandidates } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, category')
    .eq('session_id', session.id)
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(10)

  const period = FREQUENCY_LABELS[frequency] || frequency
  const adminUrl = `${siteUrl}/admin`

  // Build email
  const { subject, html } = adminReportEmail({
    sessionName: session.name,
    period,
    totalCandidates: totalCandidates || 0,
    newCandidates: newCandidatesCount || 0,
    totalVotes: totalVotes || 0,
    newVotes: newVotesCount || 0,
    pwaInstalls: pwaInstalls || 0,
    pushSubscriptions: pushSubscriptions || 0,
    recentCandidateNames: (recentCandidates || []).map((c) => ({
      name: c.stage_name || `${c.first_name} ${c.last_name}`,
      category: c.category,
    })),
    adminUrl,
  })

  // Send push notification to admin subscribers
  const pushResult = await sendPushNotifications({
    sessionId: session.id,
    role: 'admin',
    payload: {
      title: `Rapport ${period}`,
      body: `${totalCandidates || 0} candidats, ${totalVotes || 0} votes, ${pwaInstalls || 0} installs`,
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
