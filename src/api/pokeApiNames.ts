import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";

// PokeAPI (https://pokeapi.co/) est gratuite, sans clé, et connaît le nom de
// chaque Pokémon dans une trentaine de langues. pokemontcg.io, lui, n'indexe
// les cartes que par leur nom ANGLAIS, quelle que soit la langue de l'app.
// Le backend local (server/) interroge l'API GraphQL bêta de PokeAPI et met
// en cache 7 jours la correspondance "nom anglais <-> nom localisé" pour
// tous les Pokémon d'une langue donnée — ce qui permet ensuite une recherche
// 100% locale et instantanée côté app (voir pokemonNamesStore.ts).
const PROXY_URL = `${API_BASE_URL}/proxy/pokemon-names`;

interface PokeApiNameRow {
  name: string;
  pokemon_species_id: number;
  pokemon_v2_language: { name: string };
}

interface GraphQLResponse {
  data?: {
    pokemon_v2_pokemonspeciesname: PokeApiNameRow[];
  };
  errors?: { message: string }[];
}

export interface PokemonNameEntry {
  english: string;
  localized: string;
}

export async function fetchPokemonNameTranslations(
  pokeApiLanguage: string
): Promise<PokemonNameEntry[]> {
  const url = `${PROXY_URL}?lang=${encodeURIComponent(pokeApiLanguage)}`;
  const res = await fetchWithRetry(url);

  if (!res.ok) {
    throw new Error(`PokeAPI GraphQL error: ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse;
  if (json.errors?.length) {
    throw new Error(`PokeAPI GraphQL error: ${json.errors[0].message}`);
  }

  const rows = json.data?.pokemon_v2_pokemonspeciesname ?? [];

  // Regroupe les lignes (une par langue) par espèce pour ne garder que les
  // paires anglais/localisé complètes.
  const bySpecies = new Map<number, { english?: string; localized?: string }>();
  for (const row of rows) {
    const entry = bySpecies.get(row.pokemon_species_id) ?? {};
    if (row.pokemon_v2_language.name === "en") {
      entry.english = row.name;
    } else {
      entry.localized = row.name;
    }
    bySpecies.set(row.pokemon_species_id, entry);
  }

  const result: PokemonNameEntry[] = [];
  for (const entry of bySpecies.values()) {
    if (entry.english && entry.localized) {
      result.push({ english: entry.english, localized: entry.localized });
    }
  }
  return result;
}
