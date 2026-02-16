import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminConfig from '@/components/AdminConfig'

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

  return (
    <div className="p-6">
      <AdminConfig session={session} />
    </div>
  )
}
