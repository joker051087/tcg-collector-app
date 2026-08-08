import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CurrencyCode } from "../constants/currencies";
import { fetchExchangeRates } from "../api/exchangeRates";

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — les taux ne bougent pas assez vite pour justifier plus.

interface ExchangeRatesState {
  rates: Record<CurrencyCode, number> | null;
  lastFetchedAt: number | null;
  loading: boolean;
  /** Récupère de nouveaux taux seulement si le cache est absent ou périmé. */
  ensureFreshRates: () => Promise<void>;
}

export const useExchangeRatesStore = create<ExchangeRatesState>()(
  persist(
    (set, get) => ({
      rates: null,
      lastFetchedAt: null,
      loading: false,

      ensureFreshRates: async () => {
        const { lastFetchedAt, loading } = get();
        const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS;
        if (!isStale || loading) return;

        set({ loading: true });
        try {
          const rates = await fetchExchangeRates();
          set({ rates, lastFetchedAt: Date.now(), loading: false });
        } catch (err) {
          console.error("Erreur de récupération des taux de change:", err);
          // On garde les anciens taux en cache (mieux qu'un prix qui disparaît)
          // et on retentera au prochain appel de ensureFreshRates.
          set({ loading: false });
        }
      },
    }),
    {
      name: "tcg-exchange-rates-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ rates: state.rates, lastFetchedAt: state.lastFetchedAt }),
    }
  )
);
