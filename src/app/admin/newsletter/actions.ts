'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/security'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { sendSmtp } from '@/lib/smtp'
import { newsletterEmail } from '@/lib/emails'
import { goUrl } from '@/lib/email-utils'
import { revalidatePath } from 'next/cache'

type CampaignTarget = 'all' | 'voluntary' | 'legacy'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionData = any

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

export async function createCampaignWithSections(
  sessionId: string,
  subject: string,
  body: string,
  imageUrl: string | null,
  target: CampaignTarget,
  sections: SectionData[],
  tone: string,
  themes: string[],
  introText?: string,
  footerTagline?: string
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      session_id: sessionId,
      subject: subject.trim(),
      body: body.trim(),
      image_url: imageUrl || null,
      target,
      status: 'draft',
      sections,
      tone,
      themes,
      intro_text: introText?.trim() || null,
      footer_tagline: footerTagline?.trim() || null,
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
  const ctaUrl = goUrl(siteUrl, '/', 'newsletter')
  const { html } = newsletterEmail({
    subject: campaign.subject,
    body: campaign.body,
    imageUrl: campaign.image_url || undefined,
    sections: campaign.sections || undefined,
    introText: campaign.intro_text || undefined,
    footerTagline: campaign.footer_tagline || undefined,
    unsubscribeUrl: `${siteUrl}/api/unsubscribe?token=test-preview`,
    ctaUrl,
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
  const campaignCtaUrl = goUrl(siteUrl, '/', 'newsletter')
  let sent = 0
  let errors = 0

  for (const sub of subscribers) {
    try {
      const { html } = newsletterEmail({
        subject: campaign.subject,
        body: campaign.body,
        imageUrl: campaign.image_url || undefined,
        sections: campaign.sections || undefined,
        introText: campaign.intro_text || undefined,
        footerTagline: campaign.footer_tagline || undefined,
        unsubscribeUrl: `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`,
        ctaUrl: campaignCtaUrl,
        campaignId,
        subscriberEmail: sub.email,
      })

      // Envoi via IONOS SMTP (pas de quota journalier comme Resend)
      const { error: sendErr } = await sendSmtp({
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

      // Rate limit: 300ms entre chaque envoi (IONOS ~500 emails/h)
      await new Promise((r) => setTimeout(r, 300))
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

export async function getCampaignStats(campaignId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: events } = await supabase
    .from('email_events')
    .select('event_type, subscriber_email, metadata, created_at')
    .eq('campaign_id', campaignId)

  if (!events) return { opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0, unsubscribes: 0, clickUrls: [] as { url: string; count: number }[] }

  const opens = events.filter((e) => e.event_type === 'open')
  const clicks = events.filter((e) => e.event_type === 'click')
  const unsubs = events.filter((e) => e.event_type === 'unsubscribe')

  const uniqueOpenEmails = new Set(opens.map((e) => e.subscriber_email))
  const uniqueClickEmails = new Set(clicks.map((e) => e.subscriber_email))

  // Top clicked URLs
  const urlCounts: Record<string, number> = {}
  for (const c of clicks) {
    const url = (c.metadata as { url?: string })?.url || 'unknown'
    urlCounts[url] = (urlCounts[url] || 0) + 1
  }
  const clickUrls = Object.entries(urlCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    opens: opens.length,
    uniqueOpens: uniqueOpenEmails.size,
    clicks: clicks.length,
    uniqueClicks: uniqueClickEmails.size,
    unsubscribes: unsubs.length,
    clickUrls,
  }
}
