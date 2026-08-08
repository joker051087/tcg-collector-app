import { useExchangeRatesStore } from "../store/exchangeRatesStore";
import { convertToUsd } from "./currency";

// Cardmarket (EUR) est la source de prix privilégiée dans les 3 clients API
// (voir src/api/pokemonTcg.ts, scryfall.ts, ygoprodeck.ts) : c'est la
// marketplace la plus pertinente pour nos utilisateurs, et ses prix peuvent
// différer nettement de TCGplayer (marché US, en dollars) pour une même
// carte — c'est cette différence qui donnait l'impression de prix
// "incohérents" dans l'app.
//
// marketPriceUsd reste en USD dans tout le reste de l'app (voir
// useCurrencyFormatter) — on convertit donc ce prix EUR en USD ici via les
// taux de change déjà en cache (rafraîchis en tâche de fond au passage). Si
// les taux ne sont pas encore chargés, on renvoie undefined : l'appelant se
// rabat alors sur une source déjà en USD (ex TCGplayer) plutôt que d'afficher
// un nombre non converti.
export function resolveEurPriceAsUsd(eurAmount: number): number | undefined {
  useExchangeRatesStore.getState().ensureFreshRates();
  const rates = useExchangeRatesStore.getState().rates;
  const usd = convertToUsd(eurAmount, "EUR", rates);
  return usd ?? undefined;
}
