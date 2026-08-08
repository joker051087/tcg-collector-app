import { CardCondition, OwnershipType } from "../types";

// Les valeurs internes (CardCondition, OwnershipType) restent en anglais dans
// le code — ce sont des identifiants stables, pas du texte affiché. Ces clés
// pointent vers src/i18n/locales/*.json (namespaces "condition"/"ownership")
// pour l'affichage, quelle que soit la langue choisie par l'utilisateur.

export const CONDITION_LABEL_KEYS: Record<CardCondition, string> = {
  Mint: "condition.mint",
  "Near Mint": "condition.nearMint",
  Excellent: "condition.excellent",
  Good: "condition.good",
  "Light Played": "condition.lightPlayed",
  Played: "condition.played",
  Poor: "condition.poor",
};

export const OWNERSHIP_TYPE_LABEL_KEYS: Record<OwnershipType, string> = {
  raw: "ownership.raw",
  graded: "ownership.graded",
  sealed: "ownership.sealed",
};
