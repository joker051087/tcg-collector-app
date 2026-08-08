import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ChecklistStackParamList } from "../navigation/types";
import { fetchSetCards } from "../api";
import { getSealedImageForSet } from "../api/tcgApiGames";
import { UnifiedCard } from "../types";
import { usePortfolioStore } from "../store/portfolioStore";
import GameLogo from "../components/GameLogo";

type Props = NativeStackScreenProps<ChecklistStackParamList, "SetChecklist">;

// Écran 2/2 de la Checklist : toutes les cartes de la série choisie, avec un
// badge "possédée"/"manquante" déterminé en comparant aux cartes déjà dans la
// collection (comparaison par id de carte — voir note dans
// src/api/ygoprodeck.ts sur les limites de cette approche pour Yu-Gi-Oh!,
// dont l'id n'est pas spécifique à un tirage/édition).
export default function SetChecklistScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { game, setId, setName, setImageUrl } = route.params;
  const [cards, setCards] = useState<UnifiedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const portfolioItems = usePortfolioStore((state) => state.items);
  // One Piece n'a pas d'image de série via tcgapi.dev (contrairement à
  // Pokémon/Magic) — on va chercher le visuel de son booster/display à la
  // demande, uniquement pour la série ouverte (voir tcgApiGames.ts,
  // getSealedImageForSet, sur pourquoi ce n'est PAS fait pour toute la liste
  // d'un coup : quota tcgapi.dev partagé par toute l'app).
  const [boosterImageUrl, setBoosterImageUrl] = useState<string | undefined>(setImageUrl);

  useEffect(() => {
    navigation.setOptions({ title: setName });
  }, [navigation, setName]);

  useEffect(() => {
    if (game !== "onepiece" || setImageUrl) return;
    let cancelled = false;
    getSealedImageForSet(game, setId, setName).then((url) => {
      if (!cancelled && url) setBoosterImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [game, setId, setName, setImageUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSetCards(game, setId)
      .then((result) => {
        if (!cancelled) setCards(result);
      })
      .catch((err) => {
        console.error("Erreur de chargement de la série:", err);
        if (!cancelled) setError(t("checklist.errorLoadingSet"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game, setId, t]);

  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of portfolioItems) {
      if (item.card.game === game) ids.add(item.cardId);
    }
    return ids;
  }, [portfolioItems, game]);

  const ownedCount = cards.filter((c) => ownedIds.has(c.id)).length;
  const total = cards.length;
  const progressRatio = total > 0 ? ownedCount / total : 0;
  const percent = Math.round(progressRatio * 100);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <GameLogo
            game={game}
            uri={boosterImageUrl}
            size={game === "onepiece" ? 56 : 40}
            shape={game === "onepiece" ? "square" : "circle"}
          />
          <View style={styles.progressTextBlock}>
            <Text style={styles.progressText}>
              {t("checklist.progress", { owned: ownedCount, total, percent })}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const owned = ownedIds.has(item.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("CardDetail", { game, cardId: item.id, presetCard: item })
              }
            >
              <Image
                source={{ uri: item.imageSmall }}
                style={[styles.image, !owned && styles.imageMissing]}
                contentFit="contain"
              />
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, !owned && styles.rowNameMissing]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.number ? `#${item.number}` : ""}
                </Text>
              </View>
              <Text style={owned ? styles.badgeOwned : styles.badgeMissing}>
                {owned ? t("checklist.owned") : t("checklist.missing")}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  error: {
    color: "#f87171",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  progressSection: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  progressText: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#34d399",
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  image: {
    width: 40,
    height: 56,
    marginRight: 12,
    borderRadius: 4,
  },
  imageMissing: {
    opacity: 0.35,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  rowNameMissing: {
    color: "#6b7280",
  },
  rowMeta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  badgeOwned: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34d399",
    marginLeft: 8,
  },
  badgeMissing: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    marginLeft: 8,
  },
});
