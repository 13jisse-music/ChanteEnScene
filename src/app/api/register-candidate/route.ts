import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2 } from '@/lib/r2'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

// Concours en présentiel à Aubagne : France métropolitaine, DOM-TOM, Monaco.
const ALLOWED_COUNTRIES = new Set([
  'FR', 'MC',
  'GP', 'MQ', 'GF', 'RE', 'YT',
  'NC', 'PF', 'PM', 'BL', 'MF', 'WF',
])

export async function POST(request: Request) {
  // Rate limiting: 5 registrations per IP per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, remaining } = rateLimit(`register:${ip}`, { windowMs: 60_000, maxRequests: 5 })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Veuillez reessayer dans une minute.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    )
  }

  try {
    const supabase = createAdminClient()

    const contentType = request.headers.get('content-type') || ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fields: Record<string, any> = {}
    let photoFile: File | null = null
    let consentFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      // FormData mode: photo + consent as files, video URL already resolved
      const formData = await request.formData()
      const fieldNames = [
        'session_id', 'first_name', 'last_name', 'stage_name', 'date_of_birth',
        'email', 'phone', 'city', 'country', 'category', 'song_title', 'song_artist',
        'bio', 'accent_color', 'slug', 'video_public', 'image_social_consent', 'video_url',
        'youtube_url', 'instagram_url', 'tiktok_url', 'website_url',
        'fingerprint', 'referred_by', 'photo_url', 'consent_url',
      ]
      for (const name of fieldNames) {
        const val = formData.get(name)
        fields[name] = typeof val === 'string' ? val : null
      }
      photoFile = formData.get('photo') as File | null
      consentFile = formData.get('consent') as File | null
    } else {
      // JSON mode: all URLs already provided
      fields = await request.json()
    }

    const {
      session_id, first_name, last_name, stage_name, date_of_birth,
      email, phone, city, category, song_title, song_artist,
      bio, accent_color, slug, video_public, image_social_consent, video_url,
      youtube_url, instagram_url, tiktok_url, website_url,
      fingerprint, referred_by,
    } = fields

    if (!session_id || !first_name || !last_name || !email || !slug) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Garde-fou pays : par défaut FR si non transmis (rétrocompat anciens clients).
    // Refus si pays explicitement hors zone autorisée.
    const country = (fields.country as string | undefined)?.trim().toUpperCase() || 'FR'
    if (!ALLOWED_COUNTRIES.has(country)) {
      return NextResponse.json(
        { error: 'Le concours se déroule en présentiel à Aubagne (France). Les inscriptions hors France ne sont pas acceptées cette année.' },
        { status: 400 }
      )
    }

    const r2BasePath = `candidates/${slug}`

    // Upload photo to R2 if file provided
    let photo_url: string | null = fields.photo_url || null
    if (photoFile && photoFile.size > 0) {
      const sharp = (await import('sharp')).default
      const rawBuffer = Buffer.from(await photoFile.arrayBuffer())
      const photoBuffer = await sharp(rawBuffer)
        .rotate() // auto-orient EXIF
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
      photo_url = await uploadToR2(`${r2BasePath}/photo`, photoBuffer, 'image/jpeg')
    }

    if (!photo_url) {
      return NextResponse.json({ error: 'Photo obligatoire' }, { status: 400 })
    }

    // Upload consent to R2 if file provided
    let consent_url: string | null = fields.consent_url || null
    if (consentFile && consentFile.size > 0) {
      const consentBuffer = Buffer.from(await consentFile.arrayBuffer())
      consent_url = await uploadToR2(
        `${r2BasePath}/consent`,
        consentBuffer,
        consentFile.type || 'application/pdf'
      )
    }

    // Insert candidate
    const { error } = await supabase.from('candidates').insert({
      session_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      stage_name: stage_name?.trim() || null,
      date_of_birth,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      city: city?.trim() || null,
      category,
      photo_url,
      video_url: (video_url && !video_url.includes('youtube.com') && !video_url.includes('youtu.be')) ? video_url : null,
      mp3_url: null,
      song_title: song_title?.trim() || null,
      song_artist: song_artist?.trim() || null,
      bio: bio?.trim() || null,
      accent_color: accent_color || '#E91E8C',
      slug,
      video_public: video_public === 'true' || video_public === true,
      image_social_consent: image_social_consent !== 'false' && image_social_consent !== false,
      youtube_url: youtube_url?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      tiktok_url: tiktok_url?.trim() || null,
      website_url: website_url?.trim() || null,
      parental_consent_url: consent_url,
      fingerprint: fingerprint || null,
      referred_by: referred_by || null,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505' && error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Un candidat avec cet email est déjà inscrit pour cette session.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-subscribe to newsletter (fire-and-forget)
    supabase.from('email_subscribers').upsert({
      session_id,
      email: email.trim().toLowerCase(),
      source: 'inscription',
    }, { onConflict: 'session_id,email', ignoreDuplicates: true }).then(() => {})

    // Notifier admin via Telegram (avec photo du candidat)
    const { sendTelegramPhoto } = await import('@/lib/telegram')
    const now = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    await sendTelegramPhoto(
      photo_url,
      `🆕 <b>Nouvelle inscription !</b>\n` +
      `👤 ${first_name} ${last_name}\n` +
      `🎵 "${song_title || '?'}" — ${song_artist || '?'}\n` +
      `📧 ${email}\n` +
      `📍 ${city || '?'}\n` +
      `📅 ${now}`,
      '🎤 CES'
    )

    // Notification push admin
    try {
      const { sendPushNotifications } = await import('@/lib/push')
      await sendPushNotifications({
        role: 'admin',
        sessionId: session_id,
        payload: {
          title: 'Nouvelle inscription ChanteEnScène !',
          body: `${first_name} ${last_name} — "${song_title}" (${song_artist})`,
        },
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
