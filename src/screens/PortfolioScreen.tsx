import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { usePortfolioStore } from "../store/portfolioStore";
import { computePortfolioTotals, getNetRealisticPrice } from "../utils/pricing";
import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import { GAME_LABELS } from "../constants/games";
import { CONDITION_LABEL_KEYS, OWNERSHIP_TYPE_LABEL_KEYS } from "../constants/labels";
import { CollectionItem } from "../types";

export default function PortfolioScreen() {
  const { t } = useTranslation();
  const { formatUsdAmount } = useCurrencyFormatter();
  const items = usePortfolioStore((state) => state.items);
  const removeItem = usePortfolioStore((state) => state.removeItem);
  const totals = computePortfolioTotals(items);

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{t("portfolio.emptyTitle")}</Text>
        <Text style={styles.emptySubtitle}>{t("portfolio.emptySubtitle")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t("portfolio.marketValue")}</Text>
          <Text style={styles.summaryValue}>{formatUsdAmount(totals.marketValue)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t("portfolio.netValue")}</Text>
          <Text style={styles.summaryValueNet}>{formatUsdAmount(totals.netValue)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t("portfolio.cardCount")}</Text>
          <Text style={styles.summaryValue}>{totals.cardCount}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId}
        renderItem={({ item }) => (
          <PortfolioRow item={item} onRemove={() => removeItem(item.itemId)} />
        )}
      />
    </View>
  );
}

function PortfolioRow({ item, onRemove }: { item: CollectionItem; onRemove: () => void }) {
  const { t } = useTranslation();
  const { formatUsdAmount } = useCurrencyFormatter();
  const market = item.card.marketPriceUsd;
  const net = getNetRealisticPrice(item.card.marketPriceUsd);

  return (
    <View style={styles.row}>
      <Image source={{ uri: item.card.imageSmall }} style={styles.image} contentFit="contain" />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.card.name} {item.quantity > 1 ? `×${item.quantity}` : ""}
        </Text>
        <Text style={styles.rowMeta}>
          {GAME_LABELS[item.card.game]} ·{" "}
          {item.ownershipType === "graded"
            ? `${item.gradingCompany} ${item.grade ?? ""}`
            : item.ownershipType === "sealed"
            ? t(OWNERSHIP_TYPE_LABEL_KEYS.sealed)
            : t(CONDITION_LABEL_KEYS[item.condition])}
        </Text>
        <Text style={styles.rowMeta}>
          {t("portfolio.market")} {market != null ? formatUsdAmount(market) : "—"} ·{" "}
          {t("portfolio.net")} {net != null ? formatUsdAmount(net) : "—"}
        </Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Text style={styles.removeButtonText}>{t("portfolio.remove")}</Text>
      </TouchableOpacity>
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
  summary: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f9fafb",
    marginTop: 4,
  },
  summaryValueNet: {
    fontSize: 15,
    fontWeight: "700",
    color: "#34d399",
    marginTop: 4,
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
});
