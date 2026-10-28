# Prépa 10K HOKA

Site statique (HTML/CSS/JS, aucune dépendance, aucune étape de build).

- `index.html`, `styles.css` : interface
- `js/plan.js` : données du plan (séances, zones) — c'est ici qu'on modifie le programme
- `js/export.js` : export FIT (montre Garmin), ZIP, calendrier ICS, sauvegarde du suivi
- `js/sync.js`, `js/config.js`, `supabase.sql` : synchronisation du suivi entre appareils
- `js/app.js` : affichage et suivi
- `manifest.webmanifest`, `sw.js`, `icons/` : installation sur l'écran d'accueil + hors ligne
- `original-prepa-10k-hoka.html` : ton fichier d'origine, intact

## Tester en local
    cd ~/Desktop/prepa-10k && python3 -m http.server 8000
puis ouvrir http://localhost:8000

## Mettre en ligne (gratuit)
Glisser-déposer le dossier sur Netlify Drop (app.netlify.com/drop), ou le pousser sur GitHub Pages / Cloudflare Pages.
Le site doit être en HTTPS pour être installable sur iPhone (Partager → Sur l'écran d'accueil).

## Reprendre ton suivi de l'ancien fichier
Dans l'ancien fichier ouvert dans le navigateur, console développeur :
    copy(localStorage.getItem("prepa10kHoka2026_v1"))
puis, sur le nouveau site : « Coller des données ».

## Activer la synchronisation (une seule fois)
1. Créer un projet gratuit sur supabase.com (région Europe).
2. SQL Editor → New query → coller `supabase.sql` → Run.
3. Project Settings → API : copier « Project URL » et la clé publique (publishable / anon).
4. Les mettre dans `js/config.js`, puis commit et push.
5. Sur le site : « Activer sur cet appareil », puis « Lien pour un autre appareil » à ouvrir sur le téléphone.

Le lien contient le code secret : qui le connaît peut lire et modifier ton suivi.
Un projet Supabase gratuit se met en pause après une semaine sans activité (réactivable en un clic).
