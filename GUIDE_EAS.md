# Guide : générer une vraie build (pour voir l'icône et le splash)

Expo Go ne peut pas afficher l'icône ni l'écran de démarrage personnalisés de
l'app — il faut construire un vrai fichier installable (APK sur Android) via
**EAS Build**, le service de build dans le cloud d'Expo. C'est gratuit pour ce
qu'on va faire ici.

## 1. Créer un compte Expo

Va sur https://expo.dev/signup et crée un compte gratuit (email + mot de
passe).

## 2. Installer l'outil EAS

Dans PowerShell, dans le dossier `tcg-collector-app` :

```
npm install -g eas-cli
```

## 3. Se connecter

```
eas login
```

Entre l'email et le mot de passe du compte créé à l'étape 1.

## 4. Lier le projet

```
eas build:configure
```

Répond "Android" si on te demande quelle(s) plateforme(s) (on fera iOS plus
tard, ça demande un compte Apple payant). Cette commande modifie
automatiquement `app.json` pour y ajouter l'identifiant du projet — c'est
normal, laisse-la faire.

## 5. Lancer la build

```
eas build --platform android --profile preview
```

- Ça se passe sur les serveurs d'Expo, pas sur ton PC — tu peux fermer
  PowerShell une fois que la commande a démarré l'upload, mais le plus simple
  est d'attendre (10 à 20 minutes en général).
- À la fin, un lien de téléchargement apparaît dans le terminal (et sur
  https://expo.dev, section "Builds" de ton projet).

## 6. Installer sur ton téléphone

1. Ouvre le lien de téléchargement directement depuis ton téléphone Android
   (envoie-le toi par exemple, ou scanne le QR code affiché dans le terminal).
2. Télécharge le fichier `.apk`.
3. Android va probablement bloquer l'installation avec un message "Source
   inconnue" — accepte, c'est normal pour une app qui n'est pas encore sur le
   Play Store.
4. Ouvre l'app : tu devrais voir la vraie icône sur l'écran d'accueil et le
   vrai écran de démarrage (logo + "TCG HallCard").

## Et pour iPhone (iOS) ?

Ça demande un compte Apple Developer (99$/an) et une manip un peu plus longue
(enregistrer ton iPhone, passer par TestFlight). On le fera quand tu seras
prête à publier sur l'App Store — pas nécessaire pour l'instant si tu es sur
Android.
