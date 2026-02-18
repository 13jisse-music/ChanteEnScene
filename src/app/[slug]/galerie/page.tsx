import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PhotoGallery from '@/components/PhotoGallery'
import PageTracker from '@/components/PageTracker'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Galerie photos — ${slug}` }
}

export default async function GaleriePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const { data: photos } = await supabase
    .from('photos')
    .select(`
      id,
      photo_url,
      caption,
      tag_type,
      tag_event,
      tag_candidate_id,
      candidates:tag_candidate_id (first_name, last_name, stage_name)
    `)
    .eq('session_id', session.id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  const formattedPhotos = (photos || []).map((p) => {
    const c = p.candidates as unknown as { first_name: string; last_name: string; stage_name: string | null } | null
    return {
      id: p.id,
      photo_url: p.photo_url,
      caption: p.caption,
      tag_type: p.tag_type,
      tag_event: p.tag_event,
      candidate_name: c ? (c.stage_name || `${c.first_name} ${c.last_name}`) : null,
    }
  })

  return (
    <section className="relative z-10 py-8 px-4 max-w-7xl mx-auto">
      <PageTracker sessionId={session.id} pagePath={`/${slug}/galerie`} />
      <PhotoGallery photos={formattedPhotos} sessionName={session.name} />
    </section>
  )
}
