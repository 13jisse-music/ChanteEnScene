import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SessionConfig {
  registration_open_date?: string
  registration_close_date?: string
  voting_close_date?: string
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
  priority: number
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function generateAllPossiblePosts(
  session: { name: string; slug: string; config: SessionConfig; status: string },
  totalCandidates: number,
  newCandidates: { stage_name: string; first_name: string; last_name: string; slug: string }[],
  siteUrl: string
): PreviewPost[] {
  const posts: PreviewPost[] = []
  const config = session.config || {}
  const sessionUrl = `${siteUrl}/${session.slug}`

  // ── 1. Nouveaux candidats ───────────────────────────────────
  if (newCandidates.length > 0) {
    if (newCandidates.length === 1) {
      const c = newCandidates[0]
      const name = c.stage_name || `${c.first_name} ${c.last_name}`
      posts.push({
        type: 'new_candidate_welcome',
        label: `Bienvenue : ${name}`,
        priority: 1,
        message: `🎤 Bienvenue à ${name} qui rejoint l'aventure ${session.name} ! Bonne chance ! 🍀\n\nDécouvrez son profil 👉 ${sessionUrl}/candidats/${c.slug}\n\n#ChanteEnScène #ConcoursDeChant`,
        link: `${sessionUrl}/candidats/${c.slug}`,
        suggested_image_prompt: `Affiche "BIENVENUE" pour un concours de chant, style moderne avec projecteur sur scène, micro doré, nom "${name}", confettis, couleurs rose vif #e91e8c et violet foncé #1a1232`,
      })
    } else {
      const names = newCandidates.map(c => c.stage_name || c.first_name).join(', ')
      posts.push({
        type: 'new_candidates_welcome',
        label: `${newCandidates.length} nouveaux candidats`,
        priority: 1,
        message: `🎤 ${newCandidates.length} nouveaux candidats rejoignent ${session.name} !\n\nBienvenue à ${names} ! Bonne chance à tous ! 🍀\n\nDécouvrez-les 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #ConcoursDeChant`,
        link: `${sessionUrl}/candidats`,
        suggested_image_prompt: `Affiche concours de chant avec "${newCandidates.length} nouveaux candidats", silhouettes sur scène, ambiance concert festive, couleurs rose #e91e8c et violet #1a1232`,
      })
    }
  }

  // ── 2. Countdown fermeture inscriptions (J-30, J-14, J-7, J-3, J-1) ─
  if (config.registration_close_date && totalCandidates >= 5 && session.status === 'registration_open') {
    const days = daysUntil(config.registration_close_date)
    if ([30, 14, 7, 3, 1].includes(days)) {
      posts.push({
        type: 'countdown_registration_close',
        label: `Fermeture inscriptions J-${days}`,
        priority: 2,
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour s'inscrire à ${session.name} !\n\nNe manquez pas votre chance de monter sur scène ! 🎤\n\nInscription 👉 ${sessionUrl}/inscription\n\n#ChanteEnScène #DernièreChance`,
        link: `${sessionUrl}/inscription`,
        suggested_image_prompt: `Affiche "J-${days}" urgente pour un concours de chant, sablier, micro, texte "Dernière chance de s'inscrire", couleurs rose #e91e8c et violet #1a1232`,
      })
    }
  }

  // ── 3. Countdown demi-finale (J-7 à J-1) ───────────────────
  if (config.semifinal_date) {
    const days = daysUntil(config.semifinal_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_semifinal',
        label: `Demi-finale J-${days}`,
        priority: 2,
        message: `🔥 Plus que ${days} jour${days > 1 ? 's' : ''} avant la demi-finale de ${session.name} !\n\nQui passera en finale ? 🎶\n\n${sessionUrl}/live\n\n#ChanteEnScène #DemiFinale`,
        link: `${sessionUrl}/live`,
        suggested_image_prompt: `Affiche "DEMI-FINALE J-${days}" pour un concours de chant, ambiance suspense, projecteurs, flammes, couleurs rose #e91e8c et violet intense #1a1232`,
      })
    }
  }

  // ── 4. Countdown finale (J-7 à J-1) ──────────────────────
  if (config.final_date) {
    const days = daysUntil(config.final_date)
    if (days > 0 && days <= 7) {
      posts.push({
        type: 'countdown_final',
        label: `Finale J-${days}`,
        priority: 2,
        message: `🏆 Plus que ${days} jour${days > 1 ? 's' : ''} avant la GRANDE FINALE de ${session.name} !\n\nQui sera le grand gagnant ? 🎤🔥\n\n${sessionUrl}/live\n\n#ChanteEnScène #Finale`,
        link: `${sessionUrl}/live`,
        suggested_image_prompt: `Affiche "GRANDE FINALE J-${days}" spectaculaire, trophée doré, confettis, scène illuminée, couleurs rose #e91e8c et or`,
      })
    }
  }

  // ── 5. Rappel de vote ───────────────────────────────────────
  if (totalCandidates > 0 && ['registration_open', 'registration_closed'].includes(session.status)) {
    posts.push({
      type: 'voting_reminder',
      label: 'Rappel de vote',
      priority: 3,
      message: `🗳️ Avez-vous voté pour votre candidat préféré de ${session.name} ?\n\nChaque vote compte ! Soutenez vos favoris 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #Votez`,
      link: `${sessionUrl}/candidats`,
      suggested_image_prompt: `Affiche "VOTEZ !" pour un concours de chant, main qui vote, étoiles, micro, style moderne, couleurs rose vif #e91e8c et violet foncé #1a1232`,
    })
  }

  // ── 6. Countdown fermeture votes (J-7, J-3, J-1) ───────────
  if (config.voting_close_date && ['registration_open', 'registration_closed'].includes(session.status)) {
    const days = daysUntil(config.voting_close_date)
    if ([7, 3, 1].includes(days)) {
      posts.push({
        type: 'countdown_voting_close',
        label: `Fermeture votes J-${days}`,
        priority: 2,
        message: `⏳ Plus que ${days} jour${days > 1 ? 's' : ''} pour voter à ${session.name} !\n\nFaites entendre votre voix 👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #DernierJourDeVote`,
        link: `${sessionUrl}/candidats`,
        suggested_image_prompt: `Affiche "DERNIER JOUR DE VOTE" urgente, urne de vote, micro, sablier, couleurs rose #e91e8c et violet #1a1232`,
      })
    }
  }

  // ── 7. Promo hebdo ──────────────────────────────────────────
  if (session.status === 'registration_open') {
    posts.push({
      type: 'weekly_promo',
      label: 'Promo inscriptions',
      priority: 4,
      message: `🎵 Les inscriptions pour ${session.name} sont ouvertes !\n\nVous avez du talent ? Tentez votre chance et montez sur scène ! 🎤✨\n\nInscrivez-vous 👉 ${sessionUrl}/inscription\n\n#ChanteEnScène #ConcoursDeChant #LaSceneEstAToi`,
      link: `${sessionUrl}/inscription`,
      suggested_image_prompt: `Affiche promotionnelle "INSCRIPTIONS OUVERTES" pour un concours de chant, micro doré, notes de musique flottantes, scène illuminée, couleurs rose #e91e8c et violet #1a1232`,
    })
  } else if (['registration_closed', 'semifinal', 'final'].includes(session.status)) {
    posts.push({
      type: 'weekly_promo',
      label: 'Promo compétition',
      priority: 4,
      message: `🎵 ${session.name} bat son plein ! ${totalCandidates} candidats en lice !\n\nSuivez la compétition et votez pour vos favoris 🗳️🎤\n\n👉 ${sessionUrl}/candidats\n\n#ChanteEnScène #ConcoursDeChant #VoteEnDirect`,
      link: `${sessionUrl}/candidats`,
      suggested_image_prompt: `Affiche "VOTEZ POUR VOS FAVORIS" avec foule en silhouette, micro, lumières de concert, texte "${totalCandidates} candidats", couleurs rose #e91e8c et violet #1a1232`,
    })
  }

  posts.sort((a, b) => a.priority - b.priority)
  return posts
}

// ── Calendrier des prochaines publications automatiques ──────

interface CalendarEntry {
  date: string      // ISO date (YYYY-MM-DD)
  type: string
  label: string
  daysUntil: number
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function generateCalendar(
  session: { name: string; config: SessionConfig; status: string },
  totalCandidates: number,
): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  const config = session.config || {}
  const now = new Date()
  const today = toISODate(now)

  // ── Countdown fermeture inscriptions ──
  if (config.registration_close_date && totalCandidates >= 5 && session.status === 'registration_open') {
    const closeDate = new Date(config.registration_close_date)
    for (const j of [30, 14, 7, 3, 1]) {
      const postDate = addDays(closeDate, -j)
      const iso = toISODate(postDate)
      if (iso > today) {
        entries.push({ date: iso, type: 'countdown_registration_close', label: `Inscriptions J-${j}`, daysUntil: daysUntil(iso) })
      }
    }
  }

  // ── Countdown demi-finale (J-7 à J-1) ──
  if (config.semifinal_date) {
    const semiDate = new Date(config.semifinal_date)
    for (let j = 7; j >= 1; j--) {
      const postDate = addDays(semiDate, -j)
      const iso = toISODate(postDate)
      if (iso > today) {
        entries.push({ date: iso, type: 'countdown_semifinal', label: `Demi-finale J-${j}`, daysUntil: daysUntil(iso) })
      }
    }
  }

  // ── Countdown finale (J-7 à J-1) ──
  if (config.final_date) {
    const finalDate = new Date(config.final_date)
    for (let j = 7; j >= 1; j--) {
      const postDate = addDays(finalDate, -j)
      const iso = toISODate(postDate)
      if (iso > today) {
        entries.push({ date: iso, type: 'countdown_final', label: `Finale J-${j}`, daysUntil: daysUntil(iso) })
      }
    }
  }

  // ── Countdown fermeture votes (J-7, J-3, J-1) ──
  if (config.voting_close_date && ['registration_open', 'registration_closed'].includes(session.status)) {
    const voteDate = new Date(config.voting_close_date)
    for (const j of [7, 3, 1]) {
      const postDate = addDays(voteDate, -j)
      const iso = toISODate(postDate)
      if (iso > today) {
        entries.push({ date: iso, type: 'countdown_voting_close', label: `Votes J-${j}`, daysUntil: daysUntil(iso) })
      }
    }
  }

  // ── Rappel de vote (jeudis, max 8 semaines) ──
  if (totalCandidates > 0 && ['registration_open', 'registration_closed'].includes(session.status)) {
    const d = new Date(now)
    const daysToThursday = (4 - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + daysToThursday)
    for (let i = 0; i < 8; i++) {
      const iso = toISODate(d)
      entries.push({ date: iso, type: 'voting_reminder', label: 'Rappel de vote', daysUntil: daysUntil(iso) })
      d.setDate(d.getDate() + 7)
    }
  }

  // ── Promo hebdo (lundis, max 8 semaines) ──
  if (['registration_open', 'registration_closed', 'semifinal', 'final'].includes(session.status)) {
    const promoLabel = session.status === 'registration_open' ? 'Promo inscriptions' : 'Promo compétition'
    const d = new Date(now)
    const daysToMonday = (1 - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + daysToMonday)
    for (let i = 0; i < 8; i++) {
      const iso = toISODate(d)
      entries.push({ date: iso, type: 'weekly_promo', label: promoLabel, daysUntil: daysUntil(iso) })
      d.setDate(d.getDate() + 7)
    }
  }

  // Trier par date chronologique
  entries.sort((a, b) => a.date.localeCompare(b.date))
  return entries
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const admin = createAdminClient()
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chantenscene.fr'
  const siteUrl = rawSiteUrl.includes('localhost') ? 'https://chantenscene.fr' : rawSiteUrl
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get active session (is_active flag, fallback to most recent non-archived)
  let { data: sessions } = await admin
    .from('sessions')
    .select('id, name, slug, config, status')
    .eq('is_active', true)

  if (!sessions?.length) {
    const { data: fallback } = await admin
      .from('sessions')
      .select('id, name, slug, config, status')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
    sessions = fallback
  }

  if (!sessions?.length) {
    return NextResponse.json({ posts: [], calendar: [] })
  }

  const allPosts: PreviewPost[] = []
  const allCalendar: CalendarEntry[] = []

  for (const session of sessions) {
    const config = (session.config || {}) as SessionConfig

    const { count: totalCandidates } = await admin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])

    const { data: newCandidates } = await admin
      .from('candidates')
      .select('first_name, last_name, stage_name, slug')
      .eq('session_id', session.id)
      .in('status', ['approved', 'semifinalist', 'finalist'])
      .gte('created_at', oneDayAgo)

    const posts = generateAllPossiblePosts(
      { name: session.name, slug: session.slug, config, status: session.status },
      totalCandidates || 0,
      newCandidates || [],
      siteUrl
    )
    allPosts.push(...posts)

    const calendar = generateCalendar(
      { name: session.name, config, status: session.status },
      totalCandidates || 0,
    )
    allCalendar.push(...calendar)
  }

  allCalendar.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ posts: allPosts, calendar: allCalendar })
}
