# Journal de traitement des mails - Demi-finale ChantEnScene Aubagne 2026

Journal operationnel des reponses traitees pendant la campagne demi-finale.
Tenu sans coordonnees (pas d'adresses mail), informations sensibles anonymisees.

Demi-finale : mercredi 17 juin 2026, 16h-19h, Espace des Arts et de la Culture, Aubagne (huis clos).
Deadline playback MP3 : 13 juin. Rappel automatique renforce le 8 juin.

## 11 juin 2026
- Caroline Cohen (Adulte) et Lena Silano (Ado) : playbacks recus par mail (pieces jointes), recuperes par IMAP et enregistres manuellement dans le Storage + mp3_url en base. On passe a 24/30. Accuses de reception envoyes.
- Caroline Cohen : divergence de morceau elucidee - elle hesitait entre sa compo "Moi j'voulais pas" et une reprise "Rome" de Solann. DECISION Jisse : compo autorisee, et regle posee = reprise OU composition originale au choix, ouverte a TOUS (+ brief jury : noter la voix/interpretation, pas la notoriete du titre). Caroline est la seule des 30 a faire une compo, et elle a ete selectionnee dessus. RESOLU le soir du 11 juin : Caroline a envoye sa compo "Moi jvoulais pas.m4a" (4min04). Recuperee par IMAP, convertie en mp3 (ffmpeg, 192k) et enregistree dans le Storage (remplace le "Rome" provisoire). Titre/fichier desormais coherents : "Moi j'voulais pas" / Caro Cactus. Dossier Caroline clos cote fichier. Reste : accuse de reception a lui envoyer (a valider).
- Point complet envoye a Olivier Reybaud par iMessage (22/30 a ce moment, manquants par categorie avec tel sauf Lisa Martinez, reservistes 3 premiers/categorie avec tel, consigne de prevenir avant repechage). Acces SMS/iMessage du Mac active (lecture chat.db + envoi via Messages).

## 9 juin 2026
- Point playbacks envoye a Olivier Reybaud et Julien Lamand (Jisse en copie) : 20/30 recus (Enfant 9/10, Ado 7/10, Adulte 4/10), liste des manquants avec numeros de tel pour relance telephonique. Lisa Martinez volontairement non mentionnee (sa mere s'en occupe).
- Relance ferme envoyee aux 2 demi-finalistes sans numero de tel (Guillaume Salle, Adulte ; Heaven Vazi, Enfant) : sans playback d'ici vendredi 12 juin, place proposee a un autre candidat (contrainte orga). Lien de depot personnel inclus.
- Selena Espinosa (Enfant) : playback "Voila" depose (MP3 OK en base). Question sur l'acces a la demi-finale : reponse envoyee. Precision validee par Jisse : la demi-finale n'est PAS a huis clos ferme ; pas de promotion ni de tribune grand public prevue, mais les proches (parents, grands-parents, fratrie) sont les bienvenus pour venir soutenir leur candidat. (Corrige l'info "entree libre ouverte a tous" donnee a Mme Blanchard le 4 mai, anterieure a la decision.)
- Mael Capocci Guilbaud (Enfant) : fichier MP3 recu par mail, enregistre manuellement (bonne version, "Etre un homme comme vous" de Ben l'Oncle Soul, transpose +3) ; mp3_url remis en base. Changement de morceau CONFIRME par la maman (message 9 juin 07h54 : on lui a conseille de changer de chanson pour montrer plus de facettes de Mael). Titre de la fiche mis a jour : "Etre un homme comme vous" / Ben l'Oncle Soul (l'inscription portait "I got a woman" / Ray Charles). Confirmation envoyee a la famille (14h56), accusee. Dossier clos.
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
