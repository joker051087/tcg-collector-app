import { Game, UnifiedCard } from "../types";
import { CARDMARKET_GAME_PATHS } from "./marketplaceLinks";

// Cardmarket a un vrai import de liste ("Add Decklist to Wants"), documenté
// officiellement ici : https://help.cardmarket.com/en/add-decklists-to-wants
// — mais le format attendu change selon le jeu, et n'est documenté (donc
// fiable) que pour 5 des 13 jeux de l'app. Vérifié le 09/08/2026 sur
// help.cardmarket.com (pages spécifiques par jeu) :
//
//   - Magic / Yu-Gi-Oh! / Lorcana : "nom (Extension)" — pas de numéro, pas de
//     crochets, l'extension entre parenthèses.
//   - One Piece / Digimon : "nom NUMÉRO Extension" — le numéro SANS
//     crochets/parenthèses, suivi du nom de l'extension.
//   - Pokémon : nécessite le texte des attaques/capacités en plus du nom
//     ("Umbreon EX Moon Mirage Onyx", pas juste "Umbreon") — donnée qu'on n'a
//     pas dans UnifiedCard, donc PAS supporté ici (contrairement à TCGplayer
//     Mass Entry, voir massEntry.ts, qui lui accepte nom+set+numéro pour
//     Pokémon).
//   - Les 7 autres jeux (Riftbound, Dragon Ball, Digimon déjà listé, Flesh &
//     Blood, Star Wars: Unlimited, Union Arena, Gundam, Final Fantasy) : pas
//     de page d'aide dédiée trouvée -> pas de format garanti, donc exclus
//     plutôt que de deviner.
type WantsFormat = "name-expansion" | "name-number-expansion";

const CARDMARKET_WANTS_FORMAT: Partial<Record<Game, WantsFormat>> = {
  magic: "name-expansion",
  yugioh: "name-expansion",
  lorcana: "name-expansion",
  onepiece: "name-number-expansion",
  digimon: "name-number-expansion",
};

export function supportsCardmarketWantsImport(game: Game): boolean {
  return game in CARDMARKET_WANTS_FORMAT;
}

export function buildCardmarketWantsText(cards: UnifiedCard[]): string {
  return cards
    .map((c) => {
      const format = CARDMARKET_WANTS_FORMAT[c.game];
      const hasSet = c.setName && c.setName !== "—";
      if (format === "name-number-expansion") {
        const numberPart = c.number ? ` ${c.number}` : "";
        const setPart = hasSet ? ` ${c.setName}` : "";
        return `1x ${c.name}${numberPart}${setPart}`;
      }
      const setPart = hasSet ? ` (${c.setName})` : "";
      return `1x ${c.name}${setPart}`;
    })
    .join("\n");
}

export function getCardmarketWantsUrl(game: Game): string {
  return `https://www.cardmarket.com/en/${CARDMARKET_GAME_PATHS[game]}/Wants`;
}
