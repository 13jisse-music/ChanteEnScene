import * as nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ionos.fr',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const SMTP_FROM = process.env.SMTP_FROM || 'ChanteEnScène <inscriptions@chantenscene.fr>'

/**
 * Envoie un email via IONOS SMTP (pour les newsletters en masse).
 * Resend reste utilisé pour le transactionnel (1-2 emails).
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
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      headers,
    })
    return {}
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur SMTP'
    console.error('SMTP error:', msg)
    return { error: msg }
  }
}
