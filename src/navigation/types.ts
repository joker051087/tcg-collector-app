import { Game, UnifiedCard } from "../types";

export type SearchStackParamList = {
  SearchHome: undefined;
  // presetCard : fourni pour les produits scellés (tcgapi.dev), dont l'id
  // n'existe dans aucune des 3 API "cartes" — impossible d'utiliser
  // getCardById dans ce cas, on passe donc directement la carte déjà
  // récupérée par la recherche plutôt que de la re-fetcher.
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
};

// Checklist : choisir un jeu puis une série, voir quelles cartes de cette
// série sont déjà possédées, et pouvoir ajouter directement les manquantes
// (CardDetail réutilisé tel quel — même écran que dans SearchStack).
export type ChecklistStackParamList = {
  ChecklistHome: undefined;
  SetChecklist: { game: Game; setId: string; setName: string };
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
};

export type TabParamList = {
  SearchTab: undefined;
  ChecklistTab: undefined;
  PortfolioTab: undefined;
  SettingsTab: undefined;
};
