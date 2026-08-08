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

// Sens inverse : convertit un montant depuis une devise source (ex EUR,
// prix Cardmarket) vers USD, la devise interne de l'app (voir
// src/utils/marketPrice.ts). Renvoie null si le taux n'est pas disponible —
// l'appelant doit alors se rabattre sur une autre source de prix.
export function convertToUsd(
  amount: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number> | null
): number | null {
  if (currency === "USD") return amount;
  if (!rates) return null;
  const rate = rates[currency];
  if (!rate) return null;
  return amount / rate;
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
