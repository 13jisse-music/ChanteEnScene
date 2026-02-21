import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, endpoint, p256dh, auth, role, jurorId, fingerprint } = body

    if (!sessionId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Auto-detect admin: if user is logged in and is an admin, upgrade role
    let resolvedRole = role || 'public'
    if (resolvedRole === 'public') {
      try {
        const serverClient = await createClient()
        const { data: { user } } = await serverClient.auth.getUser()
        if (user) {
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role')
            .eq('email', user.email!)
            .maybeSingle()
          if (adminUser) {
            resolvedRole = 'admin'
          }
        }
      } catch {
        // Silent — keep public role if auth check fails
      }
    }

    // Delete any existing subscription for this endpoint
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('session_id', sessionId)

    // Also clean up old subscriptions for the same device (fingerprint)
    // iOS PWA reinstalls generate new endpoints, leaving orphaned entries
    if (fingerprint) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('fingerprint', fingerprint)
        .eq('session_id', sessionId)
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        session_id: sessionId,
        endpoint,
        p256dh,
        auth,
        role: resolvedRole,
        juror_id: jurorId || null,
        fingerprint: fingerprint || null,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, endpoint } = body

    if (!sessionId || !endpoint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('session_id', sessionId)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
