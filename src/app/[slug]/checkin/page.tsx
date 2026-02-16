import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SelfCheckin from '@/components/SelfCheckin'

export async function generateMetadata() {
  return { title: 'Check-in Demi-finale — ChanteEnScène' }
}

export default async function CheckinSearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  // Get active semifinal event
  const { data: event } = await supabase
    .from('live_events')
    .select('id, status')
    .eq('session_id', session.id)
    .eq('event_type', 'semifinal')
    .in('status', ['pending', 'live', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get all semifinalists
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url')
    .eq('session_id', session.id)
    .eq('status', 'semifinalist')
    .order('last_name')

  // Get already checked-in candidate IDs
  let checkedInIds: string[] = []
  if (event) {
    const { data: lineup } = await supabase
      .from('lineup')
      .select('candidate_id')
      .eq('live_event_id', event.id)

    checkedInIds = (lineup || []).map((l) => l.candidate_id)
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(233,30,140,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(126,200,80,0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">{session.name}</p>
          <p className="text-[#e91e8c] text-xs font-bold uppercase tracking-widest mt-3">
            Check-in Demi-finale
          </p>
        </div>

        <SelfCheckin
          eventId={event?.id || null}
          eventStatus={event?.status || null}
          candidates={candidates || []}
          initialCheckedInIds={checkedInIds}
        />

        <p className="text-white/15 text-[10px] text-center">
          <span className="text-white/20">Chant</span>
          <span className="text-[#7ec850]/40">En</span>
          <span className="text-[#e91e8c]/40">Scène</span>
        </p>
      </div>
    </main>
  )
}
