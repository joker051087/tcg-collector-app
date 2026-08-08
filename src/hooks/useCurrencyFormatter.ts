import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useExchangeRatesStore } from "../store/exchangeRatesStore";
import { convertFromUsd, formatCurrency } from "../utils/currency";

/**
 * Convertit et formate un montant en USD (format natif de toutes nos sources
 * de prix) dans la devise choisie par l'utilisateur dans Réglages. Déclenche
 * aussi, en arrière-plan, un rafraîchissement des taux de change si le cache
 * est périmé (voir exchangeRatesStore, cache 24h).
 */
export function useCurrencyFormatter() {
  const currency = useSettingsStore((state) => state.currency);
  const rates = useExchangeRatesStore((state) => state.rates);
  const ensureFreshRates = useExchangeRatesStore((state) => state.ensureFreshRates);

  useEffect(() => {
    ensureFreshRates();
  }, [ensureFreshRates]);

  function formatUsdAmount(amountUsd: number): string {
    const converted = convertFromUsd(amountUsd, currency, rates);
    return formatCurrency(converted, currency);
  }

  return { formatUsdAmount, currency };
}
