const fs = require('fs');
const { google } = require('googleapis');

async function check() {
  const creds = JSON.parse(fs.readFileSync('scripts/client_secret.json', 'utf8'));
  const tokens = JSON.parse(fs.readFileSync('scripts/youtube-token.json', 'utf8'));
  const { client_id, client_secret } = creds.installed || creds.web || {};
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3333');
  oauth2.setCredentials(tokens);

  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  const log = JSON.parse(fs.readFileSync('scripts/migration-log.json', 'utf8'));
  const ids = log.migrations.map(m => m.youtubeId);

  const res = await youtube.videos.list({ part: ['status', 'snippet', 'contentDetails'], id: ids });

  console.log(`\n=== Statut des ${res.data.items.length} vidéos YouTube ===\n`);

  let blocked = 0, ok = 0;
  for (const v of res.data.items) {
    const s = v.status;
    const isBlocked = s.uploadStatus !== 'processed' || s.rejectionReason;
    if (isBlocked) blocked++;
    else ok++;

    const icon = isBlocked ? '🚫' : '✅';
    console.log(`${icon} ${v.snippet.title.substring(0, 60)}`);
    console.log(`   upload: ${s.uploadStatus} | privacy: ${s.privacyStatus} | embeddable: ${s.embeddable}`);
    if (s.rejectionReason) console.log(`   REJET: ${s.rejectionReason}`);
    if (v.contentDetails?.contentRating) console.log(`   rating:`, JSON.stringify(v.contentDetails.contentRating));
  }

  console.log(`\n📊 Résultat: ${ok} OK, ${blocked} bloquées sur ${res.data.items.length} total`);
}

check().catch(e => console.error('Erreur:', e.message));
