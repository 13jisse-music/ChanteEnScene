import { createAdminClient } from '@/lib/supabase/admin'
import EditionsGallery from '@/components/EditionsGallery'

export const revalidate = 3600

export const metadata = {
  title: 'Les Editions - ChanteEnScene',
  description: 'Retrouvez les photos et videos de toutes les editions de ChanteEnScene.',
}

export default async function EditionsPage() {
  const supabase = createAdminClient()

  // Fetch only archived sessions (not the current edition)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, city, year, status, is_active')
    .eq('status', 'archived')
    .order('year', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return (
      <section className="relative z-10 py-8 px-4 max-w-6xl mx-auto">
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">Aucune edition disponible.</p>
        </div>
      </section>
    )
  }

  // For each session, fetch photos and videos
  const editions = await Promise.all(
    sessions.map(async (session) => {
      // Fetch published photos for this session
      const { data: photos } = await supabase
        .from('photos')
        .select(`
          id, photo_url, caption, tag_event, published,
          candidates:tag_candidate_id (first_name, last_name, stage_name)
        `)
        .eq('session_id', session.id)
        .eq('published', true)
        .order('created_at', { ascending: false })

      // Fetch published videos for this session
      const { data: videos } = await supabase
        .from('edition_videos')
        .select('id, youtube_url, title, description, thumbnail_url, sort_order, published')
        .eq('session_id', session.id)
        .eq('published', true)
        .order('sort_order', { ascending: true })

      const formattedPhotos = (photos || []).map((p) => {
        const c = p.candidates as unknown as { first_name: string; last_name: string; stage_name: string | null } | null
        return {
          id: p.id,
          photo_url: p.photo_url,
          caption: p.caption,
          tag_event: p.tag_event,
          candidate_name: c ? (c.stage_name || `${c.first_name} ${c.last_name}`) : null,
        }
      })

      return {
        id: session.id,
        name: session.name,
        slug: session.slug,
        city: session.city,
        year: session.year,
        status: session.status,
        is_active: session.is_active,
        photos: formattedPhotos,
        videos: (videos || []) as { id: string; youtube_url: string; title: string; description: string | null; thumbnail_url: string | null; sort_order: number; published: boolean }[],
      }
    })
  )

  return (
    <section className="relative z-10 py-8 px-4 max-w-6xl mx-auto">
      <EditionsGallery editions={editions} />
    </section>
  )
}
