import { Game, UnifiedCard } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";
import { TCGAPI_SLUG } from "../constants/tcgApiSlugs";

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

  const slug = TCGAPI_SLUG[game];
  const url = `${BASE_URL}/search?game=${encodeURIComponent(slug)}&q=${encodeURIComponent(trimmed)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Produits scellés (tcgapi.dev) erreur : ${res.status}`);
  }
  const json = await res.json();
  const items = (json.data ?? []) as RawSealedProduct[];
  return items.map((item) => toUnifiedCard(item, game));
}

// Parmi les produits scellés retournés pour une série, choisit celui qui
// correspond le mieux au "booster" au sens visuel courant — le simple
// paquet, pas la boîte ni la caisse. TCGplayer nomme presque toujours ce
// produit "<Série> - Booster Pack" (vérifié sur One Piece), on privilégie
// donc ce nom, puis n'importe quel produit "booster" non-boîte, puis le
// premier résultat en dernier recours.
function isBoxOrCase(name: string): boolean {
  return /\b(box|case|bundle|display)\b/i.test(name);
}

function pickBoosterImage(items: UnifiedCard[]): string | undefined {
  const packMatch = items.find((i) => /\bbooster pack\b/i.test(i.name) && !isBoxOrCase(i.name));
  if (packMatch) return packMatch.imageSmall || packMatch.imageLarge;
  const boosterMatch = items.find((i) => /booster/i.test(i.name) && !isBoxOrCase(i.name));
  if (boosterMatch) return boosterMatch.imageSmall || boosterMatch.imageLarge;
  return items[0]?.imageSmall || items[0]?.imageLarge;
}

// Visuel de booster pour illustrer l'écran Checklist d'une série précise
// (voir SetChecklistScreen.tsx) — appelé une seule série à la fois, jamais
// en boucle sur toute une liste (voir usage), pour rester raisonnable vis-à-
// vis de la quota tcgapi.dev partagée par toute l'app (100 requêtes/jour en
// offre gratuite). Réutilise /proxy/sealed/search, déjà en cache 12h côté
// serveur.
export async function findSetBoosterImage(game: Game, setName: string): Promise<string | undefined> {
  try {
    const items = await searchSealedProducts(game, setName);
    if (items.length === 0) return undefined;
    return pickBoosterImage(items);
  } catch {
    return undefined;
  }
}
