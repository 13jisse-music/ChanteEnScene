import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CandidateProfile from '@/components/CandidateProfile'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Mon profil — ${slug}` }
}

export default async function MonProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams
  const supabase = await createClient()

  // Find session
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  // Auth: candidate must provide their email slug as token
  // Simple token-based auth: ?token=candidate-slug
  if (!token) {
    return (
      <section className="relative z-10 py-16 px-4 max-w-md mx-auto text-center">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white mb-4"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Accéder à mon profil
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Entrez le lien reçu par email pour accéder à votre espace candidat.
        </p>
        <form
          action={`/${slug}/mon-profil`}
          method="GET"
          className="space-y-4"
        >
          <input
            name="token"
            placeholder="Votre identifiant candidat"
            required
            className="w-full px-4 py-3 rounded-xl bg-[#161228]/80 border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
          >
            Accéder à mon profil
          </button>
        </form>
      </section>
    )
  }

  // Find candidate by slug (token)
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, email, phone, city, category, photo_url, bio, accent_color, song_title, song_artist, status, slug, youtube_url, instagram_url, tiktok_url, website_url, finale_songs')
    .eq('session_id', session.id)
    .eq('slug', token)
    .single()

  if (!candidate) {
    return (
      <section className="relative z-10 py-16 px-4 max-w-md mx-auto text-center">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white mb-4">
          Profil introuvable
        </h1>
        <p className="text-white/50 text-sm">
          L&apos;identifiant fourni ne correspond à aucun candidat.
        </p>
      </section>
    )
  }

  return (
    <section className="relative z-10 py-8 px-4">
      <CandidateProfile candidate={candidate} sessionSlug={slug} />
    </section>
  )
}
