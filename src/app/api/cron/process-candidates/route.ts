export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max (Vercel hobby)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2, getR2PublicUrl } from '@/lib/r2'
import { sendTelegram } from '@/lib/telegram'

/**
 * CRON: Process new CES candidates automatically.
 *
 * Pipeline per candidate:
 * 1. Detect candidates with files still on Supabase Storage (not R2)
 * 2. Download file from Supabase
 * 3. Upload to R2
 * 4. Update URL in candidates table (video_url / photo_url → R2)
 * 5. Delete from Supabase Storage (save bandwidth)
 * 6. Send to VP API (vp.vocalprint.fr) for vocal analysis
 * 7. Wait for analysis → insert into vocal_analyses
 * 8. Notify via Telegram
 *
 * Triggered by IONOS cron every 30 min:
 *   GET https://www.chantenscene.fr/api/cron/process-candidates
 *   Header: Authorization: Bearer {CRON_SECRET}
 */

const SUPABASE_STORAGE_PREFIX = 'https://xarrchsokuhobwqvcnkg.supabase.co/storage/v1/object/public/'
const VP_API_URL = process.env.VP_API_URL || 'https://vp.vocalprint.fr'
// Telegram constants moved to @/lib/telegram

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

// sendTelegram imported from @/lib/telegram

interface ProcessResult {
  candidateId: string
  name: string
  steps: string[]
  r2Migrated: boolean
  vocalAnalyzed: boolean
  error?: string
}

// --- Step 1: Find candidates needing processing ---
async function findCandidatesToProcess(supabase: ReturnType<typeof createAdminClient>) {
  // Get active session
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)
    .limit(1)

  const sessionId = sessions?.[0]?.id
  if (!sessionId) return { sessionId: null, toMigrate: [], toAnalyze: [] }

  // Candidates with Supabase Storage URLs (need R2 migration)
  const { data: allCandidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, slug, photo_url, video_url, session_id')
    .eq('session_id', sessionId)

  const toMigrate = (allCandidates || []).filter(c =>
    (c.video_url?.includes('supabase.co/storage')) ||
    (c.photo_url?.includes('supabase.co/storage'))
  )

  // Candidates with video but no vocal_analyses
  const { data: analyzed } = await supabase
    .from('vocal_analyses')
    .select('candidate_id')
    .eq('session_id', sessionId)

  const analyzedIds = new Set((analyzed || []).map(a => a.candidate_id))

  const toAnalyze = (allCandidates || []).filter(c =>
    c.video_url &&
    !c.video_url.includes('youtube') &&
    !analyzedIds.has(c.id)
  )

  return { sessionId, toMigrate, toAnalyze }
}

// --- Step 2: Migrate a file from Supabase Storage to R2 ---
async function migrateFileToR2(supabaseUrl: string, bucket: string): Promise<string | null> {
  const match = supabaseUrl.match(/\/storage\/v1\/object\/public\/([^?]+)/)
  if (!match) return null

  const storagePath = match[1]
  const key = storagePath.startsWith(`${bucket}/`) ? storagePath : `${bucket}/${storagePath}`

  // Download from Supabase
  const res = await fetch(supabaseUrl)
  if (!res.ok) return null

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'application/octet-stream'

  // Upload to R2
  return await uploadToR2(key, buffer, contentType)
}

// --- Step 3: Delete file from Supabase Storage ---
async function deleteFromSupabase(supabase: ReturnType<typeof createAdminClient>, url: string) {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(\?.*)?$/)
  if (!match) return

  const [, bucket, path] = match
  await supabase.storage.from(bucket).remove([path])
}

// --- Step 4: Send to VP API for vocal analysis ---
// VP API v4.3 : mode=auto (Demucs + analyse), source=ces
// Le mapper traduit la response VP → schema vocal_analyses (CES inchange)
async function analyzeVocals(
  videoUrl: string,
  candidateId: string,
  sessionId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Telecharger l'audio
    const audioRes = await fetch(videoUrl)
    if (!audioRes.ok) return { success: false, error: `Download failed: ${audioRes.status}` }

    const audioBuffer = await audioRes.arrayBuffer()
    const isVideo = videoUrl.includes('.mp4') || videoUrl.includes('.mov') || videoUrl.includes('.webm')

    // Envoyer a VP API
    const formData = new FormData()
    const ext = isVideo ? '.mp4' : '.mp3'
    formData.append('file', new Blob([audioBuffer]), `audio${ext}`)
    formData.append('source', 'ces')
    formData.append('mode', 'auto')
    formData.append('context', JSON.stringify({
      candidate_id: candidateId,
      session_id: sessionId,
    }))

    const submitRes = await fetch(`${VP_API_URL}/api/analyze-voice`, {
      method: 'POST',
      body: formData,
    })

    if (!submitRes.ok) return { success: false, error: `VP submit: ${submitRes.status}` }
    const { job_id } = await submitRes.json()

    // Poll pour le resultat (max 8 min — Demucs + analyse)
    const maxWait = 480_000
    const pollInterval = 10_000
    const start = Date.now()

    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, pollInterval))

      const statusRes = await fetch(`${VP_API_URL}/api/analyze-status/${job_id}`)
      if (!statusRes.ok) continue

      const statusData = await statusRes.json()

      if (statusData.status === 'done') {
        const vp = statusData.result
        if (!vp || !vp.metriques) return { success: false, error: 'VP: response vide' }

        // --- MAPPER VP → vocal_analyses ---
        const m = vp.metriques || {}
        const tess = vp.tessiture || {}
        const raw = vp.raw || {}
        // Les zones sont dans le pitch_stream ou raw_data VP
        const zones = vp.zones || {}

        const { error: insertError } = await supabase
          .from('vocal_analyses')
          .upsert({
            session_id: sessionId,
            candidate_id: candidateId,
            justesse_pct: m.justesse_pct,
            justesse_label: mapJustesseLabel(m.justesse_pct),
            tessiture_low: tess.low_note,
            tessiture_low_midi: tess.low_note ? noteToMidi(tess.low_note) : null,
            tessiture_high: tess.high_note,
            tessiture_high_midi: tess.high_note ? noteToMidi(tess.high_note) : null,
            octaves: tess.octaves,
            voice_type: tess.voice_type,
            stability_pct: m.stability_pct,
            vibrato_count: Math.round((m.vibrato_pct || 0) / 5),
            total_notes: raw.total_notes,
            zone_grave_pct: zones.grave_pct ?? null,
            zone_medium_pct: zones.medium_pct ?? null,
            zone_aigu_pct: zones.aigu_pct ?? null,
            song_key: vp.key,
            song_key_confidence: null,
            song_bpm: vp.bpm,
            demucs_job_id: job_id,
            processing_time_sec: Math.round((Date.now() - start) / 1000),
            pipeline_version: `vp-${vp.analysis_version || 'v4'}`,
            server_used: VP_API_URL,
            raw_data: {
              ...vp,
              metriques_v3: m,
            },
          }, { onConflict: 'session_id,candidate_id' })

        if (insertError) return { success: false, error: `DB insert: ${insertError.message}` }

        return { success: true }

      } else if (statusData.status === 'error') {
        return { success: false, error: statusData.error || 'VP error' }
      }
    }

    return { success: false, error: 'Timeout (>8 min)' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// Mapper helpers
function mapJustesseLabel(pct: number | null): string {
  if (pct == null) return 'N/A'
  if (pct >= 80) return 'Excellent'
  if (pct >= 65) return 'Tres bien'
  if (pct >= 50) return 'Bien'
  return 'A travailler'
}

function noteToMidi(note: string): number | null {
  const match = note.match(/^([A-G])(#|b)?(\d+)$/)
  if (!match) return null
  const [, letter, accidental, octaveStr] = match
  const noteMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const base = noteMap[letter]
  if (base === undefined) return null
  const adj = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return (parseInt(octaveStr) + 1) * 12 + base + adj
}

// --- POST handler : analyse VP manuelle sur un ou plusieurs candidats ---
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const candidateIds: string[] = body?.candidate_ids || (body?.candidate_id ? [body.candidate_id] : [])

  if (candidateIds.length === 0) {
    return NextResponse.json({ error: 'candidate_id ou candidate_ids requis' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Trouver la session active
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('is_active', true)
    .limit(1)
  const sessionId = sessions?.[0]?.id
  if (!sessionId) return NextResponse.json({ error: 'Pas de session active' }, { status: 400 })

  const results = []

  for (const candidateId of candidateIds) {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, video_url')
      .eq('id', candidateId)
      .single()

    if (!candidate?.video_url) {
      results.push({ candidateId, name: '?', error: 'Pas de video' })
      continue
    }

    const name = `${candidate.first_name} ${candidate.last_name}`
    const analysisResult = await analyzeVocals(candidate.video_url, candidateId, sessionId, supabase)

    if (analysisResult.success) {
      const { data: va } = await supabase
        .from('vocal_analyses')
        .select('justesse_pct, voice_type')
        .eq('candidate_id', candidateId)
        .single()

      await sendTelegram(
        `🎤 <b>VP Analyse manuelle</b>\n` +
        `${name} : ${va?.justesse_pct ?? '?'}% | ${va?.voice_type ?? '?'}`
      )
      results.push({ candidateId, name, success: true })
    } else {
      results.push({ candidateId, name, error: analysisResult.error })
    }
  }

  return NextResponse.json({ results })
}

// --- GET handler : cron automatique (R2 migration uniquement, PAS d'analyse VP) ---
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: ProcessResult[] = []
  const startTime = Date.now()

  // Find work to do
  const { sessionId, toMigrate, toAnalyze } = await findCandidatesToProcess(supabase)

  if (!sessionId) {
    return NextResponse.json({ message: 'No active session', processed: 0 })
  }

  if (toMigrate.length === 0 && toAnalyze.length === 0) {
    return NextResponse.json({ message: 'Nothing to process', toMigrate: 0, toAnalyze: 0 })
  }

  // --- Process R2 migrations ---
  for (const candidate of toMigrate) {
    const name = `${candidate.first_name} ${candidate.last_name}`
    const result: ProcessResult = {
      candidateId: candidate.id,
      name,
      steps: [],
      r2Migrated: false,
      vocalAnalyzed: false,
    }

    try {
      // Migrate video
      if (candidate.video_url?.includes('supabase.co/storage')) {
        const r2Url = await migrateFileToR2(candidate.video_url, 'candidates')
        if (r2Url) {
          await supabase.from('candidates').update({ video_url: r2Url }).eq('id', candidate.id)
          await deleteFromSupabase(supabase, candidate.video_url)
          result.steps.push(`video → R2`)
        }
      }

      // Migrate photo
      if (candidate.photo_url?.includes('supabase.co/storage')) {
        const r2Url = await migrateFileToR2(candidate.photo_url, 'candidates')
        if (r2Url) {
          await supabase.from('candidates').update({ photo_url: r2Url }).eq('id', candidate.id)
          await deleteFromSupabase(supabase, candidate.photo_url)
          result.steps.push(`photo → R2`)
        }
      }

      result.r2Migrated = true
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }

    results.push(result)
  }

  // --- Analyse vocale VP : PAS automatique ---
  // L'analyse VP est declenchee manuellement via POST /api/cron/process-candidates?analyze=candidateId
  // Le cron automatique (IONOS) ne fait que la migration R2.
  const analyzedCount = 0

  // --- Summary ---
  const migratedCount = results.filter(r => r.r2Migrated).length
  const vocalCount = results.filter(r => r.vocalAnalyzed).length
  const failedCount = results.filter(r => r.error).length
  const elapsedSec = Math.round((Date.now() - startTime) / 1000)
  const remainingToAnalyze = toAnalyze.length - analyzedCount

  // Notify Telegram
  if (migratedCount > 0 || vocalCount > 0) {
    const lines = [
      `<b>Pipeline CES automatique</b>`,
      ``,
      migratedCount > 0 ? `R2 : ${migratedCount} fichier(s) migre(s)` : '',
      vocalCount > 0 ? `Vocal : ${vocalCount} analyse(s) faite(s)` : '',
      failedCount > 0 ? `Erreurs : ${failedCount}` : '',
      remainingToAnalyze > 0 ? `Restant : ${remainingToAnalyze} a analyser (prochain cron)` : '',
      `Temps : ${elapsedSec}s`,
    ].filter(Boolean).join('\n')

    await sendTelegram(lines)

    // Detail per candidate
    for (const r of results) {
      if (r.vocalAnalyzed) {
        // Fetch score for notification
        const { data: va } = await supabase
          .from('vocal_analyses')
          .select('justesse_pct, justesse_label, voice_type')
          .eq('candidate_id', r.candidateId)
          .single()

        if (va) {
          await sendTelegram(
            `🎤 <b>${r.name}</b>\n` +
            `Justesse : ${va.justesse_pct}% (${va.justesse_label})\n` +
            `Voix : ${va.voice_type}`
          )
        }
      }
    }
  }

  // --- Monitoring: alert if candidates are pending > 2h ---
  try {
    const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: stuckCandidates } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, created_at, status')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .lt('created_at', TWO_HOURS_AGO)

    if (stuckCandidates && stuckCandidates.length > 0) {
      const names = stuckCandidates.map(c => `${c.first_name} ${c.last_name}`).join(', ')
      await sendTelegram(
        `⚠️ <b>Candidats pending &gt; 2h</b>\n` +
        `${stuckCandidates.length} candidat(s) : ${names}\n` +
        `Verifier le pipeline !`
      )
    }
  } catch {
    // Monitoring non-blocking
  }

  return NextResponse.json({
    message: `Processed ${results.length} candidate(s)`,
    session: sessionId,
    r2Migrated: migratedCount,
    vocalAnalyzed: vocalCount,
    failed: failedCount,
    remainingToAnalyze,
    elapsedSec,
    results: results.map(r => ({
      name: r.name,
      steps: r.steps,
      r2: r.r2Migrated,
      vocal: r.vocalAnalyzed,
      error: r.error,
    })),
  })
}
