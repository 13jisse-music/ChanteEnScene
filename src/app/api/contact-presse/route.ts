import { NextRequest, NextResponse } from 'next/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { escapeHtml } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { name, organization, email, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const safeName = escapeHtml(String(name))
    const safeOrg = organization ? escapeHtml(String(organization)) : ''
    const safeEmail = escapeHtml(String(email))
    const safeMessage = escapeHtml(String(message)).replace(/\n/g, '<br>')

    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: 'inscriptions@chantenscene.fr',
      replyTo: email,
      subject: `[Presse] Demande de ${safeName}${safeOrg ? ` — ${safeOrg}` : ''}`,
      html: `
        <h2>Nouvelle demande presse</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px">
          <tr><td style="padding:8px;color:#666">Nom</td><td style="padding:8px;font-weight:bold">${safeName}</td></tr>
          ${safeOrg ? `<tr><td style="padding:8px;color:#666">Média / Organisation</td><td style="padding:8px">${safeOrg}</td></tr>` : ''}
          <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px">${safeMessage}</td></tr>
        </table>
      `,
    })

    if (error) {
      console.error('Press contact email error:', error)
      return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
