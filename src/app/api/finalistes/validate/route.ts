import { NextResponse } from 'next/server'

const OLIVIER_TOKEN = '12554435f30d2d76f756d99a'

async function tg(text: string) {
  try {
    await fetch('https://api.telegram.org/bot8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8386182992', text }),
    })
  } catch { /* notif non bloquante */ }
}

// Notifie l'admin (Telegram) qu'Olivier a validé l'annonce des finalistes.
export async function POST(req: Request) {
  let token = ''
  try { token = (await req.json())?.token ?? '' } catch { /* ignore */ }
  if (token !== OLIVIER_TOKEN) return NextResponse.json({ ok: false })
  await tg('✅ Olivier a VALIDÉ l’annonce des finalistes ! Tu peux l’envoyer au jury.')
  return NextResponse.json({ ok: true })
}
