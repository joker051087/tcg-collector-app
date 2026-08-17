# Guide : configurer Firebase pour la connexion Google

Ce guide t'explique, étape par étape, comment créer et configurer le projet Firebase nécessaire à la connexion Google et à la sauvegarde en ligne. Prends ton temps, chaque étape est détaillée.

À la fin, tu auras une liste de valeurs à coller dans un fichier `.env` — je te dis exactement comment faire à la toute fin.

---

## Étape 1 — Créer le projet Firebase

1. Ouvre https://console.firebase.google.com dans ton navigateur.
2. Connecte-toi avec ton compte Google (kamelnafla@gmail.com).
3. Clique sur **"Ajouter un projet"**.
4. Nom du projet : `TCG Hallcard` (ou ce que tu veux). Clique **Continuer**.
5. Sur l'écran Google Analytics, tu peux **désactiver** l'option (pas nécessaire). Clique **Créer le projet**.
6. Attends que Firebase termine (une barre de chargement), puis clique **Continuer**.

---

## Étape 2 — Ajouter une application Web (pour récupérer la configuration)

Même si TCG Hallcard est une appli mobile, Firebase demande de créer une "app Web" pour générer les clés de configuration — c'est normal.

1. Sur la page d'accueil du projet, clique sur l'icône **`</>`** (Web).
2. Nom de l'app : `TCG Hallcard`. Ne coche PAS "Configurer Firebase Hosting".
3. Clique **Enregistrer l'application**.
4. Une fenêtre affiche un bloc de code qui ressemble à ça :

```
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tcg-collector-xxxx.firebaseapp.com",
  projectId: "tcg-collector-xxxx",
  storageBucket: "tcg-collector-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Garde cette fenêtre ouverte** (ou copie ces 6 valeurs dans un fichier texte temporaire) — tu en auras besoin à l'étape 6.
6. Clique **Continuer vers la console**.

---

## Étape 3 — Activer la connexion Google

1. Dans le menu de gauche, clique **Build** puis **Authentication**.
2. Clique **Commencer** (Get started).
3. Va dans l'onglet **Sign-in method** (Méthode de connexion).
4. Clique sur **Google** dans la liste des fournisseurs.
5. Active l'interrupteur **Activer** (Enable).
6. Dans "E-mail d'assistance du projet", choisis kamelnafla@gmail.com.
7. Clique **Enregistrer**.

---

## Étape 4 — Récupérer le "Web Client ID" Google

Quand tu actives Google à l'étape 3, Firebase crée automatiquement une clé technique nécessaire au bouton "Se connecter avec Google". Il faut aller la chercher :

1. Ouvre https://console.cloud.google.com/apis/credentials
2. En haut de la page, vérifie que le bon projet est sélectionné (le menu déroulant doit afficher "TCG Hallcard" ou le nom que tu as choisi — sinon clique dessus et sélectionne-le).
3. Dans la liste "ID clients OAuth 2.0", trouve celui nommé **"Web client (auto created by Google Service)"**.
4. Clique dessus. Copie la valeur **"ID client"** (elle se termine par `.apps.googleusercontent.com`).
5. Garde cette valeur de côté — ce sera `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

---

## Étape 5 — Activer Firestore (la base de données en ligne)

1. Dans le menu de gauche de Firebase, clique **Build** puis **Firestore Database**.
2. Clique **Créer une base de données**.
3. Choisis l'emplacement le plus proche de toi (ex : `eur3 (europe-west)`), clique **Suivant**.
4. Choisis **"Démarrer en mode production"**, clique **Créer**.
5. Une fois créée, va dans l'onglet **Rules** (Règles) en haut.
6. Supprime tout le contenu actuel et remplace-le par le contenu du fichier `firestore.rules` que j'ai créé dans le projet (il est à la racine du dossier `tcg-collector-app`). Ouvre ce fichier, copie tout son contenu, colle-le dans la console Firebase à la place de l'ancien.
7. Clique **Publier**.

---

## Étape 6 — Créer ton fichier `.env`

1. Dans le dossier `tcg-collector-app`, regarde s'il existe déjà un fichier `.env` (à côté de `.env.example`). S'il n'existe pas, fais une copie de `.env.example` et renomme-la `.env`.
2. Ouvre `.env` avec le Bloc-notes et ajoute (ou complète) ces lignes avec les valeurs récupérées aux étapes 2 et 4 :

```
EXPO_PUBLIC_FIREBASE_API_KEY=colle_ici_la_valeur_apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=colle_ici_la_valeur_authDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=colle_ici_la_valeur_projectId
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=colle_ici_la_valeur_storageBucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=colle_ici_la_valeur_messagingSenderId
EXPO_PUBLIC_FIREBASE_APP_ID=colle_ici_la_valeur_appId
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=colle_ici_le_web_client_id_de_l_etape_4
```

3. Enregistre le fichier.

---

## Étape 7 — Installer les nouveaux packages

Ouvre PowerShell dans le dossier `tcg-collector-app` et lance, dans l'ordre :

```powershell
npx expo install expo-auth-session expo-web-browser expo-crypto
npm install firebase
```

Attends que chaque commande se termine avant de lancer la suivante.

---

## Étape 8 — Redémarrer l'appli

```powershell
npx expo start -c
```

(le `-c` vide le cache, important après l'ajout de nouvelles variables `.env`)

---

## Note importante — tester le bouton "Se connecter avec Google"

Le bouton de connexion Google ne pourra **pas** être testé dans Expo Go (l'appli où tu scannes le QR code) — il fonctionnera seulement dans une "vraie" version installée du téléphone (build EAS) ou une fois l'appli publiée. C'est normal, pas un bug. Le reste de l'appli (recherche, collection, wishlist, checklist) continue de fonctionner normalement dans Expo Go pendant ce temps.

Une fois qu'on a une vraie build installée (dev client, preview ou production), il faut faire l'étape 9 ci-dessous avant que "Se connecter avec Google" fonctionne dedans — sinon Google affiche "Erreur 400 : invalid_request".

---

## Étape 9 — Créer l'ID client Android (nécessaire pour toute vraie build)

Le "Web Client ID" (étape 4) suffit dans Expo Go, mais Google exige un identifiant dédié de type **Android** pour toute appli installée (dev client, preview, production). Sans ça : "Erreur 400 : invalid_request" au moment de se connecter.

1. Récupère le SHA-1 de ta build :
   ```powershell
   eas credentials
   ```
   Réponds **Android**, puis choisis le profil utilisé (peu importe lequel, ils partagent le même keystore), puis **"Keystore: Manage everything needed to build your project"**. La ligne **SHA1 Fingerprint** s'affiche directement — copie-la (format `XX:XX:XX:...`).

2. Va sur `https://console.cloud.google.com/apis/credentials?project=TON_PROJECT_ID` (le `TON_PROJECT_ID` est la valeur `EXPO_PUBLIC_FIREBASE_PROJECT_ID` de ton `.env`).

3. Clique **"+ Créer des identifiants"** → **"ID client OAuth"**.

4. Type d'application : **Android**. Nom du package : `com.kamelnafla.tcghallcard`. Empreinte SHA-1 : celle de l'étape 1. Clique **Créer**.

5. Copie l'**ID client** affiché (se termine par `.apps.googleusercontent.com`), colle-le dans `.env` :
   ```
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=colle_ici_la_valeur
   ```

6. Redémarre `npx expo start -c` (le `-c` vide le cache) et recharge l'appli sur ton téléphone.

Si un jour tu changes de keystore (nouveau compte EAS, reset des credentials...), il faudra refaire cette étape avec le nouveau SHA-1.

---

## Étape 10 — Clé de service (cache permanent du backend)

Le backend (`server/`) utilise maintenant Firestore pour garder en mémoire, de façon permanente, le catalogue et les prix déjà consultés — ça évite de re-taper sur les API tierces (pokemontcg.io, tcgapi.dev...) à chaque redémarrage du serveur Render. Pour ça, il a besoin d'une clé d'accès "admin" séparée (différente des valeurs de l'étape 2, qui elles sont pour l'app mobile).

**Attention : cette clé donne un accès complet à ton projet Firebase — contrairement aux autres valeurs de ce guide, elle ne doit JAMAIS être partagée, collée dans le code, ou envoyée sur GitHub.**

1. Dans la console Firebase, clique sur l'icône ⚙️ (roue crantée) en haut à gauche, puis **Paramètres du projet**.
2. Va dans l'onglet **Comptes de service** (Service accounts).
3. Clique **Générer une nouvelle clé privée**, puis confirme **Générer la clé**.
4. Un fichier `.json` se télécharge (dans ton dossier Téléchargements). Note son nom.
5. Ouvre PowerShell et lance cette commande, en remplaçant `NOM_DU_FICHIER.json` par le vrai nom téléchargé — ça convertit le fichier en une seule ligne de texte et la copie directement dans ton presse-papiers :
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\Downloads\NOM_DU_FICHIER.json")) | Set-Clipboard
   ```
6. **En local** (pour tester sur ton PC) : dans `server/.env` (copie `server/.env.example` si le fichier n'existe pas encore), colle (Ctrl+V) après :
   ```
   FIREBASE_SERVICE_ACCOUNT_BASE64=colle_ici_avec_ctrl_v
   ```
7. **Sur Render** (pour la prod) : va sur ton service `tcg-collector-backend` > onglet **Environment** > **Add Environment Variable**. Nom : `FIREBASE_SERVICE_ACCOUNT_BASE64`. Valeur : colle (Ctrl+V) le contenu du presse-papiers. Clique **Save Changes** (redéploie automatiquement).
8. Tu peux ensuite supprimer le fichier `.json` téléchargé dans tes Téléchargements (il ne sert plus, la valeur est déjà copiée) — ou le garder mais ne jamais le mettre dans le dossier du projet.

---

## Récapitulatif des valeurs à récupérer

| Variable `.env` | Où la trouver |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Étape 2 (config de l'app Web) |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Étape 2 |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Étape 2 |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Étape 2 |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Étape 2 |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Étape 2 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Étape 4 (Google Cloud Console > Identifiants) |
