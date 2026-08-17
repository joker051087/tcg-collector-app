import { UnifiedCard, UnifiedSet } from "../types";
import { LanguageCode } from "../i18n";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { POKEAPI_LANGUAGE_CODES } from "../constants/pokeApiLanguages";
import { usePokemonNamesStore } from "../store/pokemonNamesStore";
import { resolveEurPriceAsUsd } from "../utils/marketPrice";
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

// Cardmarket (EUR, marché européen) est privilégié sur TCGplayer (USD,
// marché US) — les deux peuvent afficher des prix très différents pour la
// même carte, et Cardmarket est la marketplace la plus pertinente pour nos
// utilisateurs (voir src/utils/marketPrice.ts). On se rabat sur TCGplayer
// si le prix Cardmarket est absent, ou si les taux de change ne sont pas
// encore chargés pour le convertir en USD.
function resolveMarketPrice(raw: RawPokemonCard): number | undefined {
  const cardmarket = raw.cardmarket?.prices;
  const eurPrice = cardmarket?.trendPrice ?? cardmarket?.averageSellPrice;
  if (eurPrice != null) {
    const usd = resolveEurPriceAsUsd(eurPrice);
    if (usd != null) return usd;
  }

  const tcgPrices = raw.tcgplayer?.prices;
  if (tcgPrices) {
    const firstVariant = Object.values(tcgPrices)[0];
    if (firstVariant?.market != null) return firstVariant.market;
  }
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

// Liste complète des séries Pokémon, pour l'écran Checklist. `id` renvoyé ici
// est l'identifiant interne pokemontcg.io (ex "sv4pt5"), à ne pas confondre
// avec ptcgoCode (ex "PAF") utilisé ailleurs pour la recherche par numéro —
// voir fetchCardsBySetId ci-dessous, qui filtre directement par cet id.
export async function listSets(): Promise<UnifiedSet[]> {
  const res = await fetchWithRetry(`${BASE_URL}/sets/all`);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  const sets = (json.data ?? []) as {
    id: string;
    name: string;
    total?: number;
    images?: { symbol?: string; logo?: string };
  }[];
  return sets.map((s) => ({
    id: s.id,
    game: "pokemon" as const,
    name: s.name,
    cardCount: s.total,
    imageUrl: s.images?.logo,
  }));
}

// Toutes les cartes d'une série (écran Checklist) — filtre par set.id, qui
// contrairement à set.ptcgoCode est toujours renseigné sur chaque carte (voir
// note sur resolveSetId plus haut).
export async function fetchCardsBySetId(setId: string): Promise<UnifiedCard[]> {
  // orderBy="id" et non "number" : voir la note détaillée sur
  // fetchAllCardsByFilter — "number" n'est pas un champ fiablement triable
  // côté pokemontcg.io (pagination instable, cartes en double d'une page à
  // l'autre), alors que "id" (identifiant propre à chaque carte) trie
  // proprement. L'ordre d'affichage réel (par numéro) est de toute façon
  // recalculé côté client, voir sortedCards dans SetChecklistScreen.tsx.
  return fetchAllCardsByFilter(`set.id:"${setId}"`, "id");
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
  options?: { pageSize?: number; page?: number; orderBy?: string }
): Promise<{ cards: UnifiedCard[]; totalCount: number }> {
  const params = new URLSearchParams({ q: filter });
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  if (options?.page) params.set("page", String(options.page));
  if (options?.orderBy) params.set("orderBy", options.orderBy);
  const url = `${BASE_URL}/cards?${params.toString()}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawPokemonCard[];
  return { cards: cards.map(toUnifiedCard), totalCount: json.totalCount ?? cards.length };
}

// 250 est le maximum de cartes que pokemontcg.io renvoie PAR PAGE — pas le
// maximum par set. Certains sets (ex Paradox Rift, Ascended Heroes) dépassent
// 250 cartes une fois les secrètes comptées, et se retrouvaient tronqués avec
// un simple appel à pageSize 250. On boucle donc sur les pages suivantes tant
// que le nombre de cartes UNIQUES récupérées n'atteint pas totalCount.
//
// Piège constaté (set "Ascended Heroes", 295 cartes) : la pagination de
// pokemontcg.io avec orderBy=number n'est PAS stable — deux requêtes
// successives (page 1 puis page 2) peuvent renvoyer des cartes en commun
// (vérifié : page 1 et page 2 se chevauchaient sur des dizaines de cartes).
// D'où l'appel systématique avec orderBy="id" plutôt que "number" côté
// appelants (voir fetchCardsBySetId, searchCardsByNumber) — "id" est
// l'identifiant propre de chaque carte, qui trie correctement et de façon
// stable (vérifié : pages consécutives sans chevauchement). La déduplication
// par id ci-dessous reste en place en filet de sécurité si jamais un autre
// appelant passe un orderBy non fiable, et le garde-fou sur le nombre de
// pages évite une boucle infinie si l'API redevenait instable.
async function fetchAllCardsByFilter(filter: string, orderBy?: string): Promise<UnifiedCard[]> {
  const pageSize = 250;
  const MAX_PAGES = 20;
  const byId = new Map<string, UnifiedCard>();
  let totalCount = Infinity;

  for (let page = 1; page <= MAX_PAGES && byId.size < totalCount; page++) {
    const result = await fetchCardsByFilter(filter, { pageSize, page, orderBy });
    totalCount = result.totalCount;
    if (result.cards.length === 0) break;

    const sizeBefore = byId.size;
    for (const card of result.cards) byId.set(card.id, card);
    // Si une page entière ne rapporte aucune carte nouvelle (API instable
    // qui reboucle sur les mêmes résultats), inutile de continuer.
    if (byId.size === sizeBefore && page > 1) break;
  }

  return Array.from(byId.values());
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
    // Un set entier peut dépasser la limite par défaut (30) et même la
    // limite par page (250, voir fetchAllCardsByFilter) — on récupère donc
    // toutes les pages. orderBy="id" (pas "number", non fiable pour la
    // pagination — voir fetchCardsBySetId ci-dessus et la note sur
    // fetchAllCardsByFilter).
    return fetchAllCardsByFilter(`set.id:"${setId}"`, "id");
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
  for (const { cards } of resultsPerFilter) {
    for (const card of cards) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        merged.push(card);
      }
    }
  }
  return merged;
}
