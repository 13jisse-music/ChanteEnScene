import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      session_id, first_name, last_name, stage_name, date_of_birth,
      email, phone, city, category, photo_url, video_url, mp3_url,
      song_title, song_artist, bio, accent_color, slug, video_public,
      youtube_url, instagram_url, tiktok_url, website_url,
      parental_consent_url, fingerprint, referred_by,
    } = body

    if (!session_id || !first_name || !last_name || !email || !slug) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase.from('candidates').insert({
      session_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      stage_name: stage_name || null,
      date_of_birth,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      city: city || null,
      category,
      photo_url,
      video_url: video_url || null,
      mp3_url: mp3_url || null,
      song_title,
      song_artist,
      bio: bio || null,
      accent_color: accent_color || '#E91E8C',
      slug,
      video_public: video_public ?? true,
      youtube_url: youtube_url || null,
      instagram_url: instagram_url || null,
      tiktok_url: tiktok_url || null,
      website_url: website_url || null,
      parental_consent_url: parental_consent_url || null,
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
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
