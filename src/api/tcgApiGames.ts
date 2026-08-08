import { Game, UnifiedCard, UnifiedSet } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";
import { TCGAPI_SLUG } from "../constants/tcgApiSlugs";

// Client générique pour les jeux qui n'ont pas d'API dédiée gratuite comme
// Pokémon (pokemontcg.io), Magic (Scryfall) ou Yu-Gi-Oh! (YGOPRODeck) : One
// Piece, Lorcana, Riftbound, Dragon Ball. Ces 4 jeux passent tous par le même
// service tiers tcgapi.dev déjà utilisé pour les produits scellés (voir
// sealedProducts.ts) — un seul client paramétré par jeu suffit donc, pas
// besoin d'un fichier par jeu comme pour les 3 API historiques.
const BASE_URL = `${API_BASE_URL}/proxy/tcgapi`;

interface RawTcgApiCard {
  id: number;
  name: string;
  number?: string | null;
  rarity?: string | null;
  image_url?: string;
  set_name?: string;
  market_price?: number | null;
}

interface RawTcgApiSet {
  id: number;
  name: string;
  card_count?: number;
  released_at?: string;
}

// Les id renvoyés par tcgapi.dev sont numériques et propres au service — on
// les préfixe pour ne jamais entrer en collision avec un id venant d'une des
// 3 API historiques (même logique que pour les produits scellés, voir
// sealedProducts.ts).
function toUnifiedCard(raw: RawTcgApiCard, game: Game): UnifiedCard {
  return {
    id: `tcgapi-${raw.id}`,
    game,
    name: raw.name,
    setName: raw.set_name ?? "—",
    number: raw.number ?? undefined,
    rarity: raw.rarity ?? undefined,
    imageSmall: raw.image_url ?? "",
    imageLarge: raw.image_url ?? "",
    marketPriceUsd: raw.market_price ?? undefined,
  };
}

export async function searchCards(game: Game, query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const slug = TCGAPI_SLUG[game];
  const url = `${BASE_URL}/cards/search?game=${encodeURIComponent(slug)}&q=${encodeURIComponent(trimmed)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`tcgapi.dev erreur : ${res.status}`);
  }
  const json = await res.json();
  const items = (json.data ?? []) as RawTcgApiCard[];
  return items.map((item) => toUnifiedCard(item, game));
}

// En pratique peu utilisé : la recherche et la checklist transmettent déjà
// la carte complète via presetCard (voir navigation/types.ts) plutôt que de
// repasser par un id — ce fallback reste utile en cas de deep link direct.
export async function getCardById(game: Game, id: string): Promise<UnifiedCard> {
  const numericId = id.replace(/^tcgapi-/, "");
  const url = `${BASE_URL}/cards/${encodeURIComponent(numericId)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`tcgapi.dev erreur : ${res.status}`);
  }
  const json = await res.json();
  return toUnifiedCard(json.data as RawTcgApiCard, game);
}

// Liste des séries d'un jeu (écran Checklist) — endpoint public de
// tcgapi.dev, pas besoin de clé (voir server/index.js).
export async function listSets(game: Game): Promise<UnifiedSet[]> {
  const slug = TCGAPI_SLUG[game];
  const url = `${BASE_URL}/games/${encodeURIComponent(slug)}/sets`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`tcgapi.dev erreur : ${res.status}`);
  }
  const json = await res.json();
  const raw = (json.data ?? []) as RawTcgApiSet[];
  return raw
    .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""))
    .map((s) => ({ id: String(s.id), game, name: s.name, cardCount: s.card_count }));
}

// Visuel d'une série précise (booster box / display / deck), pour illustrer
// l'écran Checklist d'une série (voir SetChecklistScreen.tsx). tcgapi.dev n'a
// pas d'image de série au sens strict — on se sert de ses "Sealed Products"
// (déjà utilisés par ailleurs, voir sealedProducts.ts), filtrés précisément
// par set_id côté serveur (voir /proxy/tcgapi/sealed-for-set). Volontairement
// appelé une série à la fois (jamais en boucle sur toute une liste) : la
// quota tcgapi.dev (100 requêtes/jour en offre gratuite) est partagée par
// toute l'app, un appel par série ouverte reste raisonnable, en boucler 70+
// d'un coup ne le serait pas.
export async function getSealedImageForSet(
  game: Game,
  setId: string,
  setName: string
): Promise<string | undefined> {
  const slug = TCGAPI_SLUG[game];
  const url = `${BASE_URL}/sealed-for-set?game=${encodeURIComponent(slug)}&setId=${encodeURIComponent(
    setId
  )}&q=${encodeURIComponent(setName)}`;
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return undefined;
    const json = await res.json();
    const items = (json.data ?? []) as { image_url?: string }[];
    return items[0]?.image_url;
  } catch {
    return undefined;
  }
}

// Toutes les cartes d'une série (écran Checklist), avec pagination — 3 pages
// (jusqu'à 300 cartes) largement suffisant pour ces jeux (leurs plus grosses
// séries tournent autour de 150-200 cartes).
export async function fetchCardsBySetId(game: Game, setId: string): Promise<UnifiedCard[]> {
  const all: UnifiedCard[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `${BASE_URL}/sets/${encodeURIComponent(setId)}/cards?page=${page}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      if (page === 1) throw new Error(`tcgapi.dev erreur : ${res.status}`);
      break;
    }
    const json = await res.json();
    const items = (json.data ?? []) as RawTcgApiCard[];
    if (items.length === 0) break;
    all.push(...items.map((item) => toUnifiedCard(item, game)));
    if (!json.meta?.has_more) break;
  }
  return all;
}
