import { Game } from "../types";

export const SUPPORTED_GAMES: Game[] = ["pokemon", "magic", "yugioh"];

// Noms de marque : on ne les traduit pas, ils restent identiques dans
// toutes les langues (comme sur les boîtes de jeu elles-mêmes).
export const GAME_LABELS: Record<Game, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
};

// Clés de traduction (voir src/i18n/locales/*.json, namespace "search").
export const GAME_PLACEHOLDER_KEYS: Record<Game, string> = {
  pokemon: "search.placeholderPokemon",
  magic: "search.placeholderMagic",
  yugioh: "search.placeholderYugioh",
};
