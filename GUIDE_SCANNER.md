# Guide : configurer le Scanner (Scrydex Vision + OCR.space)

Le scanner utilise deux services différents selon le jeu scanné :

- **Scrydex Vision** (payant, ~29$/mois minimum) : reconnaissance visuelle complète pour Pokémon, Magic, Lorcana, One Piece, Riftbound, Gundam.
- **OCR.space** (gratuit) : lecture du texte de la carte pour les 7 autres jeux (Yu-Gi-Oh!, Dragon Ball, Digimon, Flesh and Blood, Star Wars: Unlimited, Union Arena, Final Fantasy).

Tu peux configurer seulement OCR.space si tu ne veux pas t'engager sur l'abonnement payant pour l'instant — le scanner fonctionnera alors pour tous les jeux en mode "lecture de texte" uniquement (pas de reconnaissance visuelle automatique, mais ça fonctionne quand même : ça lit le nom sur la carte et lance une recherche).

---

## Étape 1 — Installer les nouveaux packages

Dans PowerShell, depuis le dossier `tcg-collector-app` :

```powershell
npx expo install expo-camera
```

Puis, depuis le dossier `tcg-collector-app/server` :

```powershell
cd server
npm install
cd ..
```

(`npm install` va installer `multer`, ajouté au `package.json` du serveur — nécessaire pour recevoir les photos envoyées par l'appli.)

---

## Étape 2 — OCR.space (gratuit, recommandé de faire en premier)

1. Va sur https://ocr.space/ocrapi/freekey
2. Renseigne ton adresse e-mail (kamelnafla@gmail.com), pas de carte bancaire demandée.
3. Tu reçois une clé API par e-mail (ou elle s'affiche directement à l'écran) — copie-la.
4. Ouvre `server/.env` (copie de `server/.env.example` si le fichier n'existe pas encore) et colle-la :

```
OCR_SPACE_API_KEY=colle_ici_la_cle_recue
```

---

## Étape 3 — Scrydex Vision (payant, optionnel)

1. Va sur https://scrydex.com/register et crée un compte.
2. Une fois connectée, crée une **équipe** ("Team") depuis le tableau de bord Scrydex — même seule, c'est obligatoire, note bien l'**ID d'équipe** ("Team ID") affiché.
3. Va dans la page **Pricing** (https://scrydex.com/pricing) et abonne-toi au forfait **"Starter"** (29$/mois, 5 000 crédits — chaque scan coûte 5 crédits, donc environ 1 000 scans/mois).
4. Une fois abonnée, génère une **clé API** depuis le tableau de bord.
5. Ouvre `server/.env` et ajoute :

```
SCRYDEX_API_KEY=colle_ici_la_cle_api
SCRYDEX_TEAM_ID=colle_ici_l_id_d_equipe
```

**Pense à surveiller ta consommation** dans le tableau de bord Scrydex (section "Rate Limits"/usage) pour éviter les frais de dépassement si tu scannes beaucoup.

---

## Étape 4 — Redémarrer

Backend (dans le dossier `server`) :

```powershell
node index.js
```

Appli (dans le dossier `tcg-collector-app`) :

```powershell
npx expo start -c
```

---

## Étape 5 — Tester

1. Ouvre l'onglet **Recherche**, tape sur l'icône appareil photo en haut à droite.
2. La première fois, l'appli demande la permission d'utiliser l'appareil photo — accepte.
3. Choisis un jeu, cadre une carte, appuie sur le bouton de capture.
   - Pour Pokémon/Magic/Lorcana/One Piece/Riftbound/Gundam (si Scrydex configuré) : la fiche carte s'ouvre directement.
   - Pour les autres jeux (ou si Scrydex n'est pas configuré) : une recherche se lance avec le texte lu sur la carte.

Si tu vois un message "non configurée côté serveur", vérifie que les clés sont bien dans `server/.env` (pas `server/.env.example`) et que tu as redémarré le backend après les avoir ajoutées.
