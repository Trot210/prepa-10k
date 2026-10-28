# Prépa 10K HOKA

Site statique (HTML/CSS/JS, aucune dépendance, aucune étape de build).

- `index.html`, `styles.css` : interface
- `js/plan.js` : données du plan (séances, zones) — c'est ici qu'on modifie le programme
- `js/export.js` : export FIT (montre Garmin), ZIP, calendrier ICS, sauvegarde du suivi
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
