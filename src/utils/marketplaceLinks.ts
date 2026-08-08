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

const CARDMARKET_GAME_PATHS: Record<UnifiedCard["game"], string> = {
  pokemon: "Pokemon",
  magic: "Magic",
  yugioh: "YuGiOh",
};

const TCGPLAYER_GAME_PATHS: Record<UnifiedCard["game"], string> = {
  pokemon: "pokemon",
  magic: "magic",
  yugioh: "yugioh",
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
