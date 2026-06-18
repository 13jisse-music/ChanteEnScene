export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotifications } from '@/lib/push'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

// Push "dernier jour pour voter" la veille de la finale.
// Programmé via vercel.json (15 juillet 18h30 Paris). Anti-doublon par flag config.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, slug, config')
    .order('year', { ascending: false })
    .limit(1)
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No session', sent: false })
  }

  const session = sessions[0]
  const config = (session.config || {}) as Record<string, unknown>
  if (config.finale_vote_push_sent) {
    return NextResponse.json({ message: 'Already sent', sent: false })
  }

  const payload = {
    title: '🚨 Dernier jour pour voter !',
    body: 'La grande finale, c’est demain soir. Soutenez vos finalistes — chaque voix compte. Votez maintenant !',
    url: `https://www.chantenscene.fr/${session.slug}/candidats`,
  }
  const result = await sendPushNotifications({ sessionId: session.id, role: 'all', payload })

  await supabase
    .from('sessions')
    .update({ config: { ...config, finale_vote_push_sent: new Date().toISOString() } })
    .eq('id', session.id)

  await supabase.from('push_log').insert({
    session_id: session.id,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    role: 'all',
    is_test: false,
    status: result.failed === 0 ? 'sent' : 'partial',
    sent_by: 'cron-finale-push',
  })

  return NextResponse.json({ ok: true, ...result })
}
