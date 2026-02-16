import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckinManager from '@/components/CheckinManager'

export const metadata = { title: 'Check-in Demi-finale — ChanteEnScène Admin' }

export default async function AdminCheckinPage() {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug, config')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  // Get semifinal event
  const { data: event } = await supabase
    .from('live_events')
    .select('id, status')
    .eq('session_id', session.id)
    .eq('event_type', 'semifinal')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get all semifinalists
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url')
    .eq('session_id', session.id)
    .eq('status', 'semifinalist')
    .order('category')
    .order('last_name')

  // Get checked-in candidates (in lineup)
  let checkedInIds: string[] = []
  if (event) {
    const { data: lineup } = await supabase
      .from('lineup')
      .select('candidate_id, created_at')
      .eq('live_event_id', event.id)

    checkedInIds = (lineup || []).map((l) => l.candidate_id)
  }

  return (
    <div className="p-6">
      <CheckinManager
        session={session}
        eventId={event?.id || null}
        eventStatus={event?.status || null}
        candidates={candidates || []}
        initialCheckedInIds={checkedInIds}
      />
    </div>
  )
}
