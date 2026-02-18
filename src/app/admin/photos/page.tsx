export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PhotoAdmin from '@/components/PhotoAdmin'

export const metadata = { title: 'Photos — ChanteEnScène Admin' }

export default async function PhotosPage() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  const { data: photos } = await supabase
    .from('photos')
    .select('id, photo_url, caption, tag_type, tag_candidate_id, tag_event, published, created_at, source, submitted_by_name, submitted_by_email')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name')
    .eq('session_id', session.id)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .order('last_name')

  return (
    <div className="p-4 sm:p-6">
      <PhotoAdmin
        sessionId={session.id}
        photos={photos || []}
        candidates={candidates || []}
      />
    </div>
  )
}
