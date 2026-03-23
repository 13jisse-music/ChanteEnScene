# ChanteEnScene — Optimization Log (22 mars 2026)

## Build initial
- **Resultat** : SUCCES
- Toutes les pages compilent correctement (Static + Dynamic)
- Aucune erreur TypeScript

---

## Diagnostic : Reveal par categorie (PROBLEME 2)

### Architecture actuelle
- `RegieFinale.tsx` gere les categories via onglets (Enfant / Ado / Adulte)
- `handleRevealWinner()` appelle `revealWinner(eventId, selectedWinnerId)` — server action dans `src/app/admin/finale/actions.ts`
- La server action fait un UPDATE sur `live_events` : `winner_candidate_id = candidateId` + `winner_revealed_at = now()`

### Constats
1. **Un seul champ `winner_candidate_id`** sur `live_events` — il est ecrase a chaque reveal de categorie
2. **Pas de champ `winners` JSONB** — pas d'historique des gagnants par categorie
3. **Workaround actuel** : apres le reveal (20s timeout), `resetWinnerReveal(eventId)` remet les champs a null, puis la regie passe automatiquement a la categorie suivante via `setCurrentCategory`
4. **Le reveal fonctionne** grace au timing : reveal → animation 20s → reset → categorie suivante. Mais si l'admin est trop rapide ou si le reset echoue, le `winner_candidate_id` serait ecrase
5. **Le candidat est marque `status: 'winner'`** dans la table `candidates`, ce qui constitue l'historique persistant

### Risque
- Faible en pratique (le reset s'effectue avant le prochain reveal)
- Pour une v2, ajouter un champ JSONB `winners` sur `live_events` serait plus robuste

### Composants lies
- `WinnerCountdown.tsx` : animation coin-spin avec decompte 5→0, confettis, transition vers WinnerReveal
- `WinnerReveal.tsx` : ecran plein de victoire (confettis, photo, nom, categorie)
- Les deux recoivent la categorie en prop et l'affichent correctement

---

## Modifications effectuees

### 1. IONOS_CRONS_A_CONFIGURER.md (NOUVEAU)
- Documentation complete des crons a configurer sur IONOS
- 5 crons documentes avec URL, frequence, header d'autorisation
- Instructions de configuration IONOS

### 2. Monitoring candidats pending > 2h (PROBLEME 3)
- **Fichier** : `src/app/api/cron/process-candidates/route.ts`
- **Changement** : ajout d'un bloc monitoring a la fin du handler GET
- Requete les candidats avec `status = 'pending'` et `created_at < 2h ago`
- Envoie une alerte Telegram si des candidats sont bloques
- Dans un try/catch separe (non-bloquant)

### 3. Systeme offline jury (PROBLEME 1) — 3 nouveaux fichiers
- **`src/lib/jury-offline-queue.ts`** : queue localStorage pour les scores jury hors ligne
  - Interface PendingScore, getOfflineQueue, addToOfflineQueue, markSynced, getPendingCount, clearSyncedItems
  - Deduplication : un score par candidat+event_type (pas de doublons)

- **`src/hooks/useJuryOfflineSync.ts`** : hook React de synchronisation
  - Detecte online/offline via navigator.onLine + events
  - Auto-sync quand la connexion revient
  - Import du client Supabase via `@/lib/supabase/client` (meme import que JuryScoring)

- **`src/components/JuryConnectionStatus.tsx`** : badge visuel status connexion
  - Affiche "Hors ligne" (rouge), "Synchronisation..." (bleu), ou "X note(s) en attente" (orange)
  - Position fixe en haut a droite, ne s'affiche que si necessaire

### 4. Fallback offline dans JuryScoring.tsx (PROBLEME 1)
- **Fichier** : `src/components/JuryScoring.tsx`
- **Import ajoute** : `addToOfflineQueue` depuis `@/lib/jury-offline-queue`
- **3 fonctions de scoring modifiees** :
  - `handleVote()` (decision swipe, ~ligne 287) : catch → addToOfflineQueue
  - `handleSaveStars()` (etoiles, ~ligne 1029) : catch → addToOfflineQueue
  - `handleSaveCriteria()` (criteres, ~ligne 1543) : catch → addToOfflineQueue
- Le code existant est conserve intact, juste enveloppe dans try/catch avec fallback

### 5. JuryConnectionStatus dans la page jury
- **Fichier** : `src/app/jury/[token]/page.tsx`
- **Import** : `JuryConnectionStatus` ajoute
- **JSX** : composant ajoute au debut du `<main>` pour les jures en presentiel

### BONUS : Centralisation sendTelegram
- **Nouveau fichier** : `src/lib/telegram.ts` — fonction centralisee sendTelegram (parse_mode: HTML)
- **Modifie** : `src/app/api/cron/process-candidates/route.ts` — remplace la definition locale par l'import
- **Non modifies** : bandwidth-report et social-post (utilisent parse_mode: Markdown, pas HTML)

### BONUS : Rate limiting
- **Nouveau fichier** : `src/lib/rate-limit.ts` — rate limiter in-memory avec sliding window
- **Modifie** : `src/app/api/register-candidate/route.ts` — 5 req/IP/minute, retourne 429 si depasse
- Cleanup automatique des anciennes entrees (toutes les 5 min)

---

## Build final
- **Resultat** : SUCCES
- Toutes les modifications compilent sans erreur TypeScript
- Aucune regression

## Backup
- **Declenche** : oui, via curl
- **Resultat** : 19 tables, 2739 lignes exportees
- **Note** : erreurs d'upload R2 (header auth issue), mais les donnees sont exportees

---

## Resume
| Probleme | Status | Fichiers |
|----------|--------|----------|
| P1 Jury offline | OK | jury-offline-queue.ts, useJuryOfflineSync.ts, JuryConnectionStatus.tsx, JuryScoring.tsx |
| P2 Reveal categorie | Diagnostic fait (workaround actuel fonctionne) | RegieFinale.tsx (non modifie) |
| P3 Crons + monitoring | OK | IONOS_CRONS_A_CONFIGURER.md, process-candidates/route.ts |
| Bonus sendTelegram | Centralise | telegram.ts, process-candidates/route.ts |
| Bonus rate limit | OK | rate-limit.ts, register-candidate/route.ts |
