import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import GameLogo from "../components/GameLogo";
import { colors, radius } from "../theme/colors";

type Props = NativeStackScreenProps<ChecklistStackParamList, "SetChecklist">;

// Extrait la partie numérique d'un numéro de carte pour un tri "numérique"
// plutôt qu'alphabétique (qui mettrait "10" avant "2") — le numéro est un
// champ libre selon le jeu (ex "025/198" en Pokémon, "42a" en Magic, "SDY-001"
// en Yu-Gi-Oh!, voir types/index.ts). Les cartes sans numéro exploitable sont
// repoussées en fin de liste plutôt que de faire planter le tri.
function cardNumberSortKey(number: string | undefined): [number, string] {
  if (!number) return [Number.POSITIVE_INFINITY, ""];
  const match = number.match(/\d+/);
  return [match ? parseInt(match[0], 10) : Number.POSITIVE_INFINITY, number];
}

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
  const { formatUsdAmount } = useCurrencyFormatter();

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

  // reloadToken : voir ChecklistHomeScreen.tsx pour le même principe (permet
  // au bouton "Réessayer" de redéclencher ce chargement, notamment utile
  // contre le cold-start du backend gratuit Render).
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [game, setId, t, reloadToken]);

  const handleRetry = useCallback(() => setReloadToken((n) => n + 1), []);

  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of portfolioItems) {
      if (item.card.game === game) ids.add(item.cardId);
    }
    return ids;
  }, [portfolioItems, game]);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const [numA, strA] = cardNumberSortKey(a.number);
      const [numB, strB] = cardNumberSortKey(b.number);
      return numA !== numB ? numA - numB : strA.localeCompare(strB);
    });
  }, [cards]);

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
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{t("checklist.retry")}</Text>
        </TouchableOpacity>
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
        data={sortedCards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => {
          const owned = ownedIds.has(item.id);
          const inWishlist = wishlistIds.has(item.id);
          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("CardDetail", { game, cardId: item.id, presetCard: item })
              }
            >
              <View style={styles.cardImageWrap}>
                <Image
                  source={{ uri: item.imageSmall }}
                  style={[styles.cardImage, !owned && styles.cardImageMissing]}
                  contentFit="cover"
                />
                {!owned && (
                  <TouchableOpacity
                    onPress={() => toggleWishlist(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.cardWishlistButton}
                  >
                    <Ionicons
                      name={inWishlist ? "heart" : "heart-outline"}
                      size={15}
                      color={inWishlist ? colors.wishlist : colors.white}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.cardBadge}>
                  <Text style={[styles.cardBadgeText, owned && styles.cardBadgeTextOwned]}>
                    {owned ? t("checklist.owned") : t("checklist.missing")}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardName, !owned && styles.cardNameMissing]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.number ? <Text style={styles.cardNumber}>{`#${item.number}`}</Text> : null}
              {item.marketPriceUsd != null && (
                <Text style={styles.cardPrice}>{formatUsdAmount(item.marketPriceUsd)}</Text>
              )}
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
  retryButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
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
  gridContent: {
    padding: 12,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    marginBottom: 18,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 0.716,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageMissing: {
    opacity: 0.35,
  },
  cardWishlistButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 15, 19, 0.72)",
  },
  cardBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(15, 15, 19, 0.72)",
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textMuted,
  },
  cardBadgeTextOwned: {
    color: colors.success,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: 8,
  },
  cardNameMissing: {
    color: colors.textMuted,
  },
  cardNumber: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    marginTop: 3,
  },
});
