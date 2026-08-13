import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList, TabParamList } from "../navigation/types";
import { usePortfolioStore } from "../store/portfolioStore";
import { computePortfolioTotals } from "../utils/pricing";
import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import { GAME_LABELS } from "../constants/games";
import { TRENDING_SEARCHES } from "../constants/trendingSearches";
import { searchCards } from "../api";
import { UnifiedCard } from "../types";
import { colors, radius } from "../theme/colors";

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, "HomeMain">,
  BottomTabScreenProps<TabParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { formatUsdAmount } = useCurrencyFormatter();
  const items = usePortfolioStore((state) => state.items);
  const totals = computePortfolioTotals(items);

  const recentItems = [...items]
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 8);

  // "Cartes du moment" : recherches éditoriales par jeu (voir
  // trendingSearches.ts), pas une vraie liste de tendances basée sur les
  // recherches réelles des utilisateurs — on n'a pas encore de télémétrie
  // côté serveur pour ça. Quelques résultats par recherche, fusionnés et
  // dédupliqués par id de carte.
  const [trendingCards, setTrendingCards] = useState<UnifiedCard[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      TRENDING_SEARCHES.map(({ game, query }) =>
        searchCards(game, query).catch(() => [] as UnifiedCard[])
      )
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: UnifiedCard[] = [];
      for (const cards of results) {
        for (const card of cards.slice(0, 3)) {
          if (!seen.has(card.id)) {
            seen.add(card.id);
            merged.push(card);
          }
        }
      }
      setTrendingCards(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t("home.greeting")}</Text>
        <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="albums-outline" size={36} color={colors.accent} />
          <Text style={styles.emptyTitle}>{t("home.emptyTitle")}</Text>
          <Text style={styles.emptySubtitle}>{t("home.emptySubtitle")}</Text>
          <Pressable
            style={styles.emptyCta}
            onPress={() => navigation.navigate("SearchTab", { screen: "SearchHome", params: undefined })}
          >
            <Text style={styles.emptyCtaText}>{t("home.emptyCta")}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t("portfolio.marketValue")}</Text>
            <Text style={styles.statValue}>{formatUsdAmount(totals.marketValue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t("portfolio.netValue")}</Text>
            <Text style={styles.statValueNet}>{formatUsdAmount(totals.netValue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t("portfolio.cardCount")}</Text>
            <Text style={styles.statValue}>{totals.cardCount}</Text>
          </View>
        </View>
      )}

      <View style={styles.quickActions}>
        <QuickAction
          icon="search"
          label={t("tabs.search")}
          onPress={() => navigation.navigate("SearchTab", { screen: "SearchHome", params: undefined })}
        />
        <QuickAction
          icon="checkmark-done"
          label={t("tabs.checklist")}
          onPress={() => navigation.navigate("ChecklistTab", { screen: "ChecklistHome" })}
        />
        <QuickAction
          icon="albums"
          label={t("tabs.portfolio")}
          onPress={() => navigation.navigate("PortfolioTab")}
        />
      </View>

      {recentItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.recentlyAdded")}</Text>
          <FlatList
            data={recentItems}
            keyExtractor={(item) => item.itemId}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recentCard}
                onPress={() =>
                  navigation.navigate("CardDetail", {
                    game: item.card.game,
                    cardId: item.card.id,
                    presetCard: item.card,
                  })
                }
              >
                <Image
                  source={{ uri: item.card.imageSmall }}
                  style={styles.recentImage}
                  contentFit="contain"
                />
                <Text style={styles.recentName} numberOfLines={1}>
                  {item.card.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {trendingCards.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.trendingCards")}</Text>
          <FlatList
            data={trendingCards}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recentCard}
                onPress={() =>
                  navigation.navigate("CardDetail", {
                    game: item.game,
                    cardId: item.id,
                    presetCard: item,
                  })
                }
              >
                <Image source={{ uri: item.imageSmall }} style={styles.recentImage} contentFit="contain" />
                <Text style={styles.recentName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.trendingGameTag} numberOfLines={1}>
                  {GAME_LABELS[item.game]}
                </Text>
                {item.marketPriceUsd != null && (
                  <Text style={styles.trendingPrice}>{formatUsdAmount(item.marketPriceUsd)}</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      )}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: 4,
  },
  statValueNet: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.success,
    marginTop: 4,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyCtaText: {
    color: colors.accentOn,
    fontWeight: "500",
    fontSize: 14,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "500",
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recentList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  recentCard: {
    width: 88,
  },
  recentImage: {
    width: 88,
    height: 122,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  recentName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  trendingGameTag: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
    textAlign: "center",
  },
  trendingPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    marginTop: 2,
    textAlign: "center",
  },
});
