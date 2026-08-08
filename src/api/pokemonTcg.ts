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

// Trois formats reconnus :
//   - "020/064"       -> numéro seul
//   - "SFA 020/064"   -> code de set + numéro
//   - "SFA"           -> code de set seul (parcourt tout le set)
// Le "/064" (total de cartes du set) sert seulement à guider l'utilisateur,
// pokemontcg.io ne l'utilise pas pour filtrer — il est ignoré ici. Le code
// de set (ex "SFA" pour Shrouded Fable) correspond au champ set.ptcgoCode.
type ParsedPokemonQuery =
  | { type: "number"; number: string; setCode?: string }
  | { type: "set"; setCode: string };

function parsePokemonNumberQuery(raw: string): ParsedPokemonQuery | null {
  const trimmed = raw.trim();

  const withNumber = trimmed.match(/^(?:([a-zA-Z]{2,6})\s+)?(\d+)(?:\s*\/\s*\d+)?$/);
  if (withNumber) {
    const [, setCode, number] = withNumber;
    return { type: "number", number, setCode: setCode?.toUpperCase() };
  }

  const setOnly = trimmed.match(/^[a-zA-Z]{2,6}$/);
  if (setOnly) {
    return { type: "set", setCode: trimmed.toUpperCase() };
  }

  return null;
}

async function fetchCardsByFilter(
  filter: string,
  options?: { pageSize?: number; orderBy?: string }
): Promise<UnifiedCard[]> {
  const params = new URLSearchParams({ q: filter });
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  if (options?.orderBy) params.set("orderBy", options.orderBy);
  const url = `${BASE_URL}/cards?${params.toString()}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawPokemonCard[];
  return cards.map(toUnifiedCard);
}

// Le champ set.ptcgoCode n'est PAS fiable pour filtrer les cartes : il est
// bien présent sur l'objet Set renvoyé par /v2/sets, mais constaté MANQUANT
// sur les cartes elles-mêmes pour certains sets (ex Paldean Fates), alors
// qu'il est présent pour d'autres (ex Shrouded Fable) — un problème dans les
// données de pokemontcg.io, pas dans notre requête. On résout donc d'abord
// le code tapé (ex "PAF") vers l'identifiant interne du set (ex "sv4pt5") via
// /v2/sets, où le champ est toujours fiable, puis on filtre les cartes par
// set.id — qui, lui, est toujours renseigné sur chaque carte.
async function resolveSetId(ptcgoCode: string): Promise<string | null> {
  const url = `${BASE_URL}/sets?ptcgoCode=${encodeURIComponent(ptcgoCode)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const json = await res.json();
  const sets = (json.data ?? []) as { id: string }[];
  return sets[0]?.id ?? null;
}

// Recherche par numéro de carte, ou par set entier si seul un code de set
// est tapé (ex : "SFA" liste toutes les cartes de Shrouded Fable). Le champ
// "number" de pokemontcg.io est le numéro tel qu'imprimé sur la carte, mais
// selon les sets il est stocké AVEC ou SANS le zéro de tête (ex: Shrouded
// Fable stocke "20", pas "020") — on tente donc les deux variantes et on
// fusionne les résultats. Sans code de set, un même numéro existe dans des
// dizaines de sets différents et les résultats peuvent être nombreux.
export async function searchCardsByNumber(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsed = parsePokemonNumberQuery(trimmed);

  if (parsed?.type === "set") {
    const setId = await resolveSetId(parsed.setCode);
    if (!setId) return [];
    // Un set entier peut dépasser la limite par défaut (30) — 250 est le
    // maximum autorisé par pokemontcg.io, largement suffisant. Tri par
    // numéro pour un parcours naturel plutôt que par date de sortie.
    return fetchCardsByFilter(`set.id:"${setId}"`, { pageSize: 250, orderBy: "number" });
  }

  const rawNumber = parsed?.type === "number" ? parsed.number : trimmed;
  const strippedNumber = rawNumber.replace(/^0+(?=\d)/, "");
  const numberCandidates = Array.from(new Set([rawNumber, strippedNumber]));

  const setId =
    parsed?.type === "number" && parsed.setCode ? await resolveSetId(parsed.setCode) : null;

  const filters = numberCandidates.map((num) => {
    const parts = [`number:"${num}"`];
    if (setId) {
      parts.push(`set.id:"${setId}"`);
    }
    return parts.join(" ");
  });

  const resultsPerFilter = await Promise.all(filters.map((filter) => fetchCardsByFilter(filter)));

  const seen = new Set<string>();
  const merged: UnifiedCard[] = [];
  for (const cards of resultsPerFilter) {
    for (const card of cards) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        merged.push(card);
      }
    }
  }
  return merged;
}
