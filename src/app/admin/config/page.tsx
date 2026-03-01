export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminConfig from '@/components/AdminConfig'
import { autoAdvanceSessionStatus } from '@/lib/auto-advance'

export const metadata = { title: 'Configuration — ChanteEnScène Admin' }

export default async function ConfigPage() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, status, config')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin/sessions')

  // Auto-advance session status if dates have passed
  const advancedStatus = await autoAdvanceSessionStatus(session)
  if (advancedStatus !== session.status) session.status = advancedStatus

  return (
    <div className="p-4 sm:p-6">
      <AdminConfig session={session} />
    </div>
  )
}
