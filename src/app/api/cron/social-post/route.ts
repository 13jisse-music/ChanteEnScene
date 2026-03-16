export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishEverywhere } from '@/lib/social'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = '8064044229'

async function sendTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
    })
    return res.ok
  } catch {
    return false
  }
}

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

/** Ajoute les paramètres UTM à une URL chantenscene.fr */
function utmLink(url: string, campaign: string, content?: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=social&utm_medium=cron&utm_campaign=${campaign}${content ? `&utm_content=${content}` : ''}`
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
  spotlightCandidate: { stage_name: string; first_name: string; slug: string; song_title?: string; song_artist?: string; likes_count: number } | null,
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
      const voteUrl = utmLink(`${sessionUrl}/candidats/${c.slug}`, 'new_candidates', 'vote_link')
      return `🎙️ ${name}${song}${artist}\n🗳️ Votez${pronoun} → ${voteUrl}`
    }).join('\n\n')

    // Footer message based on count
    let footerMsg = ''
    if (count <= 3) {
      footerMsg = '💬 Il reste de la place, inscrivez-vous !\n👉 ' + utmLink(sessionUrl + '/inscription', 'new_candidates', 'footer_inscription')
    } else if (count <= 5) {
      footerMsg = '🔥 La compétition s\'intensifie, qui sera le prochain ?'
    } else {
      footerMsg = `🔥 ${count} nouveaux aujourd'hui ! La suite demain...`
    }

    const title = count === 1
      ? `🎤 Nouveau candidat ${session.name} !`
      : `🎤 ${count} nouveaux candidats ${session.name} !`

    // Use composite social card image (all candidates in one image)
    const slugs = displayCandidates.map(c => c.slug).join(',')
    const imageUrl = `${siteUrl}/api/social-card?session_id=${session.id}&slugs=${slugs}`

    posts.push({
      type: count === 1 ? 'new_candidate_welcome' : count <= 5 ? 'new_candidates_welcome' : 'new_candidates_wave',
      priority: 1,
      message: `${title}\n\n${candidateLines}\n\n${footerMsg}\n\n#chantenscene #ConcoursDeChant`,
      link: count === 1 ? utmLink(`${sessionUrl}/candidats/${displayCandidates[0].slug}`, 'new_candidates') : utmLink(`${sessionUrl}/candidats`, 'new_candidates'),
      imageUrl,
    })
  }

  // ── 1b. Portrait candidat spotlight (quand pas de nouveau candidat approuvé) ──
  // Si l'admin n'a approuvé personne de nouveau, on met en avant un candidat déjà approuvé
  // Priorité : celui avec le moins de votes, jamais présenté en spotlight
  // Si tous ont été présentés, on recommence le cycle depuis le moins voté
  if (newCandidatesSinceYesterday.length === 0 && spotlightCandidate && totalCandidates > 0) {
    const name = spotlightCandidate.stage_name || spotlightCandidate.first_name
    const song = spotlightCandidate.song_title ? `\n🎵 « ${spotlightCandidate.song_title} »${spotlightCandidate.song_artist ? ` — ${spotlightCandidate.song_artist}` : ''}` : ''
    const imageUrl = `${siteUrl}/api/candidate-portrait?session_id=${session.id}&slug=${spotlightCandidate.slug}`

    posts.push({
      type: 'candidate_portrait',
      priority: 1,
      message: `🌟 Découvrez ${name}, candidat(e) à ${session.name} !${song}\n\nSoutenez ${name} en votant 🗳️\n👉 ${utmLink(`${sessionUrl}/candidats/${spotlightCandidate.slug}`, 'candidate_spotlight', 'vote_link')}\n\n#chantenscene #ConcoursDeChant #VotezPourMoi`,
      link: utmLink(`${sessionUrl}/candidats/${spotlightCandidate.slug}`, 'candidate_spotlight'),
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
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour s'inscrire à ${session.name} !\n\nNe manquez pas votre chance de monter sur scène ! 🎤\n\nInscription 👉 ${utmLink(`${sessionUrl}/inscription`, 'registration_countdown')}\n\n#chantenscene #DernièreChance`,
        link: utmLink(`${sessionUrl}/inscription`, 'registration_countdown'),
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
        message: `🔥 Plus que ${days} jour${days > 1 ? 's' : ''} avant la demi-finale de ${session.name} !\n\nQui passera en finale ? 🎶\n\n${utmLink(`${sessionUrl}/live`, 'countdown_semifinal')}\n\n#chantenscene #DemiFinale`,
        link: utmLink(`${sessionUrl}/live`, 'countdown_semifinal'),
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
        message: `🏆 Plus que ${days} jour${days > 1 ? 's' : ''} avant la GRANDE FINALE de ${session.name} !\n\nQui sera le grand gagnant ? 🎤🔥\n\n${utmLink(`${sessionUrl}/live`, 'countdown_final')}\n\n#chantenscene #Finale`,
        link: utmLink(`${sessionUrl}/live`, 'countdown_final'),
      })
    }
  }

  // ── 5. Rappel de vote (jeudi, quand les votes sont ouverts) ─
  if (dayOfWeek === 4 && totalCandidates > 0 && ['registration_open', 'registration_closed'].includes(session.status)) {
    posts.push({
      type: 'voting_reminder',
      priority: 3,
      message: `🗳️ Avez-vous voté pour votre candidat préféré de ${session.name} ?\n\nChaque vote compte ! Soutenez vos favoris 👉 ${utmLink(`${sessionUrl}/candidats`, 'voting_reminder')}\n\n#chantenscene #Votez`,
      link: utmLink(`${sessionUrl}/candidats`, 'voting_reminder'),
    })
  }

  // ── 6. Countdown fermeture des votes ────────────────────────
  if (config.voting_close_date && ['registration_open', 'registration_closed'].includes(session.status)) {
    const days = daysUntil(config.voting_close_date)
    if ([7, 3, 1].includes(days)) {
      posts.push({
        type: 'countdown_voting_close',
        priority: 2,
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour voter à ${session.name} !\n\nFaites entendre votre voix 👉 ${utmLink(`${sessionUrl}/candidats`, 'voting_countdown')}\n\n#chantenscene #DernierJourDeVote`,
        link: utmLink(`${sessionUrl}/candidats`, 'voting_countdown'),
      })
    }
  }

  // ── 7. Parrainage (mercredi, inscriptions ouvertes, 5+ candidats) ─
  if (dayOfWeek === 3 && totalCandidates >= 5 && session.status === 'registration_open') {
    posts.push({
      type: 'referral_promo',
      priority: 4,
      message: `🤝 Tu es candidat(e) à ${session.name} ? Parraine tes proches !\n\nVa sur "Mon profil" pour copier ton lien de parrainage unique et envoie-le à ceux qui aiment chanter ! Chaque filleul inscrit booste ta visibilité ⭐\n\n👉 ${utmLink(`${sessionUrl}/comment-ca-marche`, 'referral_promo')}\n\n#chantenscene #Parrainage #ConcoursDeChant`,
      link: utmLink(`${siteUrl}/comment-ca-marche`, 'referral_promo'),
    })
  }

  // ── 8. Promo hebdo (lundi) ──────────────────────────────────
  if (dayOfWeek === 1) {
    if (session.status === 'registration_open') {
      posts.push({
        type: 'weekly_promo',
        priority: 4,
        message: `🎵 Les inscriptions pour ${session.name} sont ouvertes !\n\nVous avez du talent ? Tentez votre chance et montez sur scène ! 🎤✨\n\nInscrivez-vous 👉 ${utmLink(`${sessionUrl}/inscription`, 'weekly_promo', 'inscription')}\n\n#chantenscene #ConcoursDeChant #LaSceneEstAToi`,
        link: utmLink(`${sessionUrl}/inscription`, 'weekly_promo', 'inscription'),
      })
    } else if (['registration_closed', 'semifinal', 'final'].includes(session.status)) {
      posts.push({
        type: 'weekly_promo',
        priority: 4,
        message: `🎵 ${session.name} bat son plein ! ${totalCandidates} candidats en lice !\n\nSuivez la compétition et votez pour vos favoris 🗳️🎤\n\n👉 ${utmLink(`${sessionUrl}/candidats`, 'weekly_promo', 'candidats')}\n\n#chantenscene #ConcoursDeChant #VoteEnDirect`,
        link: utmLink(`${sessionUrl}/candidats`, 'weekly_promo', 'candidats'),
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

  // Récupérer les slugs des candidats déjà annoncés dans les posts cron précédents
  const { data: pastPosts } = await supabase
    .from('social_posts_log')
    .select('message')
    .eq('source', 'cron')
    .in('post_type', ['new_candidate_welcome', 'new_candidates_welcome', 'new_candidates_wave'])

  // Extraire les slugs des URLs /candidats/{slug} dans les messages passés
  const announcedSlugs = new Set<string>()
  if (pastPosts) {
    for (const post of pastPosts) {
      const matches = (post.message || '').matchAll(/\/candidats\/([a-z0-9-]+)/g)
      for (const match of matches) {
        announcedSlugs.add(match[1])
      }
    }
  }

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

    // Candidats approuvés récemment (48h) et jamais annoncés
    // Les candidats approuvés plus anciennement seront mis en avant via le spotlight
    const recentCutoff = new Date()
    recentCutoff.setDate(recentCutoff.getDate() - 2)

    const { data: allApproved } = await supabase
      .from('candidates')
      .select('first_name, last_name, stage_name, slug, song_title, song_artist, photo_url, updated_at')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .neq('image_social_consent', false)

    const newCandidates = (allApproved || []).filter(c =>
      !announcedSlugs.has(c.slug) &&
      c.updated_at && new Date(c.updated_at) >= recentCutoff
    )

    // Find spotlight candidate: approved, never had a portrait post, fewest votes first
    const { data: pastPortraits } = await supabase
      .from('social_posts_log')
      .select('message')
      .eq('source', 'cron')
      .eq('post_type', 'candidate_portrait')

    const portraitSlugs = new Set<string>()
    if (pastPortraits) {
      for (const post of pastPortraits) {
        const matches = (post.message || '').matchAll(/\/candidats\/([a-z0-9-]+)/g)
        for (const match of matches) {
          portraitSlugs.add(match[1])
        }
      }
    }

    // Also track recently spotlighted (last 48h) to avoid consecutive posts
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const { data: recentPortraits } = await supabase
      .from('social_posts_log')
      .select('message')
      .eq('source', 'cron')
      .eq('post_type', 'candidate_portrait')
      .gte('created_at', twoDaysAgo.toISOString())

    const recentSlugs = new Set<string>()
    if (recentPortraits) {
      for (const post of recentPortraits) {
        const matches = (post.message || '').matchAll(/\/candidats\/([a-z0-9-]+)/g)
        for (const match of matches) {
          recentSlugs.add(match[1])
        }
      }
    }

    // Get approved candidates sorted by fewest votes, pick one without a portrait yet
    const { data: spotlightCandidates } = await supabase
      .from('candidates')
      .select('first_name, stage_name, slug, song_title, song_artist, likes_count')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .neq('image_social_consent', false)
      .order('likes_count', { ascending: true })

    // Pick candidate: 1) never spotlighted, 2) not recently posted (48h), 3) least votes
    let spotlightCandidate = (spotlightCandidates || []).find(c => !portraitSlugs.has(c.slug)) || null
    if (!spotlightCandidate && (spotlightCandidates || []).length > 0) {
      // All spotlighted — restart cycle but skip recently posted candidates
      spotlightCandidate = (spotlightCandidates || []).find(c => !recentSlugs.has(c.slug)) || null
    }

    const posts = generatePosts(
      { id: session.id, name: session.name, slug: session.slug, config, status: session.status },
      totalCandidates || 0,
      newCandidates || [],
      spotlightCandidate,
      socialSiteUrl
    )

    const sessionResults: { type: string; success: boolean; error?: string }[] = []

    // Publier max 1 post par jour par session
    const postToPublish = posts[0]
    if (postToPublish) {
      try {
        // Utiliser l'URL dynamique directement pour Facebook (qui accepte les redirections)
        // Pour Instagram, on upload une copie statique dans Storage
        let finalImageUrl = postToPublish.imageUrl
        if (finalImageUrl?.includes('/api/social-card') || finalImageUrl?.includes('/api/candidate-portrait')) {
          try {
            // Vérifier si une image statique existe déjà pour ces paramètres
            const urlHash = createHash('sha256').update(finalImageUrl).digest('hex').slice(0, 16)
            const filename = `social/cron-${urlHash}.png`
            const { data: existing } = supabase.storage.from('photos').getPublicUrl(filename)
            // Vérifier si le fichier existe
            const { data: fileCheck } = await supabase.storage.from('photos').list('social', { search: `cron-${urlHash}.png` })
            if (fileCheck && fileCheck.length > 0) {
              // Image déjà générée, réutiliser l'URL statique
              finalImageUrl = existing.publicUrl
            } else {
              // Générer et uploader une seule fois
              const imgRes = await fetch(finalImageUrl)
              if (imgRes.ok) {
                const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
                const { error: uploadErr } = await supabase.storage
                  .from('photos')
                  .upload(filename, imgBuffer, { contentType: 'image/png', upsert: true })
                if (!uploadErr) {
                  finalImageUrl = existing.publicUrl
                }
              }
            }
          } catch {
            // Fallback : garder l'URL dynamique (marchera pour FB mais pas IG)
          }
        }

        const result = await publishEverywhere(postToPublish.message, finalImageUrl, postToPublish.link)
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

        // Notification Telegram
        const igOk = result.instagram && 'id' in result.instagram
        const igError = result.instagram && 'error' in result.instagram ? result.instagram.error : undefined
        const statusFb = fbOk ? '✅ FB' : `❌ FB: ${fbError}`
        const statusIg = igOk ? '✅ IG' : (igError ? `❌ IG: ${igError}` : '⏭️ IG: pas d\'image')
        const preview = postToPublish.message.substring(0, 200) + (postToPublish.message.length > 200 ? '...' : '')
        const tgMsg = `📣 *Post social publié*\n\n🏷️ Type: ${postToPublish.type}\n${statusFb}\n${statusIg}\n\n${preview}`
        await sendTelegram(tgMsg)
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
