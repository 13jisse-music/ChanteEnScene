# RAPPORT AUDIT VOCALPRINT — 23 mars 2026

Machine : PCmusique (i5-6600K, 48 GB RAM, GTX 1070 8 GB, Windows 10 Pro)
Acces : SSH via Tailscale (100.122.159.69, user Ecole13Jisse)
WSL2 : Ubuntu (/home/jisse/vp/)

---

## 1. Architecture

### Deux environnements
| Env | Chemin | Role |
|-----|--------|------|
| **Windows** | `C:\Dev\learning\` | BDD SQLite, MP3 sources, scripts Python, learning engine |
| **Windows** | `C:\Dev\demucs-server\` | Serveur Demucs HTTP, bot Telegram, analyse CES |
| **WSL2** | `/home/jisse/vp/` | Pipeline v3 (GPU CUDA), batch processing |

### Liens symboliques WSL2
```
/home/jisse/vp/db  → /mnt/c/Dev/learning/db    (BDD partagee)
/home/jisse/vp/mp3 → /mnt/c/Dev/learning/mp3   (MP3 candidats)
/home/jisse/vp/pro → /mnt/c/Dev/learning/pro   (MP3 pro)
```

---

## 2. Base de donnees SQLite

**Fichier** : `C:\Dev\learning\db\vocal_learning.db`

### Stats globales
| Metrique | Valeur |
|----------|--------|
| Total analyses | 392 |
| Niveau PRO | 369 |
| Niveau candidat | 23 |
| Artistes distincts | 174 |
| Analyses v3 | 14 |
| Premiere analyse | 20 mars 2026 |
| Derniere analyse | 22 mars 2026 23h20 |

### Schema table `analyses` (61 colonnes)

#### Colonnes de base (v1)
- `id` (INTEGER), `file_path` (TEXT), `file_hash` (TEXT), `file_size` (INTEGER)
- `artist` (TEXT), `title` (TEXT), `genre` (TEXT)
- `analyzed_at` (TEXT), `engine_version` (TEXT)
- `level` (TEXT), `is_reference` (INTEGER), `famous_artist_id` (TEXT)

#### Metriques vocales (v2)
- `justesse_pct` (REAL), `justesse_harmonique_pct` (REAL), `stability_pct` (REAL)
- `tessiture_low/high` (TEXT), `tessiture_low/high_midi` (INTEGER), `octaves` (REAL), `voice_type` (TEXT)
- `bpm` (REAL), `song_key` (TEXT)
- `tenue_avg_ms` (REAL), `tenue_max_ms` (REAL)
- `dynamique_range_db` (REAL), `dynamique_label` (TEXT)
- `timbre_label` (TEXT), `timbre_brightness` (REAL)
- `vibrato_count` (INTEGER), `total_notes` (INTEGER)
- `zone_grave/medium/aigu_pct` (REAL)
- `ecg_data` (TEXT), `duration_sec` (REAL), `raw_json` (TEXT)

#### Detection instruments (v2)
- `has_double_sep` (BOOLEAN), `has_guitar` (BOOLEAN), `has_piano` (BOOLEAN)

#### Spotify enrichissement
- `spotify_track_id` (TEXT), `spotify_genre` (TEXT), `spotify_bpm` (REAL)
- `spotify_key` (TEXT), `spotify_popularity` (INTEGER), `spotify_bpm_diff` (REAL)

#### Metriques v3 (Demucs + CREPE + Whisper + Resemblyzer)
- `fatigue_q1/q2/q3/q4` (REAL), `fatigue_drop` (REAL) — evolution fatigue par quartile
- `breath_count` (INTEGER) — nombre de respirations detectees
- `avg_delay_ms` (REAL) — delai moyen entre notes
- `chest_pct` (REAL), `mixed_pct` (REAL), `head_pct` (REAL) — registres vocaux
- `harmonic_richness` (REAL), `snr_db` (REAL) — qualite du signal
- `confidence_score` (REAL) — score de confiance global
- `diction_text` (TEXT), `diction_confidence` (REAL) — transcription Whisper
- `voice_embedding` (TEXT) — empreinte vocale Resemblyzer
- `is_v3` (BOOLEAN) — flag v3 complete

### Couverture v3
| Metrique | Remplissage |
|----------|-------------|
| voice_embedding | 14/392 (3.6%) |
| fatigue_q1-q4 | 0/392 (0%) |
| diction_text | 0/392 (0%) |
| is_v3 = true | 14/392 (3.6%) |

---

## 3. Pipeline v2 (Windows — production)

### Fichiers cles dans `C:\Dev\learning\`
| Fichier | Role |
|---------|------|
| `learning_engine.py` | Moteur principal v2 (analyse + enrichissement Spotify) |
| `learning_engine_v3.py` | Version v3 Windows (non utilisee, remplacee par WSL2) |
| `vocal_analyzer_v3.py` | Analyseur vocal v3 (18 metriques) |
| `download_pro_songs.py` | Telechargement chansons pro |
| `scan_mp3s.py` | Scan des MP3 locaux |
| `sync_famous_artists.py` | Synchro artistes celebres vers Supabase |
| `calibrate_thresholds.py` | Calibration seuils notation |
| `vp_watchdog.py` | Watchdog pipeline |
| `vp_stats.py` | Stats rapides |
| `enrich_v3.py` | Enrichissement v3 |
| `migrate_v3_columns.py` | Migration colonnes v3 |

### Fichiers dans `C:\Dev\demucs-server\`
| Fichier | Role |
|---------|------|
| `demucs_server.py` | Serveur HTTP Demucs (separation voix) |
| `server.py` | Ancien serveur (remplace) |
| `start_all.py` | Lanceur Demucs + tunnel |
| `start_tunnel.py` | Cloudflare tunnel |
| `analyze_ces_vocals.py` | Analyse vocales CES (candidats) |
| `vocal_analysis.py` | Module analyse vocale |
| `telegram_vocal_bot.py` | Bot Telegram pour vocales |
| `cron_process_candidates.py` | Cron traitement candidats |
| `generate_ecg_data.py` | Generation donnees ECG |
| `test_analyze.py` | Tests |
| `reanalyze_v2.py` | Re-analyse v2 |

---

## 4. Pipeline v3 (WSL2 — GPU CUDA)

### Fichiers dans `/home/jisse/vp/`
| Fichier | Taille | Date | Role |
|---------|--------|------|------|
| `batch_v3_pro.py` | 7.1 KB | 23 mars 06:38 | Script batch v3 (lance les analyses) |
| `vocal_analyzer_v3.py` | 20 KB | 22 mars 10:48 | Analyseur 18 metriques |
| `learning_engine_linux.py` | 36 KB | 22 mars 10:56 | Moteur apprentissage Linux |
| `learning_engine.py` | 37 KB | 22 mars 10:47 | Moteur apprentissage (copie Windows) |
| `wsl_engine_wrapper.py` | 2.2 KB | 22 mars 10:51 | Wrapper WSL |
| `batch_v3.log` | 1.5 MB | 23 mars 06:50 | Log du dernier batch (26774 lignes) |
| `engine.log` | 97 KB | 22 mars 23:20 | Log learning engine |

### 18 metriques v3
1. Justesse (%), justesse harmonique (%)
2. Stabilite (%)
3. Tessiture (low/high MIDI, octaves, voice_type)
4. BPM, tonalite
5. Tenue (avg/max ms)
6. Dynamique (range dB, label)
7. Timbre (brightness, label)
8. Vibrato (count)
9. Zones (grave/medium/aigu %)
10. **Fatigue** (q1-q4, drop) — v3
11. **Souffle** (breath_count) — v3
12. **Timing** (avg_delay_ms) — v3
13. **Registres** (chest/mixed/head %) — v3
14. **Richesse harmonique** — v3
15. **SNR** (dB) — v3
16. **Confiance** (score global) — v3
17. **Diction** (text + confidence, Whisper) — v3
18. **Empreinte vocale** (embedding, Resemblyzer) — v3

### GPU
- **NVIDIA GeForce GTX 1070** : 292 MiB / 8192 MiB utilises
- CUDA actif pour Demucs, CREPE, Whisper

---

## 5. Etat du batch v3

### Dernier run : 23 mars 2026, 06:38-06:50
```
[06:38:46] === BATCH VP v3 (Demucs + CREPE + Whisper + Resemblyzer) ===
[06:38:46] Demucs server: OK (GPU=True)
[06:38:48] 369 PRO a traiter en v3
[06:38:51] [1/369] Bon Jovi - Wanted Dead Or Alive
[06:39:11]   Demucs OK (20s)
...
[06:50:48] === TERMINE: 14 OK, 347 erreurs, 8 skipped / 369 ===
```

### Diagnostic
- **14 succes** sur 369 (3.8%)
- **347 erreurs** : `ConnectionError: Remote end closed connection without response`
- **Cause probable** : le serveur Demucs a plante/sature apres ~14 analyses consecutives
- **Temps par analyse** : ~20s Demucs + analyse v3 = ~2 min/chanson
- **Temps estime total** : 369 x 2 min = ~12h (si stable)
- **8 skipped** : probablement deja en v3

---

## 6. Taches planifiees (schtasks)

| Tache | Prochain run | Statut |
|-------|-------------|--------|
| DemucsServer | N/A | **En cours** (actif) |
| DemucsCloudflare | N/A | Pret |
| VP-Learning | N/A | Pret |
| VP-V3-Batch | N/A | Pret |
| VP-Watchdog | N/A | Pret |
| LearningEngine | N/A | Pret |
| CES-Pipeline | 23/03 08:35 | Pret |
| CES-Backup | 24/03 02:00 | Pret |
| CES-HealthCheck | 24/03 07:00 | Pret |
| CES-JuryRecap | 30/03 08:00 | Pret |
| JCM-TestFollowup | 24/03 08:00 | Pret |
| YouTube-Migration-CES | 23/03 10:00 | Pret |

---

## 7. Integrations

### Front-end (CES/LCDP)
- **ECG v3** : composant front-end pret, donnees `ecg_data` dans la BDD
- **Famous artists** : table `famous_artists` dans Supabase LCDP (219 artistes)
- **Sync** : `sync_famous_artists.py` pour pousser les donnees analysees vers Supabase

### Telegram
- Bot CES : analyses vocales des candidats
- `telegram_vocal_bot.py` : bot pour envoyer des vocales
- `cron_process_candidates.py` : traitement automatique

### Spotify
- Enrichissement automatique : BPM, tonalite, popularite, genre
- Client Credentials Flow

---

## 8. Points d'attention

### Critique
1. **Batch v3 a 3.8%** — le serveur Demucs crash apres ~14 analyses. Besoin de :
   - Restart automatique du serveur Demucs entre les analyses (ou par lots de 10)
   - Retry avec backoff exponentiel dans batch_v3_pro.py
   - Ou limiter a 5-10 analyses par run et relancer via cron

### Important
2. **0 metriques fatigue/diction** — meme les 14 analyses v3 n'ont pas ces metriques (seul l'embedding fonctionne)
3. **Pas de deps listees en WSL2** — `pip3 list | grep` ne retourne rien (possible venv ou conda non active)
4. **Log 1.5 MB** — rotation des logs a mettre en place

### A surveiller
5. **GPU sous-utilise** : 292/8192 MiB — le serveur Demucs tourne mais ne traite rien actuellement
6. **Pas de backup BDD** : `vocal_learning.db` n'a pas de sauvegarde automatique
7. **347 erreurs non retentees** : les analyses echouees ne sont pas marquees pour retry

---

## 9. Roadmap v3

### Court terme (priorite)
1. **Fix batch v3** : ajouter restart Demucs + retry + batch par lots de 10
2. **Verifier deps WSL2** : activer le bon venv/conda et confirmer les packages
3. **Relancer le batch** : objectif 369/369 PRO en v3

### Moyen terme
4. **2e passe analyse** : recalculer fatigue + diction pour les 14 deja faits
5. **Backup automatique** : copie quotidienne de vocal_learning.db
6. **Rotation logs** : limiter batch_v3.log a 100K lignes

### Long terme
7. **Dashboard VP** : page admin CES avec metriques v3 (fatigue, registres, diction)
8. **Comparaison candidats/pro** : scoring automatique base sur les references
9. **Empreinte vocale** : clustering par similarite (Resemblyzer embeddings)

---

## 10. Fichiers cles — Carte complete

```
C:\Dev\learning\
├── db\
│   └── vocal_learning.db          ← BDD principale (392 analyses)
├── mp3\                           ← MP3 candidats CES
├── pro\                           ← MP3 pro (369 fichiers)
├── learning_engine.py             ← Moteur v2 principal
├── learning_engine_v3.py          ← Moteur v3 Windows (backup)
├── vocal_analyzer_v3.py           ← Analyseur 18 metriques
├── download_pro_songs.py
├── scan_mp3s.py
├── sync_famous_artists.py
├── calibrate_thresholds.py
├── vp_watchdog.py
├── vp_stats.py
└── ...

C:\Dev\demucs-server\
├── demucs_server.py               ← Serveur HTTP Demucs (GPU)
├── start_all.py                   ← Lanceur Demucs + tunnel
├── analyze_ces_vocals.py          ← Pipeline CES
├── telegram_vocal_bot.py          ← Bot Telegram
├── cron_process_candidates.py     ← Cron candidats
├── generate_ecg_data.py           ← ECG front-end
└── ...

/home/jisse/vp/ (WSL2)
├── batch_v3_pro.py                ← Batch v3 (lance les analyses)
├── vocal_analyzer_v3.py           ← Analyseur v3 Linux
├── learning_engine_linux.py       ← Moteur Linux
├── wsl_engine_wrapper.py          ← Wrapper WSL
├── batch_v3.log                   ← Log dernier batch (1.5 MB)
├── engine.log                     ← Log engine (97 KB)
├── db -> /mnt/c/Dev/learning/db   ← Symlink BDD
├── mp3 -> /mnt/c/Dev/learning/mp3
└── pro -> /mnt/c/Dev/learning/pro
```
