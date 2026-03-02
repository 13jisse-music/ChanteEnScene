'use client'

import { useState, useEffect } from 'react'
import JuryOnboarding from './JuryOnboarding'
import JuryDashboard from './JuryDashboard'
import JuryScoring from './JuryScoring'
import { trackJurorLogin, completeJurorOnboarding } from '@/app/jury/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  video_url: string | null
  mp3_url: string | null
  song_title: string
  song_artist: string
}

interface ExistingScore {
  id: string
  candidate_id: string
  event_type: string
  scores: Record<string, number | string>
  total_score: number
  comment: string | null
  viewed_at?: string | null
  watch_seconds?: number
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  session_id: string
  onboarding_done: boolean
}

interface Session {
  id: string
  name: string
  config: {
    jury_criteria?: { name: string; max_score: number }[]
    jury_voting_deadline?: string
    [key: string]: unknown
  }
}

interface Props {
  juror: Juror
  session: Session
  candidates: Candidate[]
  existingScores: ExistingScore[]
}

type View = 'onboarding' | 'dashboard' | 'voting'

export default function JuryExperience({ juror, session, candidates, existingScores }: Props) {
  const jurorName = `${juror.first_name || ''} ${juror.last_name || ''}`.trim() || 'Juré'
  const deadline = session.config?.jury_voting_deadline || null

  // Always show onboarding splash on each visit (serves as reminder + easy close with ✕)
  const [view, setView] = useState<View>('onboarding')

  // Track login on mount (fire-and-forget)
  useEffect(() => {
    trackJurorLogin(juror.id).catch(() => {})
  }, [juror.id])

  async function handleOnboardingComplete() {
    // Save onboarding done (fire-and-forget)
    completeJurorOnboarding(juror.id).catch(() => {})
    setView('dashboard')
  }

  if (view === 'onboarding') {
    return (
      <JuryOnboarding
        jurorName={jurorName}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  if (view === 'dashboard') {
    return (
      <JuryDashboard
        jurorName={jurorName}
        jurorId={juror.id}
        jurorRole={juror.role}
        sessionId={session.id}
        candidates={candidates}
        existingScores={existingScores}
        deadline={deadline}
        onStartVoting={() => setView('voting')}
      />
    )
  }

  // Voting view — use existing JuryScoring
  return (
    <div className="relative z-10">
      <JuryScoring
        juror={juror}
        session={session}
        candidates={candidates}
        existingScores={existingScores}
        criteria={[]}
      />
    </div>
  )
}
