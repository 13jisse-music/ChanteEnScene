import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishEverywhere } from '@/lib/social'

export async function POST(request: Request) {
  // Vérifier que l'utilisateur est admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Verify admin role
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!adminUser) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  try {
    const { message, image_url, link } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const result = await publishEverywhere(message, image_url, link)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
