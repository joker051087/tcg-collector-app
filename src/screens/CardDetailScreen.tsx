import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SearchStackParamList } from "../navigation/types";
import { getCardById } from "../api";
import { CARD_CONDITIONS, CardCondition, GradingCompany, OwnershipType, UnifiedCard } from "../types";
import { GAME_LABELS } from "../constants/games";
import { CONDITION_LABEL_KEYS, OWNERSHIP_TYPE_LABEL_KEYS } from "../constants/labels";
import { getNetRealisticPrice } from "../utils/pricing";
import { MARKETPLACE_LINKS } from "../utils/marketplaceLinks";
import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import { usePortfolioStore } from "../store/portfolioStore";
import { useWishlistStore } from "../store/wishlistStore";
import SelectableChips from "../components/SelectableChips";

type Props = NativeStackScreenProps<SearchStackParamList, "CardDetail">;

const OWNERSHIP_TYPES: OwnershipType[] = ["raw", "graded", "sealed"];
const GRADING_COMPANIES: GradingCompany[] = ["PSA", "CGC", "BGS", "SGC"];

export default function CardDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { formatUsdAmount } = useCurrencyFormatter();
  const { cardId, game, presetCard } = route.params;
  const [card, setCard] = useState<UnifiedCard | null>(presetCard ?? null);
  const [loading, setLoading] = useState(!presetCard);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState<CardCondition>("Near Mint");
  // Un produit scellé (presetCard vient de la recherche "Produits scellés")
  // est par défaut ajouté avec le type "Scellée" plutôt que "Brute" — c'est
  // presque toujours ce que l'utilisateur veut dans ce cas, il peut toujours
  // changer.
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(presetCard ? "sealed" : "raw");
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>("PSA");
  const [grade, setGrade] = useState("10");

  const addItem = usePortfolioStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  // Sélecteur dérivé (pas juste la fonction isInWishlist du store) pour que
  // l'écran se re-rende bien quand on coche/décoche — card peut être null au
  // tout premier rendu (avant chargement), d'où la garde.
  const inWishlist = useWishlistStore((state) => (card ? state.items.some((i) => i.id === card.id) : false));

  useEffect(() => {
    // presetCard : la carte vient déjà de la recherche (cas des produits
    // scellés, voir navigation/types.ts) — pas besoin de la re-charger via
    // getCardById, qui ne connaît d'ailleurs pas ces id.
    if (presetCard) {
      setCard(presetCard);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getCardById(game, cardId)
      .then((result) => {
        if (!cancelled) setCard(result);
      })
      .catch((err) => {
        console.error("Erreur de chargement de la carte:", err);
        if (!cancelled) setError(t("common.errorLoadingCard"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game, cardId, presetCard]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (error || !card) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? t("common.cardNotFound")}</Text>
      </View>
    );
  }

  const marketPrice = card.marketPriceUsd;
  const netPrice = getNetRealisticPrice(card.marketPriceUsd);

  function handleAdd() {
    const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
    const parsedGrade = ownershipType === "graded" ? parseFloat(grade) || undefined : undefined;

    addItem({
      card: card!,
      quantity: parsedQuantity,
      condition,
      ownershipType,
      gradingCompany: ownershipType === "graded" ? gradingCompany : undefined,
      grade: parsedGrade,
    });

    Alert.alert(t("cardDetail.addedAlertTitle"), t("cardDetail.addedAlertMessage", { name: card!.name }));
  }

  function handleOpenMarketplace(getUrl: (card: UnifiedCard) => string) {
    Linking.openURL(getUrl(card!));
  }

  function handleToggleWishlist() {
    toggleWishlist(card!);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: card.imageLarge }} style={styles.image} contentFit="contain" />

      <Text style={styles.gameTag}>{GAME_LABELS[card.game]}</Text>
      <View style={styles.nameRow}>
        <Text style={[styles.name, styles.nameFlex]}>{card.name}</Text>
        <TouchableOpacity
          onPress={handleToggleWishlist}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={inWishlist ? "heart" : "heart-outline"}
            size={26}
            color={inWishlist ? "#f472b6" : "#9ca3af"}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.set}>
        {card.setName}
        {card.number ? ` · #${card.number}` : ""} {card.rarity ? `· ${card.rarity}` : ""}
      </Text>

      <View style={styles.priceRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t("cardDetail.marketPrice")}</Text>
          <Text style={styles.priceValue}>
            {marketPrice != null ? formatUsdAmount(marketPrice) : "—"}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t("cardDetail.netPrice")}</Text>
          <Text style={styles.priceValueNet}>{netPrice != null ? formatUsdAmount(netPrice) : "—"}</Text>
        </View>
      </View>
      <Text style={styles.disclaimer}>{t("cardDetail.disclaimer")}</Text>

      <View style={styles.marketplaceRow}>
        {MARKETPLACE_LINKS.map((marketplace) => (
          <TouchableOpacity
            key={marketplace.id}
            style={styles.marketplaceButton}
            onPress={() => handleOpenMarketplace(marketplace.getUrl)}
          >
            <Text style={styles.marketplaceButtonText}>{t(marketplace.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("cardDetail.addToCollection")}</Text>

      <Text style={styles.fieldLabel}>{t("cardDetail.type")}</Text>
      <SelectableChips
        options={OWNERSHIP_TYPES}
        value={ownershipType}
        onChange={setOwnershipType}
        getLabel={(o) => t(OWNERSHIP_TYPE_LABEL_KEYS[o])}
      />

      <Text style={styles.fieldLabel}>{t("cardDetail.condition")}</Text>
      <SelectableChips
        options={CARD_CONDITIONS}
        value={condition}
        onChange={setCondition}
        getLabel={(c) => t(CONDITION_LABEL_KEYS[c])}
      />

      {ownershipType === "graded" && (
        <>
          <Text style={styles.fieldLabel}>{t("cardDetail.gradingCompany")}</Text>
          <SelectableChips options={GRADING_COMPANIES} value={gradingCompany} onChange={setGradingCompany} />

          <Text style={styles.fieldLabel}>{t("cardDetail.grade")}</Text>
          <TextInput
            style={styles.numberInput}
            value={grade}
            onChangeText={setGrade}
            keyboardType="decimal-pad"
          />
        </>
      )}

      <Text style={styles.fieldLabel}>{t("cardDetail.quantity")}</Text>
      <TextInput
        style={styles.numberInput}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>{t("cardDetail.addToCollection")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  error: {
    color: "#f87171",
  },
  image: {
    width: "100%",
    height: 320,
    alignSelf: "center",
  },
  gameTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34d399",
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f9fafb",
  },
  nameFlex: {
    flex: 1,
  },
  set: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  priceBox: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderRadius: 10,
    padding: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: "#9ca3af",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
    marginTop: 4,
  },
  priceValueNet: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34d399",
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 6,
  },
  marketplaceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  marketplaceButton: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  marketplaceButtonText: {
    color: "#f59e0b",
    fontWeight: "700",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
    marginTop: 24,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 14,
    marginBottom: 6,
  },
  numberInput: {
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 100,
  },
  addButton: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
