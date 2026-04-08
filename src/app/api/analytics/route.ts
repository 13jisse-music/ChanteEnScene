import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface IncomingEvent {
  event_type: string
  event_data?: Record<string, unknown>
  page_path: string
  page_title?: string
}

interface IncomingPayload {
  session_id: string
  fingerprint: string
  device: {
    device_type?: string
    browser?: string
    os?: string
    screen_width?: number
    screen_height?: number
    viewport_width?: number
    viewport_height?: number
    language?: string
  }
  utm: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
  }
  events: IncomingEvent[]
}

export async function POST(request: NextRequest) {
  try {
    const body: IncomingPayload = await request.json()
    const { session_id, fingerprint, device, utm, events } = body

    if (!session_id || !events?.length) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // Limiter a 50 events par batch (protection spam)
    const batch = events.slice(0, 50)

    // Extraire IP et geo depuis les headers Vercel
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const ip = ipHeader?.split(',')[0]?.trim() || null
    const city = request.headers.get('x-vercel-ip-city') || null
    const region = request.headers.get('x-vercel-ip-region') || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const latitude = request.headers.get('x-vercel-ip-latitude')
      ? parseFloat(request.headers.get('x-vercel-ip-latitude')!)
      : null
    const longitude = request.headers.get('x-vercel-ip-longitude')
      ? parseFloat(request.headers.get('x-vercel-ip-longitude')!)
      : null

    // Recuperer le user_id si connecte
    let userId: string | null = null
    try {
      const supabaseUser = await createClient()
      const { data: { user } } = await supabaseUser.auth.getUser()
      if (user) userId = user.id
    } catch {
      // pas connecte, c'est OK
    }

    const supabase = createAdminClient()

    // Construire les rows a inserer
    const rows = batch.map(evt => ({
      project: 'ces',
      session_id,
      fingerprint: fingerprint || null,
      user_id: userId,
      is_authenticated: !!userId,
      event_type: evt.event_type,
      event_data: evt.event_data || {},
      page_path: evt.page_path,
      page_title: evt.page_title || null,
      referrer: (evt.event_data?.referrer as string) || null,
      utm_source: utm?.utm_source || null,
      utm_medium: utm?.utm_medium || null,
      utm_campaign: utm?.utm_campaign || null,
      utm_content: utm?.utm_content || null,
      device_type: device?.device_type || null,
      browser: device?.browser || null,
      os: device?.os || null,
      screen_width: device?.screen_width || null,
      screen_height: device?.screen_height || null,
      viewport_width: device?.viewport_width || null,
      viewport_height: device?.viewport_height || null,
      language: device?.language || null,
      ip_address: ip,
      city: city ? decodeURIComponent(city) : null,
      region,
      country,
      latitude,
      longitude,
    }))

    const { error } = await supabase.from('analytics_events').insert(rows)

    if (error) {
      console.error('[analytics] insert error:', error.message)
      return NextResponse.json({ error: 'Erreur insertion' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: rows.length })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
