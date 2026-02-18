import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExportMp3Manager from '@/components/ExportMp3Manager'

export const metadata = { title: 'Export MP3 — ChanteEnScène Admin' }

export default async function ExportMp3Page() {
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

  // Get all candidates with MP3 (semifinalists, finalists, winners)
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status, mp3_url, song_title, song_artist, photo_url')
    .eq('session_id', session.id)
    .in('status', ['semifinalist', 'finalist', 'winner'])
    .order('category')
    .order('last_name')

  // Get lineup for semifinal (order of passage)
  const { data: semifinalEvent } = await supabase
    .from('live_events')
    .select('id')
    .eq('session_id', session.id)
    .eq('event_type', 'semifinal')
    .limit(1)
    .maybeSingle()

  let semifinalLineup: { candidate_id: string; position: number }[] = []
  if (semifinalEvent) {
    const { data } = await supabase
      .from('lineup')
      .select('candidate_id, position')
      .eq('live_event_id', semifinalEvent.id)
      .order('position')
    semifinalLineup = data || []
  }

  // Get lineup for final
  const { data: finalEvent } = await supabase
    .from('live_events')
    .select('id')
    .eq('session_id', session.id)
    .eq('event_type', 'final')
    .limit(1)
    .maybeSingle()

  let finalLineup: { candidate_id: string; position: number }[] = []
  if (finalEvent) {
    const { data } = await supabase
      .from('lineup')
      .select('candidate_id, position')
      .eq('live_event_id', finalEvent.id)
      .order('position')
    finalLineup = data || []
  }

  const config = session.config as { semifinal_date?: string; final_date?: string; semifinal_location?: string; final_location?: string }

  return (
    <div className="p-4 sm:p-6">
      <ExportMp3Manager
        session={{ id: session.id, name: session.name, config }}
        candidates={candidates || []}
        semifinalLineup={semifinalLineup}
        finalLineup={finalLineup}
      />
    </div>
  )
}
