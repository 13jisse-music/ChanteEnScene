import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import FinaleForm from './FinaleForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Ma fiche finaliste — ChantEnScène' }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const sb = createAdminClient()

  const { data: entry } = await sb
    .from('finale_entries')
    .select('id, token, phone, fast_title, fast_artist, fast_key, slow_title, slow_artist, slow_key, submitted_at, candidate_id')
    .eq('token', token)
    .single()
  if (!entry) notFound()

  const { data: cand } = await sb
    .from('candidates')
    .select('first_name, stage_name, category')
    .eq('id', entry.candidate_id)
    .single()

  // Marque l'ouverture du formulaire (une seule fois)
  await sb.from('finale_entries').update({ form_opened_at: new Date().toISOString() }).eq('id', entry.id).is('form_opened_at', null)

  return (
    <FinaleForm
      token={entry.token}
      nom={cand?.stage_name || cand?.first_name || ''}
      category={cand?.category || ''}
      initial={{
        phone: entry.phone || '',
        fastTitle: entry.fast_title || '', fastArtist: entry.fast_artist || '', fastKey: entry.fast_key || '',
        slowTitle: entry.slow_title || '', slowArtist: entry.slow_artist || '', slowKey: entry.slow_key || '',
      }}
      alreadySubmitted={!!entry.submitted_at}
    />
  )
}
