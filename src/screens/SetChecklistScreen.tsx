import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ChecklistStackParamList } from "../navigation/types";
import { fetchSetCards } from "../api";
import { findSetBoosterImage } from "../api/sealedProducts";
import { TCGAPI_GAMES } from "../constants/games";
import { UnifiedCard } from "../types";
import { usePortfolioStore } from "../store/portfolioStore";
import { useWishlistStore } from "../store/wishlistStore";
import GameLogo from "../components/GameLogo";
import { colors, radius } from "../theme/colors";

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
  // Pour les jeux tcgapi.dev, setImageUrl (voir tcgApiGames.ts) est une image
  // "représentative" quelconque du set (parfois une carte, pas forcément le
  // booster) — on va chercher spécifiquement le visuel du booster/paquet
  // parmi les produits scellés de la série, à la demande (une série à la
  // fois, jamais toute la liste, voir findSetBoosterImage). Si ça ne trouve
  // rien, on garde setImageUrl tel quel.
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>(setImageUrl);
  const wishlistCards = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const wishlistIds = useMemo(() => new Set(wishlistCards.map((c) => c.id)), [wishlistCards]);

  useEffect(() => {
    navigation.setOptions({ title: setName });
  }, [navigation, setName]);

  useEffect(() => {
    if (!TCGAPI_GAMES.includes(game)) return;
    let cancelled = false;
    findSetBoosterImage(game, setName).then((url) => {
      if (!cancelled && url) setHeroImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [game, setName]);

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
        <ActivityIndicator color={colors.accent} />
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
            uri={heroImageUrl}
            size={TCGAPI_GAMES.includes(game) ? 64 : 40}
            shape={TCGAPI_GAMES.includes(game) ? "square" : "circle"}
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
          const inWishlist = wishlistIds.has(item.id);
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
              {!owned && (
                <TouchableOpacity
                  onPress={() => toggleWishlist(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.wishlistButton}
                >
                  <Ionicons
                    name={inWishlist ? "heart" : "heart-outline"}
                    size={18}
                    color={inWishlist ? colors.wishlist : colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
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
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  progressSection: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    fontWeight: "500",
    color: colors.textPrimary,
  },
  rowNameMissing: {
    color: colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeOwned: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.accent,
    marginLeft: 8,
  },
  badgeMissing: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
    marginLeft: 8,
  },
  wishlistButton: {
    marginLeft: 10,
  },
});
