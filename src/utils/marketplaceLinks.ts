import { UnifiedCard } from "../types";

// Chaque marketplace a son propre format d'URL de recherche. On passe par
// leur barre de recherche (pas de lien produit exact) car aucune de ces
// plateformes n'expose de correspondance publique fiable "nom + set +
// numéro -> fiche produit" sans clé API dédiée (voir aussi
// src/utils/cardmarket.ts, remplacé par ce fichier plus générique).
export interface MarketplaceLink {
  id: "cardmarket" | "tcgplayer" | "ebay";
  labelKey: string;
  getUrl: (card: UnifiedCard) => string;
}

function buildQuery(card: UnifiedCard): string {
  return card.number ? `${card.name} ${card.number}` : card.name;
}

// Pokémon/Magic/Yu-Gi-Oh! ont été vérifiés en conditions réelles par
// l'utilisateur (voir historique). Les 4 nouveaux jeux ci-dessous sont des
// noms de catégorie plausibles (conventions habituelles de ces sites) mais
// PAS vérifiés en direct — Cardmarket bloque nos outils de vérification
// automatique (voir tentatives précédentes). À tester une fois déployé ; si
// un lien tombe à côté, il suffit de corriger la valeur ici.
const CARDMARKET_GAME_PATHS: Record<UnifiedCard["game"], string> = {
  pokemon: "Pokemon",
  magic: "Magic",
  yugioh: "YuGiOh",
  onepiece: "OnePiece",
  lorcana: "Lorcana",
  riftbound: "Riftbound",
  dragonball: "DragonBallSuper",
  digimon: "DigimonCardGame",
  fleshandblood: "FleshAndBlood",
  starwarsunlimited: "StarWarsUnlimited",
  unionarena: "UnionArena",
  gundam: "GundamCardGame",
  finalfantasy: "FinalFantasyTCG",
};

const TCGPLAYER_GAME_PATHS: Record<UnifiedCard["game"], string> = {
  pokemon: "pokemon",
  magic: "magic",
  yugioh: "yugioh",
  onepiece: "one-piece-card-game",
  lorcana: "lorcana",
  riftbound: "riftbound",
  dragonball: "dragon-ball-super",
  digimon: "digimon-card-game",
  fleshandblood: "flesh-and-blood-tcg",
  starwarsunlimited: "star-wars-unlimited",
  unionarena: "union-arena",
  gundam: "gundam-card-game",
  finalfantasy: "final-fantasy-tcg",
};

export const MARKETPLACE_LINKS: MarketplaceLink[] = [
  {
    id: "cardmarket",
    labelKey: "cardDetail.viewOnCardmarket",
    getUrl: (card) => {
      const gamePath = CARDMARKET_GAME_PATHS[card.game];
      return `https://www.cardmarket.com/en/${gamePath}/Products/Search?searchString=${encodeURIComponent(
        buildQuery(card)
      )}`;
    },
  },
  {
    id: "tcgplayer",
    labelKey: "cardDetail.viewOnTcgplayer",
    getUrl: (card) => {
      const gamePath = TCGPLAYER_GAME_PATHS[card.game];
      return `https://www.tcgplayer.com/search/${gamePath}/product?productLineName=${gamePath}&q=${encodeURIComponent(
        buildQuery(card)
      )}`;
    },
  },
  {
    id: "ebay",
    labelKey: "cardDetail.viewOnEbay",
    getUrl: (card) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(buildQuery(card))}`,
  },
];
