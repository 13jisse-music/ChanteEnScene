import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import SuiviDashboard from './SuiviDashboard'

export const dynamic = 'force-dynamic'

const SUIVI_TOKEN = '4267a46a049750d437d41cc7'
const SESSION = '682bef39-e7ec-4943-9e62-96bfb91bfcac'

export async function generateMetadata() {
  return { title: 'Suivi finalistes — ChantEnScène' }
}

export interface SuiviRow {
  id: string
  nom: string
  category: string
  phone: string | null
  fastTitle: string | null; fastArtist: string | null; fastKey: string | null
  slowTitle: string | null; slowArtist: string | null; slowKey: string | null
  mailOpened: boolean
  submitted: boolean
  phoneVerified: boolean
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== SUIVI_TOKEN) notFound()

  const sb = createAdminClient()
  const { data: entries } = await sb
    .from('finale_entries')
    .select('*')
    .eq('session_id', SESSION)
  const ids = (entries || []).map((e) => e.candidate_id)
  const { data: cands } = await sb
    .from('candidates')
    .select('id, first_name, stage_name, category')
    .in('id', ids)
  const byId = new Map((cands || []).map((c) => [c.id, c]))

  const order: Record<string, number> = { Enfant: 0, Ado: 1, Adulte: 2 }
  const rows: SuiviRow[] = (entries || []).map((e) => {
    const c = byId.get(e.candidate_id)
    return {
      id: e.id as string,
      nom: (c?.stage_name || c?.first_name || '') as string,
      category: (c?.category || '') as string,
      phone: e.phone, fastTitle: e.fast_title, fastArtist: e.fast_artist, fastKey: e.fast_key,
      slowTitle: e.slow_title, slowArtist: e.slow_artist, slowKey: e.slow_key,
      mailOpened: !!e.mail_opened_at, submitted: !!e.submitted_at, phoneVerified: !!e.phone_verified,
    }
  }).sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9) || a.nom.localeCompare(b.nom))

  return <SuiviDashboard token={token} rows={rows} />
}
