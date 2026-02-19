import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, endpoint, p256dh, auth, role, jurorId, fingerprint } = body

    if (!sessionId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete any existing subscription for this endpoint first
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('session_id', sessionId)

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        session_id: sessionId,
        endpoint,
        p256dh,
        auth,
        role: role || 'public',
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
