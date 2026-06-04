import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import JuryScoring from '@/components/JuryScoring'
import JuryExperience from '@/components/JuryExperience'
import JuryLoginTracker from '@/components/JuryLoginTracker'
import JuryConnectionStatus from '@/components/JuryConnectionStatus'
import PrioritesClient from '../priorites/[token]/PrioritesClient'

type Params = Promise<{ token: string }>

export async function generateMetadata() {
  return { title: 'Notation Jury — ChanteEnScène' }
}

export default async function JuryPage({ params }: { params: Params }) {
  const { token } = await params
  const supabase = createAdminClient()

  // Find juror by token
  const { data: juror } = await supabase
    .from('jurors')
    .select('*, sessions(id, name, slug, status, config)')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()

  if (!juror) notFound()

  // Mode résultats : activé par l'admin via juror.show_results
  // Affiche un message de remerciement + les demi-finalistes (fruit du travail du jury)
  if (juror.show_results) {
    const { data: semifinalists } = await supabase
      .from('candidates')
      .select('first_name, last_name, stage_name, category, photo_url')
      .eq('session_id', (juror as Record<string, unknown>).session_id as string)
      .eq('status', 'semifinalist')
      .order('category')
      .order('last_name')

    const cats = ['Ado', 'Adulte', 'Enfant'] as const
    const emoji: Record<string, string> = { Ado: '🎤', Adulte: '🎵', Enfant: '⭐' }
    const colors: Record<string, string> = { Ado: '#7c3aed', Adulte: '#0369a1', Enfant: '#b45309' }

    return (
      <main className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto text-white">
        <div className="bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] px-5 py-7 text-center">
          <div className="text-4xl mb-3">🙏</div>
          <h1 className="text-xl font-bold mb-2">Merci {juror.first_name} !</h1>
          <p className="text-[#c4b5fd] text-sm leading-relaxed max-w-md mx-auto">
            Grâce à votre travail d&apos;écoute et de sélection, voici les demi-finalistes
            de ChantEnScène Aubagne 2026. Le fruit de votre engagement.
          </p>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {cats.map(cat => {
            const list = (semifinalists || []).filter(s => s.category === cat)
            if (!list.length) return null
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{emoji[cat]}</span>
                  <h2 className="font-bold text-sm" style={{ color: colors[cat] }}>{cat}</h2>
                  <span className="text-xs text-[#475569]">({list.length} qualifiés)</span>
                </div>
                <div className="space-y-2">
                  {list.map((c, i) => {
                    const name = c.stage_name || `${c.first_name} ${c.last_name}`
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[#1e293b] rounded-xl p-2.5 border border-white/7">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white/10" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#334155] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#94a3b8]">{c.first_name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{name}</p>
                          <p className="text-[10px] text-[#64748b] truncate">{c.first_name} {c.last_name}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/25 rounded-xl p-4 text-center mt-4">
            <p className="text-xs text-[#c4b5fd] leading-relaxed">
              Rendez-vous le 17 juin à l&apos;Espace des Arts et de la Culture pour la demi-finale.
              Encore merci pour votre implication dans cette belle aventure.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Mode priorités : activé par l'admin via juror.show_priorities
  // - juré 'semifinal' => classement demi-finale (top 5, round 'final', pré-rempli par note slider+buzz)
  // - juré 'online'    => classement qui désigne les demi-finalistes (top 10, round 'semifinal')
  if (juror.show_priorities) {
    const isSemifinalJuror = juror.role === 'semifinal'
    const eventType = isSemifinalJuror ? 'semifinal' : 'online'
    const round = isSemifinalJuror ? 'final' : 'semifinal'

    const sessionForPriorities = (juror as Record<string, unknown>).sessions as {
      id: string
      config?: { finalists_per_category?: number; semifinalists_per_category?: number }
    } | null
    const topN = isSemifinalJuror
      ? (sessionForPriorities?.config?.finalists_per_category ?? 5)
      : (sessionForPriorities?.config?.semifinalists_per_category ?? 10)

    let scoresQuery = supabase
      .from('jury_scores')
      .select(`total_score, scores, candidates(id, first_name, last_name, stage_name, category, photo_url, video_url, mp3_url)`)
      .eq('juror_id', juror.id)
      .eq('event_type', eventType)
    // En ligne : on exclut les "non" (total_score 0). En demi-finale : on garde tout candidat noté
    // (un juré peut donner une note basse sans que ce soit un rejet).
    if (!isSemifinalJuror) scoresQuery = scoresQuery.gt('total_score', 0)
    const { data: scores } = await scoresQuery

    const { data: existingPriorities } = await supabase
      .from('jury_priorities')
      .select('candidate_id, category, rank')
      .eq('juror_id', juror.id)
      .eq('round', round)
      .order('rank')

    return (
      <PrioritesClient
        juror={{ id: juror.id, firstName: juror.first_name, lastName: juror.last_name }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scores={(scores || []).filter(s => s.candidates) as any}
        existingPriorities={existingPriorities || []}
        mode={isSemifinalJuror ? 'semifinal' : 'online'}
        topN={topN}
        round={round}
        sessionId={(juror as Record<string, unknown>).session_id as string}
      />
    )
  }

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
      <JuryConnectionStatus />
      <JuryLoginTracker jurorId={juror.id} sessionId={session.id} />
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
