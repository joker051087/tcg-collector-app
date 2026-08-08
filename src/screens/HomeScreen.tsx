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
import { GAME_LABELS, SUPPORTED_GAMES } from "../constants/games";
import GameLogo from "../components/GameLogo";

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t("home.greeting")}</Text>
        <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="albums-outline" size={36} color="#34d399" />
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("home.exploreGames")}</Text>
        <View style={styles.gamesGrid}>
          {SUPPORTED_GAMES.map((g) => (
            <Pressable
              key={g}
              style={styles.gameTile}
              onPress={() =>
                navigation.navigate("SearchTab", { screen: "SearchHome", params: { initialGame: g } })
              }
            >
              <GameLogo game={g} size={48} />
              <Text style={styles.gameLabel} numberOfLines={2}>
                {GAME_LABELS[g]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
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
        <Ionicons name={icon} size={20} color="#34d399" />
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
    backgroundColor: "#111827",
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
    fontWeight: "700",
    color: "#f9fafb",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
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
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
    marginTop: 4,
  },
  statValueNet: {
    fontSize: 16,
    fontWeight: "700",
    color: "#34d399",
    marginTop: 4,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#1f2937",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
    marginTop: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 6,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyCtaText: {
    color: "#ffffff",
    fontWeight: "700",
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
    backgroundColor: "#1f2937",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    color: "#d1d5db",
    marginTop: 6,
    fontWeight: "600",
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f9fafb",
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
    borderRadius: 6,
    backgroundColor: "#1f2937",
  },
  recentName: {
    fontSize: 11,
    color: "#d1d5db",
    marginTop: 4,
    textAlign: "center",
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 4,
  },
  gameTile: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  gameLabel: {
    fontSize: 10.5,
    color: "#d1d5db",
    marginTop: 6,
    textAlign: "center",
  },
});
