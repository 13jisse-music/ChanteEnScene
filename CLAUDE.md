# ChanteEnScene - Contexte Projet

## Stack technique
- **Framework** : Next.js 16.1.6 (React 19.2.3) + TypeScript
- **BDD** : Supabase (PostgreSQL + Auth + Realtime)
- **Styling** : Tailwind CSS 4 + PostCSS
- **Emails** : Resend
- **Libs clés** : canvas-confetti, qrcode, recharts, jszip, @hello-pangea/dnd
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
- **photos** : Galerie avec tags candidat/event
- **chatbot_faq** / **chatbot_conversations** : FAQ automatique
- **admin_users** : super_admin ou local_admin avec session_ids
- **page_views** : Analytics par fingerprint

## Routes publiques (dynamiques par session slug)
- `/:slug/` — Page d'accueil session
- `/:slug/candidats` — Galerie candidats (mobile: swipe TikTok, desktop: feed social)
- `/:slug/candidats/:candidateSlug` — Profil candidat
- `/:slug/live` — Streaming live + vote en direct
- `/:slug/inscription` — Formulaire inscription 4 étapes
- `/:slug/mon-profil` — Gestion profil candidat
- `/:slug/galerie` — Galerie photos
- `/palmares` — Palmarès
- `/mentions-legales`, `/reglement`, `/confidentialite` — Pages légales

## Routes admin
- `/admin` — Dashboard stats
- `/admin/candidats` — Gestion candidats (table CRUD)
- `/admin/config` — Configuration session (âges, dates, critères jury, poids)
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
- `/admin/seed` — Données de test

## Routes jury
- `/jury` — Login par email
- `/jury/:token` — Interface notation (scoring par critères, feed TikTok)

## API
- `/api/track` (POST) — Tracking page views (fingerprint, IP, referrer, durée)

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
- `PhotoAdmin.tsx`, `PhotoGallery.tsx`, `SessionManager.tsx`
- `ChatbotWidget.tsx`, `ChatbotAdmin.tsx`

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

## Workflow complet du concours
1. **Inscriptions** : Formulaire 4 étapes (identité → chanson → média → consentement)
2. **Jury en ligne** : Notation TikTok-style, critères configurables, 5 étoiles
3. **Demi-finale** : Check-in, lineup drag-and-drop, live + vote public, sélection finalistes
4. **Finale** : Performances séquentielles, scoring jury+public (60/40 par défaut), reveal winner avec confetti
5. **Post-event** : Export MP3, galerie photos, palmarès, analytics
