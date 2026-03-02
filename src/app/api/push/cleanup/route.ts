import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { sessionId, role } = body as { sessionId: string; role: string }

    if (!sessionId || !role) {
      return NextResponse.json({ error: 'sessionId et role sont requis' }, { status: 400 })
    }

    // Only allow cleaning jury sub-roles (safety guard)
    const allowedRoles = ['jury', 'jury_online', 'jury_semi', 'jury_finale']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Rôle non autorisé pour le nettoyage' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Count before deleting
    const { count } = await admin
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('role', role)

    // Delete all subscriptions for this role
    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('session_id', sessionId)
      .eq('role', role)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted: count || 0 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
