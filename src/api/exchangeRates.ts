import { CurrencyCode } from "../constants/currencies";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { API_BASE_URL } from "../config/api";

// Passe désormais par le backend local (server/), qui met les taux en cache
// 24h. Base USD car c'est la devise native de toutes nos sources de prix de
// cartes (Pokémon TCG API, Scryfall, YGOPRODeck renvoient des prix en USD).
const RATES_URL = `${API_BASE_URL}/proxy/exchange-rates`;

export async function fetchExchangeRates(): Promise<Record<CurrencyCode, number>> {
  const res = await fetchWithRetry(RATES_URL);
  if (!res.ok) {
    throw new Error(`Exchange rate API error: ${res.status}`);
  }
  const json = await res.json();
  if (json.result !== "success" || !json.rates) {
    throw new Error("Exchange rate API returned an unexpected payload");
  }
  return json.rates as Record<CurrencyCode, number>;
}
