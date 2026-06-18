import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import FinalistesReveal from './FinalistesReveal'

export const dynamic = 'force-dynamic'

// Liens secrets (non listés). Le lien Olivier affiche le bouton de validation
// et notifie l'admin (ouverture + validation). Le lien jury est en lecture seule.
const OLIVIER_TOKEN = '12554435f30d2d76f756d99a'
const JURY_TOKEN = '4f0b21aa692d1156e5ff8444'

// 14 finalistes dans l'ordre d'affichage, groupés par catégorie
const FINALISTES: { id: string; cat: string }[] = [
  { id: '44e11857-e122-4659-8bb8-536772739cbd', cat: 'Enfant' },
  { id: '980ebc8c-6427-4255-a2dc-df40c399049d', cat: 'Enfant' },
  { id: 'b8409fad-4b1b-459b-b21b-1200e1040a21', cat: 'Enfant' },
  { id: '5285155b-a2ba-4bb6-a773-667b10f21b40', cat: 'Enfant' },
  { id: 'f68ad4a2-6777-46c3-99de-1eed0e82a817', cat: 'Ado' },
  { id: '6d71104b-336f-4f3e-99c7-2150e0c60447', cat: 'Ado' },
  { id: '5222cc7d-b218-4ad4-9ce5-3eda64514434', cat: 'Ado' },
  { id: 'da95daab-0bf4-4649-bd05-17648c6a16c0', cat: 'Ado' },
  { id: '7df6cf9d-f1e5-40eb-b9da-22fd01fd14b5', cat: 'Ado' },
  { id: '38362289-6c63-4803-a23b-b7c9ceaeb7d5', cat: 'Ado' },
  { id: '31b82ade-718f-4abc-80c7-68d79e1f8fc5', cat: 'Adulte' },
  { id: 'c5698361-2f0c-419c-8b09-2fca82053f11', cat: 'Adulte' },
  { id: 'ea80e47f-222b-41f9-93c4-6050f0c5007f', cat: 'Adulte' },
  { id: 'da1dae11-933a-44b7-bb67-c2c96a0f060c', cat: 'Adulte' },
]

export interface FinaliteItem {
  id: string
  nom: string
  real: string
  cat: string
  photo: string | null
}

export async function generateMetadata() {
  return { title: 'Résultats des finalistes — ChantEnScène 2026' }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== OLIVIER_TOKEN && token !== JURY_TOKEN) notFound()
  const isOlivier = token === OLIVIER_TOKEN

  const sb = createAdminClient()
  const { data: cands } = await sb
    .from('candidates')
    .select('id, first_name, last_name, stage_name, photo_url')
    .in('id', FINALISTES.map((f) => f.id))
  const byId = new Map((cands || []).map((c) => [c.id, c]))

  const items: FinaliteItem[] = FINALISTES.map((f) => {
    const c = byId.get(f.id)
    return {
      id: f.id,
      nom: c?.stage_name || c?.first_name || '',
      real: c ? `${c.first_name} ${c.last_name}` : '',
      cat: f.cat,
      photo: c?.photo_url ?? null,
    }
  })

  const byCat: Record<string, FinaliteItem[]> = { Enfant: [], Ado: [], Adulte: [] }
  for (const it of items) byCat[it.cat].push(it)

  return <FinalistesReveal token={token} isOlivier={isOlivier} byCat={byCat} />
}
