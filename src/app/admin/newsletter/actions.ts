'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/security'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { newsletterEmail } from '@/lib/emails'
import { revalidatePath } from 'next/cache'

type CampaignTarget = 'all' | 'voluntary' | 'legacy'

export async function createCampaign(
  sessionId: string,
  subject: string,
  body: string,
  imageUrl: string,
  target: CampaignTarget
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      session_id: sessionId,
      subject: subject.trim(),
      body: body.trim(),
      image_url: imageUrl.trim() || null,
      target,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/newsletter')
  return { success: true, campaignId: data.id }
}

export async function deleteCampaign(campaignId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('email_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('status', 'draft')

  if (error) return { error: error.message }

  revalidatePath('/admin/newsletter')
  return { success: true }
}

export async function sendTestCampaign(campaignId: string) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) return { error: 'Campagne introuvable' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const { html } = newsletterEmail({
    subject: campaign.subject,
    body: campaign.body,
    imageUrl: campaign.image_url || undefined,
    unsubscribeUrl: `${siteUrl}/api/unsubscribe?token=test-preview`,
  })

  const { error: sendError } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: admin.email,
    subject: `[TEST] ${campaign.subject}`,
    html,
  })

  if (sendError) return { error: sendError.message }
  return { success: true }
}

export async function sendCampaign(campaignId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: campaign, error: campError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign) return { error: 'Campagne introuvable' }
  if (campaign.status === 'sent') return { error: 'Campagne deja envoyee' }
  if (campaign.status === 'sending') return { error: 'Envoi en cours' }

  // Build subscriber query based on target
  let query = supabase
    .from('email_subscribers')
    .select('email, unsubscribe_token')
    .eq('session_id', campaign.session_id)
    .eq('is_active', true)

  if (campaign.target === 'voluntary') {
    query = query.neq('source', 'legacy_import')
  } else if (campaign.target === 'legacy') {
    query = query.eq('source', 'legacy_import')
  }

  const { data: subscribers, error: subError } = await query

  if (subError) return { error: subError.message }
  if (!subscribers || subscribers.length === 0) return { error: 'Aucun abonne actif' }

  // Mark as sending
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', total_recipients: subscribers.length })
    .eq('id', campaignId)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const resend = getResend()
  let sent = 0
  let errors = 0

  for (const sub of subscribers) {
    try {
      const { html } = newsletterEmail({
        subject: campaign.subject,
        body: campaign.body,
        imageUrl: campaign.image_url || undefined,
        unsubscribeUrl: `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`,
      })

      const { error: sendErr } = await resend.emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject: campaign.subject,
        html,
        headers: {
          'List-Unsubscribe': `<${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}>`,
        },
      })

      if (sendErr) {
        errors++
      } else {
        sent++
      }

      // Rate limit: 600ms between sends (Resend free plan: 2 req/s)
      await new Promise((r) => setTimeout(r, 600))
    } catch {
      errors++
    }
  }

  // Update campaign status
  await supabase
    .from('email_campaigns')
    .update({
      status: errors === subscribers.length ? 'failed' : 'sent',
      total_sent: sent,
      total_errors: errors,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  revalidatePath('/admin/newsletter')
  return { success: true, sent, errors }
}
