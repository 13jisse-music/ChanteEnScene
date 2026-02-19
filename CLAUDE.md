# ChanteEnScene - Contexte Projet

## Infrastructure & Environnements

### Supabase — 2 projets
| Projet | Ref | Région | Usage |
|--------|-----|--------|-------|
| **chantenscene** | `ppcksslgphrzsjulifci` | eu-west-2 | Ancienne prod (données historiques migrées, plus utilisée) |
| **chantenscene-dev** | `xarrchsokuhobwqvcnkg` | eu-central-1 | **PRODUCTION ACTUELLE** (Vercel pointe ici) + dev local |

- Clés et credentials dans `.env.keys` (gitignored, lu par les scripts utilitaires)
- `.env.local` pointe vers chantenscene-dev (ref `xarrchsokuhobwqvcnkg`)
- **IMPORTANT** : Ne jamais changer les variables Supabase sur Vercel sans vérifier le mapping des bases

### Vercel — 2 projets
| Projet | URL | Usage |
|--------|-----|-------|
| **chante-en-scene** | www.chantenscene.fr | **PRODUCTION** — sert le site public |
| **chante-en-scene-batx** | (preview) | Projet secondaire, non utilisé pour la prod |

- Le CLI `vercel` est linké au projet **chante-en-scene**
- CRON_SECRET prod : `cron_chantenscene_2026_xK9mP` (sur chante-en-scene)
- CRON_SECRET batx : `0945ba22ad2a185ad30228922d7af82aeafc0d5de9dbee65272cd8932dfa0b86`
- Variables `NEXT_PUBLIC_*` sont baked dans le JS au build — tout changement nécessite un redéploiement

### Crons Vercel (vercel.json)
| Route | Schedule | Heure Paris | Description |
|-------|----------|-------------|-------------|
| `/api/cron/admin-report` | `0 7 * * *` | 8h tous les jours | Rapport admin par email + push |
| `/api/cron/social-post` | `0 9 * * *` | 10h tous les jours | Publication auto réseaux sociaux |
| `/api/cron/jury-recap` | `0 10 * * 1` | 11h chaque lundi | Récap jury hebdomadaire |
| `/api/cron/backup` | `0 0 * * 0` | 1h chaque dimanche | Backup BDD dans Supabase Storage |

- Tous les crons ont `export const dynamic = 'force-dynamic'` (anti-cache Next.js)
- Authentification par `Authorization: Bearer CRON_SECRET`

### Backups
- **Automatique** : Chaque dimanche 1h (Supabase Storage, bucket privé "backups", rétention 8 semaines)
- **Manuel local** : `node backup-db.js` → dossier `backups/` (gitignored, synchro OneDrive)
- **Manuel prod** : `node backup-db.js --prod` → backup de l'ancienne base

### Push Notifications
- VAPID keys configurées (même clés pour les 2 bases)
- Badge personnalisé : lettre **C** dans carré arrondi (style LinkedIn) → `public/images/pwa-badge-96.png`
- Service Worker : `public/sw.js` (push, offline, cache)
- Lib serveur : `src/lib/push.ts` (web-push, nettoyage auto des 410 expirées)
- Subscribe : `src/app/api/push/subscribe/route.ts` (pattern delete+insert, pas d'upsert)
- Send : `src/app/api/push/send/route.ts` (protégé admin)

### Fichiers utilitaires (gitignored)
- `.env.keys` — Toutes les clés centralisées (Supabase, Vercel, Resend, VAPID, Meta, IONOS)
- `backup-db.js` — Script de backup local
- `migrate-prod-to-dev.js` — Migration données ancienne base → nouvelle
- `migrate-create-tables.sql` — SQL pour créer tables manquantes
- `extract-photos.ps1` — Extraction photos JPG depuis ZIP SwissTransfer
- `triage-photos.js` — Triage auto qualité photos (sharp) + détection rafales
- `import-photos-2025.js` — Import photos vers Supabase Storage + BDD (resize 1600px)

## Stack technique
- **Framework** : Next.js 16.1.6 (React 19.2.3) + TypeScript
- **BDD** : Supabase (PostgreSQL + Auth + Realtime)
- **Styling** : Tailwind CSS 4 + PostCSS
- **Emails** : Resend
- **Libs clés** : canvas-confetti, qrcode, recharts, jszip, @hello-pangea/dnd, sharp, web-push
- **PWA** : Service Worker, manifest.json, offline.html
- **Couleur principale** : #e91e8c (rose), fond sombre #1a1232
- **Polices** : Montserrat (titres), Inter (corps)

## Architecture Supabase (3 clients)
- `src/lib/supabase/server.ts` — Client serveur (SSR, cookies Next.js)
- `src/lib/supabase/client.ts` — Client navigateur (realtime, auto-refresh)
- `src/lib/supabase/admin.ts` — Client admin (service role key, bypass RLS)

## Schéma BDD principal
- **sessions** : Instances de concours (multi-tenant), config en JSONB, statut draft→registration_open→registration_closed→semifinal→final→archived
- **candidates** : Profils complets, statut pending→approved→semifinalist→finalist→winner, slug unique, photo/video/mp3
- **votes** : Votes publics par fingerprint (SHA-256 device), 1 vote/device/candidat
- **jurors** : Jurés (online/semifinal/final), auth par qr_token
- **jury_scores** : Notes par critère (JSONB), total_score, commentaire
- **live_events** : Demi-finales et finales en direct, statut pending→live→paused→completed
- **lineup** : Ordre de passage, statut pending→performing→completed/absent/replay
- **live_votes** : Votes temps réel pendant events live
- **photos** : Galerie avec tags candidat/event (81 photos 2025 dans Storage bucket `photos`)
- **edition_videos** : Vidéos YouTube par session (titre, URL, description, published)
- **chatbot_faq** / **chatbot_conversations** : FAQ automatique
- **admin_users** : super_admin ou local_admin avec session_ids
- **page_views** : Analytics par fingerprint
- **pwa_installs** : Tracking installations PWA (fingerprint, platform, city, region)
- **push_subscriptions** : Abonnements push (endpoint, p256dh, auth, role, fingerprint)
- **email_subscribers** : Abonnés email (79 legacy importés + nouveaux)
- **email_campaigns** : Newsletters envoyées (subject, body, status, target)
- **sponsors** : Sponsors du concours
- **shares** : Tracking partages réseaux sociaux

### Session active
- **ChanteEnScène Aubagne 2026** — ID: `682bef39-e7ec-4943-9e62-96bfb91bfcac` — status: `draft`
- Sessions palmarès (2023, 2024, 2025) : archivées, IDs fixes `a0000000-...-2023/2024/2025`

## Routes publiques (dynamiques par session slug)
- `/:slug/` — Page d'accueil session
- `/:slug/candidats` — Galerie candidats (mobile: swipe TikTok, desktop: feed social)
- `/:slug/candidats/:candidateSlug` — Profil candidat
- `/:slug/live` — Streaming live + vote en direct
- `/:slug/inscription` — Formulaire inscription 4 étapes
- `/:slug/mon-profil` — Gestion profil candidat
- `/:slug/galerie` — Galerie photos
- `/palmares` — Palmarès
- `/editions` — Galerie des éditions (photos + vidéos YouTube par année)
- `/mentions-legales`, `/reglement`, `/confidentialite` — Pages légales

## Routes admin
- `/admin` — Dashboard stats (PWA adoption split Android/iOS/Desktop)
- `/admin/candidats` — Gestion candidats (table CRUD)
- `/admin/config` — Configuration session (âges, dates, critères jury, poids, push notifications)
- `/admin/sessions` — Gestion multi-sessions
- `/admin/jury` — CRUD jurés + QR codes
- `/admin/jury-en-ligne` — Interface notation jury en ligne
- `/admin/demi-finale` — Régie demi-finale (lineup, live, voting)
- `/admin/finale` — Régie finale (lineup, scoring, reveal winner)
- `/admin/stats-en-ligne` / `/admin/stats-demi-finale` / `/admin/finale/stats` — Statistiques
- `/admin/resultats` — Résultats et annonce gagnant
- `/admin/suivi-mp3` — Suivi fichiers MP3
- `/admin/export-mp3` — Export ZIP par catégorie
- `/admin/photos` — Gestion galerie
- `/admin/chatbot` — Gestion FAQ
- `/admin/editions` — Galerie éditions (photos publish/unpublish, vidéos YouTube)
- `/admin/seed` — Données de test

## Routes jury
- `/jury` — Login par email
- `/jury/:token` — Interface notation (scoring par critères, feed TikTok)

## API
- `/api/track` (POST) — Tracking page views (fingerprint, IP, referrer, durée)
- `/api/push/subscribe` (POST/DELETE) — Gestion abonnements push
- `/api/push/send` (POST) — Envoi notifications push (admin only)
- `/api/pwa/install` (POST) — Tracking installations PWA
- `/api/cron/admin-report` (GET) — Rapport admin automatique
- `/api/cron/social-post` (GET) — Publication réseaux sociaux
- `/api/cron/jury-recap` (GET) — Récap jury
- `/api/cron/backup` (GET) — Backup BDD automatique

## Hooks Realtime (src/hooks/)
- `useRealtimeEvent` — Écoute live_events (status, candidat courant, voting)
- `useRealtimeLiveVotes` — Votes live en temps réel
- `useRealtimeLineup` — Changements lineup (INSERT/UPDATE/DELETE)
- `useRealtimeJuryPush` — Push scores jury vers scoreboard
- `useWinnerReveal` — Détecte winner_revealed_at → confetti
- `useJuryNotifications` — Notifications milestones jury
- `usePageTracking` — Tracking analytics côté client

## Composants clés (50+)
### Navigation & Layout
- `PublicNav.tsx`, `AdminSidebar.tsx` (13 sections), `MobileMenu.tsx`, `ToastProvider.tsx`

### Galerie candidats
- `CandidateGallery.tsx` (routeur mobile/desktop)
- `CandidateSwipeFeed.tsx` (swipe TikTok mobile)
- `CandidateDesktopFeed.tsx` (feed social desktop)
- `CandidateCard.tsx`, `CandidateProfile.tsx`, `CandidateMedia.tsx`
- `CandidateVoteButton.tsx` (vote par fingerprint)

### Jury
- `JuryLogin.tsx`, `JuryScoring.tsx`, `JuryQRCode.tsx`, `JuryManager.tsx`, `JuryVoteCounter.tsx`

### Régie live
- `RegieFinale.tsx`, `RegieSemifinale.tsx`, `SemifinalPrep.tsx`
- `CheckinView.tsx`, `LiveView.tsx`, `ClassementPanel.tsx`

### Admin
- `AdminConfig.tsx`, `CandidatsTable.tsx`, `FinalisteSelection.tsx`
- `Mp3Uploader.tsx`, `ExportMp3Manager.tsx`, `EventManager.tsx`
- `PhotoAdmin.tsx`, `PhotoGallery.tsx`, `SessionManager.tsx`, `EditionsAdmin.tsx`
- `ChatbotWidget.tsx`, `ChatbotAdmin.tsx`
- `PwaFunnel.tsx` — Dashboard adoption PWA (Android/iOS/Desktop)
- `InstallPrompt.tsx` — Bandeau installation PWA + notifications + email fallback
- `EmailSubscribeForm.tsx` — Formulaire abonnement email

### Stats & Résultats
- `FinaleStats.tsx`, `StatsEnLigne.tsx`, `StatsDemiFinale.tsx`
- `WinnerReveal.tsx` (confetti), `WinnerCountdown.tsx`

### UI & Animations
- `FloatingNotes.tsx` (notes musicales), `BokehBackground.tsx` (effet lumières)
- `LogoRing.tsx`, `AudioPlayer.tsx`, `ShareButtons.tsx`

## Patterns & conventions
- **Multitenant** : Tout filtré par session_id
- **Server Actions** : Mutations via 'use server' dans /admin/*/actions.ts
- **Fingerprinting** : Prévention doublons sans comptes utilisateurs (SHA-256)
- **Realtime** : `.channel().on('postgres_changes')` avec filtres dynamiques
- **Status machines** : Progressions strictes pour candidates et events
- **Config JSONB** : Paramètres concours configurables à runtime dans sessions.config
- **Middleware** : Protection /admin (sauf /admin/login) via Supabase SSR cookies
- **Push subscribe** : Pattern delete+insert (pas d'upsert, pas de contrainte unique endpoint+session+role)

## Workflow complet du concours
1. **Inscriptions** : Formulaire 4 étapes (identité → chanson → média → consentement)
2. **Jury en ligne** : Notation TikTok-style, critères configurables, 5 étoiles
3. **Demi-finale** : Check-in, lineup drag-and-drop, live + vote public, sélection finalistes
4. **Finale** : Performances séquentielles, scoring jury+public (60/40 par défaut), reveal winner avec confetti
5. **Post-event** : Export MP3, galerie photos, palmarès, analytics

## Historique des interventions

### 2026-02-19 — Galerie Editions + Import photos 2025
- **Nouvelle page `/editions`** : Galerie publique année par année (2025, 2024, 2023...) avec photos + vidéos YouTube
- **Nouvelle page `/admin/editions`** : Admin pour publier/dépublier photos et gérer vidéos YouTube
- **Migration `023_edition_videos.sql`** : Table `edition_videos` (YouTube links par session)
- **Composants** : `EditionsGallery.tsx` (public, lightbox, grille responsive), `EditionsAdmin.tsx` (admin, toggle publish, bulk actions)
- **Server Actions** : `toggleEditionPhoto`, `bulkToggleEditionPhotos`, `deleteEditionPhoto`, `addEditionVideo`, `toggleEditionVideo`, `deleteEditionVideo`
- **Navigation** : Lien "Editions" ajouté dans `PublicNav.tsx` et `AdminSidebar.tsx`
- **Import photos 2025** : 81 photos importées dans Supabase Storage (bucket `photos`, public) + table `photos`
  - Pipeline : SwissTransfer ZIP → extract → triage auto (sharp: brightness/contrast/entropy + burst detection) → slideshow review manuelle → resize 1600px → upload
  - Scripts utilitaires (gitignored) : `extract-photos.ps1`, `triage-photos.js`, `import-photos-2025.js`
  - Bucket Storage `photos` créé via API (n'existait pas)
  - Toutes les photos importées en `published=false`, prêtes à publier depuis l'admin
- **Vidéos 2025** : 5 vidéos montées gardées (rushes MVI_*.MOV supprimés), à uploader sur YouTube puis ajouter via admin

### 2026-02-19 — Migration & infrastructure
- Split Android/iOS dans le dashboard PWA adoption (`PwaFunnel.tsx`, `admin/page.tsx`)
- Cron admin report changé de 9h à 8h Paris (0 7 * * * UTC)
- Fix CRON_SECRET manquant (audit sécu avait changé fail-open → fail-closed, correct)
- `force-dynamic` ajouté aux 3 crons (anti-cache Next.js GET)
- **Découverte mismatch Supabase** : Vercel pointait vers `ppcksslgphrzsjulifci` (ancienne prod), local vers `xarrchsokuhobwqvcnkg` (dev) → corrigé Vercel pour pointer vers dev
- Fix push subscribe : suppression colonnes `city`/`region` inexistantes, changement upsert → delete+insert
- **Migration données** : 79 email_subscribers, 273 page_views, 22 chatbot_faq, 7 pwa_installs, 26 push_subscriptions de l'ancienne base vers la nouvelle
- Création tables manquantes dans dev : `email_subscribers`, `pwa_installs`, `email_campaigns`
- Création `.env.keys` — fichier centralisé de toutes les clés
- Badge push notification : carré avec lettre C (monochrome, style LinkedIn)
- Backup automatique hebdomadaire (Supabase Storage, cron dimanche 1h)
- Script backup local `backup-db.js`
