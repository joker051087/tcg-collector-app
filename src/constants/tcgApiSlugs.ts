import { Game } from "../types";

// Correspondance entre nos clés de jeu internes et le "slug" attendu par
// tcgapi.dev (voir https://tcgapi.dev/games). Pokémon/Magic/Yu-Gi-Oh!
// coïncident déjà avec nos clés, mais on les liste quand même pour que ce
// tableau reste la seule source de vérité (utilisé à la fois par
// sealedProducts.ts et tcgApiGames.ts).
export const TCGAPI_SLUG: Record<Game, string> = {
  pokemon: "pokemon",
  magic: "magic",
  yugioh: "yugioh",
  onepiece: "one-piece-card-game",
  lorcana: "lorcana-tcg",
  riftbound: "riftbound-league-of-legends-trading-card-game",
  // "Fusion World" est la série Dragon Ball Super actuellement active
  // (Bandai) — l'ancienne "Dragon Ball Super Card Game: Masters" existe
  // aussi côté tcgapi.dev (slug "dragon-ball-super-ccg") si besoin de
  // l'ajouter plus tard.
  dragonball: "dragon-ball-super-fusion-world",
};
