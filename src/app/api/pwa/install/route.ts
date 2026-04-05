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

    // Compter le total d'installations
    const { count: totalInstalls } = await supabase
      .from('pwa_installs')
      .select('*', { count: 'exact', head: true })

    // Chercher si un candidat correspond a ce fingerprint
    let candidateInfo = ''
    if (fingerprint) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('first_name, last_name, song_title, city, category')
        .eq('fingerprint', fingerprint)
        .maybeSingle()
      if (candidate) {
        candidateInfo = `\n🎤 <b>${candidate.first_name} ${candidate.last_name}</b>` +
          (candidate.song_title ? ` — "${candidate.song_title}"` : '') +
          (candidate.category ? ` (${candidate.category})` : '')
      }

      // Dernieres pages visitees par ce fingerprint
      const { data: views } = await supabase
        .from('page_views')
        .select('page_path, duration_seconds')
        .eq('fingerprint', fingerprint)
        .order('created_at', { ascending: false })
        .limit(5)
      if (views && views.length > 0) {
        const pages = views.map(v => {
          const dur = v.duration_seconds ? ` (${v.duration_seconds}s)` : ''
          return v.page_path + dur
        }).join(', ')
        candidateInfo += `\n📄 ${pages}`
      }
    }

    // Notifier via Telegram
    const country = request.headers.get('x-vercel-ip-country') || '?'
    const platformLabel = platform === 'ios' ? '🍎 iOS' : platform === 'android' ? '🤖 Android' : '💻 Desktop'
    const { sendTelegram } = await import('@/lib/telegram')
    await sendTelegram(
      `📲 <b>Nouvelle installation PWA</b> (${totalInstalls || '?'} total)\n` +
      `${platformLabel}\n` +
      `📍 ${city || '?'}, ${region || ''} ${country}` +
      candidateInfo,
      '🎤 CES'
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
