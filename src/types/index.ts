// Modèle de données unifié multi-TCG : chaque API de jeu (Pokémon, Magic,
// Yu-Gi-Oh!...) a un format de réponse complètement différent. Les clients
// API (src/api/*) sont responsables de mapper leur réponse brute vers ce
// format commun, pour que le reste de l'app (recherche, fiche carte,
// collection, calcul de valeur) n'ait jamais besoin de savoir de quel jeu
// vient une carte.

// onepiece/lorcana/riftbound/dragonball : pas d'API dédiée gratuite comme
// pokemontcg.io/Scryfall/YGOPRODeck pour ces jeux, on passe donc par
// tcgapi.dev pour les 4 (voir src/api/tcgApiGames.ts et
// src/constants/tcgApiSlugs.ts pour la correspondance avec les "slugs"
// attendus par ce service).
export type Game =
  | "pokemon"
  | "magic"
  | "yugioh"
  | "onepiece"
  | "lorcana"
  | "riftbound"
  | "dragonball"
  | "digimon"
  | "fleshandblood"
  | "starwarsunlimited"
  | "unionarena"
  | "gundam"
  | "finalfantasy";

export interface UnifiedCard {
  id: string;
  game: Game;
  name: string;
  setName: string;
  /** Numéro/collector number/set code selon le jeu, purement informatif. */
  number?: string;
  rarity?: string;
  imageSmall: string;
  imageLarge: string;
  /** Prix marché déjà résolu en USD par le client API, ou undefined si inconnu. */
  marketPriceUsd?: number;
}

// Une série/set (ex "Écarlate et Violet 151", "War of the Spark") — utilisé
// par l'écran Checklist pour lister les séries d'un jeu, puis afficher les
// cartes possédées/manquantes une fois une série choisie. `id` est
// l'identifiant à passer à fetchSetCards (src/api/index.ts) : différent selon
// le jeu (id interne pokemontcg.io, code Scryfall, set_code YGOPRODeck), pas
// forcément unique en tant que clé d'affichage à lui seul (voir usage dans
// ChecklistHomeScreen).
export interface UnifiedSet {
  id: string;
  game: Game;
  name: string;
  cardCount?: number;
  /** Logo/icône de la série quand la source le fournit (pokemontcg.io,
   * Scryfall) — voir src/constants/gameLogos.ts pour le repli utilisé
   * ailleurs (logo du jeu) quand ce n'est pas le cas. */
  imageUrl?: string;
}

export type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";

export const CARD_CONDITIONS: CardCondition[] = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Light Played",
  "Played",
  "Poor",
];

export type OwnershipType = "raw" | "graded" | "sealed";

export type GradingCompany = "PSA" | "CGC" | "BGS" | "SGC";

export interface CollectionItem {
  itemId: string;
  cardId: string;
  card: UnifiedCard;
  quantity: number;
  condition: CardCondition;
  ownershipType: OwnershipType;
  gradingCompany?: GradingCompany;
  grade?: number;
  purchasePrice?: number;
  addedAt: string;
}
