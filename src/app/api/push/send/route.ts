import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotifications, PushPayload, PushSegment } from '@/lib/push'

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
    const { sessionId, role, jurorId, endpoint, segment, candidateId, payload } = body as {
      sessionId: string
      role?: 'public' | 'jury' | 'admin' | 'all' | 'jury_online' | 'jury_semi' | 'jury_finale'
      jurorId?: string
      endpoint?: string
      segment?: PushSegment
      candidateId?: string
      payload: PushPayload
    }

    if (!sessionId || !payload?.title || !payload?.body) {
      return NextResponse.json(
        { error: 'sessionId, payload.title et payload.body sont requis' },
        { status: 400 }
      )
    }

    const result = await sendPushNotifications({ sessionId, role, jurorId, endpoint, segment, candidateId, payload })

    // Logger dans push_log
    const admin = createAdminClient()
    await admin.from('push_log').insert({
      session_id: sessionId,
      title: payload.title,
      body: payload.body,
      url: payload.url || null,
      role: role || 'all',
      segment: segment || null,
      is_test: !!endpoint,
      sent: result.sent,
      failed: result.failed,
      expired: result.expired,
      sent_by: user.email,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
