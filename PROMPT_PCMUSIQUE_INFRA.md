# CONTEXTE — Infrastructure PCmusique + VocalPrint

## QUI JE SUIS
Jisse (Jean Christophe Martinez), coach vocal, 1 seul développeur (Claude Code en autonomie).
5 projets live : ChanteEnScene (concours chant), LCDP (école de chant), JCM (PNL), ToutEnMel (art), Naya Solis (SaaS vocal).

## ARCHITECTURE DEUX MACHINES

### Surface Laptop (machine principale)
- Windows 10 Pro, 8 GB RAM
- VS Code + Claude Code (CLI Anthropic)
- 4 projets Next.js (Vercel) + cockpit ecosysteme.html
- Pas de GPU, pas de puissance de calcul

### PCmusique (bureau distant, toujours allumé)
- Windows 10 Pro, i5-6600K, **48 GB RAM**, **GTX 1070 8 GB VRAM**
- IP locale : 192.168.1.139 / Tailscale : 100.122.159.69
- Accès SSH : user `Ecole13Jisse` / password `Yourbanlt300!`
- **WSL2 Ubuntu** installé (user `jisse` / `Yourbanlt300!`)
- Projets dans `C:\Dev\` (pas OneDrive)
- Synchronisation via GitHub (git push/pull)

### Connexion Surface → PCmusique
- SSH via Tailscale (100.122.159.69)
- Claude Code sur Surface peut exécuter des commandes sur PCmusique via SSH
- Les warnings SSH "post-quantum" sont normaux (pas des erreurs)
- WinRM aussi disponible (user `Ecole13Jisse`)

## CE QUI TOURNE SUR PCMUSIQUE

### 1. Serveur Demucs (séparation vocale)
- **Port** : 8642 (HTTP)
- **Script** : `C:\Dev\demucs-server\demucs_server.py`
- **GPU** : CUDA actif, ~10s/chanson
- **Endpoints** : POST `/separate`, GET `/status/{job_id}`, GET `/analyze/{job_id}`, DELETE `/cleanup/{job_id}`
- **Pipeline** : MP3 → Demucs v5 (vocals/backing) → Demucs 6s (lead/chœurs) → librosa (10 métriques)
- **Appelé par** : cron CES `/api/cron/process-candidates` (Vercel → PCmusique via Tailscale)

### 2. VP Tool Surface (interface web)
- **Port** : 5555 (Flask)
- **Script** : `C:\Users\Jisse\Desktop\VocalPrint\server.py` (démarre auto Windows via start-hidden.vbs)
- **BDD** : SQLite `C:\Dev\learning\db\vocal_learning.db`
- **Endpoints** : `/status`, `/search`, `/analyze`, etc.
- **Rôle** : interface web pour chercher/écouter les analyses, accessible depuis Surface

### 3. Learning Engine (WSL2 Ubuntu)
- **Chemin** : `/home/jisse/vp/learning_engine_linux.py`
- **Libs** : demucs, librosa, torchcrepe (CREPE), whisper, resemblyzer
- **Symlinks** : pro, mp3, db, candidats → `/mnt/c/Dev/learning/`
- **BDD partagée** : même SQLite que VP Tool (via /mnt/c/)
- **Lancement** : `wsl -- bash -c "cd /home/jisse/vp && nohup python3 learning_engine_linux.py > engine.log 2>&1 &"`
- **NE PLUS UTILISER** le learning engine Windows (crash CUDA)

### 4. Tâches planifiées Windows (schtasks)
| Tâche | Fréquence | Action |
|---|---|---|
| CES-Pipeline | 30 min | `python C:\Dev\demucs-server\cron_process_candidates.py` |
| CES-Backup | 2h quotidien | curl backup API ChanteEnScene |
| CES-HealthCheck | 7h quotidien | curl health-check API ChanteEnScene |
| CES-JuryRecap | Lundi 8h | curl jury-recap API ChanteEnScene |

## VOCALPRINT — ÉTAT ACTUEL (22 mars 2026)

### Données
- **283 analyses** dans SQLite : 227 PRO + 23 CANDIDAT + 33 UNKNOWN
- **Version** : v2.2 (VP Tool + double découpe Demucs)
- **Métriques v2** : justesse technique, justesse harmonique, tenue, dynamique RMS, timbre MFCC, tessiture, ECG pitch, stabilité/vibrato, type de voix, BPM+tonalité

### VP v3 — En cours d'installation sur WSL2
- **CREPE** (pitch neuronal) : installé, plus précis que pYIN
- **Whisper** (diction/prononciation) : installé, transcription + alignement
- **Resemblyzer** (empreinte vocale) : installé, vecteur 256D par chanteur
- **vocal_analyzer_v3.py** : script prêt, 18 métriques (fatigue, souffle, timing, registres, diction, empreinte, confiance)
- **ECG v3 front-end** : prêt (registres colorés, souffle, overlay PRO)

### Roadmap VP v3
1. ✅ Installer CREPE + Whisper + Resemblyzer sur WSL2
2. ✅ Pipeline v2 tourne en production (227+ PRO analysés)
3. ⏳ Classifier les 33 "unknown" en PRO/autre
4. ⏳ Lancer la 2e passe v3 sur les vocals déjà séparés (pas besoin de re-séparer)
5. ⏳ Recalibrer les seuils avec 227+ refs PRO
6. ⏳ Sync famous_artists LCDP avec données VP (tessiture MIDI)
7. ⏳ Re-analyser les 23 candidats CES avec pipeline v3
8. ⏳ Intégrer les métriques v3 dans l'ECG front-end

### Stratégie pipeline
- **v2 sépare + analyse** (MAINTENANT, en production sur Linux)
- **v3 enrichit APRÈS** sur les vocals déjà séparés (pas de re-séparation)
- Les vocals séparés sont dans `C:\Dev\learning\pro\*/vocals.wav`

## CE QUE CLAUDE CODE PEUT FAIRE EN AUTONOMIE

Claude Code (sur Surface) peut via SSH :
- Lancer/arrêter des scripts sur PCmusique
- Lire les logs (`wsl -- tail -f /home/jisse/vp/engine.log`)
- Exécuter des requêtes SQLite sur la BDD VP
- Modifier des scripts Python dans `C:\Dev\`
- Vérifier GPU (`nvidia-smi`)
- Créer/modifier des tâches planifiées
- Lancer le learning engine WSL2

## QUESTIONS POUR TOI (claude.ai)

1. **Classifier les 33 unknown** : quelle stratégie ? Vérifier les noms de fichiers MP3 ? Croiser avec une liste d'artistes ?
2. **2e passe v3** : lancer sur les 227 PRO d'abord (calibrage) ou sur les 23 candidats CES (valeur business) ?
3. **Recalibrage seuils** : par type de voix (soprano/tenor/etc.) ou par style (pop/rock/soul) ?
4. **Priorité** : qu'est-ce qui apporte le plus de valeur concrète rapidement ?
5. **Empreinte vocale Resemblyzer** : utile pour Naya Solis (détecter si même chanteur = triche), mais aussi pour LCDP (comparer élève avec artiste cible). Quel use case en premier ?

## FICHIERS CLÉS SUR PCMUSIQUE
- `C:\Dev\demucs-server\demucs_server.py` — serveur Demucs HTTP
- `C:\Dev\demucs-server\cron_process_candidates.py` — cron CES pipeline
- `C:\Dev\learning\db\vocal_learning.db` — SQLite BDD VP
- `C:\Dev\learning\pro\` — 227+ dossiers artistes avec vocals séparés
- `/home/jisse/vp/learning_engine_linux.py` — engine WSL2
- `/home/jisse/vp/vocal_analyzer_v3.py` — analyseur v3 (18 métriques)
