import { UnifiedCard } from "../types";

// Format texte attendu par l'outil "Mass Entry" de TCGplayer (colle une liste
// de cartes pour les ajouter en une fois au panier) : une ligne par carte,
// "quantité nom [série] numéro". Vérifié en conditions réelles : ce format
// est STRICT (une ligne "1 Charizard" seule, sans crochets, est rejetée
// d'office comme "mal formatée") et la correspondance série/numéro doit
// matcher exactement le nom interne TCGplayer — nos données (pokemontcg.io,
// Scryfall, tcgapi.dev...) ne collent pas toujours à 100%. On construit donc
// la liste en best-effort : ça fonctionnera pour une bonne partie des cartes,
// TCGplayer signale lui-même celles qu'il n'a pas reconnues (l'utilisateur
// peut alors les ajouter à la main) plutôt que d'échouer silencieusement.
export const MASS_ENTRY_URL = "https://www.tcgplayer.com/massentry";

export function buildMassEntryText(cards: UnifiedCard[]): string {
  return cards
    .map((c) => {
      const setPart = c.setName && c.setName !== "—" ? ` [${c.setName}]` : "";
      const numberPart = c.number ? ` ${c.number}` : "";
      return `1 ${c.name}${setPart}${numberPart}`;
    })
    .join("\n");
}
