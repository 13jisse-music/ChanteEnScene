# Journal de traitement des mails - Demi-finale ChantEnScene Aubagne 2026

Journal operationnel des reponses traitees pendant la campagne demi-finale.
Tenu sans coordonnees (pas d'adresses mail), informations sensibles anonymisees.

Demi-finale : mercredi 17 juin 2026, 16h-19h, Espace des Arts et de la Culture, Aubagne (huis clos).
Deadline playback MP3 : 13 juin. Rappel automatique renforce le 8 juin.

## 9 juin 2026
- Mael Capocci Guilbaud (Enfant) : fichier MP3 recu par mail, enregistre manuellement (bonne version, "Etre un homme comme vous" de Ben l'Oncle Soul, transpose +3). mp3_url remis en base. Accuse de reception envoye + question posee a la famille sur le titre (inscrit "I got a woman" / Ray Charles, mais playback recu = "Etre un homme comme vous"). Titre non modifie tant que la famille n'a pas confirme.
- Bug de depot MP3 identifie et corrige : la signed URL d'upload ne permettait pas l'ecrasement d'un fichier deja present (le chemin sessionId/slug/mp3 est fixe par candidat), donc tout 2e depot echouait. C'est ce qui bloquait Gagliano et Mael. Fix : createSignedUploadUrl avec upsert:true + header x-upsert cote client. Les candidats peuvent desormais remplacer leur MP3.

## 8 juin 2026
- Selena Espinosa (Enfant) : changement de morceau pour la demi-finale, passe a "Voila" de Barbara Pravi (mis a jour en base, demande explicite de la famille). Lien de depot renvoye. Reponse envoyee.
- Patricia Montmartin (Adulte) : confirme l'envoi de son playback "Il est mort le soleil" demain apres-midi (dans les temps). Accuse de reception envoye.
- Mael Capocci Guilbaud (Enfant) : le depot MP3 rebloque malgre la reinitialisation de la veille (capture d'erreur jointe). Invite a renvoyer son fichier audio par mail pour enregistrement manuel. Reponse envoyee.

## 7 juin 2026
- Olivier Gagliano (parent de Lola Gagliano, Enfant) : avait depose le mauvais MP3 et n'arrivait plus a le remplacer. Depot reinitialise, puis le bon fichier (envoye en piece jointe) enregistre manuellement via la porte de secours admin. Reponse envoyee.
- Elisea Gomez (Ado) : confirme sa presence et signale la coquille de jour. Playback MP3 deja recu. Reponse envoyee (la demi-finale est bien le mercredi 17 juin).
- Erratum "mercredi 17 juin" envoye aux 21 demi-finalistes ayant recu la newsletter du 6 juin (le jour annonce etait "mardi" par erreur ; la date 17 juin ne change pas).

## 6 juin 2026
- Newsletter "gentille pression" envoyee aux 23 demi-finalistes encore sans MP3, et message "tenez-vous pret" aux 8 reservistes. Copie temoin a Olivier Reybaud.
- Patricia Montmartin (Adulte) : en vacances, enverra son MP3 le mardi 9 juin (dans les temps). Morceau change pour la demi-finale : "Il est mort le soleil" de Nicoletta. Reponse envoyee.
- Stephanie Beaussant (parent de Romane Munoz, reserviste Enfant) : remerciement ; gardee en priorite sur la liste de reserve. Reponse envoyee.
- Lola Gagliano : premier depot MP3 (fichier errone, corrige le 7 juin).
- Stockage Supabase allege : purge de 23 fichiers orphelins (doublons d'inscription abandonnes + 1 fichier de test), 288 Mo liberes.
- Boite mail rangee : copies d'archive de la newsletter mises en corbeille.

## 5 juin 2026
- Desistement d'une demi-finaliste de la categorie Adulte (raison personnelle). Repechage de Marie Nalin, premiere sur la liste de reserve Adulte (promue demi-finaliste + mail de selection). Olivier Reybaud informe. Categorie Adulte de nouveau complete a 10.

## 4 juin 2026
- Reponses de confirmation de presence et rappels MP3 traitees : Zoe Galmiche, Emma-Rose Barthelemy, Sarah Vado, Selena Espinosa, et autres.
- Correction de communication : l'horaire de la grande finale avait ete annonce par erreur a 16h-19h (c'est l'horaire de la demi-finale). Grande finale : 16 juillet, a partir de 20h30, Cours Marechal Foch. Office de Tourisme corrige, site et base mis a jour.

## 3 juin 2026
- Selection des 30 demi-finalistes : envoi des mails de selection, reserve et non-selection. Reponses des candidats traitees (presence, questions morceau / instrument / duo, depots MP3).
