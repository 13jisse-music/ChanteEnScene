import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, fingerprint, platform, installSource } = body

    if (!sessionId || !fingerprint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const userAgent = request.headers.get('user-agent') || null
    const rawCity = request.headers.get('x-vercel-ip-city')
    const city = rawCity ? decodeURIComponent(rawCity) : null
    const region = request.headers.get('x-vercel-ip-country-region') || null
    const latStr = request.headers.get('x-vercel-ip-latitude')
    const lngStr = request.headers.get('x-vercel-ip-longitude')
    const latitude = latStr ? parseFloat(latStr) : null
    const longitude = lngStr ? parseFloat(lngStr) : null

    const { error } = await supabase
      .from('pwa_installs')
      .upsert(
        {
          session_id: sessionId,
          fingerprint,
          platform: platform || 'unknown',
          install_source: installSource || 'prompt',
          user_agent: userAgent,
          city,
          region,
          latitude,
          longitude,
        },
        { onConflict: 'session_id,fingerprint' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
