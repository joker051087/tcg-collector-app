// Palette centralisée de l'appli ("collector premium" : fond charbon profond,
// accent ambre/or qui évoque les cartes rares/holo). Objectif : que chaque
// écran importe ces tokens plutôt que d'écrire des couleurs en dur, pour que
// toute future refonte se fasse en un seul endroit. Voir aussi les
// incohérences relevées avant refonte (deux gris de texte différents, deux
// bordures différentes, deux couleurs de cœur "inactif") — ce fichier les
// unifie volontairement.
export const colors = {
  // Fond de page et surfaces (cartes, inputs, sections)
  bg: "#0f0f13",
  surface: "#1c1c22",
  surfaceAlt: "#242430",
  border: "#2c2c36",

  // Texte
  textPrimary: "#f5f5f7",
  textSecondary: "#a3a3ad",
  textMuted: "#6b6b76",

  // Accent principal (prix, CTA, onglet actif, barre de progression)
  accent: "#f2a93b",
  accentOn: "#2c1c04",
  accentSoft: "rgba(242, 169, 59, 0.16)",

  // Valeur nette réaliste / états "complet" (distinct de l'accent principal)
  success: "#3ecf8e",
  successSoft: "rgba(62, 207, 142, 0.16)",

  // Erreurs, actions destructrices ("Retirer")
  danger: "#ef5d6f",

  // Cœur de la wishlist
  wishlist: "#ec6a91",

  white: "#ffffff",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
