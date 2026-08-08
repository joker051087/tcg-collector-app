import { CollectionItem } from "../types";

// Frais moyens estimés d'une revente en ligne (eBay ~13% + décote marketplace).
// C'est le point de différenciation identifié face à Collectr, dont les avis
// reprochent d'afficher uniquement le "prix marché" brut. À terme, ce taux
// devrait varier par plateforme et être configurable par l'utilisateur.
export const MARKETPLACE_FEE_RATE = 0.13;

// Chaque client API (src/api/*) résout déjà le prix marché d'une carte en un
// simple nombre (UnifiedCard.marketPriceUsd), quel que soit le jeu. Cette
// fonction n'a donc plus qu'à appliquer les frais estimés, indépendamment
// du TCG concerné.
export function getNetRealisticPrice(marketPriceUsd: number | undefined): number | undefined {
  if (marketPriceUsd == null) return undefined;
  return Math.max(0, marketPriceUsd * (1 - MARKETPLACE_FEE_RATE));
}

export interface PortfolioTotals {
  marketValue: number;
  netValue: number;
  cardCount: number;
  uniqueCardCount: number;
}

export function computePortfolioTotals(items: CollectionItem[]): PortfolioTotals {
  return items.reduce<PortfolioTotals>(
    (acc, item) => {
      const market = item.card.marketPriceUsd ?? 0;
      const net = getNetRealisticPrice(item.card.marketPriceUsd) ?? 0;
      acc.marketValue += market * item.quantity;
      acc.netValue += net * item.quantity;
      acc.cardCount += item.quantity;
      acc.uniqueCardCount += 1;
      return acc;
    },
    { marketValue: 0, netValue: 0, cardCount: 0, uniqueCardCount: 0 }
  );
}
