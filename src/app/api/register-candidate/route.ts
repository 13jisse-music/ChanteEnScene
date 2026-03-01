import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

export async function POST(request: Request) {
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
        'email', 'phone', 'city', 'category', 'song_title', 'song_artist',
        'bio', 'accent_color', 'slug', 'video_public', 'video_url',
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
      bio, accent_color, slug, video_public, video_url,
      youtube_url, instagram_url, tiktok_url, website_url,
      fingerprint, referred_by,
    } = fields

    if (!session_id || !first_name || !last_name || !email || !slug) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const basePath = `${session_id}/${slug}`

    // Upload photo if file provided
    let photo_url: string | null = fields.photo_url || null
    if (photoFile && photoFile.size > 0) {
      const photoBuffer = Buffer.from(await photoFile.arrayBuffer())
      const { error: photoError } = await supabase.storage
        .from('candidates')
        .upload(`${basePath}/photo`, photoBuffer, {
          upsert: true,
          contentType: photoFile.type || 'image/jpeg',
        })
      if (photoError) {
        return NextResponse.json({ error: `Erreur upload photo: ${photoError.message}` }, { status: 500 })
      }
      const { data: photoData } = supabase.storage.from('candidates').getPublicUrl(`${basePath}/photo`)
      photo_url = photoData.publicUrl
    }

    if (!photo_url) {
      return NextResponse.json({ error: 'Photo obligatoire' }, { status: 400 })
    }

    // Upload consent if file provided
    let consent_url: string | null = fields.consent_url || null
    if (consentFile && consentFile.size > 0) {
      const consentBuffer = Buffer.from(await consentFile.arrayBuffer())
      const { error: consentError } = await supabase.storage
        .from('candidates')
        .upload(`${basePath}/consent`, consentBuffer, {
          upsert: true,
          contentType: consentFile.type || 'application/pdf',
        })
      if (consentError) {
        return NextResponse.json({ error: `Erreur upload autorisation: ${consentError.message}` }, { status: 500 })
      }
      const { data: consentData } = supabase.storage.from('candidates').getPublicUrl(`${basePath}/consent`)
      consent_url = consentData.publicUrl
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
      video_url: video_url || null,
      mp3_url: null,
      song_title: song_title?.trim() || null,
      song_artist: song_artist?.trim() || null,
      bio: bio?.trim() || null,
      accent_color: accent_color || '#E91E8C',
      slug,
      video_public: video_public === 'true' || video_public === true,
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

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
