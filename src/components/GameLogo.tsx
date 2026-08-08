import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Game } from "../types";
import { GAME_LABELS } from "../constants/games";
import { GAME_LOGOS } from "../constants/gameLogos";

interface Props {
  game: Game;
  /** Image spécifique à afficher en priorité (ex : logo/icône de série
   * renvoyé par l'API — voir UnifiedSet.imageUrl). Si absente, on retombe
   * sur le logo du jeu (GAME_LOGOS), puis sur un avatar coloré généré. */
  uri?: string;
  size?: number;
  /** "circle" (par défaut) convient à un logo/icône. "square" (coins
   * arrondis, pas de recadrage en cercle) convient à une vraie photo de
   * produit (ex : visuel de booster One Piece, voir SetChecklistScreen.tsx)
   * — recadrer une photo de boîte en cercle en perdrait une bonne partie. */
  shape?: "circle" | "square";
}

// Une couleur par jeu (13 jeux, 13 couleurs), utilisée comme dernier repli
// quand ni image de série ni logo de jeu ne sont disponibles.
const GAME_COLORS: Record<Game, string> = {
  pokemon: "#ef4444",
  magic: "#f97316",
  yugioh: "#eab308",
  onepiece: "#22c55e",
  lorcana: "#10b981",
  riftbound: "#14b8a6",
  dragonball: "#06b6d4",
  digimon: "#3b82f6",
  fleshandblood: "#6366f1",
  starwarsunlimited: "#8b5cf6",
  unionarena: "#a855f7",
  gundam: "#d946ef",
  finalfantasy: "#ec4899",
};

// Composant partagé pour afficher un repère visuel de jeu/série : utilisé
// sur l'écran d'Accueil (grille "Explorer un jeu") et sur la Checklist
// (chaque série, puis l'écran d'une série précise) — voir HomeScreen.tsx,
// ChecklistHomeScreen.tsx, SetChecklistScreen.tsx.
export default function GameLogo({ game, uri, size = 48, shape = "circle" }: Props) {
  const source = uri ?? GAME_LOGOS[game];
  const borderRadius = shape === "circle" ? size / 2 : size * 0.18;

  if (source) {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius }]}>
        <Image
          source={{ uri: source }}
          style={{ width: size * 0.86, height: size * 0.86 }}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: GAME_COLORS[game] },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{GAME_LABELS[game].charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond blanc systématique derrière chaque logo/icône : certaines images
  // sont transparentes avec des traits sombres (illisibles sur le fond bleu
  // nuit de l'app), d'autres opaques — un fond blanc uniforme garantit la
  // lisibilité dans tous les cas.
  box: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
