import { useMemo } from "react";
import { Alert, Linking, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChecklistStackParamList } from "../navigation/types";
import { useWishlistStore } from "../store/wishlistStore";
import { GAME_LABELS } from "../constants/games";
import { Game, UnifiedCard } from "../types";
import { MARKETPLACE_LINKS } from "../utils/marketplaceLinks";
import { buildMassEntryText, MASS_ENTRY_URL } from "../utils/massEntry";
import { buildCardmarketWantsText, getCardmarketWantsUrl, supportsCardmarketWantsImport } from "../utils/cardmarketWants";

type Props = NativeStackScreenProps<ChecklistStackParamList, "Wishlist">;

interface Section {
  title: string;
  game: Game;
  data: UnifiedCard[];
}

// Achat groupé : on ne peut construire une liste "Mass Entry" que pour un
// seul jeu à la fois (TCGplayer ne propose qu'une seule ligne de produits à
// la fois, voir massEntry.ts) — la liste de souhaits est donc regroupée par
// jeu, avec un bouton "copier" par groupe plutôt qu'un seul bouton global.
export default function WishlistScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);

  const sections = useMemo<Section[]>(() => {
    const byGame = new Map<Game, UnifiedCard[]>();
    for (const item of items) {
      const list = byGame.get(item.game) ?? [];
      list.push(item);
      byGame.set(item.game, list);
    }
    return Array.from(byGame.entries()).map(([game, data]) => ({
      title: GAME_LABELS[game],
      game,
      data,
    }));
  }, [items]);

  async function handleCopyForTcgplayer(cards: UnifiedCard[]) {
    const text = buildMassEntryText(cards);
    await Clipboard.setStringAsync(text);
    Alert.alert(
      t("wishlist.copiedTitle"),
      t("wishlist.copiedMessageTcgplayer"),
      [
        { text: t("wishlist.later"), style: "cancel" },
        { text: t("wishlist.openTcgplayer"), onPress: () => Linking.openURL(MASS_ENTRY_URL) },
      ]
    );
  }

  async function handleCopyForCardmarket(game: Game, cards: UnifiedCard[]) {
    const text = buildCardmarketWantsText(cards);
    await Clipboard.setStringAsync(text);
    Alert.alert(
      t("wishlist.copiedTitle"),
      t("wishlist.copiedMessageCardmarket"),
      [
        { text: t("wishlist.later"), style: "cancel" },
        { text: t("wishlist.openCardmarket"), onPress: () => Linking.openURL(getCardmarketWantsUrl(game)) },
      ]
    );
  }

  function handleOpenCard(card: UnifiedCard) {
    navigation.navigate("CardDetail", { game: card.game, cardId: card.id, presetCard: card });
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{t("wishlist.emptyTitle")}</Text>
        <Text style={styles.emptySubtitle}>{t("wishlist.emptySubtitle")}</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {section.title} ({section.data.length})
          </Text>
          <View style={styles.copyButtonRow}>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopyForTcgplayer(section.data)}
            >
              <Text style={styles.copyButtonText}>{t("wishlist.copyForTcgplayer")}</Text>
            </TouchableOpacity>
            {supportsCardmarketWantsImport(section.game) && (
              <TouchableOpacity
                style={[styles.copyButton, styles.copyButtonCardmarket]}
                onPress={() => handleCopyForCardmarket(section.game, section.data)}
              >
                <Text style={[styles.copyButtonText, styles.copyButtonTextCardmarket]}>
                  {t("wishlist.copyForCardmarket")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => handleOpenCard(item)}>
          <Image source={{ uri: item.imageSmall }} style={styles.image} contentFit="contain" />
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.setName}
              {item.number ? ` · #${item.number}` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>{t("wishlist.remove")}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      ListHeaderComponent={<Text style={styles.disclaimer}>{t("wishlist.disclaimer")}</Text>}
      ListFooterComponent={
        <Text style={styles.marketplaceHint}>
          {t("wishlist.marketplaceHint", {
            names: MARKETPLACE_LINKS.map((m) => t(m.labelKey)).join(" / "),
          })}
        </Text>
      }
    />
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  disclaimer: {
    fontSize: 12,
    color: "#9ca3af",
    padding: 14,
    paddingBottom: 4,
  },
  sectionHeader: {
    backgroundColor: "#1f2937",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f9fafb",
  },
  copyButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  copyButtonText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
  copyButtonCardmarket: {
    borderColor: "#38bdf8",
  },
  copyButtonTextCardmarket: {
    color: "#38bdf8",
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
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  rowMeta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
  },
  marketplaceHint: {
    fontSize: 11,
    color: "#6b7280",
    padding: 14,
    textAlign: "center",
  },
});
