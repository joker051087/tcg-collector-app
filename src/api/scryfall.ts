import { UnifiedCard } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { resolveEurPriceAsUsd } from "../utils/marketPrice";
import { API_BASE_URL } from "../config/api";

// Passe désormais par le backend local (server/), qui met les résultats en
// cache et se charge d'identifier l'appli auprès de Scryfall (headers
// User-Agent/Accept, voir server/index.js) — plus la peine de le faire ici.
const BASE_URL = `${API_BASE_URL}/proxy/magic`;

interface RawScryfallCard {
  id: string;
  name: string;
  set_name: string;
  collector_number: string;
  rarity?: string;
  image_uris?: { small: string; large: string };
  // Les cartes recto-verso n'ont pas `image_uris` à la racine, mais un
  // tableau `card_faces`, chaque face ayant ses propres image_uris.
  card_faces?: { image_uris?: { small: string; large: string } }[];
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    eur?: string | null;
    eur_foil?: string | null;
  };
}

function resolveImages(raw: RawScryfallCard): { small: string; large: string } {
  if (raw.image_uris) return raw.image_uris;
  const faceImages = raw.card_faces?.[0]?.image_uris;
  if (faceImages) return faceImages;
  return { small: "", large: "" };
}

// Cardmarket (EUR) est privilégié sur TCGplayer (USD) — voir
// src/utils/marketPrice.ts. Scryfall fournit directement les deux (prices.eur
// vient de Cardmarket, prices.usd de TCGplayer).
function resolveMarketPrice(raw: RawScryfallCard): number | undefined {
  const eur = raw.prices?.eur ?? raw.prices?.eur_foil;
  if (eur) {
    const parsedEur = parseFloat(eur);
    if (!Number.isNaN(parsedEur)) {
      const usd = resolveEurPriceAsUsd(parsedEur);
      if (usd != null) return usd;
    }
  }

  const usd = raw.prices?.usd ?? raw.prices?.usd_foil;
  if (!usd) return undefined;
  const parsed = parseFloat(usd);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Les URLs d'image Scryfall incluent un paramètre de cache-busting sans clé
// (ex: "?1783948539"). Sur Android, le chargeur d'image natif (OkHttp/Fresco)
// échoue avec une erreur HTTP 400 sur ce genre d'URL en HTTP/2, alors que les
// navigateurs s'en accommodent très bien. On retire donc la query string —
// elle n'est pas nécessaire pour charger l'image.
function stripQueryString(url: string): string {
  return url.split("?")[0];
}

function toUnifiedCard(raw: RawScryfallCard): UnifiedCard {
  const images = resolveImages(raw);
  return {
    id: raw.id,
    game: "magic",
    name: raw.name,
    setName: raw.set_name,
    number: raw.collector_number,
    rarity: raw.rarity,
    imageSmall: stripQueryString(images.small),
    imageLarge: stripQueryString(images.large),
    marketPriceUsd: resolveMarketPrice(raw),
  };
}

export async function searchCards(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // game:paper exclut les impressions numériques uniquement (MTGO/Arena),
  // qui n'ont souvent ni image ni prix marché exploitables ici.
  const q = encodeURIComponent(`name:"${trimmed}" game:paper`);
  const url = `${BASE_URL}/cards?q=${q}`;

  const res = await fetchWithRetry(url);
  if (res.status === 404) {
    // Scryfall renvoie 404 (pas un tableau vide) quand rien ne correspond.
    return [];
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scryfall API error: ${res.status} ${body}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawScryfallCard[];
  return cards.map(toUnifiedCard);
}

export async function getCardById(id: string): Promise<UnifiedCard> {
  const res = await fetchWithRetry(`${BASE_URL}/cards/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scryfall API error: ${res.status} ${body}`);
  }
  const json = (await res.json()) as RawScryfallCard;
  return toUnifiedCard(json);
}

// Trois formats reconnus (comme pour Pokémon, voir pokemonTcg.ts) :
//   - "42"       -> numéro de collection seul
//   - "WAR 42"   -> code de set + numéro
//   - "WAR"      -> code de set seul (parcourt tout le set)
// Les codes de set Scryfall peuvent contenir des chiffres (ex "2xm", "40k"),
// et certains numéros de collection ont un suffixe lettre (ex "42a") — d'où
// des regex un peu plus permissives que côté Pokémon.
type ParsedMagicQuery =
  | { type: "number"; number: string; setCode?: string }
  | { type: "set"; setCode: string };

function parseMagicNumberQuery(raw: string): ParsedMagicQuery | null {
  const trimmed = raw.trim();

  const withNumber = trimmed.match(/^(?:([a-zA-Z0-9]{2,6})\s+)?(\d+[a-zA-Z]?)$/);
  if (withNumber) {
    const [, setCode, number] = withNumber;
    return { type: "number", number, setCode: setCode?.toLowerCase() };
  }

  const setOnly = trimmed.match(/^[a-zA-Z0-9]{2,6}$/);
  if (setOnly) {
    return { type: "set", setCode: trimmed.toLowerCase() };
  }

  return null;
}

async function fetchCardsByFilter(
  filter: string,
  options?: { order?: string; dir?: string }
): Promise<UnifiedCard[]> {
  const params = new URLSearchParams({ q: filter });
  if (options?.order) params.set("order", options.order);
  if (options?.dir) params.set("dir", options.dir);
  const url = `${BASE_URL}/cards?${params.toString()}`;

  const res = await fetchWithRetry(url);
  if (res.status === 404) {
    return [];
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scryfall API error: ${res.status} ${body}`);
  }
  const json = await res.json();
  const cards = (json.data ?? []) as RawScryfallCard[];
  return cards.map(toUnifiedCard);
}

// Recherche par numéro de collection, ou par set entier si seul un code de
// set est tapé (ex : "WAR" liste tout War of the Spark). "cn:" est le champ
// Scryfall pour le collector number, "set:" pour le code de set ; sans
// filtre de set, un même numéro existe dans beaucoup d'éditions différentes.
export async function searchCardsByNumber(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsed = parseMagicNumberQuery(trimmed);

  if (parsed?.type === "set") {
    // "order=set" trie par set puis par numéro de collection à l'intérieur
    // du set — parcours naturel pour browser une édition entière.
    return fetchCardsByFilter(`set:${parsed.setCode} game:paper`, { order: "set", dir: "asc" });
  }

  const parts = [`cn:${parsed?.type === "number" ? parsed.number : trimmed}`];
  if (parsed?.type === "number" && parsed.setCode) {
    parts.push(`set:${parsed.setCode}`);
  }
  parts.push("game:paper");

  return fetchCardsByFilter(parts.join(" "));
}
