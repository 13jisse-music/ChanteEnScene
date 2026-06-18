import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import FinaleSelect from './FinaleSelect'

export const dynamic = 'force-dynamic'

const SESSION = '682bef39-e7ec-4943-9e62-96bfb91bfcac'
// Nombre de finalistes pré-cochés par catégorie (modifiable par le juré)
const KEEP: Record<string, number> = { Ado: 6, Enfant: 4, Adulte: 4 }

// Correspondance candidat -> clip vidéo (bucket privé jury-temp)
const CLIP: Record<string, string> = {
  '057d199d-edad-4c60-8583-d4a30575c0c5': '01_Sblm.mp4',
  '6c984f9c-e114-46b8-8bad-81821fcfdb6e': '02_LyLy.mp4',
  'c5698361-2f0c-419c-8b09-2fca82053f11': '03_EmmaRoulin.mp4',
  '44e11857-e122-4659-8bb8-536772739cbd': '04_Mael.mp4',
  '52465503-ff8e-4e80-b056-15f4d400d56d': '05_Sea.mp4',
  '31b82ade-718f-4abc-80c7-68d79e1f8fc5': '06_Zabou.mp4',
  'f213c81c-c7ff-45a2-8600-432454e2fc04': '07_LeaDebeure.mp4',
  'b8409fad-4b1b-459b-b21b-1200e1040a21': '08_selena.mp4',
  '5222cc7d-b218-4ad4-9ce5-3eda64514434': '09_Lena.mp4',
  'da95daab-0bf4-4649-bd05-17648c6a16c0': '10_ZoeGalmiche.mp4',
  '7df6cf9d-f1e5-40eb-b9da-22fd01fd14b5': '11_Ambre.mp4',
  '14be4595-9879-4ad7-9e55-52b39e970e95': '12_Ludmila.mp4',
  'da1dae11-933a-44b7-bb67-c2c96a0f060c': '13_Patricia.mp4',
  '1db7424b-154f-4535-af59-4bd4911c4d46': '14_JessicaCoti.mp4',
  '97844082-6f65-49f4-b92a-a7d835d1a7ee': '15_Tessa.mp4',
  'ff58d7f5-3389-4319-aeaa-1ea268ea39bc': '16_kate.mp4',
  '116cd44e-759a-4628-97d7-6be58e651443': '17_Lisa.mp4',
  '828b606d-5517-4144-a101-e5f9a5026284': '18_Angelina.mp4',
  '5285155b-a2ba-4bb6-a773-667b10f21b40': '19_LolaPayet.mp4',
  'f68ad4a2-6777-46c3-99de-1eed0e82a817': '20_Soane.mp4',
  '38362289-6c63-4803-a23b-b7c9ceaeb7d5': '21_ZoeLauxen.mp4',
  '2a13763b-258c-48a6-8052-2584a81b16ae': '22_CaroCactus.mp4',
  '69b91d09-3cc3-4af7-92ff-6fd42eeb831f': '23_EvaAms.mp4',
  '6d71104b-336f-4f3e-99c7-2150e0c60447': '24_EmmaRose.mp4',
  'a961e639-7376-45fb-9ab1-d09c5ed9ea0f': '25_Noemie.mp4',
  'ea80e47f-222b-41f9-93c4-6050f0c5007f': '26_LeaBifarella.mp4',
  'cc210977-6051-4f2a-a412-61fe90eb058a': '27_LolaGagliano.mp4',
  '8d09c136-4737-4f01-803e-e6ccad9a8ebc': '28_SarahVado.mp4',
  '980ebc8c-6427-4255-a2dc-df40c399049d': '29_Olivia.mp4',
  '80f6f0f8-79f0-4f30-bfba-6919016eb783': '30_Horia.mp4',
}

function ageAt(dob: string | null): number | null {
  if (!dob) return null
  const b = new Date(dob)
  const ref = new Date('2026-06-17')
  let a = ref.getFullYear() - b.getFullYear()
  const m = ref.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) a--
  return a
}

export async function generateMetadata() {
  return { title: 'Choix des finalistes — ChanteEnScène' }
}

export interface FinaleItem {
  id: string; name: string; real: string; cat: string;
  photo: string | null; age: number | null; clip: string | null;
  note: number | null; moy: number;
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const sb = createAdminClient()

  const { data: juror } = await sb
    .from('jurors')
    .select('id, first_name, role, is_active')
    .eq('qr_token', token)
    .eq('is_active', true)
    .single()
  if (!juror || juror.role !== 'semifinal') notFound()

  const ids = Object.keys(CLIP)
  const { data: cands } = await sb
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, photo_url, date_of_birth')
    .in('id', ids)

  // Moyenne anonyme du jury (total_score, buzz inclus)
  const { data: allScores } = await sb
    .from('jury_scores')
    .select('candidate_id, total_score')
    .eq('session_id', SESSION)
    .eq('event_type', 'semifinal')
  const agg: Record<string, { s: number; n: number }> = {}
  for (const s of allScores || []) {
    const k = s.candidate_id as string
    ;(agg[k] ||= { s: 0, n: 0 })
    agg[k].s += Number(s.total_score); agg[k].n++
  }
  const moyOf = (id: string) => (agg[id]?.n ? agg[id].s / agg[id].n : 0)

  // Notes de CE juré uniquement
  const { data: mine } = await sb
    .from('jury_scores')
    .select('candidate_id, total_score, scores')
    .eq('juror_id', juror.id)
    .eq('event_type', 'semifinal')
  const myNote: Record<string, number> = {}
  for (const s of mine || []) {
    const sc = (s.scores as { score?: number } | null)?.score
    myNote[s.candidate_id as string] = Number(sc ?? s.total_score)
  }

  // Sélection déjà soumise ?
  const { data: existing } = await sb
    .from('jury_priorities')
    .select('candidate_id')
    .eq('juror_id', juror.id)
    .eq('round', 'final')
  const existingIds = new Set((existing || []).map(e => e.candidate_id as string))

  const items: FinaleItem[] = []
  for (const c of cands || []) {
    const { data: signed } = await sb.storage.from('jury-temp').createSignedUrl(`clips/${CLIP[c.id]}`, 12 * 3600)
    items.push({
      id: c.id, name: c.stage_name || c.first_name, real: `${c.first_name} ${c.last_name}`,
      cat: c.category, photo: c.photo_url, age: ageAt(c.date_of_birth),
      clip: signed?.signedUrl ?? null, note: myNote[c.id] ?? null, moy: moyOf(c.id),
    })
  }

  const cats = ['Enfant', 'Ado', 'Adulte']
  const byCat: Record<string, FinaleItem[]> = {}
  for (const cat of cats) byCat[cat] = items.filter(i => i.cat === cat).sort((a, b) => b.moy - a.moy)

  const preselected = new Set<string>()
  if (existingIds.size) {
    existingIds.forEach(id => preselected.add(id))
  } else {
    for (const cat of cats) byCat[cat].slice(0, KEEP[cat] ?? 4).forEach(i => preselected.add(i.id))
  }

  return (
    <FinaleSelect
      token={token}
      jurorName={juror.first_name}
      byCat={byCat}
      keep={KEEP}
      preselected={[...preselected]}
      alreadySubmitted={existingIds.size > 0}
    />
  )
}
