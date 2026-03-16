/**
 * Migrate ALL candidate videos to Cloudflare R2
 * - 15 videos from Supabase Storage → R2
 * - 6 videos from YouTube → R2 (via yt-dlp)
 * Then update database URLs to point to R2
 *
 * Usage:
 *   node scripts/migrate-all-videos-to-r2.mjs --dry-run   (preview only)
 *   node scripts/migrate-all-videos-to-r2.mjs              (actually migrate)
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// R2 credentials
const R2_ACCOUNT_ID = 'b30f306e38bc10d8175cdc3d59a7d461';
const R2_ACCESS_KEY = 'fcdc16492fc215d9367d8f8bddcd62f9';
const R2_SECRET_KEY = 'aa01693eb94ddea383f2a07c3425dec9655b33e4fa44abe5e64d17291e1b9b3f';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = 'chantenscene-assets';
const R2_PUBLIC = 'https://pub-37ec13efdccb46f2bfdd62ab95fbd4d0.r2.dev';

// Supabase (service role key for DB operations)
const SUPABASE_URL = 'https://xarrchsokuhobwqvcnkg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcnJjaHNva3Vob2J3cXZjbmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI0NzQ2NSwiZXhwIjoyMDg2ODIzNDY1fQ.F2IFnRh55GE8IkeD6D572nFgbpPGBoaIxSY5oPR3Poo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const tmpDir = path.join(import.meta.dirname, '_video_tmp');
const dryRun = process.argv.includes('--dry-run');

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function existsOnR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function uploadFileToR2(localPath, r2Key, contentType = 'video/mp4') {
  const buf = fs.readFileSync(localPath);
  console.log(`  ⬆️  Upload R2: ${r2Key} (${(buf.length / 1024 / 1024).toFixed(1)} MB)...`);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: r2Key, Body: buf,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC}/${r2Key}`;
}

async function downloadFromSupabase(url, outputPath) {
  console.log(`  ⬇️  Downloading from Supabase...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  console.log(`  ✅ Downloaded: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return buf.length;
}

async function downloadFromYouTube(ytId, outputPath) {
  console.log(`  ⬇️  Downloading from YouTube (${ytId})...`);
  const cmd = `yt-dlp -f "best[ext=mp4]/best" --no-playlist -o "${outputPath}" "https://www.youtube.com/watch?v=${ytId}"`;
  execSync(cmd, { stdio: 'pipe', timeout: 180000 });
  const stats = fs.statSync(outputPath);
  console.log(`  ✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  return stats.size;
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  console.log('=== MIGRATION VIDÉOS → R2 ===');
  if (dryRun) console.log('🔍 DRY RUN — aucun téléchargement/upload\n');

  // 1. Get all candidates with video_url
  const { data: candidates, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, slug, video_url, photo_url')
    .not('video_url', 'is', null)
    .neq('video_url', '')
    .order('last_name');
  if (fetchErr) throw new Error(`DB fetch failed: ${fetchErr.message}`);
  console.log(`${candidates.length} candidats avec vidéo\n`);

  const results = [];
  let success = 0;
  let skipped = 0;

  for (const c of candidates) {
    const name = `${c.first_name} ${c.last_name}`;
    const ytId = getYouTubeId(c.video_url);
    const source = ytId ? 'YouTube' : 'Supabase';
    const r2Key = `candidates/${c.slug}/video`;
    const r2Url = `${R2_PUBLIC}/${r2Key}`;

    console.log(`[${name}] ${source} → R2: ${r2Key}`);

    // Already on R2?
    if (c.video_url.includes('r2.dev')) {
      console.log(`  ⏭️  Déjà sur R2\n`);
      skipped++;
      results.push({ name, slug: c.slug, source, status: 'already-r2' });
      continue;
    }

    if (dryRun) {
      results.push({ name, slug: c.slug, source, r2Key, status: 'dry-run' });
      console.log(`  [DRY RUN] serait migré vers ${r2Url}\n`);
      continue;
    }

    // Check if already uploaded to R2
    if (await existsOnR2(r2Key)) {
      console.log(`  ⏭️  Existe déjà sur R2, mise à jour URL en base...`);
      await supabase.from('candidates').update({ video_url: r2Url }).eq('id', c.id);
      console.log(`  ✅ URL mise à jour\n`);
      success++;
      results.push({ name, slug: c.slug, source, r2Key, status: 'exists-updated-url' });
      continue;
    }

    const tmpFile = path.join(tmpDir, `${c.slug}.mp4`);

    try {
      if (ytId) {
        await downloadFromYouTube(ytId, tmpFile);
      } else {
        await downloadFromSupabase(c.video_url, tmpFile);
      }

      const publicUrl = await uploadFileToR2(tmpFile, r2Key);

      // Verify
      if (!(await existsOnR2(r2Key))) throw new Error('Vérification R2 échouée');

      // Update database
      await supabase.from('candidates').update({ video_url: publicUrl }).eq('id', c.id);
      console.log(`  ✅ URL mise à jour en base`);

      // Cleanup temp
      fs.unlinkSync(tmpFile);

      success++;
      results.push({ name, slug: c.slug, source, r2Key, r2Url: publicUrl, status: 'success' });
      console.log(`  🎉 ${name} migré !\n`);
    } catch (err) {
      console.error(`  ❌ ERREUR: ${err.message}\n`);
      results.push({ name, slug: c.slug, source, r2Key, status: 'failed', error: err.message });
    }
  }

  // Summary
  console.log('\n=== RÉSUMÉ ===');
  console.log(`Total: ${candidates.length}`);
  console.log(`Succès: ${success}`);
  console.log(`Déjà R2: ${skipped}`);
  console.log(`Échecs: ${results.filter(r => r.status === 'failed').length}`);

  // Save log
  const logFile = path.join(import.meta.dirname, 'video-migration-log.json');
  fs.writeFileSync(logFile, JSON.stringify({ migratedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nLog: ${logFile}`);

  // Cleanup tmp dir
  try { fs.rmdirSync(tmpDir); } catch {}
}

main().catch(console.error);
