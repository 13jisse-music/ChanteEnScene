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

export default async function PartenairesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const search = await searchParams
  const merci = search.merci
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
      {merci && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[#7ec850]/20 to-[#7ec850]/5 border border-[#7ec850]/30 text-center animate-fade-up">
          <div className="text-4xl mb-3">{merci === 'don' ? '💚' : '🎉'}</div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white mb-2">
            {merci === 'don' ? 'Merci pour votre soutien !' : 'Merci pour votre partenariat !'}
          </h2>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            {merci === 'don'
              ? 'Votre don nous aide à faire vivre le concours. Merci pour votre générosité !'
              : 'Votre paiement a bien été reçu. Envoyez votre logo à inscriptions@chantenscene.fr et nous le mettrons en ligne rapidement.'}
          </p>
        </div>
      )}
      <SponsorShowcase sponsors={sponsors || []} sessionName={session.name} slug={slug} />
    </section>
  )
}
