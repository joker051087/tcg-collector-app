import { Game, UnifiedCard, UnifiedSet } from "../types";
import { LanguageCode } from "../i18n";
import { TCGAPI_GAMES } from "../constants/games";
import * as pokemonApi from "./pokemonTcg";
import * as magicApi from "./scryfall";
import * as yugiohApi from "./ygoprodeck";
import * as sealedApi from "./sealedProducts";
import * as tcgApiGamesApi from "./tcgApiGames";

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
  // tcgapi.dev (One Piece, Lorcana, Riftbound, Dragon Ball) n'a pas de filtre
  // par numéro de carte — l'écran Recherche masque déjà le mode "Numéro" pour
  // ces jeux (voir SearchScreen.tsx), mais on se rabat proprement sur la
  // recherche par nom si jamais mode="number" arrive quand même ici.
  if (mode === "number" && !TCGAPI_GAMES.includes(game)) {
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
    case "onepiece":
    case "lorcana":
    case "riftbound":
    case "dragonball":
      return tcgApiGamesApi.searchCards(game, query);
  }
}

// Produits scellés (coffrets, displays, boosters) — même dispatch que
// searchCards, mais une seule source (tcgapi.dev) pour les 3 jeux, voir
// sealedProducts.ts.
export async function searchSealedProducts(game: Game, query: string): Promise<UnifiedCard[]> {
  return sealedApi.searchSealedProducts(game, query);
}

// Écran Checklist : liste des séries d'un jeu, puis toutes les cartes d'une
// série donnée (pour comparer avec la collection possédée, voir
// src/screens/SetChecklistScreen.tsx).
export async function listSets(game: Game): Promise<UnifiedSet[]> {
  switch (game) {
    case "pokemon":
      return pokemonApi.listSets();
    case "magic":
      return magicApi.listSets();
    case "yugioh":
      return yugiohApi.listSets();
    case "onepiece":
    case "lorcana":
    case "riftbound":
    case "dragonball":
      return tcgApiGamesApi.listSets(game);
  }
}

export async function fetchSetCards(game: Game, setId: string): Promise<UnifiedCard[]> {
  switch (game) {
    case "pokemon":
      return pokemonApi.fetchCardsBySetId(setId);
    case "magic":
      return magicApi.fetchCardsBySetCode(setId);
    case "yugioh":
      return yugiohApi.fetchCardsBySetCode(setId);
    case "onepiece":
    case "lorcana":
    case "riftbound":
    case "dragonball":
      return tcgApiGamesApi.fetchCardsBySetId(game, setId);
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
    case "onepiece":
    case "lorcana":
    case "riftbound":
    case "dragonball":
      return tcgApiGamesApi.getCardById(game, id);
  }
}
