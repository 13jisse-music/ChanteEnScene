import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const { message, image_url, link, session_id } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const result = await publishEverywhere(message, image_url, link)

    // Log dans social_posts_log
    const admin = createAdminClient()
    const fbOk = result.facebook && 'id' in result.facebook
    const igOk = result.instagram && 'id' in result.instagram
    await admin.from('social_posts_log').insert({
      session_id: session_id || null,
      post_type: 'manual',
      source: 'manual',
      message,
      image_url: image_url || null,
      link: link || null,
      facebook_post_id: fbOk && result.facebook && 'id' in result.facebook ? result.facebook.id : null,
      instagram_post_id: igOk && result.instagram && 'id' in result.instagram ? result.instagram.id : null,
      error: (!fbOk && result.facebook && 'error' in result.facebook ? result.facebook.error : null)
        || (!igOk && result.instagram && 'error' in result.instagram ? result.instagram.error : null)
        || null,
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
