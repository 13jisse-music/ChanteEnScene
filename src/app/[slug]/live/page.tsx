import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LiveView from '@/components/LiveView'
import LiveEventWatcher from '@/components/LiveEventWatcher'
import PageTracker from '@/components/PageTracker'

type Params = Promise<{ slug: string }>

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NoLiveSection({ slug, session }: { slug: string; session: any }) {
  const config = session.config as { promo_video_url?: string; final_date?: string; semifinal_date?: string; final_location?: string }
  const promoUrl = config.promo_video_url?.trim()
  const embedUrl = promoUrl ? getEmbedUrl(promoUrl) : null
  const directVideo = promoUrl && isDirectVideo(promoUrl)

  return (
    <div className="animate-fade-up space-y-8">
      {/* Video promo */}
      {promoUrl && (embedUrl || directVideo) && (
        <div className="rounded-2xl overflow-hidden border border-[#2e2555] shadow-xl shadow-black/30 bg-black">
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={promoUrl}
              controls
              playsInline
              className="w-full"
              poster=""
            />
          )}
        </div>
      )}

      {/* Info text */}
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📺</div>
        <p
          className="text-white text-lg font-medium"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
        >
          Aucun événement en direct pour le moment.
        </p>
        <p
          className="text-white/70 text-sm mt-2 max-w-md mx-auto"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
        >
          Revenez lors de la Grande Finale pour voter en live
          pour vos candidats préférés !
        </p>

        {/* Dates info */}
        {(config.semifinal_date || config.final_date) && (
          <div className="mt-6 inline-flex flex-col gap-2 text-sm">
            {config.semifinal_date && (
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-[#e91e8c]">Demi-finale</span>
                <span className="text-white/30">—</span>
                <span>{new Date(config.semifinal_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {config.final_date && (
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-[#7ec850]">Finale</span>
                <span className="text-white/30">—</span>
                <span>{new Date(config.final_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {config.final_location && <span className="text-white/30">({config.final_location})</span>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href={`/${slug}/candidats`}
            className="px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all"
          >
            Voir les candidats
          </Link>
          <Link
            href={`/${slug}/inscription`}
            className="px-6 py-2.5 rounded-full text-sm font-bold text-white border border-[#2e2555] hover:bg-white/5 hover:-translate-y-0.5 transition-all"
          >
            Je m&apos;inscris
          </Link>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('name')
    .eq('slug', slug)
    .single()

  return {
    title: session ? `Live — ${session.name}` : 'Live — ChanteEnScène',
  }
}

export default async function LivePage({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  // Find active live event (only finale — semifinal is huis clos)
  const { data: liveEvent } = await supabase
    .from('live_events')
    .select('*')
    .eq('session_id', session.id)
    .eq('event_type', 'final')
    .in('status', ['pending', 'live', 'paused'])
    .limit(1)
    .maybeSingle()

  // Get lineup if event exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lineup: any[] = []
  if (liveEvent) {
    const { data } = await supabase
      .from('lineup')
      .select('*, candidates(id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist, accent_color, bio)')
      .eq('live_event_id', liveEvent.id)
      .order('position')
    lineup = data || []
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <PageTracker sessionId={session.id} pagePath={`/${slug}/live`} />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 animate-fade-up">
          <h1
            className="font-[family-name:var(--font-montserrat)] font-black text-2xl md:text-3xl text-white mt-4 mb-1"
            style={{ textShadow: '0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)' }}
          >
            <span className="text-gradient-gold" style={{ textShadow: 'none' }}>Live</span>
          </h1>
          <p
            className="text-white text-sm"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
          >
            {session.name}
          </p>
        </div>

        {liveEvent ? (
          <LiveView
            liveEvent={liveEvent}
            lineup={lineup}
            sessionId={session.id}
            slug={slug}
            sessionName={session.name}
          />
        ) : (
          <>
            <LiveEventWatcher sessionId={session.id} />
            <NoLiveSection slug={slug} session={session} />
          </>
        )}
      </div>
    </main>
  )
}
