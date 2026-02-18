'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { candidateApprovedEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'
import { requireAdmin, escapeHtml } from '@/lib/security'

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
        const profileUrl = `${siteUrl}/${session?.slug || ''}/candidats/${candidate.slug}`

        const { subject, html } = candidateApprovedEmail({
          candidateName: escapeHtml(displayName),
          sessionName: escapeHtml(session?.name || 'ChanteEnScène'),
          profileUrl,
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
