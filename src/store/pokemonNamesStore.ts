import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchPokemonNameTranslations, PokemonNameEntry } from "../api/pokeApiNames";

// Les noms de Pokémon changent rarement (seulement quand une nouvelle
// génération sort) — un cache d'une semaine est largement suffisant et évite
// de re-télécharger ~1300 correspondances à chaque recherche.
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface PokemonNamesState {
  pokeApiLanguage: string | null;
  entries: PokemonNameEntry[];
  lastFetchedAt: number | null;
  loading: boolean;
  /** Télécharge (ou rafraîchit si périmé) le dictionnaire pour cette langue PokeAPI. */
  ensureNamesFor: (pokeApiLanguage: string) => Promise<void>;
  /** Cherche les noms anglais dont le nom localisé contient ce texte (recherche locale, instantanée). */
  translateToEnglish: (query: string) => string[];
}

export const usePokemonNamesStore = create<PokemonNamesState>()(
  persist(
    (set, get) => ({
      pokeApiLanguage: null,
      entries: [],
      lastFetchedAt: null,
      loading: false,

      ensureNamesFor: async (pokeApiLanguage) => {
        const { pokeApiLanguage: current, lastFetchedAt, loading } = get();
        const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS;
        if (loading) return;
        if (current === pokeApiLanguage && !isStale) return;

        set({ loading: true });
        try {
          const entries = await fetchPokemonNameTranslations(pokeApiLanguage);
          set({ entries, pokeApiLanguage, lastFetchedAt: Date.now(), loading: false });
        } catch (err) {
          console.error("Erreur de récupération des noms Pokémon traduits:", err);
          set({ loading: false });
        }
      },

      translateToEnglish: (query) => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return [];
        const { entries } = get();
        const matches = entries.filter((e) => e.localized.toLowerCase().includes(trimmed));
        return Array.from(new Set(matches.map((m) => m.english)));
      },
    }),
    {
      name: "tcg-pokemon-names-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pokeApiLanguage: state.pokeApiLanguage,
        entries: state.entries,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
