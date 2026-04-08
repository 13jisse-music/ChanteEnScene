import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReport } from '@/lib/analytics-report'

// GET /api/analytics/report?days=30
// Protege : admin uniquement
export async function GET(request: NextRequest) {
  try {
    // Verifier que l'utilisateur est admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non connecte' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    // Periode (defaut 30 jours)
    const daysParam = request.nextUrl.searchParams.get('days')
    const days = daysParam ? Math.min(parseInt(daysParam) || 30, 365) : 30

    const report = await generateReport(days, 'ces')
    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
