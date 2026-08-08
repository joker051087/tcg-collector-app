import { UnifiedCard } from "../types";
import { LanguageCode } from "../i18n";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { POKEAPI_LANGUAGE_CODES } from "../constants/pokeApiLanguages";
import { usePokemonNamesStore } from "../store/pokemonNamesStore";
import { API_BASE_URL } from "../config/api";

// Passe désormais par le backend local (server/), qui met les résultats en
// cache et transmet la clé API pokemontcg.io (si configurée côté serveur —
// elle n'a plus besoin d'être dans le bundle de l'app). Voir server/index.js.
const BASE_URL = `${API_BASE_URL}/proxy/pokemon`;

interface RawPokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: { small: string; large: string };
  set: { name: string; series: string };
  tcgplayer?: {
    prices?: Record<string, { market?: number; mid?: number; low?: number }>;
  };
  cardmarket?: {
    prices?: { trendPrice?: number; averageSellPrice?: number };
  };
}

function resolveMarketPrice(raw: RawPokemonCard): number | undefined {
  const tcgPrices = raw.tcgplayer?.prices;
  if (tcgPrices) {
    const firstVariant = Object.values(tcgPrices)[0];
    if (firstVariant?.market != null) return firstVariant.market;
  }
  const cardmarket = raw.cardmarket?.prices;
  if (cardmarket?.trendPrice != null) return cardmarket.trendPrice;
  if (cardmarket?.averageSellPrice != null) return cardmarket.averageSellPrice;
  return undefined;
}

function toUnifiedCard(raw: RawPokemonCard): UnifiedCard {
  return {
    id: raw.id,
    game: "pokemon",
    name: raw.name,
    setName: raw.set.name,
    number: raw.number,
    rarity: raw.rarity,
    imageSmall: raw.images.small,
    imageLarge: raw.images.large,
    marketPriceUsd: resolveMarketPrice(raw),
  };
}

async function fetchCardsByName(name: string): Promise<UnifiedCard[]> {
  const q = encodeURIComponent(`name:"${name}*"`);
  const url = `${BASE_URL}/cards?q=${q}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawPokemonCard[];
  return cards.map(toUnifiedCard);
}

// pokemontcg.io n'indexe les cartes que par leur nom ANGLAIS. Si l'app est
// dans une autre langue, on tente de retrouver le(s) nom(s) anglais
// correspondant(s) via le dictionnaire PokeAPI mis en cache localement (voir
// pokemonNamesStore.ts). Si le dictionnaire n'a rien (pas encore chargé, ou
// l'utilisateur a en fait tapé un nom anglais malgré l'UI en français), on
// se rabat sur la requête telle quelle — comportement inchangé.
async function resolveEnglishQueries(trimmed: string, uiLanguage?: LanguageCode): Promise<string[]> {
  if (!uiLanguage) return [trimmed];
  const pokeApiLanguage = POKEAPI_LANGUAGE_CODES[uiLanguage];
  if (!pokeApiLanguage) return [trimmed];

  // Précharge/rafraîchit le dictionnaire en arrière-plan (ne bloque pas
  // cette recherche s'il n'est pas encore prêt).
  usePokemonNamesStore.getState().ensureNamesFor(pokeApiLanguage);

  // Sous 3 caractères, un sous-mot correspondrait à trop de Pokémon à la
  // fois — pas la peine de traduire, ça arrivera une fois l'utilisateur
  // ayant tapé un peu plus.
  if (trimmed.length < 3) return [trimmed];

  const matches = usePokemonNamesStore.getState().translateToEnglish(trimmed);
  if (matches.length === 0) return [trimmed];

  // Limite le nombre de requêtes parallèles envoyées à l'API en cas de
  // correspondance trop large.
  return matches.slice(0, 5);
}

export async function searchCards(query: string, uiLanguage?: LanguageCode): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const englishQueries = await resolveEnglishQueries(trimmed, uiLanguage);
  const resultsPerQuery = await Promise.all(englishQueries.map((name) => fetchCardsByName(name)));

  const seen = new Set<string>();
  const merged: UnifiedCard[] = [];
  for (const cards of resultsPerQuery) {
    for (const card of cards) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        merged.push(card);
      }
    }
  }
  return merged;
}

export async function getCardById(id: string): Promise<UnifiedCard> {
  const res = await fetchWithRetry(`${BASE_URL}/cards/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  return toUnifiedCard(json.data as RawPokemonCard);
}

// Recherche par numéro de carte (ex : "4" pour Charizard #4/102 dans Base
// Set). Le champ "number" de pokemontcg.io est le numéro tel qu'imprimé sur
// la carte (souvent juste la partie avant le "/"). Comme un même numéro
// existe dans des dizaines de sets différents, les résultats peuvent être
// nombreux — pas de filtre par set dans cette première version.
export async function searchCardsByNumber(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = encodeURIComponent(`number:"${trimmed}"`);
  const url = `${BASE_URL}/cards?q=${q}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawPokemonCard[];
  return cards.map(toUnifiedCard);
}
