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
  priority: number // Plus bas = plus prioritaire
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function generatePosts(
  session: { name: string; slug: string; config: SessionConfig; status: string },
  totalCandidates: number,
  newCandidatesSinceYesterday: { stage_name: string; first_name: string; last_name: string; slug: string }[],
  siteUrl: string
): GeneratedPost[] {
  const posts: GeneratedPost[] = []
  const config = session.config || {}
  const sessionUrl = `${siteUrl}/${session.slug}`
  const dayOfWeek = new Date().getDay() // 0=dimanche

  // ── 1. Nouveaux candidats (priorité haute) ──────────────────
  if (newCandidatesSinceYesterday.length > 0 && session.status === 'registration_open') {
    if (newCandidatesSinceYesterday.length === 1) {
      const c = newCandidatesSinceYesterday[0]
      const name = c.stage_name || `${c.first_name} ${c.last_name}`
      posts.push({
        type: 'new_candidate_welcome',
        priority: 1,
        message: `🎤 Bienvenue à ${name} qui rejoint l'aventure ${session.name} ! Bonne chance ! 🍀\n\nDécouvrez son profil 👉 ${sessionUrl}/candidats/${c.slug}\n\n#ChanteEnScène #ConcoursDeChant`,
        link: `${sessionUrl}/candidats/${c.slug}`,
      })
    } else if (newCandidatesSinceYesterday.length <= 5) {
      const names = newCandidatesSinceYesterday.map(c => c.stage_name || c.first_name).join(', ')
      posts.push({
        type: 'new_candidates_welcome',
        priority: 1,
        message: `🎤 ${newCandidatesSinceYesterday.length} nouveaux candidats rejoignent ${session.name} !\n\nBienvenue à ${names} ! Bonne chance à tous ! 🍀\n\nDécouvrez-les 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #ConcoursDeChant`,
        link: `${sessionUrl}/candidats`,
      })
    } else {
      posts.push({
        type: 'new_candidates_wave',
        priority: 1,
        message: `🔥 ${newCandidatesSinceYesterday.length} nouveaux candidats ont rejoint ${session.name} ! La compétition s'annonce intense !\n\nDécouvrez-les tous 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #ConcoursDeChant`,
        link: `${sessionUrl}/candidats`,
      })
    }
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
  if (config.semifinal_date) {
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
  if (config.final_date) {
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

  // ── 7. Promo hebdo (lundi) ──────────────────────────────────
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

    // Nouveaux candidats depuis hier (24h)
    const { data: newCandidates } = await supabase
      .from('candidates')
      .select('first_name, last_name, stage_name, slug')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .gte('created_at', oneDayAgo)

    const posts = generatePosts(
      { name: session.name, slug: session.slug, config, status: session.status },
      totalCandidates || 0,
      newCandidates || [],
      socialSiteUrl
    )

    const sessionResults: { type: string; success: boolean; error?: string }[] = []

    // Publier max 1 post par jour par session
    const postToPublish = posts[0]
    if (postToPublish) {
      try {
        const result = await publishEverywhere(postToPublish.message, undefined, postToPublish.link)
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
