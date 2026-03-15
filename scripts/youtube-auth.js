#!/usr/bin/env node
/**
 * youtube-auth.js — Autorisation OAuth2 YouTube (à exécuter UNE SEULE FOIS)
 *
 * Prérequis:
 *   1. Activer YouTube Data API v3 dans Google Cloud Console
 *   2. Créer un ID client OAuth 2.0 (type: Application de bureau)
 *   3. Télécharger le JSON → scripts/client_secret.json
 *
 * Usage:
 *   node scripts/youtube-auth.js
 *
 * Ce script ouvre un navigateur pour l'autorisation.
 * Le token est sauvegardé dans scripts/youtube-token.json (gitignored).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

const CLIENT_SECRET_PATH = path.join(__dirname, 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, 'youtube-token.json');
const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/youtube'];

async function main() {
  // 1. Load client secret
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error('❌ Fichier client_secret.json introuvable !');
    console.error('');
    console.error('Instructions :');
    console.error('  1. Va sur https://console.cloud.google.com');
    console.error('  2. Active YouTube Data API v3');
    console.error('  3. Crée un ID client OAuth 2.0 (Application de bureau)');
    console.error('  4. Télécharge le JSON');
    console.error('  5. Place-le dans scripts/client_secret.json');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const { client_id, client_secret } = creds.installed || creds.web || {};

  if (!client_id || !client_secret) {
    console.error('❌ Format client_secret.json invalide');
    process.exit(1);
  }

  // 2. Check if token already exists
  if (fs.existsSync(TOKEN_PATH)) {
    console.log('⚠️  Un token existe déjà dans youtube-token.json');
    console.log('   Supprimer le fichier pour re-autoriser.');
    process.exit(0);
  }

  // 3. Build auth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client_id);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // 4. Start local server to catch redirect
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ Erreur: ${error}</h1><p>Ferme cette page.</p>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (authCode) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>✅ Autorisation réussie !</h1><p>Tu peux fermer cette page.</p>`);
        server.close();
        resolve(authCode);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`\n🔑 Ouvre ce lien dans ton navigateur :\n`);
      console.log(`   ${authUrl.toString()}\n`);
      console.log(`En attente de l'autorisation...`);

      // Try to open browser automatically
      const { exec } = require('child_process');
      exec(`start "" "${authUrl.toString()}"`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout: pas de réponse après 5 minutes'));
    }, 300000);
  });

  // 5. Exchange code for tokens
  console.log('\n📡 Échange du code...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (tokens.error) {
    console.error(`❌ Erreur token: ${tokens.error} — ${tokens.error_description}`);
    process.exit(1);
  }

  // 6. Save tokens
  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expiry_date: Date.now() + (tokens.expires_in * 1000),
    scope: tokens.scope,
  };

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
  console.log(`\n✅ Token sauvegardé dans ${TOKEN_PATH}`);
  console.log('   Tu peux maintenant utiliser youtube-upload.js');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
