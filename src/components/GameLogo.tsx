import { useState } from "react";
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

// Composant partagé pour afficher un repère visuel de jeu/série : utilisé
// sur l'écran d'Accueil (grille "Explorer un jeu") et sur la Checklist
// (chaque série, puis l'écran d'une série précise) — voir HomeScreen.tsx,
// ChecklistHomeScreen.tsx, SetChecklistScreen.tsx.
//
// Repli unique (carré blanc + nom du jeu en texte, taille de police
// adaptative via adjustsFontSizeToFit) utilisé à la fois quand aucune URL de
// logo n'est configurée (Flesh and Blood, Union Arena, Gundam — aucun logo
// exploitable trouvé, voir gameLogos.ts) ET quand une URL configurée échoue
// à charger (logo Wikipedia renommé/supprimé, ex constaté sur Dragon Ball) :
// mieux vaut un texte lisible dans tous les cas qu'un rond coloré à une
// lettre ou un carré vide.
export default function GameLogo({ game, uri, size = 48, shape = "circle" }: Props) {
  const source = uri ?? GAME_LOGOS[game];
  const borderRadius = shape === "circle" ? size / 2 : size * 0.18;
  const [imageFailed, setImageFailed] = useState(false);

  if (source && !imageFailed) {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius }]}>
        <Image
          source={{ uri: source }}
          style={{ width: size * 0.86, height: size * 0.86 }}
          contentFit="contain"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  const label = GAME_LABELS[game];
  // Un nom en un seul mot (ex "Gundam") n'a aucun espace où RN peut couper
  // proprement — sur 2 lignes, il coupait le mot en plein milieu ("Gun" /
  // "dam") au lieu de rétrécir la police. En le forçant sur 1 seule ligne,
  // adjustsFontSizeToFit doit rétrécir jusqu'à ce que ça tienne, plutôt que
  // de couper. Les noms à plusieurs mots (ex "Flesh and Blood") gardent 2
  // lignes, qui se coupent naturellement à un espace.
  const hasMultipleWords = label.includes(" ");

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius, paddingHorizontal: 3 }]}>
      <Text
        style={[styles.fallbackNameText, { fontSize: Math.max(size * 0.3, 14) }]}
        numberOfLines={hasMultipleWords ? 2 : 1}
        adjustsFontSizeToFit
        minimumFontScale={0.35}
      >
        {label}
      </Text>
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
  fallbackNameText: {
    color: "#0f0f13",
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
