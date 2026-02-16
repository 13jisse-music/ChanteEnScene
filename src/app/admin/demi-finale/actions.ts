'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotifications } from '@/lib/push'
import { getResend, FROM_EMAIL } from '@/lib/resend'

// ─── Huis-clos semifinal actions ───

export async function checkinCandidate(eventId: string, candidateId: string) {
  const supabase = createAdminClient()

  // Check if already checked in
  const { data: existing } = await supabase
    .from('lineup')
    .select('id')
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existing) return { error: 'Ce candidat est déjà enregistré.' }

  const { error } = await supabase.from('lineup').insert({
    live_event_id: eventId,
    candidate_id: candidateId,
    position: 0,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function callToStage(eventId: string, candidateId: string) {
  const supabase = createAdminClient()

  // Update lineup status + set start time, reset timing fields
  const { error: lineupError } = await supabase
    .from('lineup')
    .update({
      status: 'performing',
      started_at: new Date().toISOString(),
      ended_at: null,
      vote_opened_at: null,
      vote_closed_at: null,
    })
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)

  if (lineupError) return { error: lineupError.message }

  // Set as current candidate on the event + auto-resume to live (triggers realtime push to jurors)
  const { error: eventError } = await supabase
    .from('live_events')
    .update({ current_candidate_id: candidateId, status: 'live' })
    .eq('id', eventId)

  if (eventError) return { error: eventError.message }

  // Push notification to jury (fire-and-forget, huis clos)
  const { data: evtPush } = await supabase
    .from('live_events')
    .select('session_id')
    .eq('id', eventId)
    .single()
  const { data: candPush } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name')
    .eq('id', candidateId)
    .single()

  if (evtPush && candPush) {
    const name = candPush.stage_name || `${candPush.first_name} ${candPush.last_name}`
    sendPushNotifications({
      sessionId: evtPush.session_id,
      role: 'jury',
      payload: {
        title: `${name} monte sur scène !`,
        body: 'Préparez-vous à noter.',
        tag: 'on-stage',
      },
    }).catch(() => {})
  }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function openVoting(eventId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Find performing candidate
  const { data: item } = await supabase
    .from('lineup')
    .select('id')
    .eq('live_event_id', eventId)
    .eq('status', 'performing')
    .maybeSingle()

  if (!item) return { error: 'Aucun candidat sur scène.' }

  // Set ended_at (performance over) and vote_opened_at (vote starts)
  const { error } = await supabase
    .from('lineup')
    .update({ ended_at: now, vote_opened_at: now })
    .eq('id', item.id)

  if (error) return { error: error.message }

  // Push notification to jury (fire-and-forget)
  const { data: evtPushVote } = await supabase
    .from('live_events')
    .select('session_id, current_candidate_id')
    .eq('id', eventId)
    .single()

  if (evtPushVote) {
    let candidateName = ''
    if (evtPushVote.current_candidate_id) {
      const { data: c } = await supabase
        .from('candidates')
        .select('first_name, last_name, stage_name')
        .eq('id', evtPushVote.current_candidate_id)
        .single()
      if (c) candidateName = c.stage_name || `${c.first_name} ${c.last_name}`
    }
    sendPushNotifications({
      sessionId: evtPushVote.session_id,
      role: 'jury',
      payload: {
        title: "C'est à vous de noter !",
        body: candidateName
          ? `${candidateName} a terminé sa prestation. Notez maintenant !`
          : 'Le candidat a terminé. Notez maintenant !',
        tag: 'jury-score',
      },
    }).catch(() => {})
  }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function finishPerformance(eventId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Find the currently performing candidate in the lineup (source of truth)
  const { data: performingItem } = await supabase
    .from('lineup')
    .select('id, candidate_id, ended_at')
    .eq('live_event_id', eventId)
    .eq('status', 'performing')
    .maybeSingle()

  if (!performingItem) return { error: 'Aucun candidat sur scène.' }

  // Mark as completed with timestamps
  await supabase
    .from('lineup')
    .update({
      status: 'completed',
      ended_at: performingItem.ended_at || now,
      vote_closed_at: now,
    })
    .eq('id', performingItem.id)

  // Clear current candidate
  await supabase
    .from('live_events')
    .update({ current_candidate_id: null })
    .eq('id', eventId)

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function replayCandidate(eventId: string, candidateId: string) {
  const supabase = createAdminClient()

  // Set status back to performing with fresh start time
  await supabase
    .from('lineup')
    .update({
      status: 'performing',
      started_at: new Date().toISOString(),
      ended_at: null,
      vote_opened_at: null,
      vote_closed_at: null,
    })
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)

  // Set as current candidate
  await supabase
    .from('live_events')
    .update({ current_candidate_id: candidateId })
    .eq('id', eventId)

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function markAbsent(eventId: string, candidateId: string) {
  const supabase = createAdminClient()

  // Mark as absent
  await supabase
    .from('lineup')
    .update({ status: 'absent' })
    .eq('live_event_id', eventId)
    .eq('candidate_id', candidateId)

  // If this was the current performer, clear
  const { data: event } = await supabase
    .from('live_events')
    .select('current_candidate_id')
    .eq('id', eventId)
    .single()

  if (event?.current_candidate_id === candidateId) {
    await supabase
      .from('live_events')
      .update({ current_candidate_id: null })
      .eq('id', eventId)
  }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function updateSemifinaleStatus(eventId: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ status })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function getJuryScoreCount(sessionId: string, candidateId: string, eventType: string) {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('jury_scores')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('candidate_id', candidateId)
    .eq('event_type', eventType)
  return { count: count || 0 }
}

export async function resetJuryScores(sessionId: string, candidateId: string, eventType: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('jury_scores')
    .delete()
    .eq('session_id', sessionId)
    .eq('candidate_id', candidateId)
    .eq('event_type', eventType)

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

// ─── Post-semifinal: Finalist selection ───

export async function promoteToFinalist(candidateId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'finalist' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  revalidatePath('/admin/resultats')
  return { success: true }
}

export async function removeFromFinalist(candidateId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'semifinalist' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  revalidatePath('/admin/resultats')
  return { success: true }
}

interface SessionConfig {
  final_date?: string
  final_location?: string
  finalists_per_category?: number
  finale_notifications_sent_at?: string | null
  [key: string]: unknown
}

function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface EmailCandidate {
  id: string
  first_name: string
  last_name: string
  email: string
  stage_name: string | null
  slug: string
}

function buildFinaleEmailHtml(candidate: EmailCandidate, config: SessionConfig, sessionSlug: string): string {
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chanteenscene.fr'
  const profileLink = `${siteUrl}/${sessionSlug}/mon-profil?token=${candidate.slug}`
  const date = config.final_date ? formatDateFr(config.final_date) : 'Date a confirmer'
  const location = config.final_location || 'Lieu a confirmer'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b1a; color: #ffffff; padding: 40px 30px; border-radius: 16px;">
      <h1 style="text-align: center; margin-bottom: 8px;">
        <span style="color: #ffffff;">Chant</span><span style="color: #7ec850;">En</span><span style="color: #e91e8c;">Scene</span>
      </h1>
      <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 30px;">Concours de chant</p>

      <h2 style="color: #f5a623; text-align: center;">Felicitations ${displayName} !</h2>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous avons le plaisir de vous annoncer que vous avez ete <strong style="color: #f5a623;">selectionne(e) pour la grande FINALE</strong> de ChanteEnScene !
      </p>

      <div style="background: rgba(245, 166, 35, 0.1); border: 1px solid rgba(245, 166, 35, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #f5a623; font-weight: bold; margin: 0 0 12px; text-align: center;">Informations Finale</p>
        <table style="width: 100%; color: rgba(255,255,255,0.7); font-size: 14px;">
          <tr>
            <td style="padding: 4px 8px; color: rgba(255,255,255,0.4);">Date</td>
            <td style="padding: 4px 8px; font-weight: bold;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: rgba(255,255,255,0.4);">Lieu</td>
            <td style="padding: 4px 8px; font-weight: bold;">${location}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(233, 30, 140, 0.1); border: 1px solid rgba(233, 30, 140, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #e91e8c; font-weight: bold; margin: 0 0 8px; text-align: center;">A preparer</p>
        <ul style="color: rgba(255,255,255,0.7); line-height: 1.8; padding-left: 20px; margin: 0;">
          <li><strong style="color: #e91e8c;">Choisissez vos morceaux</strong> pour la finale et transmettez-les aux musiciens. Les details vous seront communiques par email ou par telephone.</li>
          <li>Une <strong style="color: #e91e8c;">repetition</strong> pourra etre organisee. La date et l'heure vous seront communiquees prochainement par email ou par telephone.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${profileLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #e91e8c, #c4157a); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 14px;">
          Acceder a mon espace candidat
        </a>
      </div>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous avons hate de vous retrouver sur scene pour la grande finale ! Preparez-vous bien et n'hesitez pas a nous contacter si vous avez des questions.
      </p>

      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 30px; text-align: center;">
        A tres bientot sur scene !<br/>
        L'equipe ChanteEnScene
      </p>
    </div>
  `
}

function buildFinaleRejectionEmailHtml(candidate: EmailCandidate): string {
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b1a; color: #ffffff; padding: 40px 30px; border-radius: 16px;">
      <h1 style="text-align: center; margin-bottom: 8px;">
        <span style="color: #ffffff;">Chant</span><span style="color: #7ec850;">En</span><span style="color: #e91e8c;">Scene</span>
      </h1>
      <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 30px;">Concours de chant</p>

      <h2 style="color: #7ec850; text-align: center;">Bravo ${displayName} !</h2>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous tenons a vous feliciter chaleureusement pour votre <strong style="color: #7ec850;">superbe parcours en demi-finale</strong> de ChanteEnScene ! Monter sur scene et chanter devant un jury demande du courage et du talent, et vous l'avez fait avec brio.
      </p>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Le nombre de places en finale etant limite, nous ne pouvons malheureusement pas retenir tous les talents cette fois-ci. Mais sachez que votre prestation a ete remarquee et appreciee par le jury.
      </p>

      <div style="background: rgba(126, 200, 80, 0.1); border: 1px solid rgba(126, 200, 80, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #7ec850; font-weight: bold; margin: 0 0 8px;">Votre aventure ne s'arrete pas la !</p>
        <p style="color: rgba(255,255,255,0.6); margin: 0; line-height: 1.6;">
          Vous serez <strong style="color: #7ec850;">automatiquement prevenu(e)</strong> lors de l'ouverture de la prochaine saison de ChanteEnScene. Continuez a chanter et a cultiver votre passion — nous esperons vous retrouver bientot !
        </p>
      </div>

      <div style="background: rgba(233, 30, 140, 0.1); border: 1px solid rgba(233, 30, 140, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #e91e8c; font-weight: bold; margin: 0;">Restez connecte(e) !</p>
        <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0;">
          Suivez-nous sur nos reseaux sociaux pour etre informe(e) de nos prochains evenements et soutenir les finalistes le jour de la finale !
        </p>
      </div>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Encore bravo pour votre parcours. Vous faites partie de l'aventure ChanteEnScene et c'est une fierte pour nous de vous avoir accompagne(e) jusqu'ici.
      </p>

      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 30px; text-align: center;">
        A tres bientot !<br/>
        L'equipe ChanteEnScene
      </p>
    </div>
  `
}

export async function getFinaleEmailPreviews(sessionId: string) {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('config, slug')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as SessionConfig

  const { data: sample } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name, slug')
    .eq('session_id', sessionId)
    .eq('status', 'finalist')
    .limit(1)
    .maybeSingle()

  const previewCandidate: EmailCandidate = sample || {
    id: 'preview',
    first_name: 'Prenom',
    last_name: 'Nom',
    email: '',
    stage_name: null,
    slug: 'prenom-nom',
  }

  const { data: rejSample } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name, slug')
    .eq('session_id', sessionId)
    .eq('status', 'semifinalist')
    .limit(1)
    .maybeSingle()

  const rejectionPreviewCandidate: EmailCandidate = rejSample || previewCandidate

  const wrapHtml = (body: string) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0d0b1a;">${body}</body></html>`

  return {
    finaleHtml: wrapHtml(buildFinaleEmailHtml(previewCandidate, config, session.slug)),
    rejectionHtml: wrapHtml(buildFinaleRejectionEmailHtml(rejectionPreviewCandidate)),
  }
}

export async function resetFinaleNotifications(sessionId: string) {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, config')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as SessionConfig
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { finale_notifications_sent_at, ...rest } = config
  await supabase
    .from('sessions')
    .update({ config: { ...rest, finale_notifications_sent_at: null } })
    .eq('id', sessionId)

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function reopenSemifinal(eventId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('live_events')
    .update({ status: 'paused' })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function sendFinaleNotifications(sessionId: string) {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, config, slug')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session introuvable' }

  const config = (session.config || {}) as SessionConfig
  if (config.finale_notifications_sent_at) {
    return { error: `Les notifications finale ont deja ete envoyees.` }
  }

  // Lock immediately
  const sentAt = new Date().toISOString()
  await supabase
    .from('sessions')
    .update({ config: { ...config, finale_notifications_sent_at: sentAt } })
    .eq('id', sessionId)

  // Get finalists
  const { data: finalists } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name, slug')
    .eq('session_id', sessionId)
    .eq('status', 'finalist')

  // Get non-selected semifinalists
  const { data: nonSelected } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, stage_name, slug')
    .eq('session_id', sessionId)
    .eq('status', 'semifinalist')

  const isSimulation = !process.env.RESEND_API_KEY
  let finalistsSent = 0
  let rejectionSent = 0
  const failures: string[] = []
  const report: { email: string; name: string; type: 'finale' | 'non-selection'; status: 'sent' | 'simulated' | 'failed'; detail?: string }[] = []

  // Send finalist emails
  for (const candidate of (finalists || [])) {
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

    if (isSimulation) {
      finalistsSent++
      report.push({ email: candidate.email, name: displayName, type: 'finale', status: 'simulated', detail: 'RESEND_API_KEY non configuree' })
      continue
    }

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: [candidate.email],
        subject: 'Félicitations ! Vous êtes finaliste — ChanteEnScène',
        html: buildFinaleEmailHtml(candidate, config, session.slug),
      })
      finalistsSent++
      report.push({ email: candidate.email, name: displayName, type: 'finale', status: 'sent' })
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      failures.push(`Finale — ${candidate.email}: ${errMsg}`)
      report.push({ email: candidate.email, name: displayName, type: 'finale', status: 'failed', detail: errMsg })
    }
  }

  // Send rejection emails
  for (const candidate of (nonSelected || [])) {
    const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

    if (isSimulation) {
      rejectionSent++
      report.push({ email: candidate.email, name: displayName, type: 'non-selection', status: 'simulated', detail: 'RESEND_API_KEY non configuree' })
      continue
    }

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: [candidate.email],
        subject: 'Bravo pour votre parcours — ChanteEnScène',
        html: buildFinaleRejectionEmailHtml(candidate),
      })
      rejectionSent++
      report.push({ email: candidate.email, name: displayName, type: 'non-selection', status: 'sent' })
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      failures.push(`Non-selection — ${candidate.email}: ${errMsg}`)
      report.push({ email: candidate.email, name: displayName, type: 'non-selection', status: 'failed', detail: errMsg })
    }
  }

  revalidatePath('/admin/demi-finale')
  return { success: true, finalistsSent, rejectionSent, failures, report, sentAt, isSimulation }
}
