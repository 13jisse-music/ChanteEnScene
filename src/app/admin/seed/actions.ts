'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

// Test photos: picsum.photos with unique seeds (3:4 ratio for UI)
// Test videos: public domain sample clips (10s each, 720p)
const TEST_VIDEOS = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_2MB.mp4',
]

const FAKE_CANDIDATES = [
  // Enfant (6-12) — mineurs avec autorisation parentale
  { first_name: 'Léa', last_name: 'Martin', stage_name: null, dob: '2015-03-12', email: 'lea.martin@test.fr', phone: '06 11 22 33 01', city: 'Aubagne', category: 'Enfant', song_title: 'Alouette', song_artist: 'Traditionnel', bio: 'Léa chante depuis l\'âge de 4 ans et rêve de monter sur scène.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/lea-martin/400/533', video_url: TEST_VIDEOS[0], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-lea/400/566', youtube_url: null, instagram_url: null, tiktok_url: null, website_url: null },
  { first_name: 'Noah', last_name: 'Dubois', stage_name: 'Little Noah', dob: '2014-07-22', email: 'noah.dubois@test.fr', phone: '06 11 22 33 02', city: 'Marseille', category: 'Enfant', song_title: 'On écrit sur les murs', song_artist: 'Kids United', bio: 'Noah adore chanter à la récré et fait partie de la chorale de son école.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/noah-dubois/400/533', video_url: TEST_VIDEOS[1], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-noah/400/566', youtube_url: null, instagram_url: null, tiktok_url: null, website_url: null },
  { first_name: 'Emma', last_name: 'Petit', stage_name: null, dob: '2016-01-05', email: 'emma.petit@test.fr', phone: null, city: 'Aix-en-Provence', category: 'Enfant', song_title: 'Imagine', song_artist: 'John Lennon', bio: 'La plus jeune candidate mais une voix qui impressionne !', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/emma-petit/400/533', video_url: TEST_VIDEOS[2], video_public: false, parental_consent_url: 'https://picsum.photos/seed/consent-emma/400/566', youtube_url: null, instagram_url: null, tiktok_url: null, website_url: null },

  // Ado (13-17) — mineurs, certains avec/sans autorisation
  { first_name: 'Lucas', last_name: 'Bernard', stage_name: 'Luka B', dob: '2010-05-18', email: 'lucas.bernard@test.fr', phone: '07 22 33 44 01', city: 'Toulon', category: 'Ado', song_title: 'Dernière danse', song_artist: 'Indila', bio: 'Lucas fait de la musique depuis 5 ans, guitare et chant.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/lucas-bernard/400/533', video_url: TEST_VIDEOS[3], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-lucas/400/566', youtube_url: null, instagram_url: null, tiktok_url: 'https://www.tiktok.com/@lukab.music', website_url: null },
  { first_name: 'Chloé', last_name: 'Moreau', stage_name: null, dob: '2009-11-30', email: 'chloe.moreau@test.fr', phone: '06 22 33 44 02', city: 'La Ciotat', category: 'Ado', song_title: 'Chandelier', song_artist: 'Sia', bio: 'Passionnée de pop et de R&B, Chloé prépare son premier EP.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/chloe-moreau/400/533', video_url: TEST_VIDEOS[4], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-chloe/400/566', youtube_url: null, instagram_url: 'https://www.instagram.com/chloe.moreau.music', tiktok_url: 'https://www.tiktok.com/@chloe.moreau', website_url: null },
  { first_name: 'Théo', last_name: 'Roux', stage_name: 'Théo R', dob: '2011-08-14', email: 'theo.roux@test.fr', phone: '07 22 33 44 03', city: 'Aubagne', category: 'Ado', song_title: 'Bohemian Rhapsody', song_artist: 'Queen', bio: 'Fan de rock classique, Théo reprend les plus grands tubes au karaoké.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/theo-roux/400/533', video_url: TEST_VIDEOS[0], video_public: false, parental_consent_url: null, youtube_url: 'https://www.youtube.com/@theo-r-rock', instagram_url: null, tiktok_url: null, website_url: null },
  { first_name: 'Inès', last_name: 'Laurent', stage_name: 'Iness', dob: '2010-02-20', email: 'ines.laurent@test.fr', phone: '06 22 33 44 04', city: 'Marseille', category: 'Ado', song_title: 'Rise Up', song_artist: 'Andra Day', bio: 'Inès chante du gospel et du soul depuis ses 8 ans.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/ines-laurent/400/533', video_url: TEST_VIDEOS[1], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-ines/400/566', youtube_url: null, instagram_url: 'https://www.instagram.com/iness.gospel', tiktok_url: null, website_url: null },
  { first_name: 'Rayan', last_name: 'Meziane', stage_name: null, dob: '2012-09-05', email: 'rayan.meziane@test.fr', phone: null, city: 'Aubagne', category: 'Ado', song_title: 'Love Yourself', song_artist: 'Justin Bieber', bio: 'Rayan chante sous la douche et veut tenter sa chance !', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/rayan-meziane/400/533', video_url: TEST_VIDEOS[2], video_public: true, parental_consent_url: 'https://picsum.photos/seed/consent-rayan/400/566', youtube_url: null, instagram_url: null, tiktok_url: null, website_url: null },
  { first_name: 'Lina', last_name: 'Bouchard', stage_name: null, dob: '2013-04-17', email: 'lina.bouchard@test.fr', phone: '06 22 33 44 06', city: 'Marseille', category: 'Ado', song_title: 'Shallow', song_artist: 'Lady Gaga', bio: 'Fan de comédies musicales, Lina connaît tous les classiques par cœur.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/lina-bouchard/400/533', video_url: TEST_VIDEOS[3], video_public: true, parental_consent_url: null, youtube_url: null, instagram_url: null, tiktok_url: 'https://www.tiktok.com/@lina.musical', website_url: null },

  // Adulte (18+) — pas besoin d'autorisation parentale
  { first_name: 'Sophie', last_name: 'Garnier', stage_name: 'Soph\'', dob: '1995-04-03', email: 'sophie.garnier@test.fr', phone: '06 33 44 55 01', city: 'Marseille', category: 'Adulte', song_title: 'Je veux', song_artist: 'Zaz', bio: 'Chanteuse de bar le week-end, Sophie veut passer au niveau supérieur.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/sophie-garnier/400/533', video_url: TEST_VIDEOS[2], video_public: true, parental_consent_url: null, youtube_url: 'https://www.youtube.com/@soph-garnier', instagram_url: 'https://www.instagram.com/soph.garnier', tiktok_url: null, website_url: null },
  { first_name: 'Karim', last_name: 'Benali', stage_name: 'K-Rim', dob: '1990-09-15', email: 'karim.benali@test.fr', phone: '06 33 44 55 02', city: 'Aubagne', category: 'Adulte', song_title: 'Formidable', song_artist: 'Stromae', bio: 'Karim mélange rap et chant, un style unique qui décoiffe.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/karim-benali/400/533', video_url: TEST_VIDEOS[3], video_public: true, parental_consent_url: null, youtube_url: 'https://www.youtube.com/@krim-officiel', instagram_url: 'https://www.instagram.com/krim.officiel', tiktok_url: 'https://www.tiktok.com/@krim.officiel', website_url: 'https://krim-music.fr' },
  { first_name: 'Marie', last_name: 'Fontaine', stage_name: null, dob: '1988-12-25', email: 'marie.fontaine@test.fr', phone: '06 33 44 55 03', city: 'Cassis', category: 'Adulte', song_title: 'La vie en rose', song_artist: 'Édith Piaf', bio: 'Professeure de musique, Marie revient à ses premières amours : la scène.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/marie-fontaine/400/533', video_url: TEST_VIDEOS[4], video_public: false, parental_consent_url: null, youtube_url: null, instagram_url: null, tiktok_url: null, website_url: 'https://marie-fontaine-musique.fr' },
  { first_name: 'Antoine', last_name: 'Duval', stage_name: 'Tony D', dob: '1992-06-08', email: 'antoine.duval@test.fr', phone: '07 33 44 55 04', city: 'Toulon', category: 'Adulte', song_title: 'Hallelujah', song_artist: 'Leonard Cohen', bio: 'Antoine a une voix grave et puissante, parfaite pour les ballades.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/antoine-duval/400/533', video_url: TEST_VIDEOS[0], video_public: true, parental_consent_url: null, youtube_url: 'https://www.youtube.com/@tonyd-chante', instagram_url: null, tiktok_url: null, website_url: null },
  { first_name: 'Yasmine', last_name: 'Khelifi', stage_name: 'Yaz', dob: '1998-03-10', email: 'yasmine.khelifi@test.fr', phone: '06 33 44 55 05', city: 'Aix-en-Provence', category: 'Adulte', song_title: 'Rolling in the Deep', song_artist: 'Adele', bio: 'Yasmine est influenceuse musique et couvre les hits du moment.', accent_color: '#e91e8c', photo_url: 'https://picsum.photos/seed/yasmine-khelifi/400/533', video_url: TEST_VIDEOS[1], video_public: false, parental_consent_url: null, youtube_url: 'https://www.youtube.com/@yaz-covers', instagram_url: 'https://www.instagram.com/yaz.covers', tiktok_url: 'https://www.tiktok.com/@yaz.covers', website_url: 'https://yaz-music.com' },
  { first_name: 'Julien', last_name: 'Perrin', stage_name: null, dob: '1997-11-02', email: 'julien.perrin@test.fr', phone: null, city: 'La Ciotat', category: 'Adulte', song_title: 'Creep', song_artist: 'Radiohead', bio: 'Guitariste autodidacte, Julien compose aussi ses propres morceaux.', accent_color: '#7ec850', photo_url: 'https://picsum.photos/seed/julien-perrin/400/533', video_url: TEST_VIDEOS[4], video_public: false, parental_consent_url: null, youtube_url: null, instagram_url: 'https://www.instagram.com/julien.perrin.music', tiktok_url: null, website_url: null },
]

// User agents for page view simulation
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
]

const REFERRERS = [
  null, null, null, // direct (30%)
  'https://www.google.com/', 'https://www.google.com/', // google (20%)
  'https://www.facebook.com/', 'https://l.facebook.com/', // facebook (20%)
  'https://www.instagram.com/', // instagram (10%)
  'https://t.co/', // twitter (5%)
  'https://wa.me/', // whatsapp (5%)
  'https://www.tiktok.com/', // tiktok (5%)
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function seedTestData() {
  const supabase = createAdminClient()

  // Get the session
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, slug')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) {
    return { error: 'Aucune session trouvée' }
  }

  const sessionId = sessions[0].id
  const sessionSlug = sessions[0].slug

  // Check if test data already exists
  const { data: existing } = await supabase
    .from('candidates')
    .select('id')
    .eq('session_id', sessionId)
    .like('email', '%@test.fr')
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'Les données de test existent déjà. Supprimez-les d\'abord.' }
  }

  // Insert candidates
  const candidateRows = FAKE_CANDIDATES.map((c) => {
    const displayName = c.stage_name || `${c.first_name} ${c.last_name}`
    return {
      session_id: sessionId,
      first_name: c.first_name,
      last_name: c.last_name,
      stage_name: c.stage_name,
      date_of_birth: c.dob,
      email: c.email,
      city: c.city,
      category: c.category,
      song_title: c.song_title,
      song_artist: c.song_artist,
      bio: c.bio,
      accent_color: c.accent_color,
      slug: slugify(displayName),
      status: 'pending',
      likes_count: Math.floor(Math.random() * 80) + 5,
      photo_url: c.photo_url,
      video_url: c.video_url,
      video_public: c.video_public,
      phone: c.phone || null,
      youtube_url: c.youtube_url,
      instagram_url: c.instagram_url,
      tiktok_url: c.tiktok_url,
      website_url: c.website_url,
      parental_consent_url: c.parental_consent_url,
    }
  })

  const { data: inserted, error: insertError } = await supabase
    .from('candidates')
    .insert(candidateRows)
    .select('id, slug, status')

  if (insertError) {
    return { error: `Erreur insertion candidats: ${insertError.message}` }
  }

  // Insert random votes (likes) — simule l'engagement public
  const candidateIds = inserted.map((c) => c.id)
  const fingerprints = Array.from({ length: 30 }, (_, i) => `test-fp-${i}`)
  const voteRows: { session_id: string; candidate_id: string; fingerprint: string }[] = []

  for (const cid of candidateIds) {
    const numVotes = Math.floor(Math.random() * 15) + 3
    const shuffled = [...fingerprints].sort(() => Math.random() - 0.5)
    for (let i = 0; i < numVotes; i++) {
      voteRows.push({
        session_id: sessionId,
        candidate_id: cid,
        fingerprint: shuffled[i],
      })
    }
  }

  await supabase.from('votes').insert(voteRows)

  // Create 6 test jurors (2 per role: online, semifinal, final)
  const jurorRows = [
    { session_id: sessionId, first_name: 'Jean', last_name: 'Jury-Online1', role: 'online', email: 'jean.online@test.com' },
    { session_id: sessionId, first_name: 'Claire', last_name: 'Jury-Online2', role: 'online', email: 'claire.online@test.com' },
    { session_id: sessionId, first_name: 'Marc', last_name: 'Jury-Demi1', role: 'semifinal', email: 'marc.demi@test.com' },
    { session_id: sessionId, first_name: 'Nadia', last_name: 'Jury-Demi2', role: 'semifinal', email: 'nadia.demi@test.com' },
    { session_id: sessionId, first_name: 'Philippe', last_name: 'Jury-Finale1', role: 'final', email: 'philippe.finale@test.com' },
    { session_id: sessionId, first_name: 'Sandrine', last_name: 'Jury-Finale2', role: 'final', email: 'sandrine.finale@test.com' },
  ]

  const { data: jurors, error: jurorError } = await supabase
    .from('jurors')
    .insert(jurorRows)
    .select('id, first_name, last_name, role, qr_token')

  if (jurorError) {
    return { error: `Erreur insertion jurés: ${jurorError.message}` }
  }

  // --- Page views (tracking data for stats marketing) ---
  const candidateSlugs = inserted.map((c) => ({
    id: c.id,
    slug: c.slug,
  }))

  const now = new Date()
  const pageViewRows: {
    session_id: string
    candidate_id: string | null
    page_path: string
    fingerprint: string
    user_agent: string
    referrer: string | null
    duration_seconds: number
    created_at: string
  }[] = []

  // Generate ~80 page views over 7 days
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const hour = Math.floor(Math.random() * 14) + 9 // 9h-23h
    const minute = Math.floor(Math.random() * 60)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(hour, minute, 0, 0)

    const fp = pickRandom(fingerprints)
    const ua = pickRandom(USER_AGENTS)
    const ref = pickRandom(REFERRERS)

    // 20% chance of gallery page, 80% candidate detail
    if (Math.random() < 0.2) {
      pageViewRows.push({
        session_id: sessionId,
        candidate_id: null,
        page_path: `/${sessionSlug}/candidats`,
        fingerprint: fp,
        user_agent: ua,
        referrer: ref,
        duration_seconds: Math.floor(Math.random() * 60) + 10,
        created_at: date.toISOString(),
      })
    } else {
      const candidate = pickRandom(candidateSlugs)
      pageViewRows.push({
        session_id: sessionId,
        candidate_id: candidate.id,
        page_path: `/${sessionSlug}/${candidate.slug}`,
        fingerprint: fp,
        user_agent: ua,
        referrer: ref,
        duration_seconds: Math.floor(Math.random() * 110) + 5,
        created_at: date.toISOString(),
      })
    }
  }

  await supabase.from('page_views').insert(pageViewRows)

  revalidatePath('/admin', 'layout')

  return {
    success: true,
    candidates: inserted.length,
    jurors: jurors?.map((j) => ({
      name: `${j.first_name} ${j.last_name}`,
      role: j.role,
      token: j.qr_token,
      url: `/jury/${j.qr_token}`,
    })),
  }
}

export async function clearTestData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return { error: 'Aucune session' }
  const sessionId = sessions[0].id

  // Get ALL candidates for this session (seed + manually added during testing)
  const { data: allCandidates } = await supabase
    .from('candidates')
    .select('id, slug')
    .eq('session_id', sessionId)

  if (allCandidates && allCandidates.length > 0) {
    const ids = allCandidates.map((c) => c.id)

    // Delete ALL related data in FK order
    for (const id of ids) {
      await supabase.from('votes').delete().eq('candidate_id', id)
      await supabase.from('live_votes').delete().eq('candidate_id', id)
      await supabase.from('lineup').delete().eq('candidate_id', id)
      await supabase.from('jury_scores').delete().eq('candidate_id', id)
      await supabase.from('photos').delete().eq('tag_candidate_id', id)
      await supabase.from('page_views').delete().eq('candidate_id', id)
    }

    // Delete all session page_views (gallery views, etc.)
    await supabase
      .from('page_views')
      .delete()
      .eq('session_id', sessionId)

    // Clear candidate references in live_events (current + winner)
    for (const id of ids) {
      await supabase
        .from('live_events')
        .update({ current_candidate_id: null })
        .eq('current_candidate_id', id)
      await supabase
        .from('live_events')
        .update({ winner_candidate_id: null, winner_revealed_at: null })
        .eq('winner_candidate_id', id)
    }

    // Clean up Storage files (MP3, photos, consent uploaded during testing)
    for (const c of allCandidates) {
      const folder = `${sessionId}/${c.slug}`
      const { data: files } = await supabase.storage.from('candidates').list(folder)
      if (files && files.length > 0) {
        const paths = files.map((f) => `${folder}/${f.name}`)
        await supabase.storage.from('candidates').remove(paths)
      }
    }

    // Clean up photos Storage bucket
    const photoFolder = `photos/${sessionId}`
    const { data: photoFiles } = await supabase.storage.from('photos').list(photoFolder)
    if (photoFiles && photoFiles.length > 0) {
      const photoPaths = photoFiles.map((f) => `${photoFolder}/${f.name}`)
      await supabase.storage.from('photos').remove(photoPaths)
    }

    // Now delete the candidates themselves
    for (const id of ids) {
      await supabase.from('candidates').delete().eq('id', id)
    }
  }

  // Delete ALL jurors for this session (seed + manually added)
  await supabase.from('jury_scores').delete().eq('session_id', sessionId)
  await supabase.from('jurors').delete().eq('session_id', sessionId)

  // Delete live events (and their lineup/live_votes)
  const { data: liveEvents } = await supabase
    .from('live_events')
    .select('id')
    .eq('session_id', sessionId)

  if (liveEvents && liveEvents.length > 0) {
    for (const e of liveEvents) {
      await supabase.from('lineup').delete().eq('live_event_id', e.id)
      await supabase.from('live_votes').delete().eq('live_event_id', e.id)
      await supabase.from('live_events').delete().eq('id', e.id)
    }
  }

  // Reset session status to registration_open (keep config dates as-is)
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  // Delete all session photos (including non-candidate-tagged)
  await supabase.from('photos').delete().eq('session_id', sessionId)

  // Delete sponsors
  await supabase.from('sponsors').delete().eq('session_id', sessionId)

  if (sessionData?.config) {
    const config = { ...sessionData.config as Record<string, unknown> }
    delete config.selection_notifications_sent_at
    delete config.finale_notifications_sent_at
    delete config.jury_online_voting_closed
    await supabase
      .from('sessions')
      .update({ config, status: 'registration_open' })
      .eq('id', sessionId)
  } else {
    await supabase
      .from('sessions')
      .update({ status: 'registration_open' })
      .eq('id', sessionId)
  }

  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function resetAllSessionData() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .order('year', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return { error: 'Aucune session' }
  const sessionId = sessions[0].id

  // Get ALL candidates for this session (with slug for storage cleanup)
  const { data: allCandidates } = await supabase
    .from('candidates')
    .select('id, slug')
    .eq('session_id', sessionId)

  const candidateIds = (allCandidates || []).map((c) => c.id)

  // Get ALL live_event IDs for this session
  const { data: allEvents } = await supabase
    .from('live_events')
    .select('id')
    .eq('session_id', sessionId)

  const eventIds = (allEvents || []).map((e) => e.id)

  // Delete in order (respect foreign keys)
  // 1. Votes & live votes
  if (candidateIds.length > 0) {
    await supabase.from('votes').delete().in('candidate_id', candidateIds)
    await supabase.from('live_votes').delete().in('candidate_id', candidateIds)
  }

  // 2. Lineup
  if (eventIds.length > 0) {
    await supabase.from('lineup').delete().in('live_event_id', eventIds)
  }

  // 3. Jury scores
  await supabase.from('jury_scores').delete().eq('session_id', sessionId)

  // 4. Live events
  await supabase.from('live_events').delete().eq('session_id', sessionId)

  // 5. Page views
  await supabase.from('page_views').delete().eq('session_id', sessionId)

  // 6. Photos
  await supabase.from('photos').delete().eq('session_id', sessionId)

  // 7. Chatbot
  await supabase.from('chatbot_faq').delete().eq('session_id', sessionId)
  await supabase.from('chatbot_conversations').delete().eq('session_id', sessionId)

  // 8. Facebook posts
  await supabase.from('facebook_posts').delete().eq('session_id', sessionId)

  // 8b. Sponsors
  await supabase.from('sponsors').delete().eq('session_id', sessionId)

  // 9. Jurors
  await supabase.from('jurors').delete().eq('session_id', sessionId)

  // 10. Clean up Storage files for all candidates
  for (const c of (allCandidates || [])) {
    const folder = `${sessionId}/${c.slug}`
    const { data: files } = await supabase.storage.from('candidates').list(folder)
    if (files && files.length > 0) {
      const paths = files.map((f) => `${folder}/${f.name}`)
      await supabase.storage.from('candidates').remove(paths)
    }
  }

  // 10b. Clean up photos Storage bucket
  const photoFolder = `photos/${sessionId}`
  const { data: photoFiles } = await supabase.storage.from('photos').list(photoFolder)
  if (photoFiles && photoFiles.length > 0) {
    const photoPaths = photoFiles.map((f) => `${photoFolder}/${f.name}`)
    await supabase.storage.from('photos').remove(photoPaths)
  }

  // 11. Candidates (last because of foreign keys)
  await supabase.from('candidates').delete().eq('session_id', sessionId)

  // 12. Reset session status to registration_open (keep config dates as-is)
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  if (sessionData?.config) {
    const config = { ...sessionData.config as Record<string, unknown> }
    delete config.selection_notifications_sent_at
    delete config.finale_notifications_sent_at
    delete config.jury_online_voting_closed
    await supabase
      .from('sessions')
      .update({ config, status: 'registration_open' })
      .eq('id', sessionId)
  } else {
    await supabase
      .from('sessions')
      .update({ status: 'registration_open' })
      .eq('id', sessionId)
  }

  revalidatePath('/admin', 'layout')
  return { success: true }
}

// ============================================================
// Palmarès 2025 — Données réelles de l'édition précédente
// ============================================================

const PALMARES_SESSION_ID = 'a0000000-0000-0000-0000-000000002025'

const WINNERS_2025 = [
  {
    first_name: 'Eva',
    last_name: 'Amselem',
    date_of_birth: '2013-12-10',
    email: 'palmares-eva@edition2025.local',
    category: 'Enfants',
    song_title: 'Une dernière danse',
    song_artist: 'Indila',
    slug: 'eva-amselem',
    photoFile: 'eva-amselem.jpg',
  },
  {
    first_name: 'Giulia',
    last_name: 'Kalimbadjian',
    date_of_birth: '2012-04-08',
    email: 'palmares-giulia@edition2025.local',
    category: 'Adolescents',
    song_title: 'Je reviens te chercher',
    song_artist: 'Gilbert Bécaud (version Anne Sila)',
    slug: 'giulia-kalimbadjian',
    photoFile: 'giulia-kalimbadjian.jpg',
  },
  {
    first_name: 'Emma-Rose',
    last_name: 'Barthélémy',
    date_of_birth: '2008-11-22',
    email: 'palmares-emmarose@edition2025.local',
    category: 'Adolescents',
    song_title: 'Toxic',
    song_artist: 'Melanie Martinez',
    slug: 'emma-rose-barthelemy',
    photoFile: 'emma-rose-barthelemy.jpg',
  },
  {
    first_name: 'Stéphanaïka',
    last_name: 'Sinvil',
    date_of_birth: '2002-12-15',
    email: 'palmares-stephanaika@edition2025.local',
    category: 'Adultes',
    song_title: 'At Last',
    song_artist: 'Etta James',
    slug: 'stephanaika-sinvil',
    photoFile: 'stephanaika-sinvil.jpg',
  },
]

export async function seedPalmares2025() {
  const supabase = createAdminClient()

  // Check if palmares session already exists
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', PALMARES_SESSION_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'Le palmarès 2025 existe déjà. Supprimez-le d\'abord.' }
  }

  // 1. Create the archived 2025 session
  const { error: sessionError } = await supabase
    .from('sessions')
    .insert({
      id: PALMARES_SESSION_ID,
      name: 'ChanteEnScène 2025',
      slug: 'edition-2025',
      city: 'Aubagne',
      year: 2025,
      status: 'archived',
      is_active: false,
    })

  if (sessionError) {
    return { error: `Erreur création session: ${sessionError.message}` }
  }

  // 2. Ensure 'candidates' storage bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.name === 'candidates')) {
    await supabase.storage.createBucket('candidates', { public: true })
  }

  // 3. Upload photos & insert winners
  const photosDir = path.join(process.cwd(), 'palmares-photos')
  const inserted: string[] = []

  for (const winner of WINNERS_2025) {
    let photoUrl: string | null = null

    // Upload photo to Supabase Storage
    const photoPath = path.join(photosDir, winner.photoFile)
    if (fs.existsSync(photoPath)) {
      const fileBuffer = fs.readFileSync(photoPath)
      const storagePath = `${PALMARES_SESSION_ID}/${winner.slug}/photo`

      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('candidates')
          .getPublicUrl(storagePath)
        photoUrl = urlData.publicUrl
      }
    }

    // Insert candidate as winner
    const { error: candidateError } = await supabase
      .from('candidates')
      .insert({
        session_id: PALMARES_SESSION_ID,
        first_name: winner.first_name,
        last_name: winner.last_name,
        date_of_birth: winner.date_of_birth,
        email: winner.email,
        category: winner.category,
        song_title: winner.song_title,
        song_artist: winner.song_artist,
        slug: winner.slug,
        status: 'winner',
        photo_url: photoUrl,
      })

    if (candidateError) {
      return { error: `Erreur insertion ${winner.first_name}: ${candidateError.message}` }
    }

    inserted.push(`${winner.first_name} ${winner.last_name} (${winner.category})`)
  }

  revalidatePath('/palmares')
  revalidatePath('/admin', 'layout')

  return {
    success: true,
    winners: inserted,
  }
}

export async function clearPalmares2025() {
  const supabase = createAdminClient()

  // Get candidates for the 2025 session
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, slug')
    .eq('session_id', PALMARES_SESSION_ID)

  // Clean up storage files
  if (candidates && candidates.length > 0) {
    for (const c of candidates) {
      const folder = `${PALMARES_SESSION_ID}/${c.slug}`
      const { data: files } = await supabase.storage.from('candidates').list(folder)
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${folder}/${f.name}`)
        await supabase.storage.from('candidates').remove(filePaths)
      }
    }

    // Delete candidates
    await supabase.from('candidates').delete().eq('session_id', PALMARES_SESSION_ID)
  }

  // Delete the session
  await supabase.from('sessions').delete().eq('id', PALMARES_SESSION_ID)

  revalidatePath('/palmares')
  revalidatePath('/admin', 'layout')

  return { success: true }
}
