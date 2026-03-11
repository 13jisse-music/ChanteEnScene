import * as nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { resolve } from 'dns'
import { promisify } from 'util'
import { getResend } from './resend'

const resolveDns = promisify(resolve)

const SMTP_FROM = process.env.SMTP_FROM || 'ChanteEnScène <inscriptions@chantenscene.fr>'

/** Create a fresh transporter per invocation (avoids stale connections in serverless) */
function createTransporter() {
  const opts: SMTPTransport.Options = {
    host: process.env.SMTP_HOST || 'smtp.ionos.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }
  return nodemailer.createTransport(opts)
}

/** Pre-resolve DNS to avoid EBUSY in serverless (Vercel) */
async function warmDns(host: string, retries = 2): Promise<void> {
  for (let i = 0; i <= retries; i++) {
    try {
      await resolveDns(host)
      return
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 200 * (i + 1)))
    }
  }
}

/**
 * Envoie un email via IONOS SMTP, avec fallback Resend si SMTP échoue.
 * Sur Vercel (serverless), SMTP peut échouer (DNS EBUSY) → Resend prend le relais.
 */
export async function sendSmtp({
  to,
  subject,
  html,
  headers,
}: {
  to: string
  subject: string
  html: string
  headers?: Record<string, string>
}): Promise<{ error?: string }> {
  const isVercel = !!process.env.VERCEL

  // On Vercel: skip SMTP entirely (DNS EBUSY), use Resend API directly
  if (!isVercel) {
    try {
      const host = process.env.SMTP_HOST || 'smtp.ionos.fr'
      await warmDns(host)
      const transporter = createTransporter()
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
        headers,
      })
      transporter.close()
      return {}
    } catch (smtpErr) {
      const smtpMsg = smtpErr instanceof Error ? smtpErr.message : 'Erreur SMTP'
      console.warn('SMTP failed, falling back to Resend:', smtpMsg)
    }
  }

  // Resend API (HTTPS — works everywhere including Vercel serverless)
  try {
    const resend = getResend()
    await resend.emails.send({
      from: SMTP_FROM,
      to,
      subject,
      html,
      headers,
    })
    return {}
  } catch (resendErr) {
    const msg = resendErr instanceof Error ? resendErr.message : 'Erreur envoi email'
    console.error('Resend also failed:', msg)
    return { error: msg }
  }
}
