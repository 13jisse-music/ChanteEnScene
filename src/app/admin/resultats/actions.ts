'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'

// ─── Email HTML builders ───

interface EmailCandidate {
  first_name: string
  last_name: string
  email: string
  stage_name: string | null
}

interface SessionConfig {
  semifinal_date?: string
  semifinal_time?: string
  semifinal_location?: string
  [key: string]: unknown
}

function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function buildSelectionEmailHtml(candidate: EmailCandidate & { id?: string }, config: SessionConfig): string {
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const uploadLink = candidate.id ? `${siteUrl}/upload-mp3/${candidate.id}` : ''
  const date = config.semifinal_date ? formatDateFr(config.semifinal_date) : 'Date à confirmer'
  const time = config.semifinal_time || 'Horaire à confirmer'
  const location = config.semifinal_location || 'Lieu à confirmer'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b1a; color: #ffffff; padding: 40px 30px; border-radius: 16px;">
      <h1 style="text-align: center; margin-bottom: 8px;">
        <span style="color: #ffffff;">Chant</span><span style="color: #7ec850;">En</span><span style="color: #e91e8c;">Scène</span>
      </h1>
      <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 30px;">Concours de chant à Aubagne</p>

      <h2 style="color: #7ec850; text-align: center;">Félicitations ${displayName} !</h2>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous avons le plaisir de vous annoncer que vous avez été <strong style="color: #7ec850;">sélectionné(e) pour la demi-finale</strong> de ChanteEnScène !
      </p>

      <div style="background: rgba(126, 200, 80, 0.1); border: 1px solid rgba(126, 200, 80, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #7ec850; font-weight: bold; margin: 0 0 12px; text-align: center;">Informations demi-finale</p>
        <table style="width: 100%; color: rgba(255,255,255,0.7); font-size: 14px;">
          <tr>
            <td style="padding: 4px 8px; color: rgba(255,255,255,0.4);">Date</td>
            <td style="padding: 4px 8px; font-weight: bold;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: rgba(255,255,255,0.4);">Heure</td>
            <td style="padding: 4px 8px; font-weight: bold;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: rgba(255,255,255,0.4);">Lieu</td>
            <td style="padding: 4px 8px; font-weight: bold;">${location}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(233, 30, 140, 0.1); border: 1px solid rgba(233, 30, 140, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #e91e8c; font-weight: bold; margin: 0;">À préparer</p>
        <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0;">
          Envoyez-nous votre <strong style="color: #e91e8c;">playback MP3</strong> (instrumental de votre chanson) via le lien ci-dessous :
        </p>
        ${uploadLink ? `
        <a href="${uploadLink}" style="display: inline-block; margin-top: 16px; padding: 12px 32px; background: linear-gradient(135deg, #e91e8c, #c4157a); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 14px;">
          Envoyer mon MP3
        </a>
        ` : ''}
      </div>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous avons hâte de vous voir sur scène ! Préparez-vous bien et n'hésitez pas à nous contacter si vous avez des questions.
      </p>

      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 30px; text-align: center;">
        À très bientôt sur scène !<br/>
        L'équipe ChanteEnScène
      </p>
    </div>
  `
}

function buildRejectionEmailHtml(candidate: EmailCandidate): string {
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b1a; color: #ffffff; padding: 40px 30px; border-radius: 16px;">
      <h1 style="text-align: center; margin-bottom: 8px;">
        <span style="color: #ffffff;">Chant</span><span style="color: #7ec850;">En</span><span style="color: #e91e8c;">Scène</span>
      </h1>
      <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 30px;">Concours de chant à Aubagne</p>

      <h2 style="color: #e91e8c; text-align: center;">Merci ${displayName} !</h2>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous tenons à vous remercier sincèrement pour votre participation à ChanteEnScène. Votre talent et votre courage de monter sur scène sont admirables.
      </p>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Malheureusement, le nombre de places en demi-finale étant limité, il ne nous a pas été possible de retenir toutes les candidatures cette fois-ci.
      </p>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous vous encourageons à continuer de chanter et à retenter votre chance lors de nos prochaines éditions !
      </p>

      <div style="background: rgba(233, 30, 140, 0.1); border: 1px solid rgba(233, 30, 140, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #e91e8c; font-weight: bold; margin: 0;">Restez connecté(e) !</p>
        <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0;">
          Suivez-nous sur nos réseaux sociaux pour être informé(e) en avant-première de nos prochains concours et événements.
        </p>
      </div>

      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 30px; text-align: center;">
        À bientôt !<br/>
        L'équipe ChanteEnScène
      </p>
    </div>
  `
}

// ─── Server actions ───

export async function promoteToSemifinalist(candidateId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'semifinalist' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/resultats')
  revalidatePath('/admin/candidats')
  return { success: true }
}

export async function removeFromSemifinalist(candidateId: string, sessionId: string) {
  const supabase = createAdminClient()

  // Vérifier si les notifications ont déjà été envoyées
  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  const config = (session?.config || {}) as SessionConfig
  if (config.selection_notifications_sent_at) {
    return { error: 'Impossible : les notifications ont déjà été envoyées. La liste ne peut plus être modifiée.' }
  }

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'approved' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/resultats')
  revalidatePath('/admin/candidats')
  return { success: true }
}

export async function getEmailPreviews(sessionId: string) {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as SessionConfig

  // Utiliser un vrai candidat pour l'aperçu
  const { data: semiSample } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name')
    .eq('session_id', sessionId)
    .eq('status', 'semifinalist')
    .limit(1)
    .single()

  const { data: rejSample } = await supabase
    .from('candidates')
    .select('first_name, last_name, email, stage_name')
    .eq('session_id', sessionId)
    .eq('status', 'approved')
    .limit(1)
    .single()

  const selectionPreviewCandidate: EmailCandidate = semiSample || { first_name: 'Prénom', last_name: 'Nom', email: '', stage_name: null }
  const rejectionPreviewCandidate: EmailCandidate = rejSample || selectionPreviewCandidate

  return {
    selectionHtml: buildSelectionEmailHtml(selectionPreviewCandidate, config),
    rejectionHtml: buildRejectionEmailHtml(rejectionPreviewCandidate),
    selectionSubject: 'Félicitations ! Vous êtes sélectionné(e) pour la demi-finale — ChanteEnScène',
    rejectionSubject: 'Merci pour votre participation — ChanteEnScène',
  }
}

interface EmailReport {
  email: string
  name: string
  type: 'selection' | 'rejection'
  status: 'sent' | 'simulated' | 'failed'
  detail?: string
}

export async function sendSelectionNotifications(sessionId: string) {
  const supabase = createAdminClient()

  // 1. Charger la session et vérifier l'état
  const { data: session } = await supabase
    .from('sessions')
    .select('id, config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as SessionConfig
  if (config.selection_notifications_sent_at) {
    return { error: `Les notifications ont déjà été envoyées le ${formatDateFr(config.selection_notifications_sent_at as string)}.` }
  }

  // 2. Récupérer les demi-finalistes
  const { data: semifinalists } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name')
    .eq('session_id', sessionId)
    .eq('status', 'semifinalist')

  // 4. Récupérer les non-sélectionnés (approved)
  const { data: rejected } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name')
    .eq('session_id', sessionId)
    .eq('status', 'approved')

  const apiKey = process.env.RESEND_API_KEY
  const isSimulation = !apiKey
  let selectionSent = 0
  let rejectionSent = 0
  const failures: string[] = []
  const report: EmailReport[] = []

  // Emails de sélection
  for (const candidate of (semifinalists || [])) {
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

    if (isSimulation) {
      selectionSent++
      report.push({ email: candidate.email, name: displayName, type: 'selection', status: 'simulated', detail: 'RESEND_API_KEY non configurée — email simulé' })
      continue
    }

    try {
      const { error } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: candidate.email,
        subject: 'Félicitations ! Vous êtes sélectionné(e) pour la demi-finale — ChanteEnScène',
        html: buildSelectionEmailHtml(candidate, config),
      })
      if (error) {
        failures.push(`Sélection — ${candidate.email}: ${error.message}`)
        report.push({ email: candidate.email, name: displayName, type: 'selection', status: 'failed', detail: error.message })
      } else {
        selectionSent++
        report.push({ email: candidate.email, name: displayName, type: 'selection', status: 'sent' })
      }
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      failures.push(`Sélection — ${candidate.email}: ${err}`)
      report.push({ email: candidate.email, name: displayName, type: 'selection', status: 'failed', detail: String(err) })
    }
  }

  // Emails de rejet
  for (const candidate of (rejected || [])) {
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

    if (isSimulation) {
      rejectionSent++
      report.push({ email: candidate.email, name: displayName, type: 'rejection', status: 'simulated', detail: 'RESEND_API_KEY non configurée — email simulé' })
      continue
    }

    try {
      const { error } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: candidate.email,
        subject: 'Merci pour votre participation — ChanteEnScène',
        html: buildRejectionEmailHtml(candidate),
      })
      if (error) {
        failures.push(`Rejet — ${candidate.email}: ${error.message}`)
        report.push({ email: candidate.email, name: displayName, type: 'rejection', status: 'failed', detail: error.message })
      } else {
        rejectionSent++
        report.push({ email: candidate.email, name: displayName, type: 'rejection', status: 'sent' })
      }
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      failures.push(`Rejet — ${candidate.email}: ${err}`)
      report.push({ email: candidate.email, name: displayName, type: 'rejection', status: 'failed', detail: String(err) })
    }
  }

  // Poser le timestamp seulement après envoi réussi (permet de réessayer en cas d'échec)
  const sentAt = new Date().toISOString()
  if (selectionSent > 0 || rejectionSent > 0) {
    await supabase
      .from('sessions')
      .update({ config: { ...config, selection_notifications_sent_at: sentAt } })
      .eq('id', sessionId)
  }

  revalidatePath('/admin/resultats')
  revalidatePath('/admin/candidats')
  return { success: true, selectionSent, rejectionSent, failures, report, sentAt, isSimulation }
}

export async function autoSelectSemifinalists(sessionId: string, overrideJuryWeight?: number) {
  const supabase = createAdminClient()

  // 1. Load session config
  const { data: session } = await supabase
    .from('sessions')
    .select('id, config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as Record<string, unknown>
  const juryWeightPercent = overrideJuryWeight ?? ((config.jury_weight_percent as number) || 60)
  const publicWeightPercent = 100 - juryWeightPercent
  const semifinalistsPerCategory = (config.semifinalists_per_category as number) || 10
  const ageCategories = (config.age_categories as { name: string }[]) || []

  // Check if notifications already sent
  if (config.selection_notifications_sent_at) {
    return { error: 'Les notifications ont déjà été envoyées. La liste ne peut plus être modifiée.' }
  }

  // 2. Load candidates (approved + semifinalist)
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, category, likes_count, status')
    .eq('session_id', sessionId)
    .in('status', ['approved', 'semifinalist'])

  if (!candidates || candidates.length === 0) {
    return { error: 'Aucun candidat à sélectionner.' }
  }

  // 3. Load online jurors count
  const { data: onlineJurors } = await supabase
    .from('jurors')
    .select('id')
    .eq('session_id', sessionId)
    .eq('role', 'online')
    .eq('is_active', true)

  const nbJurors = onlineJurors?.length || 1

  // 4. Load all online jury scores
  const { data: scores } = await supabase
    .from('jury_scores')
    .select('candidate_id, scores')
    .eq('session_id', sessionId)
    .eq('event_type', 'online')

  // 5. Calculate combined score per candidate
  const maxLikes = Math.max(1, ...candidates.map((c) => c.likes_count || 0))

  type ScoredCandidate = {
    id: string
    category: string
    juryScore: number
    publicScore: number
    combinedScore: number
  }

  const scored: ScoredCandidate[] = candidates.map((c) => {
    const candidateScores = (scores || []).filter((s) => s.candidate_id === c.id)
    let oui = 0, peutEtre = 0
    for (const s of candidateScores) {
      const d = (s.scores as Record<string, string>)?.decision
      if (d === 'oui') oui++
      else if (d === 'peut-etre') peutEtre++
    }

    // Jury: (oui×2 + peutEtre×1) / (nbJurors × 2) × 100
    const maxJuryPoints = nbJurors * 2
    const juryScore = maxJuryPoints > 0 ? ((oui * 2 + peutEtre * 1) / maxJuryPoints) * 100 : 0

    // Public: likes normalized
    const publicScore = ((c.likes_count || 0) / maxLikes) * 100

    // Combined
    const combinedScore = juryScore * (juryWeightPercent / 100) + publicScore * (publicWeightPercent / 100)

    return {
      id: c.id,
      category: c.category,
      juryScore: Math.round(juryScore * 10) / 10,
      publicScore: Math.round(publicScore * 10) / 10,
      combinedScore: Math.round(combinedScore * 10) / 10,
    }
  })

  // 6. Select top N per category
  const categories = ageCategories.map((c) => c.name)
  const selectedIds = new Set<string>()

  for (const cat of categories) {
    const catCandidates = scored
      .filter((c) => c.category === cat)
      .sort((a, b) => b.combinedScore - a.combinedScore)

    const topN = catCandidates.slice(0, semifinalistsPerCategory)
    for (const c of topN) {
      selectedIds.add(c.id)
    }
  }

  // Also handle candidates whose category is not in config (edge case)
  const knownCategories = new Set(categories)
  const unknownCatCandidates = scored.filter((c) => !knownCategories.has(c.category))
  if (unknownCatCandidates.length > 0) {
    const sorted = unknownCatCandidates.sort((a, b) => b.combinedScore - a.combinedScore)
    for (const c of sorted.slice(0, semifinalistsPerCategory)) {
      selectedIds.add(c.id)
    }
  }

  // 7. Update statuses
  const toPromote = candidates.filter((c) => selectedIds.has(c.id) && c.status !== 'semifinalist')
  const toDemote = candidates.filter((c) => !selectedIds.has(c.id) && c.status === 'semifinalist')

  for (const c of toPromote) {
    await supabase.from('candidates').update({ status: 'semifinalist' }).eq('id', c.id)
  }
  for (const c of toDemote) {
    await supabase.from('candidates').update({ status: 'approved' }).eq('id', c.id)
  }

  revalidatePath('/admin/resultats')
  revalidatePath('/admin/candidats')

  return {
    success: true,
    selected: selectedIds.size,
    promoted: toPromote.length,
    demoted: toDemote.length,
    perCategory: categories.map((cat) => ({
      category: cat,
      count: scored.filter((c) => c.category === cat && selectedIds.has(c.id)).length,
      target: semifinalistsPerCategory,
    })),
  }
}

export async function saveMp3Url(candidateId: string, mp3Url: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ mp3_url: mp3Url })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/resultats')
  return { success: true }
}
