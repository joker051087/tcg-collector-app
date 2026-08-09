import { Game } from "../types";

export const SUPPORTED_GAMES: Game[] = [
  "pokemon",
  "magic",
  "yugioh",
  "onepiece",
  "lorcana",
  "riftbound",
  "dragonball",
  "digimon",
  "fleshandblood",
  "starwarsunlimited",
  "unionarena",
  "gundam",
  "finalfantasy",
];

// Jeux dont la recherche passe par tcgapi.dev plutôt qu'une API dédiée (voir
// src/api/tcgApiGames.ts) — ce service ne propose pas de recherche par
// numéro de carte fiable (pas de filtre "number:", juste une recherche
// plein-texte sur le nom), donc le mode "Numéro" de l'écran Recherche est
// masqué pour ces jeux (voir SearchScreen.tsx).
export const TCGAPI_GAMES: Game[] = [
  "onepiece",
  "lorcana",
  "riftbound",
  "dragonball",
  "digimon",
  "fleshandblood",
  "starwarsunlimited",
  "unionarena",
  "gundam",
  "finalfantasy",
];

// Jeux couverts par le scanner en mode "reconnaissance visuelle" (Scrydex
// Vision, voir server/index.js /scan/vision et GUIDE_SCANNER.md) — les 7
// autres jeux basculent automatiquement sur la lecture de texte (OCR), voir
// ScannerScreen.tsx. Les clés à droite sont les identifiants attendus par
// l'API Scrydex, différents de nos clés internes pour "magic".
export const SCRYDEX_VISION_GAMES: Partial<Record<Game, string>> = {
  pokemon: "pokemon",
  magic: "magicthegathering",
  onepiece: "onepiece",
  lorcana: "lorcana",
  riftbound: "riftbound",
  gundam: "gundam",
};

// Noms de marque : on ne les traduit pas, ils restent identiques dans
// toutes les langues (comme sur les boîtes de jeu elles-mêmes).
export const GAME_LABELS: Record<Game, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
  onepiece: "One Piece",
  lorcana: "Lorcana",
  riftbound: "Riftbound",
  dragonball: "Dragon Ball",
  digimon: "Digimon",
  fleshandblood: "Flesh and Blood",
  starwarsunlimited: "Star Wars: Unlimited",
  unionarena: "Union Arena",
  gundam: "Gundam",
  finalfantasy: "Final Fantasy",
};

// Clés de traduction (voir src/i18n/locales/*.json, namespace "search").
export const GAME_PLACEHOLDER_KEYS: Record<Game, string> = {
  pokemon: "search.placeholderPokemon",
  magic: "search.placeholderMagic",
  yugioh: "search.placeholderYugioh",
  onepiece: "search.placeholderOnePiece",
  lorcana: "search.placeholderLorcana",
  riftbound: "search.placeholderRiftbound",
  dragonball: "search.placeholderDragonball",
  digimon: "search.placeholderDigimon",
  fleshandblood: "search.placeholderFleshandblood",
  starwarsunlimited: "search.placeholderStarwarsunlimited",
  unionarena: "search.placeholderUnionarena",
  gundam: "search.placeholderGundam",
  finalfantasy: "search.placeholderFinalfantasy",
};
