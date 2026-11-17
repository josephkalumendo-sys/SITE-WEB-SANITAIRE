# Veille sanitaire en RDC

Application statique de veille sanitaire avec carte des provinces, informations sourcées et actualités.

## Actualisation quotidienne

Le workflow GitHub Actions `.github/workflows/actualisation-quotidienne.yml` collecte chaque jour à 04:00 UTC les publications récentes du flux OMS Afrique et de ReliefWeb, puis publie le site sur GitHub Pages. Il peut aussi être lancé manuellement depuis l’onglet **Actions**.

GNews et NewsData.io sont facultatifs. Pour les activer, ajoutez leurs clés dans **Settings → Secrets and variables → Actions** sous les noms `GNEWS_API_KEY` et `NEWSDATA_API_KEY`. Ne placez jamais ces clés dans les fichiers du site.

Pour la première publication, sélectionnez **Settings → Pages → Build and deployment → GitHub Actions**, puis lancez le workflow manuellement.

Les publications automatiques affichent leur source et leur date. Elles n’actualisent pas automatiquement les confirmations, alertes ni couleurs de la carte : ces statuts doivent rester fondés sur une vérification officielle, et un article médiatique ou humanitaire ne confirme pas une épidémie.
