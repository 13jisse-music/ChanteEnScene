import { NextRequest, NextResponse } from 'next/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { escapeHtml } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { ville, region, nom, fonction, email, telephone, message } = await req.json()

    if (!ville || !nom || !email) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const safeVille = escapeHtml(String(ville))
    const safeRegion = region ? escapeHtml(String(region)) : ''
    const safeNom = escapeHtml(String(nom))
    const safeFonction = fonction ? escapeHtml(String(fonction)) : ''
    const safeEmail = escapeHtml(String(email))
    const safeTelephone = telephone ? escapeHtml(String(telephone)) : ''
    const safeMessage = message ? escapeHtml(String(message)).replace(/\n/g, '<br>') : ''

    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: 'inscriptions@chantenscene.fr',
      replyTo: email,
      subject: `[Lieu] Proposition de ${safeVille}${safeFonction ? ` — ${safeNom} (${safeFonction})` : ` — ${safeNom}`}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px">
          <h2 style="color:#e91e8c">Nouvelle proposition de lieu</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;color:#666">Ville</td><td style="padding:8px;font-weight:bold;font-size:16px">${safeVille}</td></tr>
            ${safeRegion ? `<tr><td style="padding:8px;color:#666">Région</td><td style="padding:8px">${safeRegion}</td></tr>` : ''}
            <tr><td style="padding:8px;color:#666">Contact</td><td style="padding:8px;font-weight:bold">${safeNom}</td></tr>
            ${safeFonction ? `<tr><td style="padding:8px;color:#666">Fonction</td><td style="padding:8px">${safeFonction}</td></tr>` : ''}
            <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            ${safeTelephone ? `<tr><td style="padding:8px;color:#666">Téléphone</td><td style="padding:8px">${safeTelephone}</td></tr>` : ''}
            ${safeMessage ? `<tr><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px">${safeMessage}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px;color:#999;font-size:12px">
            Proposition reçue via le formulaire <a href="https://www.chantenscene.fr/proposer-un-lieu">Proposer un lieu</a>.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Proposer lieu email error:', error)
      return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
