import { createAdminClient } from '@/lib/supabase/admin'
import SessionManager from '@/components/SessionManager'

export const metadata = { title: 'Sessions — ChanteEnScène Admin' }

export default async function SessionsPage() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, city, year, status, is_active, created_at')
    .order('year', { ascending: false })

  return (
    <div className="p-6">
      <SessionManager sessions={sessions || []} />
    </div>
  )
}
