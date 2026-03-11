import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, candidateId, pagePath, fingerprint, referrer, duration } = body

    if (!sessionId || !pagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const ip = ipHeader?.split(',')[0]?.trim() || null
    const userAgent = request.headers.get('user-agent') || null

    // Vercel geo headers (free, automatic)
    const city = request.headers.get('x-vercel-ip-city') || null
    const region = request.headers.get('x-vercel-ip-region') || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const latitude = request.headers.get('x-vercel-ip-latitude') ? parseFloat(request.headers.get('x-vercel-ip-latitude')!) : null
    const longitude = request.headers.get('x-vercel-ip-longitude') ? parseFloat(request.headers.get('x-vercel-ip-longitude')!) : null

    if (duration && duration > 0) {
      // Update existing page view with duration
      const { error } = await supabase
        .from('page_views')
        .update({ duration_seconds: Math.round(duration) })
        .eq('session_id', sessionId)
        .eq('page_path', pagePath)
        .eq('fingerprint', fingerprint || '')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        // Fallback: insert new row with duration
        await supabase.from('page_views').insert({
          session_id: sessionId,
          candidate_id: candidateId || null,
          page_path: pagePath,
          fingerprint: fingerprint || null,
          ip_address: ip,
          user_agent: userAgent,
          referrer: referrer || null,
          duration_seconds: Math.round(duration),
          city, region, country, latitude, longitude,
        })
      }
    } else {
      // Initial page view
      await supabase.from('page_views').insert({
        session_id: sessionId,
        candidate_id: candidateId || null,
        page_path: pagePath,
        fingerprint: fingerprint || null,
        ip_address: ip,
        user_agent: userAgent,
        referrer: referrer || null,
        duration_seconds: 0,
        city, region, country, latitude, longitude,
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
