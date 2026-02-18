'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { requireAdmin } from '@/lib/security'

export async function promoteToSemifinalist(candidateId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('status')
    .eq('id', candidateId)
    .single()

  if (!candidate || candidate.status !== 'approved') {
    return { error: 'Ce candidat ne peut pas être promu (statut: ' + (candidate?.status || 'inconnu') + ')' }
  }

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'semifinalist' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury-en-ligne')
  revalidatePath('/admin/candidats')
  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function demoteFromSemifinalist(candidateId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('status')
    .eq('id', candidateId)
    .single()

  if (!candidate || candidate.status !== 'semifinalist') {
    return { error: 'Ce candidat n\'est pas demi-finaliste.' }
  }

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'approved' })
    .eq('id', candidateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury-en-ligne')
  revalidatePath('/admin/candidats')
  revalidatePath('/admin/demi-finale')
  return { success: true }
}

export async function bulkPromoteCategory(sessionId: string, category: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id')
    .eq('session_id', sessionId)
    .eq('category', category)
    .eq('status', 'approved')

  if (!candidates || candidates.length === 0) {
    return { error: 'Aucun candidat approuvé dans cette catégorie.' }
  }

  const candidateIds = candidates.map((c) => c.id)

  const { data: scores } = await supabase
    .from('jury_scores')
    .select('candidate_id, scores')
    .eq('session_id', sessionId)
    .eq('event_type', 'online')
    .in('candidate_id', candidateIds)

  const favorableIds: string[] = []
  for (const cid of candidateIds) {
    const candidateScores = (scores || []).filter((s) => s.candidate_id === cid)
    if (candidateScores.length === 0) continue
    const ouiCount = candidateScores.filter(
      (s) => (s.scores as Record<string, string> | null)?.decision === 'oui'
    ).length
    if (ouiCount / candidateScores.length > 0.5) {
      favorableIds.push(cid)
    }
  }

  if (favorableIds.length === 0) {
    return { error: 'Aucun candidat avec verdict favorable dans cette catégorie.' }
  }

  const { error } = await supabase
    .from('candidates')
    .update({ status: 'semifinalist' })
    .in('id', favorableIds)

  if (error) return { error: error.message }

  revalidatePath('/admin/jury-en-ligne')
  revalidatePath('/admin/candidats')
  revalidatePath('/admin/demi-finale')
  return { success: true, promoted: favorableIds.length }
}

// ─── MP3 Reminder ───

function buildMp3ReminderEmailHtml(candidate: { id: string; first_name: string; last_name: string; stage_name: string | null }, config: { semifinal_date?: string; semifinal_time?: string }): string {
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chantenscene.fr'
  const uploadLink = `${siteUrl}/upload-mp3/${candidate.id}`
  const date = config.semifinal_date
    ? new Date(config.semifinal_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'bientôt'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b1a; color: #ffffff; padding: 40px 30px; border-radius: 16px;">
      <h1 style="text-align: center; margin-bottom: 8px;">
        <span style="color: #ffffff;">Chant</span><span style="color: #7ec850;">En</span><span style="color: #e91e8c;">Scène</span>
      </h1>
      <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 30px;">Concours de chant à Aubagne</p>

      <h2 style="color: #f5a623; text-align: center;">Rappel : votre playback MP3</h2>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Bonjour ${displayName},
      </p>

      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        Nous n'avons pas encore reçu votre <strong style="color: #e91e8c;">playback MP3</strong> (version instrumentale de votre chanson).
        La demi-finale approche (${date}), et nous avons besoin de ce fichier pour préparer votre passage.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${uploadLink}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #e91e8c, #c4157a); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px;">
          Envoyer mon MP3 maintenant
        </a>
      </div>

      <p style="color: rgba(255,255,255,0.5); line-height: 1.6; font-size: 13px;">
        Si vous avez des difficultés techniques, n'hésitez pas à nous contacter. Nous pouvons aussi nous charger de l'envoi pour vous.
      </p>

      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 30px; text-align: center;">
        À très bientôt !<br/>
        L'équipe ChanteEnScène
      </p>
    </div>
  `
}

export async function sendMp3Reminder(candidateId: string, sessionId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, email, mp3_url, status')
    .eq('id', candidateId)
    .single()

  if (!candidate) return { error: 'Candidat introuvable' }
  if (candidate.status !== 'semifinalist') return { error: 'Ce candidat n\'est pas demi-finaliste.' }
  if (candidate.mp3_url) return { error: 'Ce candidat a déjà envoyé son MP3.' }

  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .single()

  const config = (session?.config || {}) as { semifinal_date?: string; semifinal_time?: string }

  const isSimulation = !process.env.RESEND_API_KEY
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  if (isSimulation) {
    return { success: true, simulated: true, message: `Rappel simulé pour ${displayName} (${candidate.email})` }
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [candidate.email],
      subject: 'Rappel : envoyez votre playback MP3 — ChanteEnScène',
      html: buildMp3ReminderEmailHtml(candidate, config),
    })

    return { success: true, message: `Rappel envoyé à ${displayName} (${candidate.email})` }
  } catch (err) {
    return { error: `Erreur d'envoi: ${err}` }
  }
}

// ─── Admin MP3 Upload ───

export async function adminUploadMp3(candidateId: string, formData: FormData) {
  await requireAdmin()
  const supabase = createAdminClient()

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Aucun fichier sélectionné.' }

  // Validate file
  if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
    return { error: 'Le fichier doit être un MP3.' }
  }

  // Get candidate info for the storage path
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, session_id, slug')
    .eq('id', candidateId)
    .single()

  if (!candidate) return { error: 'Candidat introuvable.' }

  const path = `${candidate.session_id}/${candidate.slug}/mp3`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload via admin client (bypasses RLS)
  const { error: uploadError } = await supabase.storage
    .from('candidates')
    .upload(path, buffer, {
      upsert: true,
      contentType: 'audio/mpeg',
    })

  if (uploadError) return { error: `Upload échoué: ${uploadError.message}` }

  // Get public URL and save
  const { data } = supabase.storage.from('candidates').getPublicUrl(path)
  const mp3Url = data.publicUrl

  const { error: updateError } = await supabase
    .from('candidates')
    .update({ mp3_url: mp3Url })
    .eq('id', candidateId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/jury-en-ligne')
  revalidatePath('/admin/export-mp3')
  return { success: true, mp3Url }
}
