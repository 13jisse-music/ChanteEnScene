import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import PrioritesClient from './PrioritesClient'

type Params = Promise<{ token: string }>

export async function generateMetadata() {
  return { title: 'Mes priorités — ChantEnScène' }
}

export default async function PrioritesPage({ params }: { params: Params }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: juror } = await supabase
    .from('jurors')
    .select('id, first_name, last_name, email, session_id')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()

  if (!juror) notFound()

  // Votes positifs du juré (oui + peut-etre) avec infos candidat
  const { data: scores } = await supabase
    .from('jury_scores')
    .select(`
      total_score,
      scores,
      candidates (
        id, first_name, last_name, stage_name,
        category, photo_url, video_url, mp3_url
      )
    `)
    .eq('juror_id', juror.id)
    .gt('total_score', 0)
    .in('candidates.category', ['Ado', 'Adulte', 'Enfant'])

  // Priorités déjà soumises (si le juré revient)
  const { data: existingPriorities } = await supabase
    .from('jury_priorities')
    .select('candidate_id, category, rank')
    .eq('juror_id', juror.id)
    .order('rank')

  const validScores = (scores || []).filter(s => s.candidates)

  return (
    <PrioritesClient
      juror={{ id: juror.id, firstName: juror.first_name, lastName: juror.last_name }}
      scores={validScores}
      existingPriorities={existingPriorities || []}
    />
  )
}
