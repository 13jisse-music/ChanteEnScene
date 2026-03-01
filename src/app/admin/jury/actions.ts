'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { juryInvitationEmail } from '@/lib/emails'
import { requireAdmin } from '@/lib/security'

export async function addJuror(sessionId: string, firstName: string, lastName: string, role: string, email: string, appUrl: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const cleanEmail = email.trim().toLowerCase() || null

  const { data, error } = await supabase
    .from('jurors')
    .insert({
      session_id: sessionId,
      first_name: firstName,
      last_name: lastName,
      role,
      email: cleanEmail,
    })
    .select('id, qr_token')
    .single()

  if (error) return { error: error.message }

  // Auto-send invitation email if juror has an email
  let emailSent = false
  if (cleanEmail && data) {
    try {
      const result = await sendJuryInvitation(data.id, appUrl)
      emailSent = !result.error
    } catch {
      // Email failure should not block juror creation
    }
  }

  revalidatePath('/admin/jury')
  return { success: true, juror: data, emailSent }
}

export async function toggleJuror(jurorId: string, isActive: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('jurors')
    .update({ is_active: isActive })
    .eq('id', jurorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury')
  return { success: true }
}

export async function sendJuryInvitation(jurorId: string, appUrl: string) {
  await requireAdmin()
  // Validate appUrl to prevent URL injection
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const safeAppUrl = appUrl.startsWith('http://localhost') || appUrl.startsWith('https://') ? appUrl : siteUrl
  const supabase = createAdminClient()

  const { data: juror } = await supabase
    .from('jurors')
    .select('*, sessions(name)')
    .eq('id', jurorId)
    .single()

  if (!juror) return { error: 'Juré non trouvé' }
  if (!juror.email) return { error: 'Ce juré n\'a pas d\'email' }

  const session = (juror as Record<string, unknown>).sessions as { name: string }
  const jurorName = `${juror.first_name || ''} ${juror.last_name || ''}`.trim() || 'Juré'
  const juryUrl = `${safeAppUrl}/jury/${juror.qr_token}`
  const loginUrl = `${safeAppUrl}/jury`

  const { subject, html } = juryInvitationEmail({
    jurorName,
    role: juror.role,
    sessionName: session.name,
    juryUrl,
    loginUrl,
  })

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: juror.email,
    subject,
    html,
  })

  if (error) return { error: `Échec d'envoi: ${error.message}` }

  return { success: true }
}

export async function deleteJuror(jurorId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('jurors')
    .delete()
    .eq('id', jurorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury')
  return { success: true }
}

export async function setJuryVotingDeadline(sessionId: string, deadline: string | null) {
  await requireAdmin()
  const supabase = createAdminClient()

  // Get current config
  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = { ...(session.config as Record<string, unknown> || {}), jury_voting_deadline: deadline }

  const { error } = await supabase
    .from('sessions')
    .update({ config })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury')
  return { success: true }
}

export async function sendJuryReminder(sessionId: string, jurorId?: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  // Get session info
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  // Get jurors to remind
  let query = supabase
    .from('jurors')
    .select('id, first_name, last_name, email, qr_token')
    .eq('session_id', sessionId)
    .eq('role', 'online')
    .eq('is_active', true)

  if (jurorId) {
    query = query.eq('id', jurorId)
  }

  const { data: jurors } = await query
  if (!jurors || jurors.length === 0) return { error: 'Aucun juré à relancer' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const resend = getResend()
  let sent = 0

  // Get candidate count for context
  const { count } = await supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['approved', 'semifinalist', 'finalist'])

  const config = (session.config || {}) as Record<string, unknown>
  const deadline = config.jury_voting_deadline as string | undefined

  for (const j of jurors) {
    if (!j.email) continue

    // Count their votes
    const { count: voteCount } = await supabase
      .from('jury_scores')
      .select('id', { count: 'exact', head: true })
      .eq('juror_id', j.id)

    const remaining = (count || 0) - (voteCount || 0)
    if (remaining <= 0) continue // Already voted for all

    const jurorName = `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Juré'
    const juryUrl = `${siteUrl}/jury/${j.qr_token}`

    const deadlineText = deadline
      ? `\n\nDate limite : ${new Date(deadline).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
      : ''

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: j.email,
        subject: `Rappel — ${remaining} candidat${remaining > 1 ? 's' : ''} en attente de votre vote`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#0d0b1a;color:#fff;border-radius:16px">
          <h1 style="font-size:18px;margin:0 0 8px">
            <span style="color:#fff">Chant</span><span style="color:#7ec850">En</span><span style="color:#e91e8c">Scène</span>
          </h1>
          <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px">${session.name}</p>
          <p style="font-size:14px;line-height:1.6">Bonjour ${jurorName},</p>
          <p style="font-size:14px;line-height:1.6">${remaining} candidat${remaining > 1 ? 's attendent' : ' attend'} encore votre vote ! Votre avis compte pour la sélection des demi-finalistes.${deadlineText}</p>
          <p style="margin:24px 0;text-align:center">
            <a href="${juryUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:14px">
              Voter maintenant
            </a>
          </p>
          <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:32px">ChanteEnScène — Concours de chant</p>
        </div>`,
      })
      sent++
      // Rate limit
      await new Promise((r) => setTimeout(r, 600))
    } catch {
      // Continue with next juror
    }
  }

  revalidatePath('/admin/jury')
  return { success: true, sent, total: jurors.filter((j) => j.email).length }
}
