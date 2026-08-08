import { Game, UnifiedCard } from "../types";
import { LanguageCode } from "../i18n";
import * as pokemonApi from "./pokemonTcg";
import * as magicApi from "./scryfall";
import * as yugiohApi from "./ygoprodeck";

// Point d'entrée unique utilisé par les écrans : ils n'ont jamais besoin de
// savoir quelle API/format est derrière chaque jeu.
//
// uiLanguage n'est utilisé que par Pokémon pour l'instant (pokemontcg.io
// n'indexe les cartes qu'en anglais — voir pokemonTcg.ts pour la traduction
// automatique via PokeAPI). Magic (Scryfall) et Yu-Gi-Oh! (YGOPRODeck)
// l'ignorent, leurs API n'ayant pas cette limitation dans notre usage actuel.
export async function searchCards(
  game: Game,
  query: string,
  uiLanguage?: LanguageCode
): Promise<UnifiedCard[]> {
  switch (game) {
    case "pokemon":
      return pokemonApi.searchCards(query, uiLanguage);
    case "magic":
      return magicApi.searchCards(query);
    case "yugioh":
      return yugiohApi.searchCards(query);
  }
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
