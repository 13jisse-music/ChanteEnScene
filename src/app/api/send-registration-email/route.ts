import { NextRequest, NextResponse } from 'next/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { registrationConfirmationEmail } from '@/lib/emails'
import { sendPushNotifications } from '@/lib/push'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, candidateName, sessionName, sessionId, category, songTitle, songArtist } = body

    if (!email || !candidateName || !sessionName) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const { subject, html } = registrationConfirmationEmail({
      candidateName,
      sessionName,
      category: category || '',
      songTitle: songTitle || '',
      songArtist: songArtist || '',
    })

    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    })

    if (error) {
      console.error('Registration email error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Push notification to admin (non-blocking)
    if (sessionId) {
      sendPushNotifications({
        sessionId,
        role: 'admin',
        payload: {
          title: 'Nouvelle inscription !',
          body: `${candidateName} vient de s'inscrire avec "${songTitle}" de ${songArtist}`,
          url: '/admin/candidats',
          tag: `new-registration-${Date.now()}`,
        },
      }).catch(() => {
        // Push failure should not affect response
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Registration email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
