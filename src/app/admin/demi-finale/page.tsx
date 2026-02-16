import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegieSemifinale from '@/components/RegieSemifinale'
import FinalisteSelection from '@/components/FinalisteSelection'
import CreateEventButton from '@/components/CreateEventButton'

export const metadata = { title: 'Régie Demi-finale — ChanteEnScène Admin' }

export default async function RegieSemifinalePage() {
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

  // Get semifinal event
  const { data: event } = await supabase
    .from('live_events')
    .select('*')
    .eq('session_id', session.id)
    .eq('event_type', 'semifinal')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!event) {
    return (
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-4">
          Régie Demi-finale
        </h1>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/40 mb-4">Aucun événement de demi-finale créé.</p>
          <CreateEventButton sessionId={session.id} eventType="semifinal" label="Créer la demi-finale" />
        </div>
      </div>
    )
  }

  // Get lineup with candidates (checked-in candidates)
  const { data: lineup } = await supabase
    .from('lineup')
    .select('*, candidates(id, first_name, last_name, stage_name, category, photo_url, mp3_url, song_title, song_artist)')
    .eq('live_event_id', event.id)
    .order('created_at')

  // Get ALL semifinalists for this session (for admin manual check-in)
  const { data: allSemifinalists } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, mp3_url, song_title, song_artist')
    .eq('session_id', session.id)
    .eq('status', 'semifinalist')
    .order('category')
    .order('last_name')

  // Get semifinal jurors only
  const { data: jurors } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, role, is_active')
    .eq('session_id', session.id)
    .eq('role', 'semifinal')
    .eq('is_active', true)

  // Get jury scores — summary for régie, detailed for finalists selection
  const { data: juryScores } = await supabase
    .from('jury_scores')
    .select('id, candidate_id, juror_id, total_score, scores, comment')
    .eq('session_id', session.id)
    .eq('event_type', 'semifinal')

  // For finalist selection: also get finalists (already promoted)
  const { data: finalists } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url')
    .eq('session_id', session.id)
    .eq('status', 'finalist')
    .order('category')
    .order('last_name')

  const config = (session.config || {}) as Record<string, unknown>

  return (
    <div className="p-6 space-y-8">
      <RegieSemifinale
        session={session}
        event={event}
        lineup={lineup || []}
        allSemifinalists={allSemifinalists || []}
        jurors={jurors || []}
        juryScores={juryScores || []}
      />

      {event.status === 'completed' && (
        <FinalisteSelection
          session={session}
          eventId={event.id}
          allSemifinalists={allSemifinalists || []}
          finalists={finalists || []}
          jurors={jurors || []}
          juryScores={juryScores || []}
          finalistsPerCategory={(config.finalists_per_category as number) || 5}
          notificationsSentAt={(config.finale_notifications_sent_at as string) || null}
          categories={((config.age_categories as { name: string }[]) || []).map(c => c.name)}
        />
      )}
    </div>
  )
}
