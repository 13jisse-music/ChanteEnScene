#!/usr/bin/env node
/**
 * youtube-upload.js — Upload vidéos candidats sur YouTube (unlisted)
 *
 * Usage:
 *   node scripts/youtube-upload.js video.mp4 "Titre de la vidéo"
 *   node scripts/youtube-upload.js --migrate                          # migrer toutes les vidéos Supabase → YouTube
 *   node scripts/youtube-upload.js --migrate --brand                  # + branding logo avant upload
 *   node scripts/youtube-upload.js --cleanup                          # supprimer de Supabase les vidéos DÉJÀ migrées
 *   node scripts/youtube-upload.js --dry-run --migrate                # prévisualisation sans rien toucher
 *
 * SÉCURITÉ :
 *   - Fichier migration-log.json sauvegarde CHAQUE migration (ancien URL → YouTube ID)
 *   - --cleanup est SÉPARÉ de --migrate : on supprime Supabase SEULEMENT après vérification
 *   - --cleanup vérifie que chaque vidéo YouTube existe AVANT de supprimer de Supabase
 *   - --dry-run montre ce qui serait fait sans rien exécuter
 *
 * Prérequis:
 *   1. npm install googleapis
 *   2. node scripts/youtube-auth.js (une seule fois)
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { execSync } = require('child_process');

const CLIENT_SECRET_PATH = path.join(__dirname, 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, 'youtube-token.json');
const MIGRATION_LOG_PATH = path.join(__dirname, 'migration-log.json');
const SUPABASE_URL = 'https://xarrchsokuhobwqvcnkg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcnJjaHNva3Vob2J3cXZjbmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI0NzQ2NSwiZXhwIjoyMDg2ODIzNDY1fQ.F2IFnRh55GE8IkeD6D572nFgbpPGBoaIxSY5oPR3Poo';

const DEFAULT_DESCRIPTION = `🎤 Prestation chantenscene — Concours de chant Aubagne 2026

chantenscene révèle les voix de demain ! Découvrez les talents de notre concours.

🌐 www.chantenscene.fr
📍 Aubagne — Sud de la France

#chantenscene #concoursdechant #aubagne #chant #musique`;

// Parse arguments
const args = process.argv.slice(2);
let inputPath, title, privacy = 'unlisted', description = DEFAULT_DESCRIPTION;
let batchDir, batchPrefix, doMigrate = false, doBrand = false, doCleanup = false, dryRun = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--privacy': privacy = args[++i]; break;
    case '--description': description = args[++i]; break;
    case '--all': batchDir = args[++i]; batchPrefix = args[++i] || ''; break;
    case '--migrate': doMigrate = true; break;
    case '--brand': doBrand = true; break;
    case '--cleanup': doCleanup = true; break;
    case '--dry-run': dryRun = true; break;
    default:
      if (!inputPath) inputPath = args[i];
      else if (!title) title = args[i];
  }
}

// ===== MIGRATION LOG (protection anti-perte) =====
function loadMigrationLog() {
  if (fs.existsSync(MIGRATION_LOG_PATH)) {
    return JSON.parse(fs.readFileSync(MIGRATION_LOG_PATH, 'utf8'));
  }
  return { migrations: [], lastRun: null };
}

function saveMigrationLog(log) {
  log.lastRun = new Date().toISOString();
  fs.writeFileSync(MIGRATION_LOG_PATH, JSON.stringify(log, null, 2));
}

function logMigration(log, candidateId, name, oldUrl, youtubeId) {
  log.migrations.push({
    candidateId,
    name,
    oldSupabaseUrl: oldUrl,
    youtubeId,
    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    migratedAt: new Date().toISOString(),
    supabaseDeleted: false,
  });
  saveMigrationLog(log);
}

// ===== AUTH =====
async function getAuthClient() {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error('❌ client_secret.json introuvable. Lance: node scripts/youtube-auth.js');
    process.exit(1);
  }
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error('❌ youtube-token.json introuvable. Lance: node scripts/youtube-auth.js');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const { client_id, client_secret } = creds.installed || creds.web || {};
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3333');
  oauth2.setCredentials(tokens);

  // Auto-refresh if expired
  if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
    console.log('🔄 Rafraîchissement du token...');
    const { credentials } = await oauth2.refreshAccessToken();
    const updated = { ...tokens, ...credentials };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
    oauth2.setCredentials(updated);
  }

  return oauth2;
}

// ===== UPLOAD =====
async function uploadVideo(auth, filePath, videoTitle, videoDescription, privacyStatus) {
  const youtube = google.youtube({ version: 'v3', auth });
  const fileSize = fs.statSync(filePath).size;
  const sizeMB = (fileSize / 1024 / 1024).toFixed(1);

  console.log(`\n📤 Upload: ${path.basename(filePath)} (${sizeMB} Mo)`);
  console.log(`   Titre: ${videoTitle}`);
  console.log(`   Visibilité: ${privacyStatus}`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: videoTitle,
        description: videoDescription,
        tags: ['chantenscene', 'concours de chant', 'aubagne', 'chant', 'musique', 'talent'],
        categoryId: '10', // Music
        defaultLanguage: 'fr',
      },
      status: {
        privacyStatus,
        embeddable: true,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  }, {
    onUploadProgress: (evt) => {
      const pct = Math.round((evt.bytesRead / fileSize) * 100);
      process.stdout.write(`\r   Progress: ${pct}% (${(evt.bytesRead / 1024 / 1024).toFixed(1)}/${sizeMB} Mo)`);
    },
  });

  const videoId = res.data.id;
  console.log(`\n   ✅ Upload OK !`);
  console.log(`   🔗 https://www.youtube.com/watch?v=${videoId}`);
  console.log(`   📺 Embed: https://www.youtube.com/embed/${videoId}`);

  return videoId;
}

// ===== VERIFY YOUTUBE VIDEO EXISTS =====
async function verifyYoutubeVideo(auth, videoId) {
  const youtube = google.youtube({ version: 'v3', auth });
  try {
    const res = await youtube.videos.list({ part: ['status'], id: [videoId] });
    if (res.data.items && res.data.items.length > 0) {
      const status = res.data.items[0].status.uploadStatus;
      return status === 'processed' || status === 'uploaded';
    }
    return false;
  } catch {
    return false;
  }
}

// ===== DOWNLOAD =====
async function downloadFile(url, destPath) {
  console.log(`   📥 Téléchargement depuis Supabase...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`   📥 OK (${sizeMB} Mo)`);
  return destPath;
}

// ===== MIGRATE (upload vers YouTube, PAS de suppression) =====
async function migrateAll(auth) {
  const migrationLog = loadMigrationLog();
  const alreadyMigrated = new Set(migrationLog.migrations.map(m => m.candidateId));

  // 1. Get all candidates with Supabase video URLs
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/candidates?video_url=not.is.null&select=id,first_name,last_name,stage_name,song_title,song_artist,video_url,slug`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const candidates = await res.json();
  const supabaseCandidates = candidates.filter(c =>
    c.video_url?.includes('supabase') && !alreadyMigrated.has(c.id)
  );

  if (supabaseCandidates.length === 0) {
    console.log('\n✅ Toutes les vidéos sont déjà migrées !');
    console.log(`   ${migrationLog.migrations.length} vidéos dans le log.`);
    return;
  }

  console.log(`\n🔄 Migration: ${supabaseCandidates.length} vidéos Supabase → YouTube`);
  console.log(`   Déjà migrées: ${alreadyMigrated.size}`);
  console.log(`   Quota YouTube: 6 uploads/jour`);
  console.log(`   Estimation: ${Math.ceil(supabaseCandidates.length / 6)} jours\n`);

  if (dryRun) {
    console.log('🔍 MODE DRY-RUN — rien ne sera modifié\n');
    supabaseCandidates.forEach(c => {
      const name = c.stage_name || `${c.first_name} ${c.last_name}`;
      console.log(`   📋 ${name} — ${c.video_url.substring(0, 60)}...`);
    });
    console.log(`\n   Total: ${supabaseCandidates.length} vidéos à migrer`);
    return;
  }

  const tmpDir = path.join(process.env.TEMP || '/tmp', 'ces-youtube-migrate');
  fs.mkdirSync(tmpDir, { recursive: true });

  let uploaded = 0, failed = 0, skipped = 0;

  for (const candidate of supabaseCandidates) {
    const name = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`;
    const song = candidate.song_title ? `${candidate.song_title}${candidate.song_artist ? ' — ' + candidate.song_artist : ''}` : '';
    const videoTitle = `${name}${song ? ' — ' + song : ''} — chantenscene Aubagne 2026`;

    console.log(`\n=== ${name} ===`);

    // Check daily quota
    if (uploaded >= 6) {
      console.log(`   ⏸️  Quota quotidien atteint (6/jour). Reprendre demain.`);
      skipped++;
      continue;
    }

    try {
      // Download from Supabase
      const ext = path.extname(candidate.video_url.split('?')[0]) || '.mp4';
      const tmpFile = path.join(tmpDir, `${candidate.slug || candidate.id}${ext}`);
      await downloadFile(candidate.video_url, tmpFile);

      // Brand if requested
      let uploadFile = tmpFile;
      if (doBrand) {
        const brandedFile = tmpFile.replace(ext, `-branded.mp4`);
        console.log(`   🎬 Branding...`);
        try {
          execSync(`node "${path.join(__dirname, 'brand-video.js')}" "${tmpFile}" "${brandedFile}"`, { stdio: 'pipe' });
          uploadFile = brandedFile;
          console.log(`   🎬 Branding OK`);
        } catch (err) {
          console.log(`   ⚠️  Branding échoué, upload de la vidéo originale`);
        }
      }

      // Upload to YouTube
      const videoId = await uploadVideo(auth, uploadFile, videoTitle, DEFAULT_DESCRIPTION, privacy);

      // SAUVEGARDER dans le log AVANT de toucher la BDD
      logMigration(migrationLog, candidate.id, name, candidate.video_url, videoId);
      console.log(`   💾 Migration log sauvegardé (protection anti-perte)`);

      // Update candidate in Supabase with YouTube URL
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/candidates?id=eq.${candidate.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ video_url: youtubeUrl }),
        }
      );

      if (updateRes.ok) {
        console.log(`   📝 BDD mise à jour: video_url → ${youtubeUrl}`);
      } else {
        // La vidéo est sur YouTube + dans le log, on peut restaurer
        console.log(`   ⚠️  Erreur BDD (${updateRes.status}) — vidéo sauve sur YouTube + dans le log`);
      }

      uploaded++;

      // Clean up temp files only
      try { fs.unlinkSync(tmpFile); } catch {}
      if (uploadFile !== tmpFile) try { fs.unlinkSync(uploadFile); } catch {}

    } catch (err) {
      console.error(`   ❌ Erreur: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Migration terminée:`);
  console.log(`   ✅ ${uploaded} uploadés sur YouTube`);
  console.log(`   ❌ ${failed} erreurs`);
  console.log(`   ⏸️  ${skipped} en attente (quota)`);
  console.log(`   💾 Log: ${MIGRATION_LOG_PATH}`);
  if (skipped > 0) {
    console.log(`\n   Relancer demain: node scripts/youtube-upload.js --migrate`);
  }
  if (uploaded > 0) {
    console.log(`\n   ⚠️  Supabase Storage NON supprimé (sécurité).`);
    console.log(`   Quand prêt, lancer: node scripts/youtube-upload.js --cleanup`);
  }
}

// ===== BACKUP TO PCMUSIQUE =====
const PCMUSIQUE_BACKUP_DIR = '\\\\192.168.1.139\\C$\\Dev\\backup-videos-ces';

async function backupToPCmusique(url, name) {
  const safeName = name.replace(/[^a-zA-Z0-9àâéèêëïîôùûüç_-]/g, '_').substring(0, 80);
  const ext = path.extname(url.split('?')[0]) || '.mp4';
  const destFile = `${safeName}${ext}`;
  const destPath = path.join(PCMUSIQUE_BACKUP_DIR, destFile);

  // Ensure backup dir exists on PCmusique
  try {
    execSync(`if not exist "${PCMUSIQUE_BACKUP_DIR}" mkdir "${PCMUSIQUE_BACKUP_DIR}"`, { stdio: 'pipe', shell: 'cmd.exe' });
  } catch {}

  console.log(`   💾 Backup vers PCmusique: ${destFile}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement échoué: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`   💾 Backup OK (${sizeMB} Mo) → ${destPath}`);
  return destPath;
}

// ===== CLEANUP (suppression Supabase APRÈS vérification YouTube + backup PCmusique) =====
async function cleanupSupabase(auth) {
  const migrationLog = loadMigrationLog();
  const toClean = migrationLog.migrations.filter(m => !m.supabaseDeleted);

  if (toClean.length === 0) {
    console.log('\n✅ Rien à nettoyer — tout est déjà supprimé de Supabase.');
    return;
  }

  console.log(`\n🧹 Nettoyage Supabase: ${toClean.length} vidéos à vérifier + backup + supprimer\n`);

  if (dryRun) {
    console.log('🔍 MODE DRY-RUN — rien ne sera supprimé\n');
    toClean.forEach(m => {
      console.log(`   📋 ${m.name} — YouTube: ${m.youtubeId} — Supabase: ${m.oldSupabaseUrl.substring(0, 60)}...`);
    });
    console.log(`\n   Backup prévu vers: ${PCMUSIQUE_BACKUP_DIR}`);
    return;
  }

  let cleaned = 0, skippedCount = 0, errors = 0;

  for (const migration of toClean) {
    console.log(`\n=== ${migration.name} ===`);

    // ÉTAPE 1: Vérifier que la vidéo YouTube EXISTE et est accessible
    console.log(`   🔍 Vérification YouTube (${migration.youtubeId})...`);
    const youtubeOk = await verifyYoutubeVideo(auth, migration.youtubeId);

    if (!youtubeOk) {
      console.log(`   ❌ Vidéo YouTube NON trouvée ou pas encore traitée → Supabase PRÉSERVÉ`);
      skippedCount++;
      continue;
    }
    console.log(`   ✅ Vidéo YouTube confirmée`);

    // ÉTAPE 2: Vérifier que la BDD pointe bien vers YouTube
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/candidates?id=eq.${migration.candidateId}&select=video_url`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const dbData = await dbRes.json();
    if (!dbData[0]?.video_url?.includes('youtube')) {
      console.log(`   ❌ BDD pointe encore vers Supabase → on ne supprime PAS`);
      skippedCount++;
      continue;
    }
    console.log(`   ✅ BDD pointe vers YouTube`);

    // ÉTAPE 3: Backup sur PCmusique AVANT suppression
    try {
      await backupToPCmusique(migration.oldSupabaseUrl, migration.name);
      console.log(`   ✅ Backup PCmusique confirmé`);
    } catch (err) {
      console.log(`   ❌ Backup PCmusique ÉCHOUÉ: ${err.message} → Supabase PRÉSERVÉ`);
      skippedCount++;
      continue; // PAS de suppression si le backup échoue
    }

    // ÉTAPE 4: Supprimer de Supabase Storage (SEULEMENT si backup OK)
    try {
      const storageMatch = migration.oldSupabaseUrl.match(/\/object\/public\/candidates\/(.+?)(\?|$)/);
      if (storageMatch) {
        const storagePath = decodeURIComponent(storageMatch[1]);
        const deleteRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/candidates/${storagePath}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${SERVICE_KEY}` },
          }
        );
        if (deleteRes.ok || deleteRes.status === 404) {
          console.log(`   🗑️  Supabase Storage supprimé: ${storagePath}`);
          migration.supabaseDeleted = true;
          migration.deletedAt = new Date().toISOString();
          migration.backupPath = path.join(PCMUSIQUE_BACKUP_DIR, migration.name.replace(/[^a-zA-Z0-9àâéèêëïîôùûüç_-]/g, '_').substring(0, 80) + '.mp4');
          saveMigrationLog(migrationLog);
          cleaned++;
        } else {
          console.log(`   ⚠️  Erreur suppression: ${deleteRes.status}`);
          errors++;
        }
      }
    } catch (err) {
      console.log(`   ❌ Erreur: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Nettoyage terminé:`);
  console.log(`   🗑️  ${cleaned} supprimés de Supabase`);
  console.log(`   💾 Backups dans: ${PCMUSIQUE_BACKUP_DIR}`);
  console.log(`   ⏭️  ${skippedCount} préservés (YouTube/backup non confirmé)`);
  console.log(`   ❌ ${errors} erreurs`);
}

// ===== MAIN =====
async function main() {
  const auth = await getAuthClient();

  if (doCleanup) {
    // Cleanup SÉPARÉ — ne supprime que ce qui est vérifié
    await cleanupSupabase(auth);
  } else if (doMigrate) {
    await migrateAll(auth);
  } else if (batchDir) {
    if (!fs.existsSync(batchDir)) {
      console.error(`Dossier introuvable: ${batchDir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(batchDir).filter(f => /\.(mp4|mov|webm)$/i.test(f));
    console.log(`📤 Upload de ${files.length} vidéos depuis ${batchDir}`);

    for (let i = 0; i < files.length && i < 6; i++) {
      const filePath = path.join(batchDir, files[i]);
      const name = path.basename(files[i], path.extname(files[i]));
      const videoTitle = batchPrefix ? `${batchPrefix} — ${name}` : name;
      await uploadVideo(auth, filePath, videoTitle, description, privacy);
    }
    if (files.length > 6) {
      console.log(`\n⏸️  ${files.length - 6} vidéos restantes (quota 6/jour)`);
    }
  } else if (inputPath) {
    if (!title) title = path.basename(inputPath, path.extname(inputPath));
    await uploadVideo(auth, inputPath, title, description, privacy);
  } else {
    console.log(`
Usage:
  node scripts/youtube-upload.js video.mp4 "Titre"
  node scripts/youtube-upload.js --migrate                 # Upload Supabase → YouTube
  node scripts/youtube-upload.js --migrate --brand         # + branding logo
  node scripts/youtube-upload.js --migrate --dry-run       # Prévisualisation (rien ne change)
  node scripts/youtube-upload.js --cleanup                 # Supprimer Supabase (APRÈS migration)
  node scripts/youtube-upload.js --cleanup --dry-run       # Prévisualiser le nettoyage

SÉCURITÉ:
  1. --migrate : upload YouTube + log dans migration-log.json + update BDD
     → Supabase Storage N'EST PAS touché
  2. --cleanup : vérifie YouTube + vérifie BDD + supprime Supabase
     → Triple vérification avant chaque suppression
  3. migration-log.json : sauvegarde TOUTES les anciennes URLs pour restauration
    `);
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
