export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max (Vercel hobby)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2, getR2PublicUrl } from '@/lib/r2'

/**
 * CRON: Process new CES candidates automatically.
 *
 * Pipeline per candidate:
 * 1. Detect candidates with files still on Supabase Storage (not R2)
 * 2. Download file from Supabase
 * 3. Upload to R2
 * 4. Update URL in candidates table (video_url / photo_url → R2)
 * 5. Delete from Supabase Storage (save bandwidth)
 * 6. Send to Demucs (PCmusique GPU) for vocal analysis
 * 7. Wait for analysis → insert into vocal_analyses
 * 8. Notify via Telegram
 *
 * Triggered by IONOS cron every 30 min:
 *   GET https://www.chantenscene.fr/api/cron/process-candidates
 *   Header: Authorization: Bearer {CRON_SECRET}
 */

const SUPABASE_STORAGE_PREFIX = 'https://xarrchsokuhobwqvcnkg.supabase.co/storage/v1/object/public/'
const DEMUCS_URL = process.env.DEMUCS_URL || 'http://100.122.159.69:8642' // PCmusique via Tailscale
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8745661004:AAGJffmkzEK6GfI0wfgVj0K8XboyWDpiCRY'
const TELEGRAM_CHAT_ID = '8064044229'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

async function sendTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    })
  } catch { /* ignore */ }
}

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

// --- Step 4: Send to Demucs for vocal analysis ---
async function analyzeVocals(
  videoUrl: string,
  candidateId: string,
  sessionId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Download the audio file
    const audioRes = await fetch(videoUrl)
    if (!audioRes.ok) return { success: false, error: `Download failed: ${audioRes.status}` }

    const audioBuffer = await audioRes.arrayBuffer()
    const isVideo = videoUrl.includes('.mp4') || videoUrl.includes('.mov') || videoUrl.includes('.webm')

    // Send to Demucs
    const formData = new FormData()
    const ext = isVideo ? '.mp4' : '.mp3'
    formData.append('file', new Blob([audioBuffer]), `audio${ext}`)

    const submitRes = await fetch(`${DEMUCS_URL}/separate?two_stems=vocals`, {
      method: 'POST',
      body: formData,
    })

    if (!submitRes.ok) return { success: false, error: `Demucs submit: ${submitRes.status}` }
    const { job_id } = await submitRes.json()

    // Poll for completion (max 10 min)
    const maxWait = 600_000
    const pollInterval = 10_000
    const start = Date.now()

    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, pollInterval))

      const statusRes = await fetch(`${DEMUCS_URL}/status/${job_id}`)
      if (!statusRes.ok) continue

      const statusData = await statusRes.json()

      if (statusData.status === 'done') {
        // Get analysis
        const analyzeRes = await fetch(`${DEMUCS_URL}/analyze/${job_id}`)
        if (!analyzeRes.ok) return { success: false, error: `Analyze failed: ${analyzeRes.status}` }

        const analysis = await analyzeRes.json()
        if (analysis.error) return { success: false, error: analysis.error }

        const tessiture = analysis.tessiture || {}
        const zones = analysis.zones || {}

        // Insert into vocal_analyses
        const { error: insertError } = await supabase
          .from('vocal_analyses')
          .upsert({
            session_id: sessionId,
            candidate_id: candidateId,
            justesse_pct: analysis.justesse_pct,
            justesse_label: analysis.justesse_label || 'N/A',
            tessiture_low: tessiture.low_note,
            tessiture_low_midi: tessiture.low_midi,
            tessiture_high: tessiture.high_note,
            tessiture_high_midi: tessiture.high_midi,
            octaves: tessiture.octaves,
            voice_type: analysis.voice_type,
            stability_pct: analysis.stability_pct,
            vibrato_count: analysis.vibrato_count,
            total_notes: analysis.total_notes,
            zone_grave_pct: zones.grave_pct,
            zone_medium_pct: zones.medium_pct,
            zone_aigu_pct: zones.aigu_pct,
            song_key: analysis.key,
            song_key_confidence: analysis.key_confidence,
            song_bpm: analysis.bpm,
            demucs_job_id: job_id,
            processing_time_sec: Math.round((Date.now() - start) / 1000),
            pipeline_version: 'v2-cron',
            server_used: DEMUCS_URL,
            raw_data: analysis,
          }, { onConflict: 'session_id,candidate_id' })

        if (insertError) return { success: false, error: `DB insert: ${insertError.message}` }

        // Cleanup Demucs job
        try { await fetch(`${DEMUCS_URL}/cleanup/${job_id}`, { method: 'DELETE' }) } catch { /* ok */ }

        return { success: true }

      } else if (statusData.status === 'error') {
        return { success: false, error: statusData.error || 'Demucs error' }
      }
    }

    return { success: false, error: 'Timeout (>10 min)' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// --- Main handler ---
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

  // --- Process vocal analyses (limit to 3 per run to stay within Vercel timeout) ---
  const MAX_ANALYSES_PER_RUN = 3
  let analyzedCount = 0

  for (const candidate of toAnalyze) {
    if (analyzedCount >= MAX_ANALYSES_PER_RUN) break
    // Skip if already in results from migration step
    const existing = results.find(r => r.candidateId === candidate.id)

    const name = `${candidate.first_name} ${candidate.last_name}`
    const result: ProcessResult = existing || {
      candidateId: candidate.id,
      name,
      steps: [],
      r2Migrated: false,
      vocalAnalyzed: false,
    }

    // Check remaining time (leave 30s buffer for response)
    const elapsed = Date.now() - startTime
    if (elapsed > 240_000) { // 4 min — stop to avoid Vercel timeout
      result.steps.push('SKIP: timeout approaching')
      if (!existing) results.push(result)
      break
    }

    try {
      // Re-fetch candidate to get latest URL (might have been migrated above)
      const { data: fresh } = await supabase
        .from('candidates')
        .select('video_url')
        .eq('id', candidate.id)
        .single()

      const videoUrl = fresh?.video_url || candidate.video_url
      if (!videoUrl) {
        result.steps.push('SKIP: no video URL')
        if (!existing) results.push(result)
        continue
      }

      result.steps.push('Demucs → analyzing...')
      const analysisResult = await analyzeVocals(videoUrl, candidate.id, sessionId, supabase)

      if (analysisResult.success) {
        result.vocalAnalyzed = true
        result.steps.push('vocal analysis OK')
        analyzedCount++
      } else {
        result.steps.push(`analysis FAILED: ${analysisResult.error}`)
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }

    if (!existing) results.push(result)
  }

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
