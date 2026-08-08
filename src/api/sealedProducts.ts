import { Game, UnifiedCard } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";

// Produits scellés (coffrets, displays, boosters...) via tcgapi.dev — voir
// server/index.js, route /proxy/sealed/search, pour le contexte (TCGplayer a
// fermé son API officielle aux nouveaux développeurs, tcgapi.dev republie les
// mêmes données de prix).
const BASE_URL = `${API_BASE_URL}/proxy/sealed`;

interface RawSealedProduct {
  id: number;
  name: string;
  set_name?: string;
  image_url?: string;
  market_price?: number;
}

// Les prix de tcgapi.dev viennent de TCGplayer (marché US, en dollars) — pas
// de prix Cardmarket (EUR) disponible pour les produits scellés à ce jour,
// donc pas de conversion à faire ici (contrairement aux cartes à l'unité,
// voir src/utils/marketPrice.ts).
function toUnifiedCard(raw: RawSealedProduct, game: Game): UnifiedCard {
  return {
    // Préfixé pour ne jamais entrer en collision avec un id de carte classique
    // (ex Pokémon "sv4pt5-1") et pour qu'on puisse reconnaître un produit
    // scellé rien qu'à son id si besoin.
    id: `sealed-${raw.id}`,
    game,
    name: raw.name,
    setName: raw.set_name ?? "—",
    imageSmall: raw.image_url ?? "",
    imageLarge: raw.image_url ?? "",
    marketPriceUsd: raw.market_price,
  };
}

export async function searchSealedProducts(game: Game, query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${BASE_URL}/search?game=${encodeURIComponent(game)}&q=${encodeURIComponent(trimmed)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Produits scellés (tcgapi.dev) erreur : ${res.status}`);
  }
  const json = await res.json();
  const items = (json.data ?? []) as RawSealedProduct[];
  return items.map((item) => toUnifiedCard(item, game));
}
