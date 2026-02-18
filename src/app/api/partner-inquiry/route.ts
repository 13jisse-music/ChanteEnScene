import { NextRequest, NextResponse } from 'next/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { escapeHtml } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { company, email, phone, message } = await req.json()

    if (!company || !email) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const safeCompany = escapeHtml(String(company))
    const safeEmail = escapeHtml(String(email))
    const safePhone = phone ? escapeHtml(String(phone)) : ''
    const safeMessage = message ? escapeHtml(String(message)).replace(/\n/g, '<br>') : ''

    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: 'inscriptions@chantenscene.fr',
      replyTo: email,
      subject: `[Partenariat] Demande de ${safeCompany}`,
      html: `
        <h2>Nouvelle demande de partenariat</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px">
          <tr><td style="padding:8px;color:#666">Entreprise</td><td style="padding:8px;font-weight:bold">${safeCompany}</td></tr>
          <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding:8px;color:#666">Téléphone</td><td style="padding:8px">${safePhone}</td></tr>` : ''}
          ${safeMessage ? `<tr><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px">${safeMessage}</td></tr>` : ''}
        </table>
      `,
    })

    if (error) {
      console.error('Partner inquiry email error:', error)
      return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
