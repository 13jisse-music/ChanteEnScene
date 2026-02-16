import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SponsorAdmin from '@/components/SponsorAdmin'

export const metadata = { title: 'Sponsors — ChanteEnScène Admin' }

export default async function SponsorsPage() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('id, name, logo_url, website_url, description, tier, position, published, created_at')
    .eq('session_id', session.id)
    .order('position')

  return (
    <div className="p-6">
      <SponsorAdmin sessionId={session.id} sponsors={sponsors || []} />
    </div>
  )
}
