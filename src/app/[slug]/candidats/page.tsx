import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CandidateGallery from '@/components/CandidateGallery'
import PageTracker from '@/components/PageTracker'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('name')
    .eq('slug', slug)
    .single()

  return {
    title: session ? `Candidats — ${session.name}` : 'Candidats — ChanteEnScène',
  }
}

export default async function CandidatsPage({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, photo_url, song_title, song_artist, category, bio, accent_color, slug, likes_count, video_url, video_public, status')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .order('likes_count', { ascending: false })

  const config = session.config as { age_categories: { name: string }[] }
  const categories = config.age_categories.map((c: { name: string }) => c.name)

  return (
    <main className="min-h-screen md:py-8 md:px-4">
      <PageTracker sessionId={session.id} pagePath={`/${slug}/candidats`} />
      <div className="md:max-w-6xl md:mx-auto">
        {/* Header (hidden on mobile, swipe feed has its own) */}
        <div className="text-center mb-10 animate-fade-up hidden md:block">
          <h1
            className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mt-4 mb-2"
            style={{ textShadow: '0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)' }}
          >
            <span>Nos </span>
            <span className="text-gradient-gold" style={{ textShadow: 'none' }}>Candidats</span>
          </h1>
          <p
            className="text-white text-sm"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
          >
            {session.name}
          </p>
        </div>

        {candidates && candidates.length > 0 ? (
          <CandidateGallery
            candidates={candidates}
            sessionId={session.id}
            categories={categories}
          />
        ) : (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-5xl mb-4">🎤</div>
            <p
              className="text-white text-lg font-medium"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
            >
              Aucun candidat pour le moment.
            </p>
            <p
              className="text-white/70 text-sm mt-2"
              style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
            >
              Les candidatures sont en cours de validation.
            </p>
            <Link
              href={`/${slug}/inscription`}
              className="inline-block mt-8 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all"
            >
              Je m&apos;inscris
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
