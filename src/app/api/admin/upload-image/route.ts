import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // Vérifier que l'utilisateur est admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!adminUser) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `social/${Date.now()}.${ext}`

    const admin = createAdminClient()
    const { error } = await admin.storage
      .from('photos')
      .upload(fileName, file, { contentType: file.type })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = admin.storage
      .from('photos')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
