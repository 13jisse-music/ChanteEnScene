export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewsletterAdmin from '@/components/NewsletterAdmin'

export const metadata = { title: 'Newsletter — ChanteEnScene Admin' }

export default async function NewsletterPage() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin/sessions')

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })

  // Count subscribers by source
  const { data: subscribers } = await supabase
    .from('email_subscribers')
    .select('source')
    .eq('session_id', session.id)
    .eq('is_active', true)

  const total = subscribers?.length || 0
  const legacy = subscribers?.filter((s) => s.source === 'legacy_import').length || 0
  const voluntary = total - legacy

  return (
    <div className="p-4 sm:p-6">
      <NewsletterAdmin
        sessionId={session.id}
        campaigns={campaigns || []}
        counts={{ total, voluntary, legacy }}
      />
    </div>
  )
}
