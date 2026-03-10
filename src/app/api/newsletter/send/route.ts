import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/security'
import { sendSmtp } from '@/lib/smtp'
import { newsletterEmail } from '@/lib/emails'
import { goUrl } from '@/lib/email-utils'

// 60s max sur Vercel Hobby (300s sur Pro)
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaignId } = await req.json()
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: campaign, error: campError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Campagne déjà envoyée' }, { status: 400 })
  if (campaign.status === 'sending') return NextResponse.json({ error: 'Envoi en cours' }, { status: 400 })

  // Subscribers
  let query = supabase
    .from('email_subscribers')
    .select('email, unsubscribe_token')
    .eq('session_id', campaign.session_id)
    .eq('is_active', true)

  if (campaign.target === 'voluntary') query = query.neq('source', 'legacy_import')
  else if (campaign.target === 'legacy') query = query.eq('source', 'legacy_import')

  const { data: subscribers, error: subError } = await query
  if (subError || !subscribers?.length) {
    return NextResponse.json({ error: subError?.message || 'Aucun abonné' }, { status: 400 })
  }

  // Mark sending
  await supabase.from('email_campaigns').update({
    status: 'sending',
    total_recipients: subscribers.length,
  }).eq('id', campaignId)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.chantenscene.fr'
  const ctaUrl = goUrl(siteUrl, '/', 'newsletter')
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
        ctaUrl,
        campaignId,
        subscriberEmail: sub.email,
      })

      const { error: sendErr } = await sendSmtp({
        to: sub.email,
        subject: campaign.subject,
        html,
        headers: {
          'List-Unsubscribe': `<${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}>`,
        },
      })

      if (sendErr) errors++
      else sent++

      // 200ms entre chaque (plus rapide pour tenir dans les 60s)
      await new Promise(r => setTimeout(r, 200))
    } catch {
      errors++
    }
  }

  // Update campaign
  await supabase.from('email_campaigns').update({
    status: errors === subscribers.length ? 'failed' : 'sent',
    total_sent: sent,
    total_errors: errors,
    sent_at: new Date().toISOString(),
  }).eq('id', campaignId)

  return NextResponse.json({ success: true, sent, errors })
}
