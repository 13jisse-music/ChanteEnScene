import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SponsorShowcase from '@/components/SponsorShowcase'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return {
    title: `Nos Partenaires — ChanteEnScène`,
    description: `Découvrez les partenaires et sponsors de ChanteEnScène ${slug}`,
  }
}

export default async function PartenairesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('id, name, logo_url, website_url, description, tier, position')
    .eq('session_id', session.id)
    .eq('published', true)
    .order('position')

  return (
    <section className="relative z-10 py-8 px-4 max-w-7xl mx-auto">
      <SponsorShowcase sponsors={sponsors || []} sessionName={session.name} slug={slug} />
    </section>
  )
}
