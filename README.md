# Veille sanitaire en RDC

Application statique de veille sanitaire avec carte des provinces, informations sourcées et actualités.

## Sauvegarde automatique sur GitHub

Dans VS Code, la tâche **Commit automatique après sauvegarde** démarre à l’ouverture du dossier. Elle attend 1,5 seconde sans nouvel événement de fichier, puis ajoute et commit les changements non ignorés et les pousse vers `origin`. Si GitHub est inaccessible, les commits restent en local, un avertissement est affiché et l’envoi est retenté toutes les 60 secondes ainsi qu’après les sauvegardes suivantes. Autorisez les tâches automatiques du dossier dans VS Code si demandé.

Une authentification GitHub est nécessaire une seule fois sur cet ordinateur. Dans le terminal de VS Code, lancez `git push -u origin main` et terminez la connexion proposée par Git Credential Manager; ne mettez jamais de jeton ou de mot de passe dans le code ou le chat. Cette première opération publie aussi les commits locaux déjà en attente. Le dépôt étant public, chaque push rend immédiatement les changements accessibles à tous.

Les fichiers `.env`, clés et certificats privés sont exclus via `.gitignore`. Vérifiez les changements sensibles avant de les enregistrer dans des fichiers suivis par Git. Pour arrêter la surveillance, utilisez **Tasks: Terminate Task**; pour la redémarrer, lancez la tâche depuis **Terminal → Run Task**.

## Actualisation quotidienne

Le workflow GitHub Actions `.github/workflows/actualisation-quotidienne.yml` collecte chaque jour à 04:00 UTC les publications récentes du flux OMS Afrique et de ReliefWeb, puis publie le site sur GitHub Pages. Il peut aussi être lancé manuellement depuis l’onglet **Actions**.

GNews et NewsData.io sont facultatifs. Pour les activer, ajoutez leurs clés dans **Settings → Secrets and variables → Actions** sous les noms `GNEWS_API_KEY` et `NEWSDATA_API_KEY`. Ne placez jamais ces clés dans les fichiers du site.

Pour la première publication, sélectionnez **Settings → Pages → Build and deployment → GitHub Actions**, puis lancez le workflow manuellement.

Les publications automatiques affichent leur source et leur date. Elles n’actualisent pas automatiquement les confirmations, alertes ni couleurs de la carte : ces statuts doivent rester fondés sur une vérification officielle, et un article médiatique ou humanitaire ne confirme pas une épidémie.

## Graphiques et rapports PDF

La rubrique **Épidémies et alertes** propose un graphique interactif du nombre de publications officielles chargées par mois, ventilées selon leur statut, sur une période de 3, 6 ou 12 mois. Ce décompte porte sur les publications, pas sur les cas ni sur l’incidence; les données historiques ne décrivent pas la situation actuelle.

Le bouton **Télécharger le rapport PDF** génère un rapport local incluant les alertes officielles et les actualités disponibles, avec leurs sources et dates de publication. Les informations humanitaires ou médiatiques y sont explicitement présentées comme non confirmatoires. Chart.js et jsPDF sont chargés depuis un CDN au besoin; une connexion Internet est nécessaire pour ces fonctions.
