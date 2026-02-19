import { createAdminClient } from '@/lib/supabase/admin'
import EditionsAdmin from '@/components/EditionsAdmin'

export const metadata = { title: 'Editions - Admin ChanteEnScene' }

export default async function AdminEditionsPage() {
  const supabase = createAdminClient()

  // Fetch archived + active sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, city, year, status, is_active')
    .order('year', { ascending: false })

  // Fetch ALL photos (published and unpublished) for archived sessions
  const archivedSessionIds = (sessions || [])
    .filter((s) => s.status === 'archived')
    .map((s) => s.id)

  const { data: photos } = archivedSessionIds.length > 0
    ? await supabase
        .from('photos')
        .select('id, session_id, photo_url, caption, tag_event, published, created_at')
        .in('session_id', archivedSessionIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Fetch ALL videos
  const { data: videos } = archivedSessionIds.length > 0
    ? await supabase
        .from('edition_videos')
        .select('id, session_id, youtube_url, title, description, published, sort_order')
        .in('session_id', archivedSessionIds)
        .order('sort_order', { ascending: true })
    : { data: [] }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <EditionsAdmin
        sessions={sessions || []}
        photos={photos || []}
        videos={videos || []}
      />
    </div>
  )
}
