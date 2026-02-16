import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LogoRing from '@/components/LogoRing'
import CheckinView from '@/components/CheckinView'

type Params = Promise<{ candidateId: string }>

export async function generateMetadata() {
  return {
    title: 'Check-in Demi-finale — ChanteEnScène',
  }
}

export default async function CheckinPage({ params }: { params: Params }) {
  const { candidateId } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, session_id, status')
    .eq('id', candidateId)
    .single()

  if (!candidate || candidate.status !== 'semifinalist') notFound()

  // Get active semifinal event
  const { data: event } = await supabase
    .from('live_events')
    .select('id, status')
    .eq('session_id', candidate.session_id)
    .eq('event_type', 'semifinal')
    .in('status', ['pending', 'live', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check if already checked in
  let checkedInAt: string | null = null
  if (event) {
    const { data: lineupRow } = await supabase
      .from('lineup')
      .select('created_at')
      .eq('live_event_id', event.id)
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    checkedInAt = lineupRow?.created_at || null
  }

  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(233,30,140,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(126,200,80,0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div className="max-w-sm w-full text-center space-y-6">
        <LogoRing size={80} />

        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mt-4">
            Demi-finale
          </h1>
          <p className="text-white/40 text-sm mt-1">ChanteEnScène — Check-in</p>
        </div>

        {/* Candidate info */}
        <div className="flex items-center gap-4 bg-[#161228]/80 backdrop-blur-sm border border-[#2a2545] rounded-2xl p-4">
          <div className="w-14 h-14 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border-2 border-[#e91e8c]/30">
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">🎤</div>
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-[#e91e8c]">{candidate.category}</p>
          </div>
        </div>

        <CheckinView
          candidateId={candidate.id}
          eventId={event?.id || null}
          eventStatus={event?.status || null}
          checkedInAt={checkedInAt}
          displayName={displayName}
        />

        <p className="text-white/15 text-[10px] mt-8">
          <span className="text-white/20">Chant</span>
          <span className="text-[#7ec850]/40">En</span>
          <span className="text-[#e91e8c]/40">Scène</span>
        </p>
      </div>
    </main>
  )
}
