import { CurrencyCode, CURRENCY_SYMBOLS } from "../constants/currencies";

export function convertFromUsd(
  amountUsd: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number> | null
): number {
  if (currency === "USD" || !rates) return amountUsd;
  const rate = rates[currency];
  if (!rate) return amountUsd;
  return amountUsd * rate;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  try {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
  } catch {
    // Filet de sécurité si Intl ne reconnaît pas la devise sur cet environnement.
    return `${CURRENCY_SYMBOLS[currency] ?? ""}${amount.toFixed(2)}`;
  }
}
