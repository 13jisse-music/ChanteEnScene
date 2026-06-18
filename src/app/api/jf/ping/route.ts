import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function tg(text: string) {
  try {
    await fetch('https://api.telegram.org/bot8775745718:AAHGt9_a7scEvfGgZgnCAs5u_qTyF9leAe0/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '8386182992', text }),
    })
  } catch { /* notif non bloquante */ }
}

// Notifie (Telegram) qu'un juré a ouvert son interface de choix des finalistes.
// Anti-spam : on ne renotifie pas si une ouverture a été signalée il y a moins de 15 min.
export async function POST(req: Request) {
  let token = ''
  try { token = (await req.json())?.token ?? '' } catch { /* ignore */ }

  const sb = createAdminClient()
  const { data: juror } = await sb
    .from('jurors')
    .select('id, first_name, role, is_active, jf_opened_at')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()
  if (!juror || juror.role !== 'semifinal') return NextResponse.json({ ok: false })

  const last = juror.jf_opened_at ? new Date(juror.jf_opened_at as string).getTime() : 0
  if (Date.now() - last > 15 * 60 * 1000) {
    await sb.from('jurors').update({ jf_opened_at: new Date().toISOString() }).eq('id', juror.id)
    await tg(`👀 ${juror.first_name} vient d'ouvrir son interface de choix des finalistes.`)
  }
  return NextResponse.json({ ok: true })
}
