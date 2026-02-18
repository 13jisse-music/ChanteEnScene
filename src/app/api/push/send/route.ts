import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotifications, PushPayload } from '@/lib/push'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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

    const body = await request.json()
    const { sessionId, role, jurorId, payload } = body as {
      sessionId: string
      role?: 'public' | 'jury' | 'admin' | 'all'
      jurorId?: string
      payload: PushPayload
    }

    if (!sessionId || !payload?.title || !payload?.body) {
      return NextResponse.json(
        { error: 'sessionId, payload.title et payload.body sont requis' },
        { status: 400 }
      )
    }

    const result = await sendPushNotifications({ sessionId, role, jurorId, payload })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
