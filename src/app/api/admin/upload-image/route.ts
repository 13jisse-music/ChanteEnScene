import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, listR2Objects } from '@/lib/r2'

export async function GET() {
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

  // List images from R2
  const r2Files = await listR2Objects('social/', 50)
  const images = r2Files
    .filter(f => f.key.match(/\.(jpg|jpeg|png|webp)$/i))
    .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
    .map(f => ({
      name: f.key.replace('social/', ''),
      url: f.url,
      folder: 'social',
    }))

  return NextResponse.json({ images })
}

export async function POST(request: Request) {
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
    const key = `social/${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadToR2(key, buffer, file.type || 'image/jpeg')

    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
