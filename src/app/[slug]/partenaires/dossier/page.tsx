import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DossierClient from './DossierClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return {
    title: `Dossier de Partenariat — ChanteEnScène ${slug}`,
    description: 'Devenez partenaire de ChanteEnScène, le concours de chant à Aubagne',
  }
}

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, city, year, config')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const config = (session.config || {}) as Record<string, unknown>

  // Count candidates and votes for stats
  const { count: candidateCount } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .neq('status', 'pending')

  const { count: voteCount } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const { count: pageViewCount } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  return (
    <DossierClient
      session={{
        name: session.name,
        city: session.city || 'Aubagne',
        year: session.year || 2026,
        config,
      }}
      stats={{
        candidates: candidateCount || 0,
        votes: voteCount || 0,
        pageViews: pageViewCount || 0,
      }}
      slug={slug}
    />
  )
}
