export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { inscriptionReminderEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'
import { publishEverywhere } from '@/lib/social'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'

  // Get active session in draft status
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, status, config')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No sessions found', sent: false })
  }

  const session = sessions[0]
  const config = (session.config || {}) as Record<string, unknown>
  const registrationStart = config.registration_start as string | undefined

  // Only send if session is in draft (before registration opens)
  if (session.status !== 'draft') {
    return NextResponse.json({ message: 'Session not in draft status', sent: false })
  }

  if (!registrationStart) {
    return NextResponse.json({ message: 'No registration_start date configured', sent: false })
  }

  // Calculate days left (calendar days, Paris timezone)
  const today = new Date()
  const todayStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) // YYYY-MM-DD
  const targetDate = new Date(registrationStart + 'T00:00:00')
  const todayDate = new Date(todayStr + 'T00:00:00')
  const daysLeft = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

  // Only send at J-5 and Jour J
  if (daysLeft !== 5 && daysLeft !== 0) {
    return NextResponse.json({ message: `${daysLeft} days left — no notification today`, sent: false })
  }

  // Dedupe: check if already sent today
  const lastSent = config.inscription_reminder_last_sent as string | undefined
  if (lastSent === todayStr) {
    return NextResponse.json({ message: 'Already sent today', sent: false })
  }

  // Format the opening date in French
  const formattedDate = targetDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const inscriptionUrl = `${siteUrl}/${session.slug}/inscription`

  // --- Auto-open registrations on Jour J ---
  let autoOpened = false
  if (daysLeft === 0) {
    const { error: statusError } = await supabase
      .from('sessions')
      .update({ status: 'registration_open' })
      .eq('id', session.id)

    if (!statusError) {
      autoOpened = true
      // Also update config date
      await supabase
        .from('sessions')
        .update({ config: { ...config, registration_start: todayStr } })
        .eq('id', session.id)
    }
  }

  // --- Send push notification ---
  const pushBody = daysLeft === 0
    ? 'Les inscriptions sont ouvertes ! Inscrivez-vous maintenant 🎤'
    : `Les inscriptions ouvrent dans 5 jours ! Préparez votre candidature 🎶`

  const pushResult = await sendPushNotifications({
    sessionId: session.id,
    role: 'public',
    payload: {
      title: 'ChanteEnScène',
      body: pushBody,
      url: daysLeft === 0 ? inscriptionUrl : siteUrl,
      tag: `inscription-reminder-j${daysLeft}`,
    },
  })

  // --- Send emails to subscribers ---
  const { data: subscribers } = await supabase
    .from('email_subscribers')
    .select('id, email, unsubscribe_token')
    .eq('session_id', session.id)
    .eq('is_active', true)

  let emailsSent = 0
  let emailsFailed = 0

  if (subscribers && subscribers.length > 0) {
    const resend = getResend()

    for (const sub of subscribers) {
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const { subject, html } = inscriptionReminderEmail({
        sessionName: session.name,
        daysLeft,
        formattedDate,
        inscriptionUrl,
        siteUrl,
        unsubscribeUrl,
      })

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: sub.email,
          subject,
          html,
        })
        emailsSent++
      } catch {
        emailsFailed++
      }

      // Rate limit: 600ms between emails (Resend allows 2 req/s)
      if (subscribers.indexOf(sub) < subscribers.length - 1) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }
  }

  // --- Publish on Facebook + Instagram on Jour J ---
  let socialPosted = false
  if (daysLeft === 0) {
    try {
      const socialSiteUrl = siteUrl.includes('localhost') ? 'https://chantenscene.fr' : siteUrl
      const socialMessage = `🎤 Les inscriptions pour ${session.name} sont officiellement ouvertes !\n\nVous avez du talent et envie de monter sur scène ? C'est le moment ! Inscrivez-vous dès maintenant 👉 ${socialSiteUrl}/${session.slug}/inscription\n\n#ChanteEnScène #ConcoursDeChant #Aubagne #Inscription`
      await publishEverywhere(socialMessage, undefined, `${socialSiteUrl}/${session.slug}/inscription`)
      socialPosted = true
    } catch {
      // Silent — social post failure should not block the rest
    }
  }

  // Mark as sent today
  await supabase
    .from('sessions')
    .update({
      config: { ...config, inscription_reminder_last_sent: todayStr },
    })
    .eq('id', session.id)

  return NextResponse.json({
    message: `Inscription reminder J-${daysLeft} sent`,
    daysLeft,
    autoOpened,
    socialPosted,
    pushSent: pushResult.sent,
    pushFailed: pushResult.failed,
    emailsSent,
    emailsFailed,
    totalSubscribers: subscribers?.length || 0,
  })
}
