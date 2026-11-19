# Veille sanitaire en RDC

Application statique de veille sanitaire avec carte des provinces, informations sourcées et actualités.

## Sauvegarde automatique sur GitHub

Dans VS Code, la tâche **Commit automatique après sauvegarde** démarre à l’ouverture du dossier. Elle attend 1,5 seconde sans nouvel événement de fichier, puis ajoute et commit les changements non ignorés et les pousse vers `origin`. Si GitHub est inaccessible, les commits restent en local, un avertissement est affiché et l’envoi est retenté toutes les 60 secondes ainsi qu’après les sauvegardes suivantes. Autorisez les tâches automatiques du dossier dans VS Code si demandé.

Une authentification GitHub est nécessaire une seule fois sur cet ordinateur. Dans le terminal de VS Code, lancez `git push -u origin main` et terminez la connexion proposée par Git Credential Manager; ne mettez jamais de jeton ou de mot de passe dans le code ou le chat. Cette première opération publie aussi les commits locaux déjà en attente. Le dépôt étant public, chaque push rend immédiatement les changements accessibles à tous.

Les fichiers `.env`, clés et certificats privés sont exclus via `.gitignore`. Vérifiez les changements sensibles avant de les enregistrer dans des fichiers suivis par Git. Pour arrêter la surveillance, utilisez **Tasks: Terminate Task**; pour la redémarrer, lancez la tâche depuis **Terminal → Run Task**.

## Actualisation quotidienne

Le workflow GitHub Actions `.github/workflows/actualisation-quotidienne.yml` collecte chaque jour à 04:00 UTC les publications récentes du flux OMS Afrique et de ReliefWeb, puis publie le site sur GitHub Pages. Il peut aussi être lancé manuellement depuis l’onglet **Actions**.

GNews et NewsData.io sont facultatifs. Pour les activer, ajoutez leurs clés dans **Settings → Secrets and variables → Actions** sous les noms `GNEWS_API_KEY` et `NEWSDATA_API_KEY`. Ne placez jamais ces clés dans les fichiers du site.

Pour activer la troisième source choisie, créez une clé GNews puis ajoutez-la au dépôt GitHub dans **Settings → Secrets and variables → Actions → New repository secret**, sous le nom exact `GNEWS_API_KEY`. La clé est lue uniquement par le workflow quotidien; ne l’inscrivez jamais dans le code ou dans le chat. Lancez ensuite **Actions → Actualisation quotidienne des sources sanitaires → Run workflow** pour vérifier la collecte. Le flux GNews est médiatique et ne confirme pas une épidémie.

Pour la première publication, sélectionnez **Settings → Pages → Build and deployment → GitHub Actions**, puis lancez le workflow manuellement.

Les publications automatiques affichent leur source et leur date. Elles n’actualisent pas automatiquement les confirmations, alertes ni couleurs de la carte : ces statuts doivent rester fondés sur une vérification officielle, et un article médiatique ou humanitaire ne confirme pas une épidémie.

## Recherche et filtres

Dans **Actualités sanitaires**, le flux se filtre par mots-clés, source, rubrique/catégorie et intervalle de dates de publication. Les filtres sont combinables et peuvent être effacés en une fois. Les favoris conservent le titre, la source, la date et le lien afin de rester accessibles même lorsque la publication sort du flux récent.

## Comptes et favoris synchronisés

L’application utilise Supabase Auth pour créer un compte par e-mail, se connecter, réinitialiser un mot de passe et se déconnecter. Supabase gère les mots de passe; ils ne sont pas enregistrés par le site. Les favoris d’un compte sont stockés dans Supabase et protégés par Row Level Security (RLS). Sans configuration Supabase, les favoris continuent de fonctionner localement dans le navigateur.

Pour activer les comptes :

1. Créez un projet Supabase et activez le fournisseur **Email** dans **Authentication → Providers**. Configurez les URL autorisées et l’URL de redirection vers l’adresse HTTPS de GitHub Pages du site.
2. Dans **SQL Editor**, exécutez [`supabase/schema.sql`](./supabase/schema.sql) pour créer la table et ses politiques RLS.
3. Dans les paramètres API du projet, copiez l’URL du projet et sa clé `anon`/`publishable` publique dans [`data/supabase-config.js`](./data/supabase-config.js), aux champs `url` et `anonKey`. Cette clé publique est destinée au navigateur; n’y mettez jamais la clé `service_role` ou une clé secrète.
4. Publiez le changement sur GitHub Pages, puis testez la création de compte, la confirmation par e-mail et la connexion.

Les favoris locaux existants sont importés au premier chargement d’un compte. Les favoris synchronisés sont accessibles après connexion sur les autres appareils. Ne sauvegardez pas de données de patient dans l’application.

## Graphiques et rapports PDF

La rubrique **Épidémies et alertes** propose un graphique interactif qui reprend les repères de la carte, regroupés par province et type d’information, avec des filtres de 3, 6 ou 12 mois selon la date de publication. Un repère est une information sourcée, pas un cas; le contexte provincial et les indicateurs ne confirment pas une épidémie dans une ville.

Le bouton **Télécharger le rapport PDF** génère un rapport local incluant les alertes officielles et les actualités disponibles, avec leurs sources et dates de publication. Les informations humanitaires ou médiatiques y sont explicitement présentées comme non confirmatoires. Chart.js et jsPDF sont chargés depuis un CDN au besoin; une connexion Internet est nécessaire pour ces fonctions.

## Notifications d’alertes

Dans **Épidémies et alertes**, l’utilisateur peut autoriser les notifications du navigateur. Les alertes et confirmations officielles actives présentes dans les données sont signalées une fois par navigateur; les informations historiques et les articles de presse sont exclus. Les préférences sont conservées localement. Le site étant statique, il ne vérifie les alertes que lorsque la page est ouverte et les données de la rubrique sont chargées : les notifications Web Push en arrière-plan ne sont pas disponibles. L’envoi de SMS nécessite un serveur et une passerelle SMS, qui ne sont pas configurés; aucun numéro de téléphone n’est recueilli.

## Consultation hors connexion

Après une première visite en ligne sur la version HTTPS, le site met en cache son interface, la carte et les données sanitaires locales pour les visites suivantes hors connexion. Attendez l’indication **Prêt hors ligne** avant de quitter la page. Les nouveaux rapports sont récupérés au retour de la connexion; les navigateurs compatibles avec Background Sync peuvent aussi le faire lorsque l’application est fermée. Sinon, le site les actualise lorsque la page est ouverte. Les liens vers des sources externes, les recherches d’actualités en direct et les fonctions reposant sur des bibliothèques chargées depuis un CDN nécessitent encore Internet. Le site peut être installé depuis le menu du navigateur lorsqu’il est ouvert en HTTPS.
