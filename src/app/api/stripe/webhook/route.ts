import { NextRequest, NextResponse } from 'next/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { sendPushNotifications } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Active session ID for push notifications
const SESSION_ID = '682bef39-e7ec-4943-9e62-96bfb91bfcac'

function verifyStripeSignature(body: string, signature: string, secret: string): boolean {
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts['t']
  const v1 = parts['v1']
  if (!timestamp || !v1) return false

  // Check timestamp is within 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp)
  if (age > 300) return false

  const payload = `${timestamp}.${body}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}

function getTierFromAmount(cents: number): string {
  if (cents >= 50000) return 'Or'
  if (cents >= 25000) return 'Argent'
  if (cents >= 10000) return 'Bronze'
  if (cents >= 5000) return 'Supporter'
  return 'Don'
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!verifyStripeSignature(body, signature, webhookSecret)) {
    console.error('Invalid Stripe webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '?'
    const amountCents = session.amount_total || 0
    const email = session.customer_details?.email || 'inconnu'
    const name = session.customer_details?.name || 'Anonyme'
    const tier = getTierFromAmount(amountCents)

    console.log(`[Stripe] Payment received: ${amount}€ from ${name} (${email}) — ${tier}`)

    // Send email notification to admin
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: 'inscriptions@chantenscene.fr',
        subject: `Paiement reçu : ${amount}€ — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px">
            <h2 style="color:#7ec850">Nouveau paiement reçu !</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;color:#666">Montant</td><td style="padding:8px;font-weight:bold;font-size:20px;color:#7ec850">${amount} €</td></tr>
              <tr><td style="padding:8px;color:#666">Nom</td><td style="padding:8px;font-weight:bold">${name}</td></tr>
              <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px;color:#666">Formule</td><td style="padding:8px">${tier}</td></tr>
              <tr><td style="padding:8px;color:#666">ID Stripe</td><td style="padding:8px;font-size:12px;color:#999">${session.id}</td></tr>
            </table>
            <p style="margin-top:16px;color:#666;font-size:13px">
              N'oubliez pas d'ajouter ce partenaire sur le site via
              <a href="https://www.chantenscene.fr/admin">l'admin</a>.
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[Stripe webhook] Email error:', err)
    }

    // Send push notification to admin
    try {
      await sendPushNotifications({
        sessionId: SESSION_ID,
        role: 'admin',
        payload: {
          title: `Paiement reçu : ${amount}€`,
          body: `${name} — ${tier}`,
          url: 'https://www.chantenscene.fr/admin',
        },
      })
    } catch (err) {
      console.error('[Stripe webhook] Push error:', err)
    }

    // Log donation in database
    try {
      const supabase = createAdminClient()
      await supabase.from('donations').insert({
        session_id: SESSION_ID,
        amount_cents: amountCents,
        tier,
        donor_name: name,
        donor_email: email !== 'inconnu' ? email : null,
        stripe_session_id: session.id,
      })
    } catch (err) {
      console.error('[Stripe webhook] DB insert error:', err)
    }
  }

  return NextResponse.json({ received: true })
}
