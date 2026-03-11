import * as nodemailer from 'nodemailer'
import { getResend } from './resend'

const SMTP_FROM = process.env.SMTP_FROM || 'ChanteEnScène <inscriptions@chantenscene.fr>'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ionos.fr',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Envoie un email via IONOS SMTP (local) ou Resend API (Vercel).
 * Sur Vercel, SMTP échoue (DNS EBUSY) → on utilise Resend directement.
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
  // Sur Vercel : SMTP ne marche pas (DNS serverless), on passe par Resend
  if (process.env.VERCEL) {
    try {
      await getResend().emails.send({ from: SMTP_FROM, to, subject, html, headers })
      return {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur envoi email'
      console.error('Resend error:', msg)
      return { error: msg }
    }
  }

  // En local / self-hosted : SMTP IONOS
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html, headers })
    return {}
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur SMTP'
    console.error('SMTP error:', msg)
    return { error: msg }
  }
}
