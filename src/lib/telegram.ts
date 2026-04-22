/**
 * Centralized Telegram notification helper.
 * Used by cron routes and other server-side code.
 */

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegram(text: string, prefix: string = '🎤 CES'): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[CES telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured')
    return false
  }
  const fullMessage = `<b>${prefix}</b>\n${text}`
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: fullMessage, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Envoie une photo avec legende via Telegram */
export async function sendTelegramPhoto(photoUrl: string, caption: string, prefix: string = '🎤 CES'): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[CES telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured')
    return false
  }
  const fullCaption = `<b>${prefix}</b>\n${caption}`
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, photo: photoUrl, caption: fullCaption, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch {
    return false
  }
}
