# 🍼 Suivi des biberons

Site web (Node.js + HTML/CSS/JS) qui enregistre les biberons dans Baserow.
Le token Baserow reste sur le serveur : il n'est jamais visible dans le navigateur.

## 1. Baserow
1. Crée un compte sur baserow.io, puis une base de données (ex. « Bébé »).
2. **Table `Biberons`** — champs (les noms doivent être identiques) :
   - `nom` (le champ principal : renomme « Name » en `nom`, type texte)
   - `jour` — Texte sur une ligne
   - `heure` — Texte sur une ligne
   - `quantite` — Nombre (0 décimale)
   Supprime les autres champs et les lignes vides créés par défaut.
3. **Table `Objectifs`** — champs : `nom` (principal, texte), `quantite` (Nombre), `nb_biberons` (Nombre). Aucune ligne à créer.
3b. **Table `Cacas`** — champs : `nom` (principal, texte), `jour` (texte sur une ligne), `heure` (texte sur une ligne).
4. **ID des tables** : ouvre chaque table, l'URL ressemble à `baserow.io/database/111/table/222` → l'ID est le dernier nombre (222).
5. **Token** : clique sur ton nom (en haut à gauche) → Paramètres → Jetons de base de données → Créer. Choisis ton espace de travail et coche Créer, Lire, Mettre à jour, Supprimer.

## 2. Tester en local (Node 20+)
    npm install
    cp .env.example .env    # puis remplis les valeurs
    npm run dev             # http://localhost:3000

## 3. Mettre en ligne sur Render
1. Envoie ce dossier sur un dépôt GitHub (le fichier `.env` est ignoré, c'est voulu).
2. Sur render.com : New → Web Service → choisis ton dépôt.
3. Runtime `Node`, Build Command `npm install`, Start Command `npm start`.
4. Dans Environment, ajoute : `BASEROW_TOKEN`, `TABLE_BIBERONS`, `TABLE_OBJECTIF`, `TABLE_CACAS`, `APP_PIN` (code d'accès à ton choix). `BASEROW_URL` n'est utile que si tu héberges Baserow toi-même.
5. Sur chaque appareil, ouvre l'URL Render et saisis le code une fois. Ajoute le site à l'écran d'accueil du téléphone.

Note : sur l'offre gratuite, Render met le site en veille après 15 min sans visite ; le premier chargement peut prendre environ une minute.
