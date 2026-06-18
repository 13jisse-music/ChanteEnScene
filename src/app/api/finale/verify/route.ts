import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const SUIVI_TOKEN = '4267a46a049750d437d41cc7'

// Marque (ou démarque) un téléphone comme vérifié, depuis le tableau de bord
// de suivi. Protégé par le token de suivi (Olivier / admin).
export async function POST(req: Request) {
  let b: { suiviToken?: string; entryId?: string; value?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }
  if (b.suiviToken !== SUIVI_TOKEN) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!b.entryId) return NextResponse.json({ error: 'Manque entryId.' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb.from('finale_entries')
    .update({ phone_verified: !!b.value, updated_at: new Date().toISOString() })
    .eq('id', b.entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
