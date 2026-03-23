# IONOS — Crons a configurer pour ChanteEnScene

## Crons Vercel (deja actifs)
Ces crons sont dans `vercel.json` et fonctionnent automatiquement :
- `0 6 * * *` — `/api/cron/admin-report` (rapport admin quotidien)
- `0 9 * * *` — `/api/cron/social-post` (post reseaux sociaux)
- `0 20 * * *` — `/api/cron/bandwidth-report` (rapport bande passante)

## Crons a configurer sur IONOS
Ces crons necessitent un appel HTTP externe (pas de declencheur Vercel) :

### 1. Process candidates (pipeline R2 + Demucs)
```
Frequence : toutes les 30 min
URL : https://www.chantenscene.fr/api/cron/process-candidates
Methode : GET
Header : Authorization: Bearer cron_chantenscene_2026_xK9mP
```
**Important** : ce cron migre les fichiers vers R2 et lance l'analyse vocale Demucs. Il est critique pendant les periodes d'inscription.

### 2. Backup base de donnees
```
Frequence : tous les jours a 3h du matin
URL : https://www.chantenscene.fr/api/cron/backup
Methode : GET
Header : Authorization: Bearer cron_chantenscene_2026_xK9mP
```

### 3. Health check
```
Frequence : toutes les 5 min
URL : https://www.chantenscene.fr/api/cron/health-check
Methode : GET
Header : Authorization: Bearer cron_chantenscene_2026_xK9mP
```

### 4. Inscription reminder
```
Frequence : tous les jours a 10h
URL : https://www.chantenscene.fr/api/cron/inscription-reminder
Methode : GET
Header : Authorization: Bearer cron_chantenscene_2026_xK9mP
```

### 5. Jury recap
```
Frequence : tous les jours a 21h
URL : https://www.chantenscene.fr/api/cron/jury-recap
Methode : GET
Header : Authorization: Bearer cron_chantenscene_2026_xK9mP
```

## Comment configurer sur IONOS
1. Aller sur https://my.ionos.fr > Hebergement > Taches planifiees (Cron Jobs)
2. Pour chaque cron, creer une tache avec :
   - Type : URL externe
   - URL : celle indiquee ci-dessus
   - Methode : GET
   - Header custom : `Authorization: Bearer cron_chantenscene_2026_xK9mP`
3. Si IONOS ne supporte pas les headers custom, utiliser un script curl :
   ```bash
   curl -s -H "Authorization: Bearer cron_chantenscene_2026_xK9mP" https://www.chantenscene.fr/api/cron/process-candidates
   ```

## Variable d'environnement
- `CRON_SECRET` doit etre defini sur Vercel avec la valeur : `cron_chantenscene_2026_xK9mP`
- Verifier : Vercel > Settings > Environment Variables
