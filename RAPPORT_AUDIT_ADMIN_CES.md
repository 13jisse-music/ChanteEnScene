# RAPPORT AUDIT FONCTIONNEL — ChanteEnScene

> Audit en lecture seule — 22 mars 2026
> Généré par Claude Code pour analyse par claude.ai

---

## 1. ARCHITECTURE

### Pages (65 fichiers page.tsx)

**Pages publiques dynamiques (sous `[slug]` = slug de session) :**
- `src/app/[slug]/page.tsx` — page session (landing par edition)
- `src/app/[slug]/candidats/page.tsx` — liste candidats
- `src/app/[slug]/candidats/[candidateSlug]/page.tsx` — profil candidat
- `src/app/[slug]/checkin/page.tsx` — check-in candidat
- `src/app/[slug]/galerie/page.tsx` — galerie photos
- `src/app/[slug]/inscription/page.tsx` — formulaire d'inscription
- `src/app/[slug]/live/page.tsx` — suivi live
- `src/app/[slug]/mon-profil/page.tsx` — profil candidat connecte
- `src/app/[slug]/partenaires/page.tsx` — page partenaires
- `src/app/[slug]/partenaires/dossier/page.tsx` — dossier partenaire

**Pages publiques statiques :**
- `src/app/page.tsx` — homepage
- `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx` — blog
- `src/app/comment-ca-marche/page.tsx`, `src/app/editions/page.tsx`, `src/app/palmares/page.tsx`
- `src/app/presse/page.tsx`, `src/app/presentation/page.tsx`
- `src/app/mentions-legales/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/reglement/page.tsx`
- `src/app/proposer-un-lieu/page.tsx`, `src/app/soutenir/page.tsx`, `src/app/go/page.tsx`

**Pages fonctionnelles :**
- `src/app/jury/page.tsx`, `src/app/jury/[token]/page.tsx` — interface jury (token QR)
- `src/app/checkin/[candidateId]/page.tsx` — self-checkin
- `src/app/corriger/[token]/page.tsx` — correction inscription
- `src/app/upload-mp3/[candidateId]/page.tsx` — upload MP3 (lien envoyé par email)

### Routes API (40 fichiers route.ts)

| Catégorie | Routes |
|-----------|--------|
| **Admin** | `admin/ai-analysis`, `admin/migrate-photos-to-r2`, `admin/social-preview`, `admin/social-publish`, `admin/token-refresh`, `admin/upload-image` |
| **Cron** | `cron/admin-report`, `cron/backup`, `cron/bandwidth-report`, `cron/health-check`, `cron/inscription-reminder`, `cron/jury-recap`, `cron/process-candidates`, `cron/social-post` |
| **Newsletter** | `newsletter/generate-image`, `newsletter/generate`, `newsletter/send` |
| **Push** | `push/cleanup`, `push/send`, `push/subscribe` |
| **Tracking** | `track/click`, `track/open`, `track` (page views) |
| **Paiement** | `stripe/webhook` |
| **Autres** | `register-candidate`, `send-registration-email`, `contact-presse`, `partner-inquiry`, `proposer-lieu`, `revalidate`, `unsubscribe`, `upload-to-r2`, `upload-url`, `social-card`, `candidate-portrait`, `checkin-status`, `monitoring`, `monitoring/ecosystem`, `pwa/install` |

### Composants : 100 fichiers .tsx dans `src/components/`

### Configuration (next.config.ts)
- **Images** : autorise Supabase (`xarrchsokuhobwqvcnkg.supabase.co`) et Cloudflare R2 (`pub-37ec13efdccb46f2bfdd62ab95fbd4d0.r2.dev`)
- **Server Actions** : bodySizeLimit = 25 MB
- **Security headers** : X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, X-XSS-Protection, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/microphone/geolocation bloquées), HSTS 1 an
- **Service Worker** : no-cache
- **Cache social cards** : 7 jours CDN

### Middleware (src/middleware.ts)
- **Matcher** : `/admin` et `/admin/:path*` uniquement
- Crée un client Supabase SSR, rafraîchit la session
- **Protection admin** : vérifie `auth.getUser()` puis lookup dans table `admin_users` par email
- Redirige vers `/admin/login` si non authentifié ou non admin
- Redirige les admins connectés depuis `/admin/login` vers `/admin`

---

## 2. PAGES ADMIN (35 pages)

### /admin
- **Rôle** : Dashboard principal — stats, stepper de phases, trafic, funnel PWA, installations récentes, candidats récents, changelog
- **Données** : `sessions`, `candidates`, `votes`, `pwa_installs`, `push_subscriptions`, `email_subscribers`, `page_views`, `donations`, `jurors`
- **Actions** : Lecture seule, liens vers sous-pages
- **Auth** : Middleware (admin_users)
- **Composants** : `SemifinalPrep`, `PwaFunnel`, `InstallsMap`, `DailyStats`, `ChangelogCard`

### /admin/login
- **Rôle** : Authentification admin (email + password)
- **Données** : `auth.signInWithPassword` + lookup `admin_users`
- **Actions** : Formulaire login, signOut si pas admin
- **Auth** : Page publique (exclue du middleware)
- **Composants** : `LogoRing`

### /admin/candidats
- **Rôle** : Liste de tous les candidats avec scores jury et events email distance
- **Données** : `candidates`, `jury_scores` (event_type=online), `email_events`
- **Actions** : Délégation au composant `CandidatsTable` (approbation, rejet, promotion, etc.)
- **Auth** : Middleware
- **Composants** : `CandidatsTable`

### /admin/sessions
- **Rôle** : Gestion des sessions/éditions du concours
- **Données** : `sessions`
- **Actions** : CRUD sessions (via `SessionManager`)
- **Auth** : Middleware
- **Composants** : `SessionManager`

### /admin/config
- **Rôle** : Configuration de la session active (dates, lieux, critères jury, phases)
- **Données** : `sessions` (active, config JSONB)
- **Actions** : Modification config, auto-avancement de phase (`autoAdvanceSessionStatus`), changement manuel de phase
- **Auth** : Middleware
- **Composants** : `AdminConfig`

### /admin/jury
- **Rôle** : Gestion des jurés (création, activation, QR codes, scores)
- **Données** : `jurors`, `candidates`, `jury_scores`
- **Actions** : CRUD jurés (via `JuryManager`)
- **Auth** : Middleware
- **Composants** : `JuryManager`

### /admin/jury-en-ligne
- **Rôle** : Régie du jury en ligne — classement, sélection demi-finalistes, notifications
- **Données** : `sessions`, `candidates`, `jury_scores` (online), `jurors` (online)
- **Actions** : Sélection/désélection semifinalistes, envoi notifications
- **Auth** : Middleware
- **Composants** : `RegieEnLigne`

### /admin/demi-finale
- **Rôle** : Régie demi-finale (gestion live event, lineup, jury, sélection finalistes)
- **Données** : `live_events` (semifinal), `lineup`, `candidates` (semifinalist), `jurors` (semifinal), `jury_scores` (semifinal)
- **Actions** : Créer event, gérer lineup, scores jury. Si event completed : sélection finalistes (`FinalisteSelection`)
- **Auth** : Middleware
- **Composants** : `RegieSemifinale`, `FinalisteSelection`, `CreateEventButton`

### /admin/demi-finale/checkin
- **Rôle** : Check-in des semifinalistes le jour J
- **Données** : `live_events` (semifinal), `candidates` (semifinalist), `lineup`
- **Actions** : Check-in / check-out candidats
- **Auth** : Middleware
- **Composants** : `CheckinManager`

### /admin/finale
- **Rôle** : Régie finale (lineup, scores, votes public, classement)
- **Données** : `live_events` (final), `lineup`, `candidates` (finalist), `jurors` (final), `jury_scores` (final), `live_votes`
- **Actions** : Gérer event final, rundown si pas encore créé. Candidats remplaçants possibles.
- **Auth** : Middleware
- **Composants** : `RegieFinale`, `FinaleRundown`

### /admin/finale/stats
- **Rôle** : Statistiques détaillées de la finale
- **Données** : `live_events` (final), `lineup`, `jury_scores` (final), `live_votes`, `jurors`, `candidates` (winner)
- **Actions** : Lecture seule
- **Auth** : Middleware
- **Composants** : `FinaleStats`

### /admin/newsletter
- **Rôle** : Composer et envoyer des newsletters (MailForge)
- **Données** : `sessions`, `email_campaigns`, `email_subscribers`
- **Actions** : Créer/envoyer campagnes, stats par source
- **Auth** : Middleware
- **Composants** : `NewsletterComposer`

### /admin/votes
- **Rôle** : Détail des votes publics, classement par candidat
- **Données** : `candidates`, `votes`
- **Actions** : Lecture seule
- **Auth** : Middleware

### /admin/photos
- **Rôle** : Gestion galerie photos (upload, tags, publication)
- **Données** : `photos`, `candidates`
- **Actions** : CRUD photos (via `PhotoAdmin`)
- **Auth** : Middleware
- **Composants** : `PhotoAdmin`

### /admin/social
- **Rôle** : Réseaux sociaux — previews automatiques, publication FB/IG, calendrier, historique
- **Données** : `sessions`, `social_posts_log` (client-side)
- **Actions** : Publier manuellement FB+IG (via `/api/admin/social-publish`), upload image, copier prompt image
- **Auth** : Middleware (page `use client`, fetch API)

### /admin/sponsors
- **Rôle** : Gestion partenaires/sponsors
- **Données** : `sponsors`
- **Actions** : CRUD sponsors (via `SponsorAdmin`)
- **Auth** : Middleware
- **Composants** : `SponsorAdmin`

### /admin/notifications
- **Rôle** : Envoi push notifications, segmentation par rôle, historique
- **Données** : `sessions`, `candidates`, `push_subscriptions`, `push_log`
- **Actions** : Envoyer push par segment (public, jury, admin, candidats)
- **Auth** : Middleware
- **Composants** : `NotificationsAdmin`

### /admin/blog
- **Rôle** : CRUD articles blog (titre, contenu HTML, tags, image, publication)
- **Données** : `blog_posts` (client-side)
- **Actions** : Créer, modifier, supprimer, publier/dépublier (via server actions `./actions`)
- **Auth** : Middleware

### /admin/analytics
- **Rôle** : Analyse trafic web (graphiques, insights IA, carte géo)
- **Données** : `page_views`, `email_campaigns`, `social_posts_log`, `candidates`
- **Actions** : Lecture seule
- **Auth** : Middleware
- **Composants** : `AnalyticsChart`, `AnalyticsInsights`, `GeoAnalyticsMap`

### /admin/editions
- **Rôle** : Gestion éditions archivées (photos, vidéos)
- **Données** : `sessions`, `photos`, `edition_videos`
- **Actions** : CRUD photos/vidéos pour éditions archivées
- **Auth** : Middleware
- **Composants** : `EditionsAdmin`

### /admin/events
- **Rôle** : Gestion événements live (semifinal/final)
- **Données** : `live_events`, `candidates`, `lineup`, `jurors`, `jury_scores`
- **Actions** : Créer/gérer live events, lineup
- **Auth** : Middleware
- **Composants** : `EventManager`

### /admin/chatbot
- **Rôle** : Gestion FAQ chatbot
- **Données** : `chatbot_faq`
- **Actions** : CRUD FAQ
- **Auth** : Middleware
- **Composants** : `ChatbotAdmin`

### /admin/seed
- **Rôle** : Injection données de test
- **Actions** : Injecter candidats/votes/jurés fictifs
- **Auth** : Middleware
- **Composants** : `SeedManager`

### /admin/abonnes
- **Rôle** : Liste abonnés email
- **Données** : `email_subscribers`
- **Actions** : Gestion abonnés (via `SubscribersList`)
- **Auth** : Middleware

### /admin/export-mp3
- **Rôle** : Export MP3 semifinalistes/finalistes pour le DJ
- **Données** : `candidates` (semifinalist/finalist/winner), `live_events`, `lineup`
- **Actions** : Télécharger MP3 par ordre de passage
- **Auth** : Middleware
- **Composants** : `ExportMp3Manager`

### /admin/resultats
- **Rôle** : Vue complète des résultats (jury + votes + live)
- **Données** : `candidates`, `jurors`, `jury_scores`, `votes`, `live_events`, `live_votes`
- **Actions** : Lecture seule
- **Auth** : Middleware
- **Composants** : `ResultsView`

### /admin/palmares
- **Rôle** : Palmarès des éditions archivées (gagnants)
- **Données** : `sessions` (archived), `candidates` (winner)
- **Auth** : Middleware
- **Composants** : `PalmaresAdmin`

### /admin/guide
- **Rôle** : Mode d'emploi admin interactif
- **Auth** : Middleware
- **Composants** : `AdminGuide`

### /admin/infra
- **Rôle** : Monitoring infrastructure Supabase (taille BDD, storage, santé)
- **Données** : SQL direct via API Supabase Management
- **Auth** : Middleware + `SUPABASE_ACCESS_TOKEN` requis

### /admin/stats-demi-finale
- **Rôle** : Stats marketing demi-finale (page views, votes par candidat)
- **Données** : `candidates`, `page_views`, `votes`
- **Auth** : Middleware
- **Composants** : `StatsDemiFinale`

### /admin/stats-en-ligne
- **Rôle** : Stats phase en ligne (jury scores, votes, shares, classement)
- **Données** : `candidates`, `jury_scores` (online), `jurors` (online), `votes`, `shares`
- **Auth** : Middleware
- **Composants** : `StatsEnLigne`

### /admin/stats-jury
- **Rôle** : Fiabilité et engagement jury (temps de visionnage, sessions, scores)
- **Données** : `jurors`, `jury_scores` (online), `candidates`, `juror_sessions`
- **Auth** : Middleware
- **Composants** : `JuryEngagementStats`

### /admin/visiteurs
- **Rôle** : Détail visiteurs (appareils, navigateurs, sources, pages vues)
- **Données** : `page_views`
- **Actions** : Lecture seule
- **Auth** : Middleware

### /admin/vocal-scores
- **Rôle** : Scores analyse vocale automatique (pipeline Demucs)
- **Données** : `candidates`, `vocal_analyses`, `jury_scores` (online), `jurors`
- **Actions** : Visualisation scores vocaux vs scores jury
- **Auth** : Middleware
- **Composants** : `VocalScoresAdmin`

### /admin/suivi-mp3
- **Rôle** : Suivi envoi MP3 par semifinalistes
- **Données** : `candidates` (semifinalist)
- **Auth** : Middleware
- **Composants** : `SuiviMp3`

---

## 3. RÉGIE LIVE

### 3.1 Architecture générale

3 niveaux d'événements :
1. **Phase en ligne** (jury en ligne, votes public) — géré par `RegieEnLigne.tsx`
2. **Demi-finale** (huis clos, jury présent) — géré par `RegieSemifinale.tsx` + `CheckinManager.tsx`
3. **Finale** (publique, en direct) — géré par `RegieFinale.tsx` + `FinaleRundown.tsx`

**Tables Supabase impliquées** :
- `live_events` : id, session_id, event_type (`semifinal`/`final`), status (`pending`/`live`/`paused`/`completed`), current_candidate_id, current_category, is_voting_open, winner_candidate_id, winner_revealed_at
- `lineup` : id, live_event_id, candidate_id, position, status (`pending`/`performing`/`completed`/`absent`), started_at, ended_at, vote_opened_at, vote_closed_at
- `live_votes` : live_event_id, candidate_id, fingerprint
- `photos` : session_id, photo_url, fingerprint, live_event_id, source (`crowd`), tag_candidate_id

### 3.2 RegieEnLigne (src/components/RegieEnLigne.tsx)

**Rôle** : Console admin pour la phase jury en ligne (pré-demi-finale). Classement des candidats par catégorie après évaluation du jury en ligne.

**Affichage** :
- Bandeau de phase (status session avec couleur)
- Toggle pour fermer/rouvrir le vote jury en ligne (`config.jury_online_voting_closed`)
- 5 cards stats : candidats, votes, jurés actifs, évalués, approuvés
- Podiums (1ers et 2nds par catégorie) avec score composite : `oui% * 60 + likes_normalized * 30 + verdict_bonus * 10`
- Tableau par catégorie avec verdict par candidat (oui/peut-être/non), % favorable/défavorable

**Interactions** :
- `promoteToSemifinalist` / `demoteFromSemifinalist` : promouvoir/révoquer un candidat comme demi-finaliste
- `bulkPromoteCategory` : promotion en lot de tous les favorables d'une catégorie
- Modal email : aperçu HTML des emails de sélection/rejet + envoi via `sendSelectionNotifications`

### 3.3 RegieSemifinale (src/components/RegieSemifinale.tsx)

**Rôle** : Console de régie pour la demi-finale huis clos. Gère le passage en direct des candidats un par un.

**Affichage** :
- Header avec chronomètre de performance et chrono de vote (countdown)
- Badge statut en temps réel (EN DIRECT / En pause / Terminé)
- Barre de progression (passés / sur scène / en attente / non arrivés / absents)
- Liste du lineup avec actions contextuelles
- Compteur de votes jury par candidat (polled toutes les 3s)
- Étoiles moyennes par candidat après passage

**Interactions** :
- `handleStart()` : passer l'event en `live`
- `handleCall(candidateId)` : appeler un candidat sur scène (status `performing`, push jury)
- `handleOpenVoting()` : ouvrir le vote jury
- `handleFinish()` : terminer la performance
- `replayCandidate()` : repasser un candidat
- `markAbsent()` : marquer absent
- `resetJuryScores()` : remettre à zéro les notes jury d'un candidat

**Supabase Realtime** :
- `useRealtimeEvent` sur `live_events` (Realtime UPDATE + polling 5s)
- `useRealtimeLineup` sur `lineup` (Realtime INSERT/UPDATE/DELETE)
- `useJuryNotifications` sur `jury_scores` (Realtime INSERT/UPDATE/DELETE + polling 5s)

### 3.4 RegieFinale (src/components/RegieFinale.tsx)

**Rôle** : Console de régie pour la Grande Finale publique. Ajoute la dimension votes public en direct et classement pondéré.

**Affichage** :
- Onglets par catégorie (Enfant/Ado/Adulte) avec badge quand catégorie terminée
- Chronomètre performance + chrono vote
- Classement temps réel via `ClassementPanel` : `jury_normalized * juryWeight + public_normalized * publicWeight + social_normalized * socialWeight`
- Éditeur de poids en live (jury/public/social) sauvegardable en base
- Modal de remplacement (ajouter un candidat de secours)
- Modal de révélation du gagnant avec confirmation

**Interactions** :
- `handleStartCategory(category)` : démarrer une catégorie
- `handleAdvance()` : passer au candidat suivant
- `handleToggleVoting()` : ouvrir/fermer le vote public + jury
- `handleRevealWinner()` : déclencher la révélation
- `handleSaveWeights()` : sauvegarder les poids de notation

**Supabase Realtime** :
- `useRealtimeEvent` sur `live_events`
- `useRealtimeLiveVotes` sur `live_votes` (Realtime INSERT + polling 5s)
- `useJuryNotifications` sur `jury_scores`

### 3.5 LiveView — Vue public (src/components/LiveView.tsx)

**Rôle** : Vue spectateur pour `/[slug]/live`. Accessible au public uniquement pendant la FINALE (demi-finale = huis clos).

**Affichage** :
- Bandeau statut (EN DIRECT / Commence bientôt / En pause / Terminée)
- Photo grand format du candidat en cours + nom + catégorie + chanson + bio
- Bouton "Je soutiens !" quand voting ouvert (1 vote par fingerprint par candidat)
- "À suivre" : prochain candidat
- Boutons de partage + inscription email/push

**Supabase Realtime** :
- `useRealtimeEvent` : mise à jour en direct
- `useRealtimeLiveVotes` : compteur de votes en direct
- `useWinnerReveal` : détection de `winner_revealed_at` pour lancer l'animation

### 3.6 Check-in

**CheckinManager** : vue admin avec QR code imprimable pointant vers `/{slug}/checkin`. Liste des candidats avec filtres, check-in manuel. Poll toutes les 5s.

**SelfCheckin** : vue candidat. Le candidat tape son nom, sélectionne son profil, confirme. Insert dans `lineup` avec position=0, status=`pending`.

### 3.7 FinaleRundown (src/components/FinaleRundown.tsx)

Feuille de route de la finale. Timeline visuelle avec blocs par catégorie, drag-and-drop pour réordonner, estimations de durée, badge MP3 (présent ou manquant). Bouton "Créer la finale et lancer la régie".

### 3.8 WinnerReveal + WinnerCountdown

**WinnerCountdown** : overlay plein écran avec pièce 3D tournante. Photos des finalistes qui défilent de plus en plus lentement. À 0 : confetti (`canvas-confetti`) + lock sur le gagnant. Durée ~13s.

**WinnerReveal** : overlay avec trophée, photo du gagnant, confetti (burst + cannons + pluie 5s). Portal dans `document.body`.

### 3.9 LivePhotoCapture

Mode Reporter côté spectateur mobile. Max 5 photos avec cooldown 30s. Compression JPEG 1200px max. Upload R2. Insert `photos` avec `source: 'crowd'`.

### 3.10 Comportement offline/online

**Stratégie duale partout** : chaque hook Realtime utilise :
1. Supabase Realtime (WebSocket) pour la latence quasi-nulle
2. Polling fallback (5s) pour les cas où le WebSocket tombe
3. `visibilitychange` listener : re-poll quand la page redevient visible

**Pas de mode offline persistant** : les votes et scores ne sont PAS stockés en localStorage/IndexedDB. Si la connexion est coupée, les actions échouent silencieusement.

---

## 4. JURY — Système complet

### 4.1 Accès jury : QR → URL → page

1. L'admin crée un juré dans `JuryManager` avec nom, email, rôle (`online`/`semifinal`/`final`)
2. Un `qr_token` UUID est généré automatiquement
3. L'admin peut envoyer une invitation email contenant `/jury/{qr_token}`
4. Le juré peut aussi se connecter via `/jury` en entrant son email → redirect vers `/jury/{qr_token}`

**Page `/jury/[token]`** :
- Requête admin (bypass RLS) : `jurors` par `qr_token` + `is_active=true`
- Si `role=online` et `jury_online_voting_closed` : page "Jury terminé, merci"
- Filtre candidats selon le rôle
- Route vers `JuryExperience` (online) ou `JuryScoring` directement (semifinal/final)

### 4.2 JuryExperience

Orchestre le parcours juré en ligne :
1. **Onboarding** (`JuryOnboarding`) : splash de bienvenue
2. **Dashboard** (`JuryDashboard`) : progression, stats (oui/peut-être/non), deadline
3. **Voting** (`JuryScoring` en mode TikTok feed)

**Tracking** :
- `trackJurorLogin()` : incrémente `login_count`, push notif admin
- `heartbeatJuror()` : toutes les 30s, met à jour `last_seen_at` + gère `juror_sessions`

### 4.3 Critères de notation — 3 modes

#### Mode Online (TikTok Feed) — `role='online'`
- **Critère unique** : décision `oui` / `peut-être` / `non`
- **Scores** : oui=2, peut-être=1, non=0
- **Stockage** : `jury_scores.scores = { decision: "oui"|"peut-être"|"non" }`, `total_score = 0|1|2`
- **UI** : feed vertical swipeable, vidéo YouTube/audio MP3, 3 boutons
- **Tracking** : `viewed_at`, `watch_seconds`
- **event_type** : `"online"`

#### Mode Demi-finale (Star Rating) — `role='semifinal'`
- **Critère unique** : étoiles 1 à 5
- **Labels** : 1=Raté, 2=Moyen, 3=Bien, 4=Super, 5=Top
- **Stockage** : `jury_scores.scores = { stars: 1-5 }`, `total_score = 1-5`
- **Auto-push** : quand l'admin ouvre le vote, le formulaire s'ouvre automatiquement
- **event_type** : `"semifinal"`

#### Mode Finale (Critères multiples) — `role='final'`
- **Critères** : définis dans `session.config.jury_criteria` (tableau dynamique `{ name, max_score }`)
- **Notation** : 1 à 5 étoiles par critère
- **Stockage** : `jury_scores.scores = { "Technique vocale": 4, "Interprétation": 3, ... }`, `total_score = somme`
- **event_type** : `"final"`

### 4.4 Table jury_scores

```
jury_scores:
  id: uuid
  session_id: uuid (FK sessions)
  juror_id: uuid (FK jurors)
  candidate_id: uuid (FK candidates)
  event_type: text ("online" | "semifinal" | "final")
  scores: jsonb
  total_score: number
  comment: text | null
  viewed_at: timestamp | null (online only)
  watch_seconds: integer | null (online only)
  created_at: timestamp
  UNIQUE(juror_id, candidate_id, event_type)
```

### 4.5 Agrégation des scores

**Phase en ligne** (RegieEnLigne) :
- Par candidat : compte des oui/peut-être/non
- `ouiPercent = oui / total_votes`
- Verdict : `ouiPercent > 0.5` → favorable, `nonPercent > 0.5` → défavorable, sinon balance

**Phase demi-finale** (FinalisteSelection) :
- Moyenne des étoiles par candidat, tri desc

**Phase finale** (ClassementPanel) :
- Score composé pondéré :
  - `juryNormalized = avgJuryScore / maxCriteriaScore * 100`
  - `publicNormalized = publicVotes / maxPublicVotes * 100`
  - `socialNormalized = socialLikes / maxSocialLikes * 100`
  - `totalScore = juryN * juryWeight + publicN * publicWeight + socialN * socialWeight`
- Poids par défaut : jury 40%, public 40%, réseaux 20%
- Poids éditables en temps réel par l'admin

### 4.6 Comportement hors ligne jury

Pas de mode offline. Scores envoyés directement à Supabase. En cas d'erreur : `alert('Erreur')`. Pas de queue offline, pas de stockage local temporaire.

---

## 5. VOTES PUBLIC

### 5.1 Deux systèmes distincts

- **Vote "likes" (hors live)** : table `votes` — vote permanent sur le profil d'un candidat
- **Vote live (pendant la finale)** : table `live_votes` — vote pendant la performance

### 5.2 Vote Likes — CandidateVoteButton

- Au mount : `getFingerprint()` puis check `votes` table pour `candidate_id + fingerprint`
- Au clic : appel RPC `vote_for_candidate(p_session_id, p_candidate_id, p_fingerprint)`
- Optimistic update du compteur + `hasVoted = true`
- Bouton désactivé après vote

**Table votes** :
```
votes:
  id: uuid
  session_id: uuid
  candidate_id: uuid
  fingerprint: text (SHA-256)
  ip_address: text
  user_agent: text
  created_at: timestamp
  UNIQUE(candidate_id, fingerprint)
```

**Pas de champ phase/round** dans la table votes.

### 5.3 Vote Live — LiveView

- Bouton "Je soutiens !" quand `is_voting_open` est true
- Insert dans `live_votes` avec fingerprint
- Optimistic update de `votedIds`

**Table live_votes** :
```
live_votes:
  id: uuid
  live_event_id: uuid (FK live_events)
  candidate_id: uuid (FK candidates)
  fingerprint: text (SHA-256)
  created_at: timestamp
  UNIQUE(live_event_id, candidate_id, fingerprint)
```

### 5.4 Fingerprint (src/lib/fingerprint.ts)

Concaténation de 6 propriétés navigateur :
1. `navigator.userAgent`
2. `navigator.language`
3. `screen.width x screen.height`
4. `screen.colorDepth`
5. `Intl.DateTimeFormat().resolvedOptions().timeZone`
6. `navigator.hardwareConcurrency`

Hashage SHA-256 (HTTPS) ou djb2 fallback (HTTP dev).

**Limites** : pas de FingerprintJS, pas de canvas fingerprinting. Suffisant pour bloquer le vote multiple depuis un même navigateur.

### 5.5 Comptage temps réel (finale)

Hook `useRealtimeLiveVotes` :
- Realtime INSERT sur `live_votes` → increment local
- Polling fallback 5s
- Utilisé dans `RegieFinale` (admin) et `LiveView` (public)

---

## 6. PHASES — Machine à états

### Stockage
- **Table** : `sessions.status` (TEXT avec CHECK constraint)
- **Valeurs** : `draft` → `registration_open` → `registration_closed` → `semifinal` → `final` → `archived`

### Changement de phase

**Manuel** : via `AdminConfig` — utilise `getNextStatus()`, stepper visuel

**Automatique** : via `autoAdvanceSessionStatus()` (`src/lib/auto-advance.ts`)
- `draft` → `registration_open` : quand `config.registration_start` est passé
- `registration_open` → `registration_closed` : le jour après `config.registration_end`
- Les transitions semifinal/final/archived restent manuelles

**Push automatiques** : `PHASE_PUSH_MESSAGES` dans `phases.ts` — messages push envoyés à chaque transition

### Guards par phase

| Guard | Fichier | Logique |
|-------|---------|---------|
| Inscription candidat | `[slug]/inscription/page.tsx` | Bloquée si pas `draft` ou `registration_open` |
| CTA inscription homepage | `page.tsx` | CTA si `draft`/`registration_open`, sinon "Résultats"/"Candidats" |
| Notifications segmentées | `NotificationsAdmin.tsx` | `isStatusAtOrPast()` pour filtrer segments |
| Sélection semifinalistes | `RegieEnLigne.tsx` | Visible quand `registration_closed` |
| Sélection finalistes | `admin/demi-finale` | Visible quand event `completed` |

### Parcours candidat (candidates.status)

```
pending → approved → semifinalist → finalist → winner
              \→ rejected
```

---

## 7. COMMUNICATIONS

### 7.1 Email (Resend + SMTP)

**Double canal** (`src/lib/smtp.ts`) :
- **Sur Vercel** : Resend API
- **En local** : SMTP IONOS (`smtp.ionos.fr:587`, nodemailer)
- From : `ChanteEnScene <inscriptions@chantenscene.fr>`

**9 templates email** (`src/lib/emails.ts`) :

| Fonction | Usage |
|---|---|
| `registrationConfirmationEmail` | Confirmation inscription candidat |
| `correctionRequestEmail` | Demande de correction candidature |
| `candidateApprovedEmail` | Notification approbation candidat |
| `juryWeeklyRecapEmail` | Recap hebdo jury en ligne |
| `adminReportEmail` | Rapport admin quotidien/hebdomadaire |
| `newsletterEmail` | Newsletter composée (sections colorées, images, CTA) |
| `inscriptionReminderEmail` | Rappel ouverture inscriptions (J-5, J0) |
| `juryInvitationEmail` | Invitation jury (lien QR token) |
| `healthCheckEmail` | Rapport health-check |

**Envoi batch** (`/api/newsletter/send`) :
- Séquentiel avec 200ms entre chaque email
- Header `List-Unsubscribe`
- Met à jour `email_campaigns` (status, total_sent, total_errors)

**Génération IA newsletters** :
- Cascade : Gemini Flash → Groq Llama → OpenAI GPT-4o-mini
- 3 modes : suggest (thèmes), compose (sections), quick suggest
- 5 tons : décalé, pro, chaleureux, urgence, inspirant

**Génération images** : Gemini 2.5 Flash (gratuit) → DALL-E 3 (payant ~0.04$)

### 7.2 Push VAPID

**Segmentation** : `public`, `jury`, `admin`, `all`, `jury_online`, `jury_semi`, `jury_finale`, `all_candidates`, `approved`, `semifinalist`, `finalist`, `specific_candidate`

Le segment candidat utilise `candidates.fingerprint` pour matcher les `push_subscriptions`.

**APIs** :
- `POST /api/push/subscribe` : inscrit, déduplique par endpoint+session+role
- `POST /api/push/send` : envoi admin, logue dans `push_log`
- `POST /api/push/cleanup` : supprime subscriptions d'un rôle jury

**Presets admin** : vote ouvert/fermé, sur scène, entracte, résultats, pause

### 7.3 Social Auto

**Librairie** (`src/lib/social.ts`) :
- Facebook : Graph API v24.0 (post texte + post photo)
- Instagram : Graph API v24.0 (création container → attente → publication)
- `publishEverywhere(message, imageUrl?, link?)` : publie FB + IG simultanément

**Cron social** (`/api/cron/social-post`, schedule `0 9 * * *`) :
- 1 post max/jour/session
- Types par priorité :
  1. Nouveaux candidats (48h, jamais annoncés)
  2. Portrait spotlight (candidat avec le moins de votes)
  3. Countdown inscriptions (J-30, J-14, J-7, J-3, J-1)
  4. Countdown demi-finale (J-7 à J-1)
  5. Countdown finale (J-7 à J-1)
  6. Rappel de vote (jeudi)
  7. Countdown fermeture votes (J-7, J-3, J-1)
  8. Parrainage (mercredi, 5+ candidats)
  9. Promo hebdo (lundi)
- UTM tracking sur tous les liens
- Logue dans `social_posts_log`

**Admin social** (`/admin/social`) : preview, publication manuelle, calendrier, historique

### 7.4 Telegram

**Destinataire unique** : Chat ID `8064044229` (Jisse) via `@ChanteEnScene_bot`

**Alertes** :
- Résultat publication FB/IG (cron social)
- Pipeline automatique (R2 migrations, analyses vocales)
- Rapport bandwidth quotidien

---

## 8. PIPELINE CANDIDAT

### Flow complet

1. **Inscription** : formulaire `/[slug]/inscription` → POST `/api/register-candidate` → insert `candidates` (status `pending`) → email confirmation → push admin

2. **Paiement Stripe** : **pas de paiement pour l'inscription** — gratuit. Stripe = dons/sponsors uniquement.

3. **Cron pipeline** (`/api/cron/process-candidates`, 30 min IONOS) :
   - **Étape A — Migration R2** : détecte URLs Supabase Storage → télécharge → upload R2 → update candidates → supprime de Supabase (économie bandwidth)
   - **Étape B — Analyse vocale Demucs** : détecte candidats avec vidéo sans `vocal_analyses` → télécharge audio → POST `DEMUCS_URL/separate?two_stems=vocals` → poll `/status/{job_id}` (max 10 min) → GET `/analyze/{job_id}` → max 3 analyses/run

4. **Scoring** : upsert `vocal_analyses` (justesse_pct, justesse_label, tessiture, octaves, voice_type, stability, vibrato, zones, BPM, tonalité, raw_data)

5. **Coach IA** : pas de génération coaching IA automatique dans le pipeline

6. **Notification admin** : Telegram (résumé pipeline + détail par candidat analysé) + cleanup Demucs

---

## 9. CRONS

### Déclarés dans vercel.json (3 crons Vercel)

| URL | Schedule | Description |
|---|---|---|
| `/api/cron/admin-report` | `0 6 * * *` (6h) | Rapport admin quotidien/hebdomadaire |
| `/api/cron/social-post` | `0 9 * * *` (9h) | Publication sociale automatique |
| `/api/cron/bandwidth-report` | `0 20 * * *` (20h) | Rapport bandwidth Supabase |

### Non déclarés (IONOS ou manuels)

| URL | Fréquence | Description |
|---|---|---|
| `/api/cron/process-candidates` | 30 min (IONOS) | Pipeline R2 + analyse vocale |
| `/api/cron/backup` | non schedulé | Backup JSON → R2 (19 tables, rétention 8 backups) |
| `/api/cron/health-check` | non schedulé | Health check complet (pages, BDD, storage, push, emails) |
| `/api/cron/inscription-reminder` | non schedulé | Rappel inscriptions J-5 et J0 (auto-ouvre inscriptions à J0) |
| `/api/cron/jury-recap` | non schedulé | Recap hebdo jury en ligne par email |

### Détail

**admin-report** : stats en parallèle, quotidien = push seul, dimanche = email + push complet. Fréquence configurable par session. Déduplique par `config.last_report_sent_at`.

**bandwidth-report** : Supabase Analytics API → requêtes storage/REST/auth, estimation GB, trend, ping site, analyse coût Pro (seuil 5.5 GB free tier). Rapport via Telegram.

**backup** : 19 tables en JSON, upload R2, rétention 8 backups, max 10000 lignes/table.

**health-check** : 7 pages publiques (HTTP), 4 APIs sécurité (doivent retourner 401), BDD (taille, tables), Storage, backup age, push, emails. Verdict global ok/warn/ko. Email + push admin.

**inscription-reminder** : J-5 et J0 uniquement. J0 : auto-ouvre inscriptions (`status → registration_open`) + publie FB+IG. Emails à tous les abonnés (600ms entre chaque).

**jury-recap** : jurys en ligne actifs, calcule votes faits vs restants, email personnalisé via Resend.

---

## 10. SCHÉMA DB

### Tables principales (28 tables + 37 migrations)

| Table | Colonnes clés | Relations |
|-------|--------------|-----------|
| **sessions** | id, name, slug, city, year, status, is_active, config (JSONB) | Parent de tout |
| **candidates** | id, session_id, first/last_name, stage_name, email, category, photo/video/mp3_url, song_title/artist, bio, slug, status, correction_token, finale_songs, likes_count, referred_by, fingerprint | FK sessions |
| **votes** | id, session_id, candidate_id, fingerprint, ip_address, user_agent | FK sessions+candidates, UNIQUE(candidate_id, fingerprint) |
| **jurors** | id, session_id, first/last_name, email, role, qr_token, is_active, onboarding_done, last_login/seen_at, login_count | FK sessions |
| **jury_scores** | id, session_id, juror_id, candidate_id, event_type, scores (JSONB), total_score, comment, viewed_at, watch_seconds | FK sessions+jurors+candidates, UNIQUE(juror_id, candidate_id, event_type) |
| **live_events** | id, session_id, event_type, status, current_candidate_id, current_category, is_voting_open, winner_candidate_id, winner_revealed_at | FK sessions |
| **lineup** | id, live_event_id, candidate_id, position, status, started/ended_at, vote_opened/closed_at | FK live_events+candidates |
| **live_votes** | id, live_event_id, candidate_id, fingerprint | FK live_events+candidates, UNIQUE(live_event_id, candidate_id, fingerprint) |
| **photos** | id, session_id, photo/thumbnail_url, caption, tag_type, tag_candidate_id, published, source | FK sessions |
| **admin_users** | id, email (UNIQUE), role (super_admin/local_admin), session_ids | Standalone |
| **page_views** | id, session_id, candidate_id, page_path, fingerprint, ip, user_agent, referrer, duration, geo | FK sessions |
| **push_subscriptions** | id, session_id, endpoint, p256dh, auth, role, juror_id, fingerprint | FK sessions, RLS |
| **email_subscribers** | id, session_id, email, source, fingerprint, unsubscribe_token, is_active | FK sessions, RLS |
| **email_campaigns** | id, session_id, subject, body, image_url, status, target, total_recipients/sent/errors, sent_at | FK sessions |
| **email_events** | campaign_id, subscriber_email, event_type | Tracking |
| **social_posts_log** | id, session_id, post_type, source, message, image_url, link, fb/ig_post_id, error | FK sessions, RLS |
| **push_log** | id, session_id, title, body, url, image, role, is_test, sent, failed, expired, sent_by | FK sessions, RLS |
| **sponsors** | id, session_id, name, logo_url, website_url, description, tier, position, published | FK sessions |
| **donations** | id, session_id, amount_cents, tier, donor_name/email, stripe_session_id, notes | FK sessions, RLS |
| **shares** | id, session_id, candidate_id, platform | FK sessions+candidates |
| **pwa_installs** | id, session_id, platform, install_source, city, region, lat/lng | FK sessions |
| **blog_posts** | id, title, slug (UNIQUE), excerpt, content, featured_image, published, author, tags | RLS: anyone reads published |
| **vocal_analyses** | id, session_id, candidate_id, justesse_pct/label, tessiture_low/high, octaves, voice_type, stability, vibrato, zones, bpm, key, raw_data | FK sessions+candidates |
| **chatbot_faq** | id, session_id, question, answer, sort_order, is_active | FK sessions |
| **chatbot_conversations** | id, session_id, messages (JSONB) | FK sessions |
| **edition_videos** | id, session_id, youtube_url, title, description, published, sort_order | FK sessions |
| **juror_sessions** | id, juror_id, session_id, started/last_ping/ended_at | FK jurors+sessions |
| **facebook_posts** | id, session_id, post_type, content, photo_urls, facebook_post_id, status, scheduled_for, published_at | FK sessions |

### Config JSONB de session

```json
{
  "age_categories": [{"name":"Enfant","min_age":6,"max_age":12}, ...],
  "registration_start": "2026-03-01",
  "registration_end": "2026-06-01",
  "semifinal_date": "2026-06-17",
  "final_date": "2026-07-16",
  "max_video_duration_sec": 180,
  "max_votes_per_device": 50,
  "semifinalists_per_category": 10,
  "finalists_per_category": 5,
  "jury_weight_percent": 60,
  "public_weight_percent": 40,
  "jury_criteria": [{"name":"Justesse vocale","max_score":10}, ...]
}
```

---

## 11. STRIPE

**Modèle** : dons / sponsoring uniquement (pas d'abonnement, pas de paiement inscription)

**Produits (Payment Links)** :

| Lien | Montant |
|---|---|
| Don libre | à partir de 1 EUR |
| Partenaire Or | 500 EUR |
| Partenaire Argent | 250 EUR |
| Partenaire Bronze | 100 EUR |
| Supporter | 50 EUR |

**Webhook** (`/api/stripe/webhook`) :
- Écoute `checkout.session.completed`
- Vérification signature HMAC-SHA256 (tolérance 5 min)
- Actions post-paiement :
  1. Email admin (montant, nom, email, formule)
  2. Email remerciement donateur
  3. Push notification admin
  4. Insert `donations` (session_id, amount_cents, tier, donor_name/email, stripe_session_id)
- Tiers automatiques : 500+ = Or, 250+ = Argent, 100+ = Bronze, 50+ = Supporter, sinon = Don

**Session gratuite** : oui, l'inscription candidat est 100% gratuite.

---

## 12. SÉCURITÉ

### Authentification
- **Supabase Auth** : email/password via `@supabase/ssr`
- **Middleware** : protège `/admin/*` sauf `/admin/login`
- **Jury** : accès par QR token unique (pas de compte Supabase Auth)
- **Candidats** : pas d'authentification — inscription publique, correction via `correction_token`

### RLS (Row Level Security)
- **Active** sur : `push_subscriptions`, `email_subscribers`, `social_posts_log`, `push_log`, `donations`, `blog_posts`
- Tables principales (`sessions`, `candidates`, `votes`, `jurors`, `jury_scores`, `live_events`, `lineup`, `live_votes`) : **RLS non active** — sécurité par middleware et code applicatif
- L'admin utilise `createAdminClient()` avec `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)

### Variables d'environnement (44 variables)

| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` | Client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (bypass RLS) |
| `SUPABASE_ACCESS_TOKEN` | API Management |
| `CRON_SECRET` | Protection routes cron |
| `RESEND_API_KEY`, `SMTP_*` | Emails |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiements |
| `FACEBOOK_PAGE_TOKEN`, `INSTAGRAM_TOKEN/ACCOUNT_ID` | Social |
| `VAPID_*` | Push notifications |
| `R2_*` | Cloudflare R2 storage |
| `TELEGRAM_BOT_TOKEN` | Notifications admin |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY` | Cascade IA |
| `DEMUCS_URL` | Pipeline vocale (PCmusique) |

### Rate limiting
- **Pas de rate limiting applicatif explicite**
- Anti-spam votes : UNIQUE(candidate_id, fingerprint)
- Anti-spam live votes : UNIQUE(live_event_id, candidate_id, fingerprint)
- `config.max_votes_per_device` : 50 (vérification côté client)
- Crons : protégés par `Bearer {CRON_SECRET}`
- XSS prevention : `escapeHtml()` dans templates email

---

## 13. POINTS D'ATTENTION

1. **RLS non active** sur les tables principales (`candidates`, `votes`, `jury_scores`, etc.) — la `anon_key` est publique, un client pourrait théoriquement lire/écrire directement
2. **Pas de rate limiting** applicatif — les routes publiques (register-candidate, votes) sont ouvertes
3. **Fingerprint basique** (6 signaux navigateur) — contournable par changement de navigateur/appareil
4. **Pas de mode offline jury** — si la connexion tombe pendant le vote, le score est perdu
5. **Pas de Coach IA automatique** dans le pipeline candidat — la génération de feedback IA n'est pas intégrée au cron
6. **4 crons non schedulés** (backup, health-check, inscription-reminder, jury-recap) — doivent être déclenchés manuellement ou via IONOS
7. **max_votes_per_device = 50** vérifié côté client uniquement, pas de contrainte serveur
8. **sendTelegram() redéfini localement** dans chaque cron — pas de fonction centralisée
