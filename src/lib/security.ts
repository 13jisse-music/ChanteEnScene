import { createClient } from '@/lib/supabase/server'

/**
 * Verify the current user is an authenticated admin.
 * Throws if not authenticated or not in admin_users table.
 * Use at the top of every admin Server Action.
 */
export async function requireAdmin(): Promise<{ email: string; role: string; session_ids: string[] | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('Non authentifié')
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('role, session_ids')
    .eq('email', user.email)
    .maybeSingle()

  if (!admin) {
    throw new Error('Accès non autorisé')
  }

  return { email: user.email, role: admin.role, session_ids: admin.session_ids }
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
