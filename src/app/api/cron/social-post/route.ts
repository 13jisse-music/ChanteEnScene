import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishEverywhere } from '@/lib/social'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  return authHeader === `Bearer ${cronSecret}`
}

interface SessionConfig {
  registration_open_date?: string
  registration_close_date?: string
  semifinal_date?: string
  final_date?: string
  jury_online_voting_closed?: boolean
  [key: string]: unknown
}

type PostType =
  | 'countdown_registration'
  | 'candidate_count'
  | 'new_candidates'
  | 'voting_reminder'
  | 'countdown_semifinal'
  | 'countdown_final'

interface GeneratedPost {
  type: PostType
  message: string
  link?: string
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function generatePosts(
  session: { name: string; slug: string; config: SessionConfig; status: string },
  candidateCount: number,
  newCandidatesThisWeek: { stage_name: string; first_name: string; last_name: string }[],
  siteUrl: string
): GeneratedPost[] {
  const posts: GeneratedPost[] = []
  const config = session.config || {}
  const sessionUrl = `${siteUrl}/${session.slug}`
  const dayOfWeek = new Date().getDay() // 0=dimanche

  // Countdown avant ouverture des inscriptions
  if (config.registration_open_date && session.status === 'draft') {
    const days = daysUntil(config.registration_open_date)
    if (days > 0 && days % 10 === 0) {
      posts.push({
        type: 'countdown_registration',
        message: `⏳ J-${days} avant l'ouverture des inscriptions pour ${session.name} !\n\nPréparez votre plus belle chanson, bientôt ce sera à vous de briller sur scène ! 🎤✨\n\n${sessionUrl}`,
        link: sessionUrl,
      })
    }
  }

  // Nouveau(x) candidat(s) cette semaine
  if (newCandidatesThisWeek.length > 0 && session.status === 'registration_open') {
    if (newCandidatesThisWeek.length === 1) {
      const c = newCandidatesThisWeek[0]
      const name = c.stage_name || `${c.first_name} ${c.last_name}`
      posts.push({
        type: 'new_candidates',
        message: `🎵 Nouveau candidat : ${name} rejoint l'aventure ${session.name} !\n\nDécouvrez son profil et votez pour vos favoris 👉 ${sessionUrl}/candidats`,
        link: `${sessionUrl}/candidats`,
      })
    } else {
      posts.push({
        type: 'new_candidates',
        message: `🎵 ${newCandidatesThisWeek.length} nouveaux candidats cette semaine pour ${session.name} !\n\nDécouvrez-les et votez pour vos favoris 👉 ${sessionUrl}/candidats`,
        link: `${sessionUrl}/candidats`,
      })
    }
  }

  // Compteur de candidats (chaque lundi)
  if (dayOfWeek === 1 && candidateCount > 0 && session.status === 'registration_open') {
    posts.push({
      type: 'candidate_count',
      message: `🎤 Déjà ${candidateCount} candidats inscrits à ${session.name}, et vous ?\n\nIl est encore temps de tenter votre chance ! Inscrivez-vous maintenant 👉 ${sessionUrl}/inscription`,
      link: `${sessionUrl}/inscription`,
    })
  }

  // Rappel de vote (chaque jeudi)
  if (dayOfWeek === 4 && candidateCount > 0 && ['registration_open', 'registration_closed'].includes(session.status)) {
    posts.push({
      type: 'voting_reminder',
      message: `🗳️ Avez-vous voté pour votre candidat préféré de ${session.name} ?\n\nChaque vote compte ! Soutenez vos favoris 👉 ${sessionUrl}/candidats`,
      link: `${sessionUrl}/candidats`,
    })
  }

  // Countdown demi-finale
  if (config.semifinal_date) {
    const days = daysUntil(config.semifinal_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_semifinal',
        message: `🔥 Plus que ${days} jour${days > 1 ? 's' : ''} avant la demi-finale de ${session.name} !\n\nQui passera en finale ? Rendez-vous bientôt pour le découvrir ! 🎶\n\n${sessionUrl}/live`,
        link: `${sessionUrl}/live`,
      })
    }
  }

  // Countdown finale
  if (config.final_date) {
    const days = daysUntil(config.final_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_final',
        message: `🏆 Plus que ${days} jour${days > 1 ? 's' : ''} avant la GRANDE FINALE de ${session.name} !\n\nQui sera le grand gagnant ? Ne manquez pas ça ! 🎤🔥\n\n${sessionUrl}/live`,
        link: `${sessionUrl}/live`,
      })
    }
  }

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chanteenscene.fr'
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Récupérer les sessions actives
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, config, status')
    .eq('is_active', true)

  if (!sessions?.length) {
    return NextResponse.json({ message: 'Aucune session active', posts: [] })
  }

  const results: { session: string; posts: { type: string; success: boolean; error?: string }[] }[] = []

  for (const session of sessions) {
    const config = (session.config || {}) as SessionConfig

    // Compter les candidats approuvés
    const { count: candidateCount } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])

    // Nouveaux candidats cette semaine
    const { data: newCandidates } = await supabase
      .from('candidates')
      .select('first_name, last_name, stage_name')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .gte('created_at', oneWeekAgo)

    const posts = generatePosts(
      { name: session.name, slug: session.slug, config, status: session.status },
      candidateCount || 0,
      newCandidates || [],
      siteUrl
    )

    const sessionResults: { type: string; success: boolean; error?: string }[] = []

    // Publier max 1 post par jour par session pour ne pas spammer
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

        // Log dans Supabase pour éviter les doublons
        await supabase.from('social_posts_log').insert({
          session_id: session.id,
          post_type: postToPublish.type,
          message: postToPublish.message,
          facebook_post_id: fbOk && 'id' in result.facebook! ? result.facebook.id : null,
          instagram_post_id: result.instagram && 'id' in result.instagram ? result.instagram.id : null,
          error: fbError || (result.instagram && 'error' in result.instagram ? result.instagram.error : null),
        }).then(() => {})  // fire-and-forget
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
