import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { juryWeeklyRecapEmail } from '@/lib/emails'

// Protect cron with a secret key
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // Dev mode: allow without secret
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chanteenscene.fr'
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Find active sessions where jury voting is not closed
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, name, slug, config')
    .eq('is_active', true)

  // Filter out sessions where jury voting is explicitly closed
  const sessions = (allSessions || []).filter((s) => {
    const config = (s.config || {}) as Record<string, unknown>
    return !config.jury_online_voting_closed
  })

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No active sessions', sent: 0 })
  }

  let totalSent = 0

  for (const session of sessions) {
    // Get all online jurors with email
    const { data: jurors } = await supabase
      .from('jurors')
      .select('id, first_name, last_name, email, qr_token')
      .eq('session_id', session.id)
      .eq('role', 'online')
      .eq('is_active', true)
      .not('email', 'is', null)

    if (!jurors || jurors.length === 0) continue

    // Get all approved candidates for this session
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, stage_name, category, song_title, created_at')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .order('created_at', { ascending: false })

    if (!candidates || candidates.length === 0) continue

    // New candidates this week
    const newCandidates = candidates.filter((c) => c.created_at >= oneWeekAgo)

    for (const juror of jurors) {
      if (!juror.email) continue

      // Get this juror's scores
      const { data: scores } = await supabase
        .from('jury_scores')
        .select('candidate_id')
        .eq('juror_id', juror.id)
        .eq('event_type', 'online')

      const votedIds = new Set((scores || []).map((s) => s.candidate_id))
      const votedCount = votedIds.size
      const remainingCount = candidates.length - votedCount

      // Skip if nothing new and everything voted
      if (newCandidates.length === 0 && remainingCount === 0) continue

      const juryUrl = `${siteUrl}/jury/${juror.qr_token}`
      const jurorName = `${juror.first_name} ${juror.last_name}`

      const { subject, html } = juryWeeklyRecapEmail({
        jurorName,
        sessionName: session.name,
        newCandidatesCount: newCandidates.length,
        totalCandidates: candidates.length,
        votedCount,
        remainingCount,
        juryUrl,
        newCandidates: newCandidates.map((c) => ({
          name: c.stage_name || `${c.first_name} ${c.last_name}`,
          category: c.category,
          songTitle: c.song_title,
        })),
      })

      try {
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: juror.email,
          subject,
          html,
        })
        totalSent++
      } catch {
        // Continue with other jurors
      }
    }
  }

  return NextResponse.json({ message: 'Jury recap emails sent', sent: totalSent })
}
