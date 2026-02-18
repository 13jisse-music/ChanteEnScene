import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuiviMp3 from '@/components/SuiviMp3'

export const metadata = { title: 'Suivi MP3 — ChanteEnScène Admin' }

export default async function SuiviMp3Page() {
  const supabase = await createClient()

  // Get active session
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug, config')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  const config = (session.config || {}) as Record<string, unknown>
  const notificationsSentAt = (config.selection_notifications_sent_at as string) || null

  // Get semifinalists with MP3 info
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, mp3_url, email, slug, status')
    .eq('session_id', session.id)
    .eq('status', 'semifinalist')
    .order('category')
    .order('last_name')

  return (
    <div className="p-4 sm:p-6">
      <SuiviMp3
        session={{ id: session.id, name: session.name, slug: session.slug, config: session.config as Record<string, unknown> }}
        candidates={candidates || []}
        notificationsSentAt={notificationsSentAt}
      />
    </div>
  )
}
