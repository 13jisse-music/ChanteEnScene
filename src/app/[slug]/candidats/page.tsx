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

        {/* Top 10 ranking — only visible on desktop when 10+ candidates */}
        {candidates && candidates.length >= 10 && (
          <div className="hidden md:block mb-8 animate-fade-up">
            <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-white text-center mb-4 flex items-center justify-center gap-2">
                <span className="text-lg">🏅</span>
                <span>Top 10 des votes</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {candidates.slice(0, 10).map((c, i) => {
                  const name = c.stage_name || `${c.first_name} ${c.last_name}`
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <Link
                      key={c.id}
                      href={`/${slug}/candidats/${c.slug}`}
                      className="flex items-center gap-2.5 bg-[#1a1232] border border-[#2e2555] rounded-xl px-3 py-2.5 hover:border-[#e91e8c]/30 transition-colors group"
                    >
                      <span className="text-sm font-bold text-white/30 w-5 shrink-0 text-center">
                        {i < 3 ? medals[i] : `${i + 1}`}
                      </span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2e2555] shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/20">🎤</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-medium truncate group-hover:text-[#e91e8c] transition-colors">{name}</p>
                        <p className="text-[#6b5d85] text-[10px]">{c.likes_count} vote{c.likes_count !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

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
