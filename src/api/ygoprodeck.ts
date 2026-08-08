import { UnifiedCard } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";

// Passe désormais par le backend local (server/), qui met les résultats en
// cache. `fname` fait une recherche floue sur le nom côté YGOPRODeck
// (pratique pour la recherche "au fil de la frappe").
const BASE_URL = `${API_BASE_URL}/proxy/yugioh`;

interface RawYugiohCard {
  id: number;
  name: string;
  rarity?: string;
  card_images?: { image_url: string; image_url_small: string }[];
  card_sets?: { set_name: string; set_code: string; set_rarity?: string }[];
  card_prices?: {
    tcgplayer_price?: string;
    cardmarket_price?: string;
    ebay_price?: string;
  }[];
}

function resolveMarketPrice(raw: RawYugiohCard): number | undefined {
  const priceEntry = raw.card_prices?.[0];
  const priceStr = priceEntry?.tcgplayer_price ?? priceEntry?.cardmarket_price;
  if (!priceStr) return undefined;
  const parsed = parseFloat(priceStr);
  return Number.isNaN(parsed) || parsed === 0 ? undefined : parsed;
}

function toUnifiedCard(raw: RawYugiohCard): UnifiedCard {
  const firstSet = raw.card_sets?.[0];
  const images = raw.card_images?.[0];
  return {
    id: String(raw.id),
    game: "yugioh",
    name: raw.name,
    setName: firstSet?.set_name ?? "—",
    number: firstSet?.set_code,
    rarity: firstSet?.set_rarity ?? raw.rarity,
    imageSmall: images?.image_url_small ?? "",
    imageLarge: images?.image_url ?? "",
    marketPriceUsd: resolveMarketPrice(raw),
  };
}

export async function searchCards(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${BASE_URL}/cards?fname=${encodeURIComponent(trimmed)}`;
  const res = await fetchWithRetry(url);
  if (res.status === 400) {
    // YGOPRODeck renvoie 400 + { error: "..." } quand rien ne correspond.
    return [];
  }
  if (!res.ok) {
    throw new Error(`YGOPRODeck API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawYugiohCard[];
  return cards.map(toUnifiedCard);
}

export async function getCardById(id: string): Promise<UnifiedCard> {
  const url = `${BASE_URL}/cards?id=${encodeURIComponent(id)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`YGOPRODeck API error: ${res.status}`);
  }
  const json = await res.json();
  const card = (json.data ?? [])[0] as RawYugiohCard | undefined;
  if (!card) {
    throw new Error("Card not found");
  }
  return toUnifiedCard(card);
}

// YGOPRODeck n'a pas de filtre par numéro/code de set sur son endpoint de
// recherche classique. Le backend (server/) télécharge et met en cache la
// base complète, puis filtre par code de set (ex : "SDY-006") — voir
// server/index.js, route /proxy/yugioh/by-number.
export async function searchCardsByNumber(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${BASE_URL}/by-number?code=${encodeURIComponent(trimmed)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`YGOPRODeck API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawYugiohCard[];
  return cards.map(toUnifiedCard);
}
