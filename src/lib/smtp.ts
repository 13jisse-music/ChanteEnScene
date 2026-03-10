import * as nodemailer from 'nodemailer'
import { resolve } from 'dns'
import { promisify } from 'util'

const resolveDns = promisify(resolve)

const SMTP_FROM = process.env.SMTP_FROM || 'ChanteEnScène <inscriptions@chantenscene.fr>'

/** Create a fresh transporter per invocation (avoids stale connections in serverless) */
function createTransporter() {
  return nodemailer.createTransport({
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
  })
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur SMTP'
    console.error('SMTP error:', msg)
    return { error: msg }
  }
}
