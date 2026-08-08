import { Game, UnifiedCard } from "../types";

export type SearchStackParamList = {
  SearchHome: undefined;
  // presetCard : fourni pour les produits scellés (tcgapi.dev), dont l'id
  // n'existe dans aucune des 3 API "cartes" — impossible d'utiliser
  // getCardById dans ce cas, on passe donc directement la carte déjà
  // récupérée par la recherche plutôt que de la re-fetcher.
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
};

export type TabParamList = {
  SearchTab: undefined;
  PortfolioTab: undefined;
  SettingsTab: undefined;
};
