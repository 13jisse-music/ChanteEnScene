export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import SubscribersList from './SubscribersList'

async function getSubscribers() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions?.length) return { subscribers: [], sessionId: '' }

  const sessionId = sessions[0].id

  const { data: subscribers } = await supabase
    .from('email_subscribers')
    .select('id, email, source, is_active, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  return { subscribers: subscribers || [], sessionId }
}

export default async function AdminAbonnesPage() {
  const { subscribers, sessionId } = await getSubscribers()

  const active = subscribers.filter(s => s.is_active).length
  const unsubscribed = subscribers.filter(s => !s.is_active).length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-white/30 text-xs hover:text-white/50 transition-colors">← Dashboard</Link>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white mt-1">
            Abonnés email
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#7ec85015', color: '#7ec850' }}>
            {active} actif{active > 1 ? 's' : ''}
          </span>
          {unsubscribed > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#ef444415', color: '#ef4444' }}>
              {unsubscribed} désabonné{unsubscribed > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <SubscribersList initialSubscribers={subscribers} sessionId={sessionId} />
    </div>
  )
}
