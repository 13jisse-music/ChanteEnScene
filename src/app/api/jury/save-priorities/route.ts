import { createAdminClient } from '@/lib/supabase/admin'
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

type Priority = {
  juror_id: string
  candidate_id: string
  category: string
  rank: number
}

export async function POST(req: Request) {
  const { juror_id, juror_name, priorities, round } = await req.json() as {
    juror_id: string
    juror_name: string
    priorities: Priority[]
    round?: string
  }

  if (!juror_id || !priorities?.length) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // round 'semifinal' = classement online qui designe les demi-finalistes (defaut, retrocompat)
  // round 'final'     = classement demi-finale qui designe les finalistes
  const roundValue = round === 'final' ? 'final' : 'semifinal'

  const supabase = createAdminClient()

  // Recupere la session du jure pour lier les priorites (source de verite serveur)
  const { data: jurorRow } = await supabase
    .from('jurors')
    .select('session_id')
    .eq('id', juror_id)
    .single()
  const sessionId = jurorRow?.session_id ?? null

  // Supprime les anciens du MEME round et re-insere (upsert propre, sans ecraser l'autre round)
  await supabase
    .from('jury_priorities')
    .delete()
    .eq('juror_id', juror_id)
    .eq('round', roundValue)

  const { error } = await supabase.from('jury_priorities').insert(
    priorities.map(p => ({
      juror_id: p.juror_id,
      candidate_id: p.candidate_id,
      category: p.category,
      rank: p.rank,
      round: roundValue,
      session_id: sessionId,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupère les noms des candidats pour la notif
  const { data: cands } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, category')
    .in('id', priorities.map(p => p.candidate_id))

  const bycat = (cat: string) =>
    priorities
      .filter(p => p.category === cat)
      .sort((a, b) => a.rank - b.rank)
      .map(p => {
        const c = cands?.find(c => c.id === p.candidate_id)
        return `${p.rank}. ${c?.first_name ?? ''} ${c?.last_name ?? ''}`
      })
      .join('\n')

  const title = roundValue === 'final'
    ? `🏆 <b>${juror_name}</b> a classé ses finalistes (demi-finale) !`
    : `🏆 <b>${juror_name}</b> a soumis ses priorités !`

  const msg = [
    title,
    '',
    `🎤 <b>ADO</b>\n${bycat('Ado')}`,
    '',
    `🎵 <b>ADULTE</b>\n${bycat('Adulte')}`,
    '',
    `⭐ <b>ENFANT</b>\n${bycat('Enfant')}`,
  ].join('\n')

  await sendTelegram(msg)

  return NextResponse.json({ ok: true })
}
