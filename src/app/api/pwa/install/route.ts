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

    // Filter out known bots — PWA installs require a real browser
    const BOT_UA = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|semrush|ahref|mj12|dotbot|headless|phantom|puppeteer|playwright/i
    if (BOT_UA.test(userAgent || '')) {
      return NextResponse.json({ ok: true }) // silent ignore
    }
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

    // Chercher si un candidat correspond a ce fingerprint
    let candidateName = ''
    if (fingerprint) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('first_name, last_name, song_title, song_artist')
        .eq('fingerprint', fingerprint)
        .maybeSingle()
      if (candidate) {
        candidateName = `\n🎤 <b>${candidate.first_name} ${candidate.last_name}</b>` +
          (candidate.song_title ? ` — "${candidate.song_title}"` : '')
      }
    }

    // Notifier via Telegram
    const country = request.headers.get('x-vercel-ip-country') || '?'
    const platformLabel = platform === 'ios' ? '🍎 iOS' : platform === 'android' ? '🤖 Android' : '💻 Desktop'
    const { sendTelegram } = await import('@/lib/telegram')
    await sendTelegram(
      `📲 <b>Nouvelle installation PWA</b>\n` +
      `${platformLabel}\n` +
      `📍 ${city || '?'}, ${region || ''} ${country}` +
      candidateName,
      '🎤 CES'
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
