import { NavigatorScreenParams } from "@react-navigation/native";
import { Game, UnifiedCard } from "../types";

export type SearchStackParamList = {
  // initialGame : fourni quand on arrive depuis la grille "Explorer un jeu"
  // de l'écran d'Accueil, pour ouvrir directement la recherche sur le jeu
  // choisi plutôt que sur Pokémon par défaut (voir SearchScreen.tsx).
  // initialQuery : fourni quand on revient du Scanner en mode OCR (voir
  // ScannerScreen.tsx) — préremplit la recherche avec le texte lu sur la
  // carte plutôt que de laisser l'utilisateur le retaper.
  SearchHome: { initialGame?: Game; initialQuery?: string } | undefined;
  // presetCard : fourni pour les produits scellés (tcgapi.dev), dont l'id
  // n'existe dans aucune des 3 API "cartes" — impossible d'utiliser
  // getCardById dans ce cas, on passe donc directement la carte déjà
  // récupérée par la recherche plutôt que de la re-fetcher. Même raison
  // pour les cartes identifiées par le Scanner (voir ScannerScreen.tsx,
  // id préfixé "scrydex-").
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
  // Scanner : appareil photo pour identifier une carte (voir
  // ScannerScreen.tsx) — reconnaissance visuelle (Scrydex Vision) pour les
  // jeux couverts, lecture de texte (OCR) pour les autres, voir
  // SCRYDEX_VISION_GAMES dans src/constants/games.ts.
  Scanner: { initialGame?: Game } | undefined;
};

// Checklist : choisir un jeu puis une série, voir quelles cartes de cette
// série sont déjà possédées, et pouvoir ajouter directement les manquantes
// (CardDetail réutilisé tel quel — même écran que dans SearchStack).
export type ChecklistStackParamList = {
  ChecklistHome: undefined;
  // setImageUrl : logo/icône de la série si l'API la fournit (voir
  // UnifiedSet.imageUrl), transmis directement par ChecklistHomeScreen pour
  // éviter un re-fetch — affiché en haut de l'écran via GameLogo.
  SetChecklist: { game: Game; setId: string; setName: string; setImageUrl?: string };
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
  // Liste de souhaits (cartes manquantes cochées depuis la Checklist, ou
  // ajoutées depuis une fiche carte) — voir wishlistStore.ts.
  Wishlist: undefined;
};

// Accueil : tableau de bord (stats collection, accès rapides, dernières
// cartes ajoutées, grille des jeux). CardDetail réutilisé pour ouvrir une
// carte directement depuis "Ajouts récents" sans repasser par Recherche.
export type HomeStackParamList = {
  HomeMain: undefined;
  CardDetail: { game: Game; cardId: string; presetCard?: UnifiedCard };
};

// NavigatorScreenParams sur les onglets qui contiennent un stack imbriqué :
// nécessaire pour pouvoir naviguer depuis l'Accueil vers un écran précis
// d'un autre onglet (ex : navigation.navigate("SearchTab", { screen:
// "SearchHome", params: { initialGame: "onepiece" } })) avec un typage correct.
export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
  ChecklistTab: NavigatorScreenParams<ChecklistStackParamList>;
  PortfolioTab: undefined;
  SettingsTab: undefined;
};
