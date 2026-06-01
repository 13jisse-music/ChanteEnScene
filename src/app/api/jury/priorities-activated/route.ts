import { NextResponse } from 'next/server'

const TELEGRAM_TOKEN = '8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0'
const TELEGRAM_CHAT = '8386182992'

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
  })
}

// Appelé par le Database Webhook Supabase quand show_priorities passe à true
export async function POST(req: Request) {
  const payload = await req.json()

  // Supabase webhook payload : { type, table, record, old_record }
  const record = payload?.record
  if (!record) return NextResponse.json({ ok: false })

  // Seulement quand show_priorities vient de passer à true
  const wasActivated = record.show_priorities === true
    && payload?.old_record?.show_priorities === false

  if (!wasActivated) return NextResponse.json({ ok: false, reason: 'not activated' })

  const name = `${record.first_name} ${record.last_name}`

  await sendTelegram(
    `🔔 <b>${name}</b> vient de terminer tous ses votes !\n\nSon interface a basculé automatiquement sur la sélection des priorités.\nIl peut maintenant classer ses 10 favoris par catégorie depuis son lien habituel.`
  )

  return NextResponse.json({ ok: true })
}
