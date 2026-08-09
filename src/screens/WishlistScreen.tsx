import { useMemo } from "react";
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChecklistStackParamList } from "../navigation/types";
import { useWishlistStore } from "../store/wishlistStore";
import { GAME_LABELS } from "../constants/games";
import { Game, UnifiedCard } from "../types";
import { MARKETPLACE_LINKS } from "../utils/marketplaceLinks";

type Props = NativeStackScreenProps<ChecklistStackParamList, "Wishlist">;

interface Section {
  title: string;
  game: Game;
  data: UnifiedCard[];
}

// Suivi des cartes manquantes qu'on veut acheter (voir wishlistStore.ts),
// regroupé par jeu. L'achat groupé via TCGplayer Mass Entry / Cardmarket
// Wants a été retiré (trop peu fiable en pratique — noms/séries de nos
// sources pas toujours reconnus par ces outils tiers, voir historique) : on
// s'appuie ici uniquement sur les liens de recherche individuels par carte
// (fiables car basés sur une recherche, pas une correspondance exacte), déjà
// utilisés sur la fiche carte (CardDetailScreen).
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
  sectionHeader: {
    backgroundColor: "#1f2937",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f9fafb",
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
