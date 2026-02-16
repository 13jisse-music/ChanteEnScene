'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { juryInvitationEmail } from '@/lib/emails'

export async function addJuror(sessionId: string, firstName: string, lastName: string, role: string, email: string, appUrl: string) {
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
  const juryUrl = `${appUrl}/jury/${juror.qr_token}`
  const loginUrl = `${appUrl}/jury`

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
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('jurors')
    .delete()
    .eq('id', jurorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury')
  return { success: true }
}
