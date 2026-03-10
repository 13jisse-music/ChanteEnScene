'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { candidateApprovedEmail, correctionRequestEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'
import { requireAdmin, escapeHtml } from '@/lib/security'
import { goUrl } from '@/lib/email-utils'
import { sendSmtp } from '@/lib/smtp'
import { randomUUID } from 'crypto'

export async function updateCandidateStatus(candidateId: string, status: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', candidateId)

  if (error) {
    return { error: error.message }
  }

  // Send approval notification email when status changes to 'approved'
  if (status === 'approved') {
    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('first_name, last_name, stage_name, email, slug, session_id')
        .eq('id', candidateId)
        .single()

      if (candidate?.email) {
        const { data: session } = await supabase
          .from('sessions')
          .select('name, slug')
          .eq('id', candidate.session_id)
          .single()

        const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
        const sessionSlug = session?.slug || ''
        const profileUrl = goUrl(siteUrl, `/${sessionSlug}/candidats/${candidate.slug}`, 'profile')
        const galleryUrl = goUrl(siteUrl, `/${sessionSlug}/candidats`, 'approved')
        const referralUrl = goUrl(siteUrl, `/${sessionSlug}/inscription?ref=${candidate.slug}`, 'approved')

        const { subject, html } = candidateApprovedEmail({
          candidateName: escapeHtml(displayName),
          sessionName: escapeHtml(session?.name || 'ChanteEnScène'),
          profileUrl,
          galleryUrl,
          referralUrl,
        })

        await getResend().emails.send({
          from: FROM_EMAIL,
          to: candidate.email,
          subject,
          html,
        })

        // Send push notification to online jurors
        await sendPushNotifications({
          sessionId: candidate.session_id,
          role: 'jury',
          payload: {
            title: 'Nouveau candidat a evaluer !',
            body: `${displayName} vient d'etre inscrit(e). Decouvrez sa candidature et votez !`,
            url: `/jury`,
            tag: `new-candidate-${candidateId}`,
          },
        })
      }
    } catch {
      // Email/push failure should not block status update
    }
  }

  revalidatePath('/admin/candidats')
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleVideoPublic(candidateId: string, videoPublic: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ video_public: videoPublic })
    .eq('id', candidateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/candidats')
  return { success: true }
}

export async function toggleImageSocialConsent(candidateId: string, consent: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ image_social_consent: consent })
    .eq('id', candidateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/candidats')
  return { success: true }
}

export async function deleteCandidate(candidateId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  // Clean up all FK references before deleting
  await supabase.from('votes').delete().eq('candidate_id', candidateId)
  await supabase.from('live_votes').delete().eq('candidate_id', candidateId)
  await supabase.from('lineup').delete().eq('candidate_id', candidateId)
  await supabase.from('jury_scores').delete().eq('candidate_id', candidateId)
  await supabase.from('photos').delete().eq('tag_candidate_id', candidateId)
  await supabase
    .from('live_events')
    .update({ current_candidate_id: null })
    .eq('current_candidate_id', candidateId)
  await supabase
    .from('live_events')
    .update({ winner_candidate_id: null, winner_revealed_at: null })
    .eq('winner_candidate_id', candidateId)

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/candidats')
  revalidatePath('/admin')
  return { success: true }
}

export async function requestCorrection(candidateId: string, fields: string[]) {
  await requireAdmin()
  const supabase = createAdminClient()

  if (!fields.length) return { error: 'Sélectionnez au moins un champ à corriger' }

  // Fetch candidate + session
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, email, session_id, correction_token, status')
    .eq('id', candidateId)
    .single()

  if (!candidate) return { error: 'Candidat introuvable' }
  if (candidate.status === 'approved') return { error: 'Candidat déjà approuvé' }

  // Reuse existing token or generate a new one
  const token = candidate.correction_token || randomUUID()

  const { error } = await supabase
    .from('candidates')
    .update({ correction_token: token, correction_fields: fields, correction_submitted_at: null })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  // Fetch session info for email
  const { data: session } = await supabase
    .from('sessions')
    .select('name')
    .eq('id', candidate.session_id)
    .single()

  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const correctionUrl = `${siteUrl}/corriger/${token}`

  // Send correction email
  try {
    const { subject, html } = correctionRequestEmail({
      candidateName: escapeHtml(displayName),
      sessionName: escapeHtml(session?.name || 'ChanteEnScène'),
      correctionUrl,
      fields,
    })

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: candidate.email,
      subject,
      html,
    })
  } catch {
    // Email failure should not block the action
  }

  revalidatePath('/admin/candidats')
  return { success: true, token }
}

/** Envoie un email de distance via IONOS SMTP avec pixel de tracking */
export async function sendDistanceEmail(
  candidateId: string,
  emailType: 'red' | 'orange',
  subject: string,
  body: string,
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, city')
    .eq('id', candidateId)
    .single()

  if (!candidate) return { error: 'Candidat introuvable' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const trackingId = `distance-${candidateId}-${Date.now()}`

  // Build HTML email with tracking pixel
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:Inter,Arial,sans-serif;background:#0d0b1a;color:#fafafa;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#161228;border-radius:16px;border:1px solid #2a2545;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#e91e8c 0%,#8b5cf6 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;font-size:22px;color:#fff;">ChanteEnScène</h1>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Aubagne 2026</p>
    </div>
    <div style="padding:32px 24px;">
      ${body.split('\n').map(line =>
        line.trim() ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#d1d5db;">${escapeHtml(line)}</p>` : ''
      ).join('')}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #2a2545;text-align:center;">
      <p style="margin:0;font-size:11px;color:#6b7280;">
        ChanteEnScène — <a href="${siteUrl}" style="color:#e91e8c;text-decoration:none;">chantenscene.fr</a>
      </p>
    </div>
  </div>
  <img src="${siteUrl}/api/track/open?cid=${encodeURIComponent(trackingId)}&e=${encodeURIComponent(candidate.email)}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`

  const { error: sendErr } = await sendSmtp({
    to: candidate.email,
    subject,
    html,
  })

  if (sendErr) return { error: sendErr }

  // Log the send event
  await supabase.from('email_events').insert({
    campaign_id: trackingId,
    subscriber_email: candidate.email,
    event_type: 'send',
    metadata: {
      type: emailType === 'red' ? 'distance_inform' : 'distance_remind',
      candidate_id: candidateId,
      city: candidate.city,
    },
  })

  revalidatePath('/admin/candidats')
  return { success: true, trackingId }
}
