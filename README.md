# TCG Collector — prototype MVP

Prototype cliquable pour une app de gestion de collection TCG (comme Collectr), construit
avec **React Native + Expo** pour tourner sur iOS, Android et Web depuis un seul codebase.

Ce prototype couvre sept jeux : **Pokémon**, **Magic: The Gathering**, **Yu-Gi-Oh!**, **One
Piece**, **Lorcana**, **Riftbound** et **Dragon Ball** (Fusion World). Les trois premiers
("vague 1" du plan, `Plan_App_TCG.md`) utilisent chacun leur API gratuite dédiée ; les quatre
derniers ("vague 2") n'ont pas d'équivalent gratuit dédié et passent donc par **tcgapi.dev**,
le même service tiers déjà utilisé pour les produits scellés (voir plus bas) :

| Jeu | Source | Doc |
|---|---|---|
| Pokémon | pokemontcg.io | https://docs.pokemontcg.io/ |
| Magic | Scryfall | https://scryfall.com/docs/api |
| Yu-Gi-Oh! | YGOPRODeck | https://ygoprodeck.com/api-guide/ |
| One Piece, Lorcana, Riftbound, Dragon Ball | tcgapi.dev | https://tcgapi.dev/introduction |

Toutes les cartes, quel que soit le jeu, sont ramenées à un même format commun
(`UnifiedCard`, voir `src/types/index.ts`) avant d'arriver dans l'UI — la recherche, la fiche
carte et l'écran collection n'ont donc pas besoin de savoir de quel jeu vient une carte.

## Fonctionnalités incluses

- Recherche de cartes par nom, avec un sélecteur des 7 jeux en haut de l'écran
- **Recherche par numéro de carte** (en plus du nom) pour Pokémon/Magic/Yu-Gi-Oh! — voir `src/api/*.ts`,
  fonctions `searchCardsByNumber`. Pour Yu-Gi-Oh!, qui n'a pas de filtre par numéro côté
  YGOPRODeck, le backend télécharge et met en cache la base complète puis filtre lui-même
  (route `/proxy/yugioh/by-number`, voir `server/index.js`). Tape aussi un code de set/série
  seul (ex : "SFA" en Pokémon, "WAR" en Magic, "SDY" en Yu-Gi-Oh!) pour parcourir tout le set
- Fiche carte avec **prix marché** et **prix net réaliste** (après frais de revente estimés
  ~13%) — c'est le principal point de différenciation identifié face à Collectr
- Ajout manuel à la collection avec **état (condition)**, quantité, et type (brute / gradée /
  scellée) — corrige un autre point faible relevé dans les avis Collectr
- Écran "Ma collection" avec valeur totale (marché + nette), liste des cartes possédées et
  jeu d'origine affiché pour chacune (une collection peut mélanger les 3 jeux)
- Persistance locale (AsyncStorage) — la collection reste sauvegardée entre les sessions
- **Multi-devises** : USD, EUR, GBP, JPY, CAD, AUD, CHF — taux de change en temps réel
  (rafraîchis toutes les 24h, mis en cache localement), choix dans l'onglet Réglages
- **Multi-langues** : français, anglais, espagnol, allemand, japonais, italien, portugais —
  détection automatique de la langue de l'appareil au premier lancement, modifiable ensuite
  dans Réglages
- **Recherche Pokémon en langue locale** : pokemontcg.io n'indexe les cartes que par leur nom
  anglais ("Charizard"). Quand l'app est dans une autre langue, une recherche comme
  "Dracaufeu" est automatiquement traduite vers "Charizard" avant d'interroger l'API, via un
  dictionnaire de correspondance de noms téléchargé une fois depuis PokeAPI et mis en cache
  localement 7 jours (voir `src/store/pokemonNamesStore.ts`)
- **Produits scellés** (coffrets, displays, boosters) pour les 3 jeux, avec recherche et prix
  automatique — bascule "Cartes / Produits scellés" en haut de l'écran Recherche. Les données
  viennent de tcgapi.dev (voir section "Clés API" : TCGplayer, la source la plus logique, a
  fermé son API officielle aux nouveaux développeurs en 2024)
- **Checklist par série** (nouvel onglet) : choisis un jeu puis une série, l'app liste toutes
  ses cartes et indique lesquelles sont déjà dans ta collection ("Possédée"/"Manquante") avec
  un compteur de progression — pratique pour savoir ce qu'il te reste à trouver pour compléter
  un set. Tape directement sur une carte manquante pour l'ajouter à ta collection

## Installation

Prérequis : Node.js 18+ et npm installés sur ta machine.

```bash
cd tcg-collector-app
npm install
npx expo install --fix              # aligne automatiquement les versions des dépendances Expo
npx expo install expo-localization  # module natif, à installer via cette commande spécifiquement
```

Le backend a ses propres dépendances, à installer séparément :

```bash
cd server
npm install
```

## Lancer l'app

L'app a besoin du backend pour fonctionner (recherche de cartes, prix, taux de change — voir
section "Backend" ci-dessous). Il faut donc **deux terminaux ouverts en parallèle**.

**Terminal 1 — le backend :**

```bash
cd tcg-collector-app/server
npm start
```

**Terminal 2 — l'app :**

```bash
cd tcg-collector-app
npx expo start
```

Cela ouvre le Metro Bundler. Depuis là :
- appuie sur `i` pour ouvrir le simulateur iOS (macOS + Xcode requis)
- appuie sur `a` pour ouvrir un émulateur/appareil Android (Android Studio requis)
- appuie sur `w` pour ouvrir la version web dans le navigateur
- ou scanne le QR code avec l'app **Expo Go** sur ton téléphone (le plus rapide pour tester sans rien installer de lourd)

## Backend

`server/` est un petit serveur Node.js/Express qui sert d'intermédiaire entre l'app et les 5 API
tierces (pokemontcg.io, Scryfall, YGOPRODeck, open.er-api.com, PokeAPI, tcgapi.dev) : il **met les réponses
en cache** (1h pour les cartes/prix, 24h pour les taux de change, 7 jours pour les noms Pokémon
traduits) pour absorber la lenteur/instabilité de ces API gratuites, réduire le nombre d'appels
réels envoyés, et éviter d'exposer la clé API Pokémon dans le bundle de l'app.

Pour l'instant il tourne **en local sur ton PC**, à côté d'Expo (voir "Lancer l'app" ci-dessus).
Il faut deux choses pour que ton téléphone (Expo Go) puisse le joindre :

1. **Le téléphone et le PC doivent être sur le même réseau Wi-Fi.**
2. **Renseigner l'adresse IP locale de ton PC** (pas `localhost`, qui depuis le téléphone
   désignerait le téléphone lui-même) dans l'app :
   - trouve ton IP locale : `ipconfig` sous Windows (cherche "Adresse IPv4", ex.
     `192.168.1.23`) ;
   - copie `.env.example` en `.env` à la racine du projet, et renseigne
     `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:4000` (avec ta propre IP) ;
   - redémarre `npx expo start` après avoir créé/modifié ce `.env`.

Le fichier `server/cache-data.json` (créé automatiquement) garde le cache entre deux
redémarrages du serveur — tu peux le supprimer si tu veux forcer un rafraîchissement complet.

### Déployer le backend en ligne (Render, gratuit)

Ça rend le backend joignable depuis n'importe où (plus besoin du même Wi-Fi que le téléphone),
et se rapproche d'une vraie config de prod. Render a été choisi ici car son offre gratuite ne
demande pas de carte bancaire (contrairement à Railway, qui a supprimé son vrai plan gratuit).
Limite à connaître : sur le plan gratuit, le serveur s'endort après 15 min d'inactivité — la
première requête après une pause met 30 à 60 secondes à répondre, les suivantes sont normales.

Un fichier `render.yaml` est déjà prêt à la racine du projet (pointe vers `server/`). Étapes :

1. **Créer un compte GitHub** (https://github.com, gratuit) si tu n'en as pas déjà un.
2. **Créer un dépôt** sur GitHub (bouton "New repository"), nom libre, ex. `tcg-collector-app`.
3. **Pousser le projet** vers ce dépôt. Depuis PowerShell, à la racine du projet :
   ```
   git init
   git add .
   git commit -m "Premier commit"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/tcg-collector-app.git
   git push -u origin main
   ```
   (Git te demandera de te connecter à ton compte GitHub la première fois.)
4. **Créer un compte Render** (https://render.com, gratuit, pas de carte bancaire requise).
5. Sur Render : **New > Blueprint**, connecte ton compte GitHub, sélectionne le dépôt que tu
   viens de créer. Render détecte automatiquement `render.yaml` et propose de déployer le
   service `tcg-collector-backend`.
6. Une fois déployé, va dans l'onglet **Environment** du service et renseigne
   `POKEMONTCG_API_KEY` (optionnel) et `TCGAPI_KEY` (nécessaire pour les produits scellés) —
   voir section "Clés API".
7. Render te donne une URL publique (ex. `https://tcg-collector-backend.onrender.com`). Mets-la
   dans le `.env` à la racine du projet :
   ```
   EXPO_PUBLIC_API_BASE_URL=https://tcg-collector-backend.onrender.com
   ```
8. Relance `npx expo start` — tu peux maintenant fermer le terminal du backend local, l'app
   utilise le serveur en ligne. Ça marche aussi bien en Wi-Fi qu'en 4G/5G sur le téléphone.

## Clés API

- **Pokémon** : optionnel mais recommandé, **côté serveur uniquement** désormais. Sans clé,
  l'API pokemontcg.io est limitée à 1000 requêtes/jour. Crée une clé gratuite sur
  https://pokemontcg.io/, copie `server/.env.example` en `server/.env`, puis renseigne
  `POKEMONTCG_API_KEY`.
- **Magic (Scryfall)** : aucune clé requise.
- **Yu-Gi-Oh! (YGOPRODeck)** : aucune clé requise.
- **Taux de change (open.er-api.com)** : aucune clé requise.
- **Noms Pokémon traduits (PokeAPI)** : aucune clé requise.
- **Produits scellés (tcgapi.dev)** : requise pour cette fonctionnalité (sans elle, la
  recherche de produits scellés est simplement désactivée, le reste de l'app fonctionne
  normalement). Compte gratuit sur https://tcgapi.dev/signup (100 requêtes/jour, pas de carte
  bancaire), copie `server/.env.example` en `server/.env`, renseigne `TCGAPI_KEY`. Service
  tiers non affilié à TCGplayer, utilisé car TCGplayer a fermé son API officielle aux nouveaux
  développeurs depuis 2024.

## Structure du projet

```
tcg-collector-app/
  server/                       # backend Node/Express : cache + proxy vers les 4 API tierces
    index.js                     # routes /proxy/*, voir section "Backend" plus haut
    cache.js                     # cache en mémoire + persisté sur disque (cache-data.json)
  src/
    api/
      index.ts               # point d'entrée unique : searchCards(game, query), getCardById(game, id)
      pokemonTcg.ts           # client backend (pokemon) -> UnifiedCard (+ traduction FR/ES/... -> EN)
      pokeApiNames.ts         # client backend (dictionnaire de noms Pokémon multilingues)
      scryfall.ts             # client backend (Magic) -> UnifiedCard
      ygoprodeck.ts           # client backend (Yu-Gi-Oh!) -> UnifiedCard
      sealedProducts.ts       # client backend (produits scellés, tcgapi.dev) -> UnifiedCard
      exchangeRates.ts        # client backend (taux de change, base USD)
    config/api.ts             # URL du backend (EXPO_PUBLIC_API_BASE_URL)
    types/index.ts            # UnifiedCard, Game, types collection
    constants/
      games.ts                 # libellés et clés de traduction des placeholders par jeu
      currencies.ts             # devises supportées + symboles
      labels.ts                  # clés de traduction pour état/type de possession
      pokeApiLanguages.ts        # correspondance code langue app -> code langue PokeAPI
    i18n/
      index.ts                   # config i18next + détection langue de l'appareil
      locales/*.json              # traductions (fr, en, es, de, ja, it, pt)
    store/
      portfolioStore.ts           # collection de l'utilisateur (zustand + persistance locale)
      settingsStore.ts             # langue + devise choisies (zustand + persistance locale)
      exchangeRatesStore.ts         # cache client des taux de change
      pokemonNamesStore.ts           # cache client du dictionnaire de noms Pokémon multilingues
    hooks/useCurrencyFormatter.ts # convertit/formate un prix USD dans la devise choisie
    utils/
      pricing.ts                 # calcul valeur marché / valeur nette réaliste (en USD)
      currency.ts                 # conversion + formatage devise
      fetchWithRetry.ts            # retry automatique sur erreurs serveur (5xx)
    screens/                    # Recherche, Détail carte, Ma collection, Réglages
    navigation/                  # tabs + stack de navigation
    components/                  # éléments réutilisables (liste, sélecteurs de chips)
```

### Ajouter un nouveau jeu

Deux cas de figure :

- **Le jeu est couvert par tcgapi.dev** (liste complète sur https://tcgapi.dev/games — la
  plupart des jeux physiques le sont) : c'est le chemin le plus rapide, pas besoin de nouveau
  client API. Ajouter le jeu dans `Game` (`src/types/index.ts`), `TCGAPI_SLUG`
  (`src/constants/tcgApiSlugs.ts` — le "slug" exact est visible dans l'URL de la page du jeu
  sur tcgapi.dev/games), `SUPPORTED_GAMES`/`TCGAPI_GAMES`/`GAME_LABELS`/`GAME_PLACEHOLDER_KEYS`
  (`src/constants/games.ts`), les clés `search.placeholderXxx` dans chaque fichier de
  `src/i18n/locales/`, et les entrées correspondantes dans `CARDMARKET_GAME_PATHS`/
  `TCGPLAYER_GAME_PATHS` (`src/utils/marketplaceLinks.ts`, à vérifier en conditions réelles).
  Aucune modification de `src/api/tcgApiGames.ts` ni du backend n'est nécessaire.
- **Le jeu a une API gratuite dédiée** (comme Pokémon/Magic/Yu-Gi-Oh!) : créer
  `src/api/monJeu.ts` avec les fonctions `searchCards(query)` et `getCardById(id)` qui
  retournent des `UnifiedCard`, ajouter les routes `/proxy/monjeu/...` correspondantes dans
  `server/index.js`, puis enregistrer le tout dans `src/api/index.ts` et dans
  `Game`/`GAME_LABELS` (mêmes fichiers que ci-dessus).

### Ajouter une langue ou une devise

Langue : dupliquer `src/i18n/locales/en.json` sous le nouveau code langue, traduire les clés,
puis l'enregistrer dans `SUPPORTED_LANGUAGES`/`LANGUAGE_LABELS`/`resources` (`src/i18n/index.ts`).
Devise : l'ajouter dans `SUPPORTED_CURRENCIES`/`CURRENCY_SYMBOLS` (`src/constants/currencies.ts`)
— le taux de change est déjà fourni par l'API tant que c'est une devise ISO standard.

## Ce que ce prototype NE fait PAS encore (volontairement)

Conformément au plan produit, ces points sont prévus pour les versions suivantes :

- **Backend déployé en prod** — le backend avec cache existe (`server/`) mais tourne pour
  l'instant en local sur ton PC, à côté d'Expo. Avant une vraie mise en prod, il faudra le
  déployer sur un hébergeur (Render, Railway...) pour qu'il soit accessible sans dépendre du
  même réseau Wi-Fi que le téléphone.
- **Multi-TCG** — Pokémon, Magic, Yu-Gi-Oh!, One Piece, Lorcana, Riftbound et Dragon Ball sont
  branchés. D'autres jeux (Star Wars: Unlimited, Flesh and Blood, Digimon...) peuvent être
  ajoutés facilement via tcgapi.dev, qui les couvre déjà tous (voir "Ajouter un nouveau jeu").
- **Scan photo de carte** — prévu en V2, volontairement pas dans ce prototype (c'est le point
  le plus complexe techniquement et le principal point faible constaté chez Collectr).
- **Comptes utilisateurs / synchronisation cloud** — la collection est stockée uniquement en
  local pour l'instant.
- **Publication sur les stores** — nécessite un compte développeur Apple (99$/an) et Google
  Play (25$ à vie), la génération de builds signés via `eas build`, et le remplissage des
  fiches App Store/Play Store (dont le formulaire "confidentialité des données"). Ce sont des
  étapes à faire depuis un compte que toi seul peux créer/gérer.

## Prochaine étape suggérée

Tester que tout fonctionne toujours pareil avec le backend local (recherche, fiche carte, taux
de change), en vérifiant dans les logs du terminal `server/` que les secondes recherches
identiques affichent bien `X-Cache: HIT`. Ensuite, décider entre déployer le backend en ligne
ou repartir sur la vague 2 de TCG (Lorcana, One Piece, Dragon Ball...).
