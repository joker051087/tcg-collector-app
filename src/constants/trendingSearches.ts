import { Game } from "../types";

// Sélection éditoriale (pas de vraie télémétrie de recherche côté serveur
// pour l'instant) utilisée par la section "Cartes du moment" de l'accueil
// (voir HomeScreen.tsx) : quelques recherches par nom, choisies parmi les
// personnages/cartes les plus emblématiques de chaque jeu, pour donner un
// aperçu de cartes réelles (vraies images, vrais prix) sans dépendre d'une
// vraie liste de tendances. À réviser de temps en temps pour rester
// pertinent.
export const TRENDING_SEARCHES: { game: Game; query: string }[] = [
  { game: "pokemon", query: "Charizard" },
  { game: "pokemon", query: "Pikachu" },
  { game: "onepiece", query: "Luffy" },
  { game: "onepiece", query: "Shanks" },
  { game: "lorcana", query: "Elsa" },
  { game: "lorcana", query: "Mickey Mouse" },
];
