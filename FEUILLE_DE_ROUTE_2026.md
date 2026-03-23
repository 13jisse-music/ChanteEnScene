# CHANTENSCENE — FEUILLE DE ROUTE CONCOURS 2026

## Document de référence pour Claude Code
## Dernière mise à jour : 22 mars 2026
## Placer ce fichier dans : C:\Users\ecole\OneDrive\Documents\ChanteEnScene\FEUILLE_DE_ROUTE_2026.md

---

## INFORMATIONS CLÉS

- **Organisateur** : Jisse (Jean Christophe Martinez), seul admin
- **3ème édition** du concours
- **Site** : chantenscene.fr (Next.js 16 + Supabase + Vercel)
- **3 catégories** : Enfant (6-12), Ado (13-17), Adulte (18+)
- **Inscriptions GRATUITES** cette session (demande Ville d'Aubagne)
- **Stripe** = dons/sponsors uniquement (5 produits 50-500€), pas de paiement candidat
- **Subvention Ville d'Aubagne** : 10 000€ confirmée
- **Budget** : recettes 13 450€, dépenses ~2 550€, net +10 850€

---

## CALENDRIER

| Date | Phase | Statut session |
|------|-------|----------------|
| 1er mars 2026 | Ouverture inscriptions | `registration_open` |
| 1er juin 2026 | Fermeture inscriptions | `registration_closed` (auto-advance) |
| 1er - 17 juin | Sélection demi-finalistes (jury en ligne + admin) | `registration_closed` |
| **17 juin 2026** | **DEMI-FINALE** — salle municipale Aubagne | `semifinal` (changement manuel) |
| 17 juin - 16 juillet | Préparation finale | `semifinal` → `final` (changement manuel) |
| **16 juillet 2026** | **GRANDE FINALE** — en extérieur, Aubagne | `final` |
| Après finale | Archivage | `archived` (changement manuel) |

---

## MACHINE À ÉTATS

### Phases session (sessions.status)
```
draft → registration_open → registration_closed → semifinal → final → archived
```
- `draft → registration_open` : AUTO quand config.registration_start est passé
- `registration_open → registration_closed` : AUTO le lendemain de config.registration_end
- `registration_closed → semifinal` : MANUEL (admin)
- `semifinal → final` : MANUEL (admin)
- `final → archived` : MANUEL (admin)

### Parcours candidat (candidates.status)
```
pending → approved → semifinalist → finalist → winner
                \→ rejected
```

---

## PHASE 1 : REGISTRATION_OPEN (1er mars → 1er juin)

### Ce qui se passe
1. **Candidat s'inscrit** : formulaire 4 étapes → POST /api/register-candidate → candidates status=pending → email confirmation Resend → push Telegram admin
2. **Pipeline auto (cron IONOS 30 min)** : détecte pending → migration photos/vidéos vers R2 → Demucs GPU (PCmusique) → 10 métriques vocales → upsert vocal_analyses → Telegram résumé → cleanup Demucs. Max 3 analyses par run.
3. **Admin approuve** : /admin/candidats → CandidatsTable → bouton Approuver → email candidat → statut approved → visible sur le site
4. **Jury en ligne** : admin crée jurés role=online dans /admin/jury → invitation email QR → juré accède /jury/[token] → JuryExperience (TikTok feed) → vote oui/peut-être/non → jury_scores event_type="online"
5. **Votes publics** : visiteurs votent "like" sur les profils candidats → table votes → UNIQUE(candidate_id, fingerprint)
6. **Communications auto** : cron social 9h (FB+IG, 8 types posts), cron admin-report 6h, cron bandwidth 20h, newsletter MailForge manuelle

### Outils admin actifs
- /admin/candidats — liste, approbation, rejet
- /admin/jury — gestion jurés en ligne
- /admin/jury-en-ligne — RegieEnLigne (classement par score composite)
- /admin/votes — détail votes publics
- /admin/vocal-scores — scores VocalPrint vs scores jury
- /admin/newsletter — MailForge (envoi newsletter)
- /admin/notifications — push VAPID segmentés
- /admin/social — publication FB/IG manuelle
- /admin/analytics — trafic web
- /admin/blog — articles SEO
- /admin/infra — monitoring Supabase
- /admin/stats-en-ligne — stats phase en ligne
- /admin/stats-jury — engagement jury

### Points d'attention cette phase
- Pipeline max 3 analyses/run : si afflux de candidats, queue de 2h+
- Pas d'alerte si candidat pending > 2h (cron silencieux en cas d'erreur)
- Crons backup et health-check NON schedulés — pas de filet de sécurité
- RLS non active sur tables principales (candidates, votes, jury_scores)

---

## PHASE 2 : REGISTRATION_CLOSED (1er juin → 17 juin)

### Ce qui se passe
1. **Auto-advance** : le lendemain de config.registration_end → status = registration_closed + push PHASE_PUSH_MESSAGES
2. **Formulaire inscription se bloque** automatiquement (guard dans [slug]/inscription/page.tsx)
3. **Votes publics (likes)** : restent ouverts (pas de guard par phase sur CandidateVoteButton)
4. **Sélection demi-finalistes** : admin dans /admin/jury-en-ligne → RegieEnLigne → classement par score composite (oui% × 60 + likes_normalized × 30 + verdict_bonus × 10) → promotion individuelle ou en lot par catégorie → config.semifinalists_per_category = 10
5. **Notification candidats** : modal email dans RegieEnLigne → aperçu HTML → envoi emails sélection/rejet via sendSelectionNotifications + Resend

### Outils admin actifs (en plus des précédents)
- /admin/jury-en-ligne — RegieEnLigne → sélection demi-finalistes
- /admin/config — changement de phase quand prêt

### Préparation demi-finale (à faire dans cette période)
- Créer les jurés demi-finale (role=semifinal) dans /admin/jury
- Créer le live_event type=semifinal dans /admin/demi-finale (CreateEventButton)
- Configurer le lineup (ordre de passage) par drag-drop
- Exporter les MP3 pour le DJ : /admin/export-mp3

### Points d'attention
- 23 candidats / 3 catégories = ~8 par catégorie. Avec semifinalists_per_category=10, quasi tout le monde passe. Jisse le sait, c'est peut-être voulu.
- Vérifier que les emails de sélection partent bien (tester avec 1 candidat avant envoi en lot)
- Le changement vers `semifinal` est MANUEL — ne pas oublier de le faire avant le 17 juin

---

## PHASE 3 : SEMIFINAL — 17 juin (salle municipale Aubagne)

### Format
- **Public présent mais NE VOTE PAS** — seul le jury note
- **Jury en salle** : role=semifinal, note en étoiles 1-5
- **Pas de LiveView pour le public** (le code bloque LiveView en phase semifinal = correct, c'est voulu)
- **Objectif** : sélectionner les finalistes (config.finalists_per_category = 5)

### Déroulement (admin dans /admin/demi-finale)

#### Avant le show
1. Changer la phase en `semifinal` dans /admin/config
2. Check-in candidats : /admin/demi-finale/checkin → QR affiché → candidats scannent → SelfCheckin (tape nom, sélectionne profil, confirme → insert lineup position=0)
3. Vérifier que tous les jurés semifinal sont créés et actifs

#### Pendant le show (RegieSemifinale)
1. **"Démarrer"** → live_event status=live
2. **"Appeler [candidat]"** → lineup status=performing → chrono démarre → push auto au jury
3. Le candidat chante sur la musique (MP3 exporté pour le DJ)
4. **"Ouvrir vote"** → is_voting_open=true → le formulaire étoiles 1-5 s'ouvre auto sur les téléphones des jurés
5. Jurés notent (JuryScoring mode semifinal : 1=Raté, 2=Moyen, 3=Bien, 4=Super, 5=Top)
6. Admin voit le compteur de votes jury en temps réel (poll 3s) + moyenne étoiles
7. **"Terminer"** → lineup status=completed → candidat suivant
8. **Options** : "Repasser" (re-performing), "Absent" (marquer absent), "Reset scores" (remettre à 0)

#### Après le show (FinalisteSelection)
1. Event passe à completed
2. /admin/demi-finale affiche FinalisteSelection
3. Classement par moyenne étoiles, par catégorie
4. Admin sélectionne les finalistes (5 par catégorie)
5. Candidats sélectionnés → status = finalist

### Supabase Realtime actif
- useRealtimeEvent sur live_events (Realtime UPDATE + polling 5s)
- useRealtimeLineup sur lineup (Realtime INSERT/UPDATE/DELETE)
- useJuryNotifications sur jury_scores (Realtime INSERT/UPDATE/DELETE + polling 5s)

### Points d'attention CRITIQUES
- **WiFi salle** : jurés en salle sur leur téléphone. Si WiFi instable, les scores échouent silencieusement. BESOIN DU MODE OFFLINE JURY.
- **SelfCheckin** ajoute position=0 dans lineup. Si le lineup est déjà configuré par drag-drop, vérifier qu'il n'y a pas de conflit/doublon.
- **Scoring demi-finale = étoiles jury UNIQUEMENT**. Les votes publics (likes) ne sont PAS utilisés pour la sélection des finalistes. C'est la moyenne des étoiles jury qui compte.

---

## ENTRE DEMI-FINALE ET FINALE (17 juin → 16 juillet)

### Ce que Jisse doit faire
1. Annoncer les finalistes (emails via sendSelectionNotifications ou manuellement)
2. Les finalistes envoient le TITRE de leur chanson de finale par email à Jisse (pas de MP3 upload)
3. Jisse transmet aux musiciens pour la répétition
4. Créer les jurés finale (role=final) dans /admin/jury
5. Configurer les critères de notation finale dans session.config.jury_criteria (ex: "Technique vocale", "Interprétation", "Présence scénique")
6. Configurer les poids du scoring final : jury_weight + public_weight + social_weight (défaut 40/40/20)
7. Créer le live_event type=final dans /admin/finale → FinaleRundown
8. Configurer le lineup finale par catégorie (drag-drop dans FinaleRundown)

### Communications
- Social auto : countdown finale J-7 à J-1
- Newsletter annonce finale via MailForge
- Push notifications aux abonnés

---

## PHASE 4 : FINAL — 16 juillet (EN EXTÉRIEUR, Aubagne)

### Format
- **EN EXTÉRIEUR — PAS DE WIFI — chacun sa 4G**
- **3 catégories** passent l'une après l'autre : Enfant, puis Ado, puis Adulte
- **Jury en salle** note par critères multiples (role=final)
- **Public vote** via LiveView "Je soutiens !" (table live_votes)
- **Réseaux sociaux** : partages comptent dans le scoring (table shares)
- **3 gagnants** : 1 par catégorie, révélés après chaque catégorie
- **Mode reporter** : public prend des photos (LivePhotoCapture, max 5, cooldown 30s)

### Déroulement (admin dans /admin/finale → RegieFinale)

#### Avant le show
1. Changer la phase en `final` dans /admin/config
2. "Créer la finale et lancer la régie" dans FinaleRundown → crée live_event type=final
3. Check-in finalistes
4. Jurés finale scannent leur QR → /jury/[token] → prêts
5. Public arrive sur /[slug]/live → LiveView affiche "Commence bientôt"

#### Pendant le show (RegieFinale, par catégorie)
1. **"Démarrer [Enfant]"** → onglet catégorie actif
2. **"Avancer"** → candidat suivant → photo grand format sur LiveView public
3. **"Ouvrir vote"** → is_voting_open=true → jury note + public vote "Je soutiens !"
4. **Jury** : note par critères multiples (étoiles 1-5 par critère défini dans config.jury_criteria)
5. **Public** : clique "Je soutiens !" → insert live_votes (1 vote / candidat / fingerprint)
6. **ClassementPanel en temps réel** : jury_normalized × juryWeight + public_normalized × publicWeight + social_normalized × socialWeight
7. **Poids éditables en direct** par l'admin (handleSaveWeights)
8. Après le dernier candidat de la catégorie → **"Révéler le gagnant"** → modal confirmation → WinnerCountdown (13s) → WinnerReveal (confetti)
9. Passer à la catégorie suivante

#### 3 reveals
- Gagnant Enfant après passage de tous les Enfants
- Gagnant Ado après passage de tous les Ados
- Gagnant Adulte à la fin de la soirée
- **ATTENTION** : le champ live_events.winner_candidate_id est UN SEUL champ. Vérifier que le handleRevealWinner() fonctionne par catégorie et ne se limite pas à 1 seul gagnant.

#### Vue public (LiveView — /[slug]/live)
- Bandeau statut (EN DIRECT / Commence bientôt / En pause / Terminée)
- Photo grand format du candidat en cours + nom + catégorie + chanson + bio
- Bouton "Je soutiens !" quand voting ouvert
- "À suivre" : prochain candidat
- Partage social + inscription newsletter/push
- WinnerReveal en Realtime quand winner_revealed_at est détecté

#### Mode reporter (LivePhotoCapture)
- Accessible aux spectateurs depuis /[slug]/live
- Max 5 photos par personne, cooldown 30 secondes
- Compression JPEG 1200px max côté client avant upload
- Upload vers R2
- Insert dans photos avec source='crowd'
- Modérable ensuite dans /admin/photos

### Supabase Realtime actif
- useRealtimeEvent sur live_events
- useRealtimeLiveVotes sur live_votes (Realtime INSERT + polling 5s)
- useJuryNotifications sur jury_scores
- useWinnerReveal : détection winner_revealed_at → animation

### Points d'attention CRITIQUES
- **PAS DE WIFI EN EXTÉRIEUR**. Tout le monde sur 4G. 200+ personnes sur le même relais = 4G instable/saturée. Le mode offline jury est INDISPENSABLE.
- **Le Realtime WebSocket** va se déconnecter régulièrement. Le polling fallback 5s prend le relais mais consomme de la bande passante.
- **3 reveals** : vérifier que le système gère 3 gagnants distincts et pas 1 seul.
- **R2 stockage** : 9.9 GB de marge (76 MB utilisés sur 10 GB). Avec le mode reporter, même 50 photos HD ne poseront pas de problème.
- **Suggestion réseau** : un routeur 4G/5G dédié (Huawei/TP-Link, SIM Free 30€/mois) pour le jury + l'admin réduirait énormément le risque réseau.

---

## PHASE 5 : ARCHIVED (après la finale)

### Ce que Jisse fait
1. Changer la phase en `archived` dans /admin/config
2. /admin/palmares → figer les gagnants (PalmaresAdmin)
3. /admin/editions → ajouter vidéos YouTube, photos souvenirs (EditionsAdmin)
4. Les pages candidats restent accessibles (URLs pérennes pour le portfolio)
5. La homepage bascule automatiquement ("Édition terminée, résultats")

---

## TABLES SUPABASE — RÉSUMÉ

| Table | Rôle | Phase(s) |
|-------|------|----------|
| sessions | Config session, phase, JSONB config | Toutes |
| candidates | Candidats (status, slug, media, scoring) | Toutes |
| votes | Votes likes publics (fingerprint) | registration_open → semifinal |
| jurors | Jurés (role: online/semifinal/final, QR token) | Toutes |
| jury_scores | Notes jury (event_type: online/semifinal/final, JSONB scores) | Toutes |
| live_events | Événements live (semifinal/final, status, voting, winner) | semifinal, final |
| lineup | Ordre de passage (position, status) | semifinal, final |
| live_votes | Votes public pendant le live (fingerprint) | final |
| vocal_analyses | Résultats analyse VocalPrint (10 métriques) | registration_open |
| photos | Galerie photos (dont source=crowd) | final, archived |
| email_subscribers | Abonnés newsletter (86 actifs) | Toutes |
| email_campaigns | Campagnes newsletter | Toutes |
| push_subscriptions | Abonnés push VAPID | Toutes |
| social_posts_log | Log publications FB/IG | Toutes |
| push_log | Log push notifications | Toutes |
| sponsors | Partenaires/sponsors | Toutes |
| donations | Dons Stripe | Toutes |
| shares | Partages réseaux sociaux | Toutes |
| pwa_installs | Installations PWA géolocalisées | Toutes |
| blog_posts | Articles blog SEO | Toutes |
| chatbot_faq | FAQ chatbot | Toutes |
| admin_users | Admins (super_admin/local_admin) | Toutes |
| page_views | Analytics trafic | Toutes |
| juror_sessions | Sessions jury (heartbeat) | registration_open → final |
| edition_videos | Vidéos YouTube archivées | archived |
| facebook_posts | Posts FB schedulés | Toutes |

---

## SCORING — 3 SYSTÈMES DIFFÉRENTS

### 1. Score composite phase en ligne (RegieEnLigne)
```
score = oui_percent × 60 + likes_normalized × 30 + verdict_bonus × 10
```
- Sert à classer les candidats pour sélectionner les demi-finalistes
- Basé sur jury en ligne (oui/peut-être/non) + votes publics (likes)

### 2. Score demi-finale (FinalisteSelection)
```
score = moyenne des étoiles jury (1-5)
```
- Jury en salle uniquement (role=semifinal)
- Le public NE VOTE PAS en demi-finale
- Sert à sélectionner les finalistes

### 3. Score finale (ClassementPanel)
```
score = jury_normalized × juryWeight + public_normalized × publicWeight + social_normalized × socialWeight
```
- Poids par défaut : jury 40%, public 40%, social 20%
- Poids éditables en temps réel par l'admin
- jury = moyenne critères multiples (role=final)
- public = live_votes count
- social = shares count

---

## CRONS

| Cron | Fréquence | Plateforme | Rôle |
|------|-----------|------------|------|
| admin-report | 6h quotidien | Vercel | Rapport admin (push + email dimanche) |
| social-post | 9h quotidien | Vercel | Publication FB+IG auto (8 types) |
| bandwidth-report | 20h quotidien | Vercel | Rapport bandwidth Supabase |
| process-candidates | 30 min | IONOS | Pipeline R2 + analyse vocale Demucs |
| backup | **NON SCHEDULÉ** | À configurer IONOS | Backup 19 tables → R2 |
| health-check | **NON SCHEDULÉ** | À configurer IONOS | Health check complet |
| jury-recap | **NON SCHEDULÉ** | À configurer IONOS | Recap hebdo jury en ligne |
| inscription-reminder | **NON SCHEDULÉ** | À configurer IONOS | Rappel inscriptions J-5, J0 |

---

## PROBLÈMES IDENTIFIÉS (22 mars 2026)

### CRITIQUE
1. **Pas de mode offline jury** — scores perdus si connexion tombe (demi-finale salle + finale extérieur sans WiFi)
2. **Winner reveal = 1 seul champ** — live_events.winner_candidate_id. Or il faut 3 gagnants (1 par catégorie). À vérifier si le code gère ça.

### IMPORTANT
3. **Crons backup et health-check non schedulés** — pas de filet de sécurité
4. **RLS non active** sur tables principales — la anon_key publique permet théoriquement de lire/écrire toutes les données
5. **Pas de rate limiting** applicatif sur routes publiques
6. **max_votes_per_device=50** vérifié côté client uniquement

### MINEUR
7. **sendTelegram() redéfini localement** dans chaque cron (maintenance debt)
8. **Pas d'alerte candidat pending > 2h** (cron silencieux en cas d'erreur)

---

## INFRASTRUCTURE

| Service | Plan | Coût | Rôle |
|---------|------|------|------|
| Vercel | Hobby | 0€ | Hosting (75% CPU avec 4 projets) |
| Supabase | Free | 0€ | BDD + Auth + Storage backup |
| Cloudflare R2 | Free (10 GB) | 0€ | Stockage principal photos/vidéos |
| IONOS | Hosting | ~5€/mois | 4 domaines + SMTP + crons |
| Stripe | Pay-per-use | 1.4%+0.25€/tx | Dons uniquement |
| PCmusique | Local | 0€ | GPU GTX 1070 pour VocalPrint/Demucs |
| Resend | Free | 0€ | Envoi emails transactionnels |

---

## CE DOCUMENT EST UNE RÉFÉRENCE

Quand tu travailles sur ChanteEnScene, consulte cette feuille de route pour :
- Savoir dans quelle phase on est et ce qui est attendu
- Comprendre quel outil fait quoi et quand
- Anticiper les problèmes des phases à venir
- Ne pas casser ce qui fonctionne déjà

**Mise à jour** : ce document doit être mis à jour à chaque changement de phase ou modification majeure.
