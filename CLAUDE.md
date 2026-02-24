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
| **chante-en-scene** | www.chantenscene.fr | **PRODUCTION** — seul projet actif |

- Le CLI `vercel` est linké au projet **chante-en-scene**
- CRON_SECRET prod : dans `.env.keys` et Vercel (ne pas committer)
- Ancien projet **chante-en-scene-batx** supprimé le 23/02/2026 (causait des crons en doublon)
- Variables `NEXT_PUBLIC_*` sont baked dans le JS au build — tout changement nécessite un redéploiement

### Crons Vercel (vercel.json)
| Route | Schedule | Heure Paris | Description |
|-------|----------|-------------|-------------|
| `/api/cron/admin-report` | `0 7 * * *` | 8h tous les jours | Rapport admin par email + push |
| `/api/cron/social-post` | `0 9 * * *` | 10h tous les jours | Publication auto réseaux sociaux |
| `/api/cron/jury-recap` | `0 10 * * 1` | 11h chaque lundi | Récap jury hebdomadaire |
| `/api/cron/backup` | `0 0 * * 0` | 1h chaque dimanche | Backup BDD dans Supabase Storage |
| `/api/cron/inscription-reminder` | `0 9 * * *` | 10h tous les jours | Rappel inscriptions J-5 + Jour J (email + push) |
| `/api/cron/health-check` | `0 8 1 * *` | 9h le 1er du mois | Checkup complet du site (email + push admin) |

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
- Lib serveur : `src/lib/push.ts` (web-push, nettoyage auto des 410 expirées, **segmentation par fingerprint candidat**)
- Subscribe : `src/app/api/push/subscribe/route.ts` (pattern delete+insert, pas d'upsert)
- Send : `src/app/api/push/send/route.ts` (protégé admin, log dans `push_log`, **supporte segment + candidateId**)
- **Segmentation** : ciblage par rôle (public/jury/admin) + par statut candidat (inscrits/approuvés/demi-finalistes/finalistes/individuel) via fingerprint matching
- Bouton "Tester sur mon appareil" dans l'admin notifications (envoie au endpoint du navigateur courant)
- Page dédiée : `/admin/notifications` (séparée de la page social)

### Stripe (paiements en ligne)
- **Statement descriptor** : CHANTENSCENE / CES
- **Virements** : automatiques, hebdomadaires le lundi
- **Clés** : dans `.env.keys` et `.env.local` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- **Webhook** : `/api/stripe/webhook` — email + push admin + insert `donations` à chaque paiement
- **Dashboard** : Carte "Dons & Partenariats" sur `/admin` (total €, nombre, dernier don)
- 5 liens de paiement actifs (Supporter 50€, Bronze 100€, Argent 250€, Or 500€, Don libre)
- Après paiement, redirection vers `/aubagne-2026/partenaires?merci=1` (ou `?merci=don`)
- Détails complets (compte, liens, IDs) dans `.env.keys`

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
- **social_posts_log** : Historique publications sociales (manuelles + cron), avec source, image, lien FB/IG
- **push_log** : Historique notifications push envoyées (titre, body, url, image, role, is_test, sent/failed/expired, sent_by)
- **donations** : Paiements Stripe reçus (montant, tier Don/Supporter/Bronze/Argent/Or, donateur, stripe_session_id)

### Session active
- **ChanteEnScène Aubagne 2026** — ID: `682bef39-e7ec-4943-9e62-96bfb91bfcac` — status: `draft`
- Sessions palmarès (2023, 2024, 2025) : archivées, IDs fixes `a0000000-...-2023/2024/2025`

## Routes publiques (dynamiques par session slug)
- `/:slug/` — Redirige vers `/` (évite page vide)
- `/:slug/candidats` — Galerie candidats (mobile: swipe TikTok, desktop: feed social)
- `/:slug/candidats/:candidateSlug` — Profil candidat
- `/:slug/live` — Streaming live + vote en direct
- `/:slug/inscription` — Formulaire inscription 4 étapes
- `/:slug/mon-profil` — Gestion profil candidat
- `/:slug/galerie` — Galerie photos
- `/palmares` — Palmarès
- `/editions` — Galerie des éditions (photos + vidéos YouTube par année)
- `/presse` — Espace presse (dossier PDF, photos HD, formulaire contact)
- `/proposer-un-lieu` — Formulaire proposition de lieu pour accueillir une édition
- `/soutenir` — Page don libre Stripe (chiffres impact, postes numériques)
- `/comment-ca-marche` — Explication du fonctionnement du concours
- `/go` — Page trampoline email→PWA (mobile: propose ouvrir/installer l'appli, desktop: redirige immédiat)
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
- `/admin/notifications` — Notifications push (segmentation candidats, historique, push par étape)
- `/admin/chatbot` — Gestion FAQ
- `/admin/editions` — Galerie éditions (photos publish/unpublish, vidéos YouTube)
- `/admin/infra` — Infrastructure Supabase (jauges BDD/Storage, tables, buckets, santé)
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
- `/api/cron/inscription-reminder` (GET) — Rappel inscriptions J-5 + Jour J
- `/api/cron/health-check` (GET) — Checkup complet du site (pages, APIs, Supabase, push, emails)
- `/api/admin/upload-image` (GET/POST) — Liste images bucket Storage (GET) + Upload image (POST), protégé admin
- `/api/admin/social-publish` (POST) — Publication manuelle FB/IG, log dans social_posts_log
- `/api/admin/social-preview` (GET) — Prévisualisation publications auto
- `/api/contact-presse` (POST) — Formulaire contact presse → email via Resend
- `/api/proposer-lieu` (POST) — Formulaire proposition de lieu → email via Resend
- `/api/stripe/webhook` (POST) — Webhook Stripe → email + push admin + insert donations

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
- `PublicNav.tsx`, `PublicFooter.tsx` (4 colonnes), `AdminSidebar.tsx` (13 sections), `MobileMenu.tsx`, `ToastProvider.tsx`

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
- `ChangelogCard.tsx` — Commits GitHub récents (server component, cache 1h)
- `PresseContactForm.tsx` — Formulaire contact presse (client component)
- `ProposerLieuForm.tsx` — Formulaire proposition de lieu (client component)
- `GoogleAnalytics.tsx` — Google Analytics gtag.js (conditionnel NEXT_PUBLIC_GA_ID)

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

## Roadmap — Fonctionnalités à développer

### CAPITAL — Page Générique de fin (`/generique`)
- **Concept** : Générique cinématographique défilant (style crédits de film), affiché sur les téléphones du public après l'annonce du gagnant en finale
- **PAS d'écran géant** — tout passe par les téléphones et desktop uniquement (c'est la raison d'être de l'appli)
- **Contenu dynamique** (données en BDD) :
  1. Logo ChanteEnScène + édition
  2. Gagnant (doré, mise en avant)
  3. Finalistes + demi-finalistes
  4. Jury
  5. **Logos sponsors** (placement premium, bien visibles)
  6. **Noms des donateurs** (opt-in : checkbox "afficher mon nom" au moment du don Stripe)
  7. Histoire courte de ChanteEnScène (2023 → 2026)
  8. Crédits (photos Playymo, etc.)
- **Motivation dons** : mentionner sur `/soutenir` + email confirmation Stripe que le nom apparaît dans le générique
- **Mobile first** : animation verticale type TikTok/cinéma, optimisée téléphone
- **Timing** : à développer avant la finale (juillet), pas urgent pour le 1er mars
- **Impact** : argument fort pour convaincre donateurs ET sponsors (visibilité garantie devant le public)

### Autres fonctionnalités prévues
- **Google Analytics** : créer propriété GA4, obtenir ID G-XXXXXXXXXX, ajouter sur Vercel + redeploy
- **Revoir les fonctionnalités live** : vote en direct, déclaration participants, annonce vainqueur — tout sur téléphone du public (pas d'écran géant)

## Historique des interventions

### 2026-02-24 — Fix crons + Page /go trampoline + Audit URLs

#### Fix cron admin-report — timing trop serré
- **Problème** : Le seuil de 23h en millisecondes faisait rater l'envoi quand Vercel décalait le cron de quelques minutes (22h35m < 23h)
- **Fix** : Remplacement par comparaison de date calendaire timezone Paris (`alreadySentThisPeriod()`) pour le mode daily
- **Fichier** : `src/app/api/cron/admin-report/route.ts`

#### Fix push J-5 → page vide + redirect [slug]
- **Problème** : Push J-5 pointait vers `/:slug/` qui n'avait pas de page.tsx → page vide
- **Fix** : Push pointe vers `/` (homepage), création `src/app/[slug]/page.tsx` (redirect → `/`)
- **SW amélioré** : `notificationclick` utilise URLs absolues pour mieux ouvrir la PWA installée

#### Fix lien désinscription inscription-reminder
- **Problème** : Utilisait `?id=` au lieu de `?token=` → lien cassé pour les 84 emails J-5 envoyés
- **Fix** : `unsubscribe_token` ajouté au select + URL corrigée

#### Audit complet des 32 URLs push/email/social
- Vérification de toutes les URLs dans : push notifications (7), email templates (8), publications sociales (9)
- Seul bug trouvé : le lien désinscription (corrigé ci-dessus)

#### Page `/go` — Trampoline email → PWA
- **`src/app/go/page.tsx`** (CRÉÉ) : Page client ~130 lignes, Suspense wrapper
  - Mobile (navigateur) : carte avec message contextuel + bouton "Ouvrir l'application" + instructions d'installation iOS/Android
  - Desktop ou PWA standalone : redirection immédiate (transparent)
  - URL format : `/go?to=/inscription&ctx=inscription-j5`
  - Validation sécurité : `to` doit être chemin relatif, pas de `//` ni protocole
  - 6 contextes : inscription-j5, inscription-j0, newsletter, approved, profile, défaut
- **`src/lib/email-utils.ts`** (CRÉÉ) : Helper `goUrl(siteUrl, path, ctx?)` pour wrapper les URLs
- **Emails modifiés** (URLs wrappées avec `/go`) :
  - `inscription-reminder/route.ts` : URLs J-5 et Jour J
  - `admin/candidats/actions.ts` : profileUrl, galleryUrl, referralUrl (email approuvé)
  - `admin/newsletter/actions.ts` : CTA newsletter
  - `emails.ts` : Ajout param `ctaUrl` à `newsletterEmail()`, suppression URLs hardcodées
- **Non modifié** : Push notifications (le SW gère déjà la PWA), emails admin/jury

### 2026-02-23 — Page Soutenir + Menu mobile + Footer

#### Page "Soutenir" (`/soutenir`)
- **`src/app/soutenir/page.tsx`** (CRÉÉ) : Page don libre Stripe
  - Chiffres impact (4 éditions, 73 candidats, 1800+ votes) avec couleurs vives et glow
  - Bouton "Faire un don" → lien Stripe externe (montant libre)
  - 4 postes 100% numériques : dev/hébergement appli, domaines/serveurs, newsletters/push/communication, outils marketing
  - Lien vers page partenaires en bas
- **STRIPE_DON_LIBRE** : `https://buy.stripe.com/fZucMX8pe9NAeRecyM14405`

#### Menu mobile — Section "Nous soutenir"
- **`PublicNav.tsx`** (MODIFIÉ) : Ajout section "Nous soutenir" (Faire un don + Devenir partenaire), suppression "Partenaires" du nav principal
- **`MobileMenu.tsx`** (MODIFIÉ) : Même section ajoutée (menu secondaire)
- **`PublicFooter.tsx`** (MODIFIÉ) : Lien "Soutenir le projet" en doré (#ffc44d) pour contraste sur fond rose

### 2026-02-23 — Google Analytics + Proposer un lieu + Top 10 + Badge profil + Parrainage

#### Google Analytics (`GoogleAnalytics.tsx`)
- **`src/components/GoogleAnalytics.tsx`** (CRÉÉ) : Composant client gtag.js avec `next/script` strategy afterInteractive
- **`src/app/layout.tsx`** (MODIFIÉ) : `<GoogleAnalytics />` ajouté avant ServiceWorkerRegistrar
- Conditionnel : ne charge rien si `NEXT_PUBLIC_GA_ID` n'est pas défini
- **À faire** : Créer compte GA4, récupérer ID G-XXXXXXX, ajouter dans Vercel

#### Page "Proposer un lieu" (`/proposer-un-lieu`)
- **`src/app/proposer-un-lieu/page.tsx`** (CRÉÉ) : Page server-rendered avec 3 arguments + chiffres clés + formulaire
- **`src/components/ProposerLieuForm.tsx`** (CRÉÉ) : Formulaire client (ville, région, nom, fonction, email, téléphone, message)
- **`src/app/api/proposer-lieu/route.ts`** (CRÉÉ) : API Resend → inscriptions@chantenscene.fr (escapeHtml, replyTo)
- **`PublicFooter.tsx`** (MODIFIÉ) : Lien "Proposer un lieu" ajouté dans colonne Le concours

#### Classement Top 10 public (`candidats/page.tsx`)
- **`src/app/[slug]/candidats/page.tsx`** (MODIFIÉ) : Section Top 10 desktop (`hidden md:block`)
- Grille 5×2 avec médailles (🥇🥈🥉) pour les 3 premiers, affiché seulement quand 10+ candidats
- Photo miniature + nom + votes, lien vers profil candidat

#### Badge "Profil complet" (`CandidateCard.tsx`)
- **`src/components/CandidateCard.tsx`** (MODIFIÉ) : Checkmark vert après le nom si photo_url + bio + song_title + song_artist
- **`src/components/CandidateProfile.tsx`** (MODIFIÉ) : Barre de complétion + checklist (photo, bio, chanson, réseau social) + section parrainage

#### Système de parrainage
- **Migration `029_referrals.sql`** : `ALTER TABLE candidates ADD COLUMN referred_by UUID REFERENCES candidates(id)` + index
- **`src/components/InscriptionForm.tsx`** (MODIFIÉ) : Lecture `?ref=slug` → résolution candidat → `referred_by` à l'insert + bannière parrain + lien partage en succès
- **`src/app/[slug]/mon-profil/page.tsx`** (MODIFIÉ) : Query count referrals, passé à CandidateProfile
- **`src/components/CandidateProfile.tsx`** (MODIFIÉ) : Section parrainage avec lien copiable + compteur filleuls

#### Communication parrainage
- **`src/app/comment-ca-marche/page.tsx`** (MODIFIÉ) : Nouvelle section Parrainage (4 InfoCards + guide pas-à-pas)
- **`src/lib/emails.ts`** (MODIFIÉ) : Section parrainage dans l'email d'approbation candidat (lien violet copiable)
- **`src/app/admin/candidats/actions.ts`** (MODIFIÉ) : Construction referralUrl passé à candidateApprovedEmail
- **`src/app/api/cron/social-post/route.ts`** (MODIFIÉ) : Post parrainage auto chaque mercredi (section 7) si inscriptions ouvertes et 5+ candidats

#### Page "Soutenir" (`/soutenir`)
- **`src/app/soutenir/page.tsx`** (CRÉÉ) : Page don libre Stripe, chiffres impact (4 éditions, 73 candidats, 1800+ votes)
  - Don libre via `buy.stripe.com` (lien existant), postes 100% numériques (dev, hébergement, newsletters, marketing)
  - Lien discret vers partenaires en bas
- **`src/components/PublicNav.tsx`** (MODIFIÉ) : Section "Nous soutenir" dans le menu mobile (Faire un don + Devenir partenaire)
  - "Partenaires" retiré de la nav principale (accessible uniquement via "Devenir partenaire")
- **`src/components/PublicFooter.tsx`** (MODIFIÉ) : Lien doré "Soutenir le projet" dans colonne Le concours
- **`src/components/MobileMenu.tsx`** (MODIFIÉ) : Section "Nous soutenir" ajoutée (même pattern)

#### Mise à jour guide-concours.html
- Étape 1 : "Proposer un lieu" + "Google Analytics" + "Page Soutenir" + "Liens don" passés des idées aux features actives (NEW)
- Étape 2 : "Top 10" + "Badge profil" + "Parrainage" + "Email bienvenue" + "Post parrainage mercredi" → actifs (NEW)
- Étape 3 : "Email demi-finalistes" + "Email non-retenus" + "Page résultats animée" → actifs (NEW)

### 2026-02-23 — Suivi dons Stripe + Guide concours visuel + Fixes social/homepage

#### Suivi dons Stripe sur dashboard admin
- **Migration `028_donations.sql`** : Table `donations` (amount_cents, tier, donor_name, donor_email, stripe_session_id)
- **Webhook Stripe** (`api/stripe/webhook/route.ts`) : Ajout insert `donations` en base à chaque paiement (en plus de email + push admin existants)
- **Dashboard admin** (`admin/page.tsx`) : Carte "Dons & Partenariats" — total €, nombre de dons, dernier don (nom, montant, tier, date)
- Tiers automatiques : Don (<50€), Supporter (50€+), Bronze (100€+), Argent (250€+), Or (500€+)

#### Guide concours visuel (`guide-concours.html`)
- **Fichier HTML interactif** : 7 slides (intro + 6 étapes) avec navigation flèches/swipe/dots
- **4 sections par slide** : Ce que tu fais (rose), Ce que le site affiche (vert), Ce qui se fait tout seul (violet), Améliorations possibles (bleu pointillé)
- **Données réelles** : dates Aubagne 2026 (1 mars, 1 juin, 17 juin, 16 juillet), config BDD, lieux
- **Raccourci bureau** : "Guide ChanteEnScene" sur le bureau Windows
- Mis à jour à chaque nouvelle fonctionnalité pour garder la vue d'ensemble

#### Fix posts sociaux prématurés
- **Problème** : Le cron social-post publiait des countdowns demi-finale/finale sur FB/IG alors que la session était encore en draft
- **Fix** : Ajout guards de statut dans `social-post/route.ts` — countdown_semifinal requiert `registration_closed`/`semifinal`, countdown_final requiert `semifinal`/`final`

#### Fix gap midnight-10h sur la homepage
- **Problème** : Entre minuit (date passée) et 10h (cron inscription-reminder), la homepage montrait "Prochainement" au lieu de "En cours"
- **Fix** : Dans `page.tsx`, détection si `registration_start` est passée même en statut draft → affiche timeline step 1

#### Footer restructuré
- Colonne 4 renommée "Contact" → "Suivez-nous" (icônes FB/IG uniquement)
- Lien "Contact" déplacé dans colonne 2 "Le concours"
- Suppression lien redondant "Nous contacter"

### 2026-02-23 — Checkup automatique + suppression projet Vercel batx

#### Diagnostic email admin parasite
- **Problème** : L'email admin du matin était l'ancien format (pas le nouveau dashboard analytique) + push non reçu
- **Cause** : Le projet Vercel `chante-en-scene-batx` (secondaire) exécutait les mêmes crons avec l'ancien code, mettant à jour `last_report_sent_at` avant le vrai projet
- **Fix** : Suppression du projet batx via `vercel remove chante-en-scene-batx`, reset du timestamp, déclenchement manuel du cron → email OK + 2 push envoyés

#### Checkup complet du site (6 agents parallèles)
- **Exécution** : 6 agents spécialisés en parallèle (pages, APIs, Supabase, Vercel, push, emails)
- **Résultats** : 8/8 pages OK, 9/9 APIs OK, BDD 2.6%, Storage 3.8%, 13 push subscribers, 84 email subscribers
- **Rapport HTML** envoyé par email (Resend) + push admin

#### Cron health-check automatique + bouton admin
- **`src/app/api/cron/health-check/route.ts`** (CRÉÉ) : Route cron complète
  - Tests : 8 pages publiques (HTTP 200), 4 APIs sécurisées (HTTP 401), Supabase BDD/Storage/tables/backup, push (abonnés + VAPID + SW), emails (abonnés + campagnes)
  - Exporte `runHealthCheck()` et `sendHealthCheckReport()` pour réutilisation par server action
  - Interface `CheckResult` : category, label, status (ok/warn/ko), value, detail
  - Envoi email HTML + push admin avec verdict global
- **`src/lib/emails.ts`** (MODIFIÉ) : Ajout `healthCheckEmail()` — même style dark que adminReportEmail
  - Synthèse 4 compteurs (OK/Warn/KO/Total), barres quotas BDD/Storage, audience push/email, checks par catégorie, tables principales
- **`src/app/admin/infra/actions.ts`** (CRÉÉ) : Server action `triggerHealthCheck()` avec `requireAdmin()`
- **`src/app/admin/infra/HealthCheckButton.tsx`** (CRÉÉ) : Bouton client avec loader + résultat coloré
- **`src/app/admin/infra/page.tsx`** (MODIFIÉ) : Intégration du bouton checkup
- **`vercel.json`** (MODIFIÉ) : Cron `0 8 1 * *` (1er du mois à 9h Paris)
- **Commit** : `aba7322` — pushé sur master, déployé en production

### 2026-02-22 — Newsletter #1 + Dossier de presse + Page Presse + Footer + Email admin analytique

#### Newsletter #1 — Envoi campagne email
- **Template HTML** : `newsletter-chantenscene-2.html` (style "Quotidien Matin")
  - Header logo Georgia serif, 3 sections avec fonds colorés vifs (#f472b6, #1a1232, #a78bfa), CTA plein écran rose, footer Quotidien-style
  - 3 images ChatGPT uploadées dans Storage `photos/newsletter/` : hero, appli, flashback
  - Unsubscribe personnalisé par token via `/api/unsubscribe`
- **Script d'envoi** : `send-newsletter1.js` (Downloads, gitignored)
  - Ajout subscribers manuels (13jisse@gmail.com, reybaud.olivier@neuf.fr, julienlamand.music@gmail.com, c.martinezpnrj@gmail.com)
  - Envoi via Resend à 83/83 abonnés actifs, 0 erreurs
  - Campaign loggée dans `email_campaigns`
- **Fix constraint source** : `email_subscribers_source_check` mis à jour via Supabase Management API
  - Ajout : `'manual'`, `'countdown'`, `'inscription'` aux sources autorisées
  - Script : `fix-source-constraint.js` (Downloads)

#### Opt-in newsletter à l'inscription
- **`InscriptionForm.tsx`** : Checkbox pré-cochée "Recevoir les actualités ChanteEnScène par email"
  - Ajouté en étape 3 (recap/consentement), appel `subscribeEmail()` après inscription réussie (non-bloquant)
- **`subscribe-email.ts`** : Ajout `'inscription'` au type `SubscribeSource`
- **`EmailSubscribeForm.tsx`** : Ajout `'inscription'` au type source prop
- **Commit** : `fa9beea` — pushé sur master

#### Dossier de presse
- **Fichier HTML** : `c:\Users\ecole\Downloads\dossier-presse-chantenscene.html` (7 pages A4, print-ready)
- **Fichier PDF** : `public/documents/dossier-presse-chantenscene.pdf` (~9.6 MB, converti via Chrome headless)
- **Structure** :
  1. Couverture — Image ChatGPT (`cover-dossier-presse.png`) + logo + badge "4e édition"
  2. Le concept — Citation fondateur + photo concert
  3. Chiffres clés — 6 stats + graphique évolution 2023→2026
  4. Édition 2026 — Features + mockup appli ChatGPT
  5. Galerie photos — Mosaïque 9 photos réelles Storage (2024+2025), crédit Playymo
  6. Palmarès — 3 ans de gagnants (données BDD corrigées), photos 2025
  7. Contact — Jean-Christophe Martinez, inscriptions@chantenscene.fr
- **Données palmarès** : 2023 (Estelle/Giulia/Paloma), 2024 (Yassine/Valentine/Paloma), 2025 (Stéphanaïka/Eva/Giulia)

#### Page Presse (`/presse`)
- **Nouvelle page** : `src/app/presse/page.tsx` — server-rendered, accessible depuis le footer uniquement
- **Dossier de presse** : Carte téléchargement PDF avec bouton rose
- **Photos HD** : Grille 6 photos du concours 2025 (Supabase Storage), clic = ouvre en plein écran
- **Formulaire contact presse** : `PresseContactForm.tsx` (client component)
  - Champs : nom, organisation (optionnel), email, message
  - POST vers `/api/contact-presse` → email envoyé à inscriptions@chantenscene.fr via Resend
  - Remplace le mailto exposé (anti-bot)
- **API** : `src/app/api/contact-presse/route.ts` (même pattern que `partner-inquiry`, escapeHtml, replyTo)

#### Footer structuré 4 colonnes (`PublicFooter.tsx`)
- **Refonte complète** du footer (était : logo + 3 liens légaux)
- **4 colonnes responsive** (lg:grid-cols-4, mobile grid-cols-2) :
  - Logo + tagline + "Aubagne, France"
  - Le concours : Editions, Palmarès, Presse
  - Légal : Mentions légales, Règlement, Confidentialité
  - Contact : email inscriptions@chantenscene.fr + icônes Facebook/Instagram
- Copyright centré en dessous
- Masqué sur /admin, /jury, etc. (logique existante conservée)

#### Dashboard admin — Changelog
- **`ChangelogCard.tsx`** : Composant server async, fetch GitHub API (10 derniers commits, cache 1h)
  - Groupés par date, affichés avec heure + message
- Ajouté dans `src/app/admin/page.tsx` — section "Mises à jour du site"

#### Section Dotations/Prix (`AdminConfig.tsx`)
- Ajout `prizes` et `prizes_visible` à l'interface SessionConfig
- Helpers : `updatePrize`, `addPrize`, `removePrize`
- UI : champs dynamiques rang + description, toggle visibilité (masqué par défaut)
- Public display prévu sur page session + inscription (quand commune donne aval)

#### Email admin — Dashboard analytique complet
- **Cron** (`admin-report/route.ts`) : 17 requêtes Supabase en parallèle (Promise.all)
  - Nouvelles données : total pages vues, top 5 pages, breakdown statut candidats, plateforme PWA, rôle push
  - GitHub API : commits des dernières 24h
- **Template** (`emails.ts` → `adminReportEmail`) : 7 sections
  1. **Header** : Briefing quotidien + date + badge statut session (couleur dynamique)
  2. **Hier en un coup d'oeil** : 4 métriques J-1 (visiteurs, inscriptions, votes, nouveaux abos) + total pages vues + taux conversion
  3. **Tableau de bord** : 5 lignes totaux avec deltas verts (+N) + audience totale agrégée
  4. **Analyse d'audience** : Barres de progression plateforme PWA (Android/iOS/Desktop) + rôle push (public/jury/admin)
  5. **Candidats** : Breakdown par statut (barres colorées) + nouvelles inscriptions
  6. **Pages populaires** : Top 5 pages visitées hier (monospace)
  7. **Prochaines actions** : Todo dynamique basée sur config (dotations, dates, statut session)
  + Section déploiements (commits GitHub)
- **Push quotidien** : Format compact J-1 (visiteurs, inscriptions, votes, installs, abos) + résumé déploiements

#### Ancienne base MySQL parsée
- **`dbs10591269.sql`** (Downloads) : Dump phpMyAdmin de l'ancienne BDD 2025
  - Tables : `Artistes` (73), `JuryVotes` (124), `votes_publics` (1863), `votes_jury` (finale), `Jurys` (5)
  - Script `parse-old-db.js` créé pour extraction données → stats utilisées dans le dossier de presse
  - Stats clés : 73 inscrits, 34 sélectionnés, 24 demi-finalistes, 14 finalistes, 1863 votes, 5 jurés finale

### 2026-02-21 — Page Notifications dédiée + Segmentation push + Fix iOS PWA

#### Page Notifications dédiée (`/admin/notifications`)
- **Nouvelle page server-rendered** + composant client `NotificationsAdmin.tsx` (~550 lignes)
- Push notifications **séparées** de la page social → page dédiée avec sidebar "🔔 Notifications"
- **Segments progressifs** selon la phase du concours (via `isStatusAtOrPast()`) :
  - Toujours : Tous, Public, Jury, Admin
  - `registration_open` : + Candidats inscrits, Un candidat (autocomplete)
  - `registration_closed` : + Approuvés
  - `semifinal` : + Demi-finalistes
  - `final` : + Finalistes
- **Ciblage candidats par fingerprint** : match `candidates.fingerprint` ↔ `push_subscriptions.fingerprint`
- Stats push : "26 abonnés (18 public, 5 jury, 3 admin) | 8/15 candidats joignables"
- Indicateur de portée : "12 appareils recevront cette notification"
- Autocomplete candidat avec badge status + icône push/email
- Formulaire : titre, body, URL + boutons Envoyer / Tester sur mon appareil
- Notifications par étape (déplacé depuis social) + historique push avec colonne Segment
- Migration `027_candidate_fingerprint.sql` : `fingerprint` sur candidates, `segment` sur push_log

#### Capture fingerprint à l'inscription
- `InscriptionForm.tsx` : capture silencieuse du fingerprint avant insert candidat (silent fail)
- Zero impact UI, transparent pour l'utilisateur

#### Extension lib push avec segments
- `src/lib/push.ts` : nouveau type `PushSegment` (all_candidates, approved, semifinalist, finalist, specific_candidate)
- Deux paths de ciblage : role-based (existant) et segment-based (nouveau via fingerprint matching)
- `src/app/api/push/send/route.ts` : accepte `segment` + `candidateId`, log segment dans push_log

#### Nettoyage page social
- `admin/social/page.tsx` réduit de ~1030 à ~380 lignes (tout le code push supprimé)
- Bandeau de redirection vers `/admin/notifications`
- Reste : publications sociales FB/IG, historique social, previews auto

#### Fix détection iOS PWA
- **Problème** : la détection `standalone` était bloquée par des `return` anticipés (email-subscribed, desktop)
- **Solution** : `useEffect` dédié indépendant du flow UI dans `InstallPrompt.tsx`
- Ajout `navigator.standalone` (propriété spécifique iOS Safari) en plus de `matchMedia`
- Filtrage anti-bots dans `/api/pwa/install` (regex UA : bot, crawler, headless, puppeteer, etc.)
- Les utilisateurs iPhone apparaissent désormais dans les installations PWA dès qu'ils ouvrent l'appli

### 2026-02-20/21 — Page Infra + Historiques + Sélecteur images push

#### Page Infrastructure (`/admin/infra`)
- **Nouvelle page server-rendered** : État des lieux Supabase en temps réel
  - Jauges BDD (ex: 13 MB / 500 MB) et Storage (ex: 31 MB / 1 GB) avec couleur vert/orange/rouge
  - Storage par bucket : barres de remplissage vs limite 1 GB (pas proportion entre buckets)
  - Liste de toutes les tables avec nombre de lignes (point coloré selon volume)
  - Santé : dernier backup, dernière pub sociale, push actifs, email actifs
  - Rappel limites free tier Supabase
- Utilise **Supabase Management API** (`SUPABASE_ACCESS_TOKEN`) avec requêtes SQL directes
- `SUPABASE_ACCESS_TOKEN` ajouté dans `.env.local` et Vercel
- Lien "Infrastructure" ajouté dans `AdminSidebar.tsx` section Dev

#### Publications sociales — Upload image + Historique
- **Fix RLS upload** : Création `/api/admin/upload-image` (POST) avec `createAdminClient()` pour bypass RLS Storage
- **Historique publications** : Tableau en haut de la page social avec badge Manuel/Auto, statut FB/IG, lien cliquable
- **Colonnes ajoutées** à `social_posts_log` : `source`, `image_url`, `link` (via Management API)
- **Logging** : Les publications manuelles (`social-publish`) et cron sont loggées dans `social_posts_log`
- **Fix RLS lecture** : Policy `FOR SELECT USING (true)` ajoutée pour permettre lecture côté client (anon)

#### Push Notifications — Test, images, historique, sélecteur
- **Bouton "Tester sur mon appareil"** : Utilise `navigator.serviceWorker.ready` → `pushManager.getSubscription()` pour cibler le endpoint du navigateur courant
- **Support image** : Champ `image` ajouté dans `PushPayload`, `sw.js`, formulaire admin (Android/Chrome, ignoré iOS)
- **Sélecteur d'images** : Bouton "Parcourir" ouvre une galerie modale avec toutes les images du bucket Storage (GET `/api/admin/upload-image`)
- **Historique push** (`push_log`) : Nouvelle table, chaque envoi (test ou broadcast) est loggé avec titre, body, url, image, role, résultat (sent/failed/expired), sent_by
- **Tableau historique** : Affiché sous le formulaire push, badges Test (bleu) / Tous/Public/Jury (rose)
- Migration : `026_push_log.sql`

#### Fix page Infra — Barres storage
- Les barres de storage par bucket montraient la proportion entre buckets (photos = 94%) au lieu du remplissage vs 1 GB
- Corrigé : `b.total_bytes / STORAGE_LIMIT_BYTES * 100` + couleur conditionnelle + pourcentage affiché

### 2026-02-20 — Push auto par étape + Carte installations + Cron inscriptions

#### Carte des installations PWA (admin dashboard)
- **Carte Leaflet** : Modal plein écran avec markers emoji par plateforme (🤖 Android, 🍎 iOS, 💻 Desktop)
  - Import dynamique de Leaflet (évite SSR), CSS injecté via `<link>`, fitBounds auto
  - Composant `InstallsMap.tsx` avec mini PieChart recharts (donut Android/iOS/Desktop)
- **Géolocalisation** : Capture lat/lng via headers Vercel (`x-vercel-ip-latitude/longitude`) dans `api/pwa/install`
- **Migration `024_pwa_installs_coordinates.sql`** : Colonnes `latitude`/`longitude` ajoutées à `pwa_installs`
- **Backfill géocodage** : 14 installs existantes géocodées via Nominatim/OpenStreetMap
- **Fix encodage URL** : `decodeURIComponent()` sur `x-vercel-ip-city` (Cébazat, Fort Worth, La Penne-sur-Huveaune corrigés)
- **Liste installations** : Limitée à 5 visibles avec scroll (`max-height: 300px`)
- Packages ajoutés : `leaflet`, `@types/leaflet`

#### Cron rappel inscriptions
- **`/api/cron/inscription-reminder`** : Cron quotidien 10h Paris (0 9 * * * UTC)
  - Envoie email + push public à J-5 et Jour J avant `config.registration_start`
  - Dédupliqué via `config.inscription_reminder_last_sent`
  - Template email `inscriptionReminderEmail` dans `lib/emails.ts`
- Ajouté dans `vercel.json`

#### Push automatique par étape du concours
- **`PHASE_PUSH_MESSAGES`** dans `lib/phases.ts` : Messages par défaut pour registration_open, registration_closed, semifinal, final
- **`advanceSessionPhase()`** dans `admin/config/actions.ts` : Envoie auto un push public à chaque transition de phase
  - Priorité aux messages personnalisés (`config.custom_phase_notifications[phase]`), sinon défaut
- **Admin social** (`admin/social/page.tsx`) :
  - Section "Notifications push programmées" : Affiche les phases restantes avec message (défaut/personnalisé) + info cron inscriptions
  - Toggle "Envoi instantané" / "Liée à une étape" dans le formulaire push
  - Mode étape : dropdown phase, pré-remplissage message, sauvegarde dans `config.custom_phase_notifications`
  - Publications auto limitées à 4 lignes visibles (max-h réduit)

#### Divers
- 20 installations PWA analysées : zéro bot (PWA = action physique obligatoire)
- VS Code passé en français (pack `ms-ceintl.vscode-language-pack-fr`)

### 2026-02-19 — Galerie Editions + Import photos 2024/2025
- **Nouvelle page `/editions`** : Galerie publique année par année (2025, 2024, 2023...) avec photos + vidéos YouTube
  - Accordéon par année (cliquer pour plier/déplier), première édition avec contenu ouverte par défaut
  - Lightbox plein écran avec swipe gauche/droite (navigation) + swipe haut/bas (fermer), drag feedback visuel
  - Crédit photographe : "Julien aka Playymo" avec lien Instagram sur "Playymo" (https://www.instagram.com/playy_mo/)
  - Filtre `.eq('status', 'archived')` pour exclure l'édition en cours (2026)
- **Nouvelle page `/admin/editions`** : Admin pour publier/dépublier photos et gérer vidéos YouTube
- **Migration `023_edition_videos.sql`** : Table `edition_videos` (YouTube links par session)
- **Composants** : `EditionsGallery.tsx` (public, lightbox, grille responsive), `EditionsAdmin.tsx` (admin, toggle publish, bulk actions)
- **Server Actions** : `toggleEditionPhoto`, `bulkToggleEditionPhotos`, `deleteEditionPhoto`, `addEditionVideo`, `toggleEditionVideo`, `deleteEditionVideo`
- **Navigation** : Lien "Galerie" remplacé par "Editions" dans `PublicNav.tsx`, ajouté dans `AdminSidebar.tsx`
- **Import photos 2025** : 81 photos importées dans Supabase Storage (bucket `photos`, public) + table `photos`
  - Pipeline : SwissTransfer ZIP → extract → triage auto (sharp: brightness/contrast/entropy + burst detection) → slideshow review manuelle → resize 1600px → upload
  - Scripts utilitaires (gitignored) : `extract-photos.ps1`, `triage-photos.js`, `import-photos-2025.js`
  - Bucket Storage `photos` créé via API (n'existait pas)
  - Fix orientation EXIF : ajout `.rotate()` avant `.resize()` dans le pipeline sharp, re-import des 81 photos
  - Toutes les photos importées en `published=false`, publiées manuellement depuis l'admin
- **Import photos 2024** : 19 photos importées (`import-photos-2024.js`, session `a0000000-0000-0000-0000-000000002024`)
- **Vidéos 2025** : 5 vidéos montées gardées (rushes MVI_*.MOV supprimés), à uploader sur YouTube puis ajouter via admin
- **Notification push envoyée** (19 fév) : "Les Editions" annoncée à tous les abonnés (10 reçues, 12 expirées/nettoyées)
  - Bug badge : le script ponctuel utilisait `pwa-icon-192.png` au lieu de `pwa-badge-96.png` → le "C" n'apparaissait pas. `push.ts` utilise le bon fichier par défaut, OK pour les prochaines notifs via l'admin
- **Déployé en production** sur Vercel (commit + push master)

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
