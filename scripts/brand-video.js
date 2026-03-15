#!/usr/bin/env node
/**
 * brand-video.js — Ajoute le logo chantenscene en overlay sur une vidéo
 *
 * Usage:
 *   node scripts/brand-video.js input.mp4 output.mp4
 *   node scripts/brand-video.js input.mp4                    # output = input-branded.mp4
 *   node scripts/brand-video.js --all ./videos/              # brand tous les .mp4 du dossier
 *
 * Options:
 *   --jingle path/to/jingle.mp3    Ajouter un jingle audio au début
 *   --logo-size 120                Taille du logo en pixels (défaut: 100)
 *   --position br                  Position: tl, tr, bl, br (défaut: br = bas-droite)
 *   --opacity 0.3                  Opacité du logo (défaut: 0.35)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'logo-alpha.webm');
const LOGO_PNG = path.join(__dirname, '..', 'public', 'images', 'logo.png');

// Parse arguments
const args = process.argv.slice(2);
let inputPath, outputPath, jinglePath, logoSize = 100, position = 'br', opacity = 0.35, batchDir;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--jingle': jinglePath = args[++i]; break;
    case '--logo-size': logoSize = parseInt(args[++i]); break;
    case '--position': position = args[++i]; break;
    case '--opacity': opacity = parseFloat(args[++i]); break;
    case '--all': batchDir = args[++i]; break;
    default:
      if (!inputPath) inputPath = args[i];
      else outputPath = args[i];
  }
}

// Position overlay mapping
const POSITIONS = {
  tl: `10:10`,
  tr: `main_w-overlay_w-10:10`,
  bl: `10:main_h-overlay_h-10`,
  br: `main_w-overlay_w-10:main_h-overlay_h-10`,
};

function brandVideo(input, output) {
  if (!fs.existsSync(input)) {
    console.error(`Fichier introuvable: ${input}`);
    return false;
  }

  // Use PNG logo (simpler, more compatible than animated webm)
  const logoFile = fs.existsSync(LOGO_PNG) ? LOGO_PNG : LOGO_PATH;
  const pos = POSITIONS[position] || POSITIONS.br;

  let cmd;
  if (jinglePath && fs.existsSync(jinglePath)) {
    // With jingle: prepend jingle audio, overlay logo on entire video
    // 1. Get jingle duration
    const probCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${jinglePath}"`;
    const jingleDuration = parseFloat(execSync(probCmd).toString().trim());

    // Complex filter: overlay logo + prepend jingle
    cmd = [
      'ffmpeg -y',
      `-i "${input}"`,
      `-i "${logoFile}"`,
      `-i "${jinglePath}"`,
      `-filter_complex "`,
      // Scale logo
      `[1:v]scale=${logoSize}:${logoSize},format=rgba,colorchannelmixer=aa=${opacity}[logo];`,
      // Overlay logo on video
      `[0:v][logo]overlay=${pos}[branded];`,
      // Mix audio: jingle at start then original audio
      `[2:a][0:a]concat=n=2:v=0:a=1[aout]`,
      `"`,
      `-map "[branded]" -map "[aout]"`,
      `-c:v libx264 -preset fast -crf 23`,
      `-c:a aac -b:a 192k`,
      `-movflags +faststart`,
      `"${output}"`,
    ].join(' ');
  } else {
    // Logo overlay only (no jingle)
    cmd = [
      'ffmpeg -y',
      `-i "${input}"`,
      `-i "${logoFile}"`,
      `-filter_complex "`,
      `[1:v]scale=${logoSize}:${logoSize},format=rgba,colorchannelmixer=aa=${opacity}[logo];`,
      `[0:v][logo]overlay=${pos}[branded]`,
      `"`,
      `-map "[branded]" -map 0:a?`,
      `-c:v libx264 -preset fast -crf 23`,
      `-c:a copy`,
      `-movflags +faststart`,
      `"${output}"`,
    ].join(' ');
  }

  console.log(`\n🎬 Branding: ${path.basename(input)}`);
  console.log(`   Logo: ${path.basename(logoFile)} (${logoSize}px, ${position}, ${Math.round(opacity * 100)}%)`);
  if (jinglePath) console.log(`   Jingle: ${path.basename(jinglePath)}`);
  console.log(`   Output: ${output}`);

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 300000 }); // 5 min timeout
    const size = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
    console.log(`   ✅ OK (${size} Mo)`);
    return true;
  } catch (err) {
    console.error(`   ❌ Erreur FFmpeg:`, err.stderr?.toString().split('\n').slice(-3).join('\n'));
    return false;
  }
}

// Main
if (batchDir) {
  // Batch mode
  if (!fs.existsSync(batchDir)) {
    console.error(`Dossier introuvable: ${batchDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(batchDir).filter(f => /\.(mp4|mov|webm|avi)$/i.test(f));
  console.log(`🎬 Branding de ${files.length} vidéos dans ${batchDir}`);

  let ok = 0, fail = 0;
  for (const file of files) {
    const input = path.join(batchDir, file);
    const ext = path.extname(file);
    const output = path.join(batchDir, 'branded', file.replace(ext, `-branded.mp4`));
    fs.mkdirSync(path.join(batchDir, 'branded'), { recursive: true });
    if (brandVideo(input, output)) ok++;
    else fail++;
  }
  console.log(`\n📊 Résultat: ${ok} OK, ${fail} erreurs sur ${files.length} vidéos`);
} else if (inputPath) {
  // Single file mode
  if (!outputPath) {
    const ext = path.extname(inputPath);
    outputPath = inputPath.replace(ext, `-branded.mp4`);
  }
  const success = brandVideo(inputPath, outputPath);
  process.exit(success ? 0 : 1);
} else {
  console.log(`
Usage:
  node scripts/brand-video.js video.mp4 [output.mp4]
  node scripts/brand-video.js --all ./videos/

Options:
  --jingle chemin/jingle.mp3    Ajouter un jingle audio
  --logo-size 120               Taille du logo (défaut: 100px)
  --position br                 Position: tl, tr, bl, br (défaut: br)
  --opacity 0.35                Opacité du logo (défaut: 0.35)
  `);
}
