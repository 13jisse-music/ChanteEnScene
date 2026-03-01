import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel serverless: allow up to 50MB body for video uploads
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const formData = await request.formData()

    // Extract text fields
    const session_id = formData.get('session_id') as string
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string
    const stage_name = formData.get('stage_name') as string | null
    const date_of_birth = formData.get('date_of_birth') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string | null
    const city = formData.get('city') as string | null
    const category = formData.get('category') as string
    const song_title = formData.get('song_title') as string
    const song_artist = formData.get('song_artist') as string
    const bio = formData.get('bio') as string | null
    const accent_color = formData.get('accent_color') as string | null
    const slug = formData.get('slug') as string
    const video_public = formData.get('video_public') === 'true'
    const video_url_text = formData.get('video_url_text') as string | null
    const youtube_url = formData.get('youtube_url') as string | null
    const instagram_url = formData.get('instagram_url') as string | null
    const tiktok_url = formData.get('tiktok_url') as string | null
    const website_url = formData.get('website_url') as string | null
    const fingerprint = formData.get('fingerprint') as string | null
    const referred_by = formData.get('referred_by') as string | null

    // Extract files
    const photo = formData.get('photo') as File | null
    const video = formData.get('video') as File | null
    const consent = formData.get('consent') as File | null

    if (!session_id || !first_name || !last_name || !email || !slug) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (!photo) {
      return NextResponse.json({ error: 'Photo obligatoire' }, { status: 400 })
    }

    const basePath = `${session_id}/${slug}`

    // Upload photo
    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const { error: photoError } = await supabase.storage
      .from('candidates')
      .upload(`${basePath}/photo`, photoBuffer, {
        upsert: true,
        contentType: photo.type || 'image/jpeg',
      })
    if (photoError) {
      return NextResponse.json({ error: `Erreur upload photo: ${photoError.message}` }, { status: 500 })
    }
    const { data: photoData } = supabase.storage.from('candidates').getPublicUrl(`${basePath}/photo`)
    const photo_url = photoData.publicUrl

    // Upload video (if file)
    let final_video_url: string | null = null
    if (video && video.size > 0) {
      const videoBuffer = Buffer.from(await video.arrayBuffer())
      const { error: videoError } = await supabase.storage
        .from('candidates')
        .upload(`${basePath}/video`, videoBuffer, {
          upsert: true,
          contentType: video.type || 'video/mp4',
        })
      if (videoError) {
        return NextResponse.json({ error: `Erreur upload vidéo: ${videoError.message}` }, { status: 500 })
      }
      const { data: videoData } = supabase.storage.from('candidates').getPublicUrl(`${basePath}/video`)
      final_video_url = videoData.publicUrl
    } else if (video_url_text) {
      final_video_url = video_url_text
    }

    // Upload consent (if provided)
    let consent_url: string | null = null
    if (consent && consent.size > 0) {
      const consentBuffer = Buffer.from(await consent.arrayBuffer())
      const { error: consentError } = await supabase.storage
        .from('candidates')
        .upload(`${basePath}/consent`, consentBuffer, {
          upsert: true,
          contentType: consent.type || 'application/pdf',
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
      video_url: final_video_url,
      mp3_url: null,
      song_title: song_title?.trim(),
      song_artist: song_artist?.trim(),
      bio: bio?.trim() || null,
      accent_color: accent_color || '#E91E8C',
      slug,
      video_public,
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
