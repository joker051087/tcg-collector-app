import { Game, UnifiedCard } from "../types";
import { LanguageCode } from "../i18n";
import * as pokemonApi from "./pokemonTcg";
import * as magicApi from "./scryfall";
import * as yugiohApi from "./ygoprodeck";
import * as sealedApi from "./sealedProducts";

export type SearchMode = "name" | "number";

// Point d'entrée unique utilisé par les écrans : ils n'ont jamais besoin de
// savoir quelle API/format est derrière chaque jeu.
//
// uiLanguage n'est utilisé que par Pokémon pour l'instant (pokemontcg.io
// n'indexe les cartes qu'en anglais — voir pokemonTcg.ts pour la traduction
// automatique via PokeAPI). Magic (Scryfall) et Yu-Gi-Oh! (YGOPRODeck)
// l'ignorent, leurs API n'ayant pas cette limitation dans notre usage actuel.
//
// mode="number" recherche par numéro/code de carte plutôt que par nom (voir
// searchCardsByNumber dans chaque client — nécessaire notamment pour
// Yu-Gi-Oh!, dont l'API n'a pas de filtre par numéro natif, géré côté
// backend).
export async function searchCards(
  game: Game,
  query: string,
  uiLanguage?: LanguageCode,
  mode: SearchMode = "name"
): Promise<UnifiedCard[]> {
  if (mode === "number") {
    switch (game) {
      case "pokemon":
        return pokemonApi.searchCardsByNumber(query);
      case "magic":
        return magicApi.searchCardsByNumber(query);
      case "yugioh":
        return yugiohApi.searchCardsByNumber(query);
    }
  }

  switch (game) {
    case "pokemon":
      return pokemonApi.searchCards(query, uiLanguage);
    case "magic":
      return magicApi.searchCards(query);
    case "yugioh":
      return yugiohApi.searchCards(query);
  }
}

// Produits scellés (coffrets, displays, boosters) — même dispatch que
// searchCards, mais une seule source (tcgapi.dev) pour les 3 jeux, voir
// sealedProducts.ts.
export async function searchSealedProducts(game: Game, query: string): Promise<UnifiedCard[]> {
  return sealedApi.searchSealedProducts(game, query);
}

export async function getCardById(game: Game, id: string): Promise<UnifiedCard> {
  switch (game) {
    case "pokemon":
      return pokemonApi.getCardById(id);
    case "magic":
      return magicApi.getCardById(id);
    case "yugioh":
      return yugiohApi.getCardById(id);
  }
}
