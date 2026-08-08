import { Game } from "../types";

export const SUPPORTED_GAMES: Game[] = [
  "pokemon",
  "magic",
  "yugioh",
  "onepiece",
  "lorcana",
  "riftbound",
  "dragonball",
];

// Jeux dont la recherche passe par tcgapi.dev plutôt qu'une API dédiée (voir
// src/api/tcgApiGames.ts) — ce service ne propose pas de recherche par
// numéro de carte fiable (pas de filtre "number:", juste une recherche
// plein-texte sur le nom), donc le mode "Numéro" de l'écran Recherche est
// masqué pour ces jeux (voir SearchScreen.tsx).
export const TCGAPI_GAMES: Game[] = ["onepiece", "lorcana", "riftbound", "dragonball"];

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
};
