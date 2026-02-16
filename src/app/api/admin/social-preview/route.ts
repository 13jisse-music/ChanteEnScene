import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SessionConfig {
  registration_open_date?: string
  registration_close_date?: string
  semifinal_date?: string
  final_date?: string
  [key: string]: unknown
}

interface PreviewPost {
  type: string
  label: string
  message: string
  link?: string
  suggested_image_prompt?: string
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function generateAllPossiblePosts(
  session: { name: string; slug: string; config: SessionConfig; status: string },
  candidateCount: number,
  newCandidates: { stage_name: string; first_name: string; last_name: string }[],
  siteUrl: string
): PreviewPost[] {
  const posts: PreviewPost[] = []
  const config = session.config || {}
  const sessionUrl = `${siteUrl}/${session.slug}`

  // Countdown inscriptions
  if (config.registration_open_date) {
    const days = daysUntil(config.registration_open_date)
    if (days > 0) {
      posts.push({
        type: 'countdown_registration',
        label: `Countdown inscriptions (J-${days})`,
        message: `⏳ J-${days} avant l'ouverture des inscriptions pour ${session.name} !\n\nPréparez votre plus belle chanson, bientôt ce sera à vous de briller sur scène ! 🎤✨\n\n${sessionUrl}`,
        link: sessionUrl,
        suggested_image_prompt: `Affiche promotionnelle colorée pour un concours de chant "${session.name}", style moderne et festif, avec un compte à rebours J-${days}, micro doré, notes de musique, couleurs rose vif et violet foncé`,
      })
    }
  }

  // Nouveaux candidats
  if (newCandidates.length > 0) {
    if (newCandidates.length === 1) {
      const c = newCandidates[0]
      const name = c.stage_name || `${c.first_name} ${c.last_name}`
      posts.push({
        type: 'new_candidates',
        label: `Nouveau candidat : ${name}`,
        message: `🎵 Nouveau candidat : ${name} rejoint l'aventure ${session.name} !\n\nDécouvrez son profil et votez pour vos favoris 👉 ${sessionUrl}/candidats`,
        link: `${sessionUrl}/candidats`,
        suggested_image_prompt: `Affiche "Bienvenue" pour un nouveau candidat dans un concours de chant, style élégant avec projecteur sur scène, micro, nom "${name}", couleurs rose et violet`,
      })
    } else {
      posts.push({
        type: 'new_candidates',
        label: `${newCandidates.length} nouveaux candidats`,
        message: `🎵 ${newCandidates.length} nouveaux candidats cette semaine pour ${session.name} !\n\nDécouvrez-les et votez pour vos favoris 👉 ${sessionUrl}/candidats`,
        link: `${sessionUrl}/candidats`,
        suggested_image_prompt: `Affiche promotionnelle concours de chant avec "${newCandidates.length} nouveaux candidats", silhouettes sur scène, ambiance concert, couleurs rose et violet`,
      })
    }
  }

  // Compteur candidats
  if (candidateCount > 0) {
    posts.push({
      type: 'candidate_count',
      label: `Compteur : ${candidateCount} candidats`,
      message: `🎤 Déjà ${candidateCount} candidats inscrits à ${session.name}, et vous ?\n\nIl est encore temps de tenter votre chance ! Inscrivez-vous maintenant 👉 ${sessionUrl}/inscription`,
      link: `${sessionUrl}/inscription`,
      suggested_image_prompt: `Affiche dynamique concours de chant avec le chiffre "${candidateCount}" en grand, micro, foule en ombre, texte "Et vous ?", couleurs rose et violet`,
    })
  }

  // Rappel de vote
  if (candidateCount > 0) {
    posts.push({
      type: 'voting_reminder',
      label: 'Rappel de vote',
      message: `🗳️ Avez-vous voté pour votre candidat préféré de ${session.name} ?\n\nChaque vote compte ! Soutenez vos favoris 👉 ${sessionUrl}/candidats`,
      link: `${sessionUrl}/candidats`,
      suggested_image_prompt: `Affiche "VOTEZ !" pour un concours de chant, style moderne avec main qui vote, étoiles, micro, couleurs rose vif et violet foncé`,
    })
  }

  // Countdown demi-finale
  if (config.semifinal_date) {
    const days = daysUntil(config.semifinal_date)
    if (days > 0) {
      posts.push({
        type: 'countdown_semifinal',
        label: `Countdown demi-finale (J-${days})`,
        message: `🔥 Plus que ${days} jour${days > 1 ? 's' : ''} avant la demi-finale de ${session.name} !\n\nQui passera en finale ? Rendez-vous bientôt pour le découvrir ! 🎶\n\n${sessionUrl}/live`,
        link: `${sessionUrl}/live`,
        suggested_image_prompt: `Affiche "DEMI-FINALE J-${days}" pour un concours de chant sur scène, ambiance suspense, projecteurs, flammes, couleurs rose et violet intense`,
      })
    }
  }

  // Countdown finale
  if (config.final_date) {
    const days = daysUntil(config.final_date)
    if (days > 0) {
      posts.push({
        type: 'countdown_final',
        label: `Countdown finale (J-${days})`,
        message: `🏆 Plus que ${days} jour${days > 1 ? 's' : ''} avant la GRANDE FINALE de ${session.name} !\n\nQui sera le grand gagnant ? Ne manquez pas ça ! 🎤🔥\n\n${sessionUrl}/live`,
        link: `${sessionUrl}/live`,
        suggested_image_prompt: `Affiche "GRANDE FINALE J-${days}" spectaculaire pour un concours de chant, trophée doré, confettis, scène illuminée, couleurs rose et or`,
      })
    }
  }

  return posts
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chanteenscene.fr'
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await admin
    .from('sessions')
    .select('id, name, slug, config, status')
    .eq('is_active', true)

  if (!sessions?.length) {
    return NextResponse.json({ posts: [] })
  }

  const allPosts: PreviewPost[] = []

  for (const session of sessions) {
    const config = (session.config || {}) as SessionConfig

    const { count: candidateCount } = await admin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])

    const { data: newCandidates } = await admin
      .from('candidates')
      .select('first_name, last_name, stage_name')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .gte('created_at', oneWeekAgo)

    const posts = generateAllPossiblePosts(
      { name: session.name, slug: session.slug, config, status: session.status },
      candidateCount || 0,
      newCandidates || [],
      siteUrl
    )
    allPosts.push(...posts)
  }

  return NextResponse.json({ posts: allPosts })
}
