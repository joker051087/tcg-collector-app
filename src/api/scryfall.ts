import { UnifiedCard } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
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
  };
}

function resolveImages(raw: RawScryfallCard): { small: string; large: string } {
  if (raw.image_uris) return raw.image_uris;
  const faceImages = raw.card_faces?.[0]?.image_uris;
  if (faceImages) return faceImages;
  return { small: "", large: "" };
}

function resolveMarketPrice(raw: RawScryfallCard): number | undefined {
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

// Recherche par numéro de collection (ex : "1" pour le Black Lotus dans
// Vintage Cube). "cn:" est le champ Scryfall pour le collector number ; sans
// filtre de set, un même numéro existe dans beaucoup d'éditions différentes.
export async function searchCardsByNumber(query: string): Promise<UnifiedCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = encodeURIComponent(`cn:${trimmed} game:paper`);
  const url = `${BASE_URL}/cards?q=${q}`;

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
