export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishEverywhere } from '@/lib/social'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

interface SessionConfig {
  registration_open_date?: string
  registration_close_date?: string
  voting_close_date?: string
  semifinal_date?: string
  final_date?: string
  [key: string]: unknown
}

interface GeneratedPost {
  type: string
  message: string
  link?: string
  imageUrl?: string
  priority: number // Plus bas = plus prioritaire
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function generatePosts(
  session: { id: string; name: string; slug: string; config: SessionConfig; status: string },
  totalCandidates: number,
  newCandidatesSinceYesterday: { stage_name: string; first_name: string; last_name: string; slug: string; song_title?: string; song_artist?: string; photo_url?: string }[],
  siteUrl: string
): GeneratedPost[] {
  const posts: GeneratedPost[] = []
  const config = session.config || {}
  const sessionUrl = `${siteUrl}/${session.slug}`
  const dayOfWeek = new Date().getDay() // 0=dimanche

  // ── 1. Nouveaux candidats — format liste consolidée ────────
  if (newCandidatesSinceYesterday.length > 0 && session.status === 'registration_open') {
    const count = newCandidatesSinceYesterday.length
    const displayCandidates = newCandidatesSinceYesterday.slice(0, 5)

    // Build candidate lines with vote links
    const candidateLines = displayCandidates.map(c => {
      const name = c.stage_name || c.first_name
      const song = c.song_title ? ` — \u00AB ${c.song_title} \u00BB` : ''
      const artist = c.song_artist ? ` (${c.song_artist})` : ''
      const pronoun = count === 1 ? '' : ` pour ${name}`
      return `🎙️ ${name}${song}${artist}\n🗳️ Votez${pronoun} → ${sessionUrl}/candidats/${c.slug}`
    }).join('\n\n')

    // Footer message based on count
    let footerMsg = ''
    if (count <= 3) {
      footerMsg = '💬 Il reste de la place, inscrivez-vous !\n👉 ' + sessionUrl + '/inscription'
    } else if (count <= 5) {
      footerMsg = '🔥 La compétition s\'intensifie, qui sera le prochain ?'
    } else {
      footerMsg = `🔥 ${count} nouveaux aujourd'hui ! La suite demain...`
    }

    const title = count === 1
      ? `🎤 Nouveau candidat ${session.name} !`
      : `🎤 ${count} nouveaux candidats ${session.name} !`

    // Use first candidate's photo as image (direct URL from Supabase Storage)
    const imageUrl = displayCandidates.find(c => c.photo_url)?.photo_url || undefined

    posts.push({
      type: count === 1 ? 'new_candidate_welcome' : count <= 5 ? 'new_candidates_welcome' : 'new_candidates_wave',
      priority: 1,
      message: `${title}\n\n${candidateLines}\n\n${footerMsg}\n\n#ChanteEnScène #ConcoursDeChant`,
      link: count === 1 ? `${sessionUrl}/candidats/${displayCandidates[0].slug}` : `${sessionUrl}/candidats`,
      imageUrl,
    })
  }

  // ── 2. Countdown fermeture inscriptions (après 5+ inscrits) ─
  if (config.registration_close_date && totalCandidates >= 5 && session.status === 'registration_open') {
    const days = daysUntil(config.registration_close_date)
    if ([30, 14, 7, 3, 1].includes(days)) {
      posts.push({
        type: 'countdown_registration_close',
        priority: 2,
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour s'inscrire à ${session.name} !\n\nNe manquez pas votre chance de monter sur scène ! 🎤\n\nInscription 👉 ${sessionUrl}/inscription\n\n#ChanteEnScène #DernièreChance`,
        link: `${sessionUrl}/inscription`,
      })
    }
  }

  // ── 3. Countdown demi-finale (J-7 à J-1) ───────────────────
  if (config.semifinal_date && ['registration_closed', 'semifinal'].includes(session.status)) {
    const days = daysUntil(config.semifinal_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_semifinal',
        priority: 2,
        message: `🔥 Plus que ${days} jour${days > 1 ? 's' : ''} avant la demi-finale de ${session.name} !\n\nQui passera en finale ? 🎶\n\n${sessionUrl}/live\n\n#ChanteEnScène #DemiFinale`,
        link: `${sessionUrl}/live`,
      })
    }
  }

  // ── 4. Countdown finale (J-7 à J-1) ────────────────────────
  if (config.final_date && ['semifinal', 'final'].includes(session.status)) {
    const days = daysUntil(config.final_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_final',
        priority: 2,
        message: `🏆 Plus que ${days} jour${days > 1 ? 's' : ''} avant la GRANDE FINALE de ${session.name} !\n\nQui sera le grand gagnant ? 🎤🔥\n\n${sessionUrl}/live\n\n#ChanteEnScène #Finale`,
        link: `${sessionUrl}/live`,
      })
    }
  }

  // ── 5. Rappel de vote (jeudi, quand les votes sont ouverts) ─
  if (dayOfWeek === 4 && totalCandidates > 0 && ['registration_open', 'registration_closed'].includes(session.status)) {
    posts.push({
      type: 'voting_reminder',
      priority: 3,
      message: `🗳️ Avez-vous voté pour votre candidat préféré de ${session.name} ?\n\nChaque vote compte ! Soutenez vos favoris 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #Votez`,
      link: `${sessionUrl}/candidats`,
    })
  }

  // ── 6. Countdown fermeture des votes ────────────────────────
  if (config.voting_close_date && ['registration_open', 'registration_closed'].includes(session.status)) {
    const days = daysUntil(config.voting_close_date)
    if ([7, 3, 1].includes(days)) {
      posts.push({
        type: 'countdown_voting_close',
        priority: 2,
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour voter à ${session.name} !\n\nFaites entendre votre voix 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #DernierJourDeVote`,
        link: `${sessionUrl}/candidats`,
      })
    }
  }

  // ── 7. Parrainage (mercredi, inscriptions ouvertes, 5+ candidats) ─
  if (dayOfWeek === 3 && totalCandidates >= 5 && session.status === 'registration_open') {
    posts.push({
      type: 'referral_promo',
      priority: 4,
      message: `🤝 Tu es candidat(e) à ${session.name} ? Parraine tes proches !\n\nVa sur "Mon profil" pour copier ton lien de parrainage unique et envoie-le à ceux qui aiment chanter ! Chaque filleul inscrit booste ta visibilité ⭐\n\n👉 ${sessionUrl}/comment-ca-marche\n\n#ChanteEnScène #Parrainage #ConcoursDeChant`,
      link: `${siteUrl}/comment-ca-marche`,
    })
  }

  // ── 8. Promo hebdo (lundi) ──────────────────────────────────
  if (dayOfWeek === 1) {
    if (session.status === 'registration_open') {
      posts.push({
        type: 'weekly_promo',
        priority: 4,
        message: `🎵 Les inscriptions pour ${session.name} sont ouvertes !\n\nVous avez du talent ? Tentez votre chance et montez sur scène ! 🎤✨\n\nInscrivez-vous 👉 ${sessionUrl}/inscription\n\n#ChanteEnScène #ConcoursDeChant #LaSceneEstAToi`,
        link: `${sessionUrl}/inscription`,
      })
    } else if (['registration_closed', 'semifinal', 'final'].includes(session.status)) {
      posts.push({
        type: 'weekly_promo',
        priority: 4,
        message: `🎵 ${session.name} bat son plein ! ${totalCandidates} candidats en lice !\n\nSuivez la compétition et votez pour vos favoris 🗳️🎤\n\n👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #ConcoursDeChant #VoteEnDirect`,
        link: `${sessionUrl}/candidats`,
      })
    }
  }

  // Trier par priorité (plus bas = plus prioritaire)
  posts.sort((a, b) => a.priority - b.priority)

  return posts
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.FACEBOOK_PAGE_TOKEN) {
    return NextResponse.json({ error: 'FACEBOOK_PAGE_TOKEN non configuré' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chantenscene.fr'
  // Toujours utiliser le domaine public pour les posts sociaux (jamais localhost)
  const socialSiteUrl = siteUrl.includes('localhost') ? 'https://chantenscene.fr' : siteUrl
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get active session (is_active flag, fallback to most recent non-archived)
  let { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, config, status')
    .eq('is_active', true)

  if (!sessions?.length) {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('id, name, slug, config, status')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessions = fallback
  }

  if (!sessions?.length) {
    return NextResponse.json({ message: 'Aucune session active', posts: [] })
  }

  const results: { session: string; posts: { type: string; success: boolean; error?: string }[] }[] = []

  for (const session of sessions) {
    const config = (session.config || {}) as SessionConfig

    // Total candidats approuvés
    const { count: totalCandidates } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])

    // Nouveaux candidats depuis hier (24h) — uniquement ceux ayant consenti au partage
    const { data: newCandidates } = await supabase
      .from('candidates')
      .select('first_name, last_name, stage_name, slug, song_title, song_artist, photo_url')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .neq('image_social_consent', false)
      .gte('created_at', oneDayAgo)

    const posts = generatePosts(
      { id: session.id, name: session.name, slug: session.slug, config, status: session.status },
      totalCandidates || 0,
      newCandidates || [],
      socialSiteUrl
    )

    const sessionResults: { type: string; success: boolean; error?: string }[] = []

    // Publier max 1 post par jour par session
    const postToPublish = posts[0]
    if (postToPublish) {
      try {
        const result = await publishEverywhere(postToPublish.message, postToPublish.imageUrl, postToPublish.link)
        const fbOk = result.facebook && !('error' in result.facebook)
        const fbError = result.facebook && 'error' in result.facebook ? result.facebook.error : undefined

        sessionResults.push({
          type: postToPublish.type,
          success: !!fbOk,
          error: fbError,
        })

        // Log dans Supabase
        await supabase.from('social_posts_log').insert({
          session_id: session.id,
          post_type: postToPublish.type,
          source: 'cron',
          message: postToPublish.message,
          image_url: postToPublish.imageUrl || null,
          link: postToPublish.link || null,
          facebook_post_id: fbOk && 'id' in result.facebook! ? result.facebook.id : null,
          instagram_post_id: result.instagram && 'id' in result.instagram ? result.instagram.id : null,
          error: fbError || (result.instagram && 'error' in result.instagram ? result.instagram.error : null),
        }).then(() => {})
      } catch (err) {
        sessionResults.push({
          type: postToPublish.type,
          success: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        })
      }
    }

    results.push({ session: session.name, posts: sessionResults })
  }

  return NextResponse.json({ message: 'Posts sociaux traités', results })
}
