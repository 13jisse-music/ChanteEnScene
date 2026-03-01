import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JuryScoring from '@/components/JuryScoring'
import JuryExperience from '@/components/JuryExperience'

type Params = Promise<{ token: string }>

export async function generateMetadata() {
  return { title: 'Notation Jury — ChanteEnScène' }
}

export default async function JuryPage({ params }: { params: Params }) {
  const { token } = await params
  const supabase = await createClient()

  // Find juror by token
  const { data: juror } = await supabase
    .from('jurors')
    .select('*, sessions(id, name, slug, status, config)')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()

  if (!juror) notFound()

  const session = (juror as Record<string, unknown>).sessions as {
    id: string
    name: string
    slug: string
    status: string
    config: {
      jury_criteria: { name: string; max_score: number }[]
      jury_online_voting_closed?: boolean
      jury_voting_deadline?: string
    }
  }

  const isOnline = juror.role === 'online'

  // Gate access for online jurors:
  // - Open as soon as there are approved candidates (no phase restriction)
  // - Closed only when admin explicitly sets jury_online_voting_closed
  if (isOnline) {
    if (session.config?.jury_online_voting_closed) {
      return (
        <main className="relative z-50 min-h-screen flex items-center justify-center bg-[#0d0b1a] text-white px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
              Jury en ligne terminé
            </h1>
            <p className="text-white/50 text-sm">
              Merci pour votre participation ! Les résultats sont en cours de traitement.
            </p>
            <p className="text-center mt-4">
              <span className="text-white/30 text-xs">Chant</span>
              <span className="text-[#7ec850]/50 text-xs">En</span>
              <span className="text-[#e91e8c]/50 text-xs">Scène</span>
            </p>
          </div>
        </main>
      )
    }
  }

  // Get candidates to score based on juror role
  const statusFilter =
    juror.role === 'final'
      ? ['finalist']
      : juror.role === 'semifinal'
        ? ['semifinalist']
        : ['approved', 'semifinalist', 'finalist']

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, video_url, mp3_url, song_title, song_artist')
    .eq('session_id', session.id)
    .in('status', statusFilter)
    .order('category')

  // Get existing scores by this juror
  const { data: existingScores } = await supabase
    .from('jury_scores')
    .select('*')
    .eq('juror_id', juror.id)

  // Find active live event for real-time push
  const { data: liveEvent } = await supabase
    .from('live_events')
    .select('id')
    .eq('session_id', session.id)
    .in('status', ['pending', 'live', 'paused'])
    .limit(1)
    .maybeSingle()

  // Online jurors get the full experience: onboarding → dashboard → voting
  if (isOnline) {
    return (
      <JuryExperience
        juror={juror}
        session={session}
        candidates={candidates || []}
        existingScores={existingScores || []}
      />
    )
  }

  // Semifinal/Final jurors get the standard layout (in-person, no dashboard needed)
  return (
    <main className="relative z-50 min-h-screen py-8 px-4 bg-[#0d0b1a] text-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">{session.name}</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-xs text-[#e91e8c]">
            Juré : {juror.first_name} {juror.last_name}
          </div>
        </div>

        <JuryScoring
          juror={juror}
          session={session}
          candidates={candidates || []}
          existingScores={existingScores || []}
          criteria={session.config?.jury_criteria || []}
          liveEventId={liveEvent?.id || null}
        />
      </div>
    </main>
  )
}
