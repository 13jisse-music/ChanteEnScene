export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ChatbotAdmin from '@/components/ChatbotAdmin'

export const metadata = { title: 'Chatbot FAQ — ChanteEnScène Admin' }

export default async function ChatbotPage() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!session) redirect('/admin')

  const { data: faqs } = await supabase
    .from('chatbot_faq')
    .select('id, question, answer, sort_order, is_active')
    .eq('session_id', session.id)
    .order('sort_order')

  return (
    <div className="p-4 sm:p-6">
      <ChatbotAdmin sessionId={session.id} faqs={faqs || []} />
    </div>
  )
}
