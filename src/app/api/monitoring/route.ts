export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const PAT = process.env.SUPABASE_ACCESS_TOKEN || ''
const PROJECT_REF = 'xarrchsokuhobwqvcnkg'

interface HourlyData {
  timestamp: string
  total_rest_requests: number
  total_storage_requests: number
  total_auth_requests: number
  total_realtime_requests: number
}

async function fetchAnalytics(interval: string): Promise<HourlyData[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/analytics/endpoints/usage.api-counts?interval=${interval}`,
    { headers: { Authorization: `Bearer ${PAT}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.result || []
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
  })
}

export async function GET() {
  if (!PAT) {
    return NextResponse.json({ error: 'Missing SUPABASE_ACCESS_TOKEN' }, { status: 500 })
  }

  const [hourly, weekly] = await Promise.all([
    fetchAnalytics('1day'),
    fetchAnalytics('7day'),
  ])

  // Group by day
  const days: Record<string, { rest: number; storage: number; auth: number }> = {}
  for (const r of weekly) {
    const day = r.timestamp.substring(0, 10)
    if (!days[day]) days[day] = { rest: 0, storage: 0, auth: 0 }
    days[day].rest += r.total_rest_requests || 0
    days[day].storage += r.total_storage_requests || 0
    days[day].auth += r.total_auth_requests || 0
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120, s-maxage=120',
  }

  return NextResponse.json({ hourly, days }, { headers: corsHeaders })
}
