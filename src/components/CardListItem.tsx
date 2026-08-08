import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { UnifiedCard } from "../types";
import { GAME_LABELS } from "../constants/games";
import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";

interface Props {
  card: UnifiedCard;
  onPress: () => void;
  showGameTag?: boolean;
}

export default function CardListItem({ card, onPress, showGameTag }: Props) {
  const { formatUsdAmount } = useCurrencyFormatter();

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Image source={{ uri: card.imageSmall }} style={styles.image} contentFit="contain" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.set} numberOfLines={1}>
          {showGameTag ? `${GAME_LABELS[card.game]} · ` : ""}
          {card.setName}
          {card.number ? ` · #${card.number}` : ""}
        </Text>
        {card.rarity ? <Text style={styles.rarity}>{card.rarity}</Text> : null}
      </View>
      <Text style={styles.price}>
        {card.marketPriceUsd != null ? formatUsdAmount(card.marketPriceUsd) : "—"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  image: {
    width: 46,
    height: 64,
    marginRight: 12,
    borderRadius: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  set: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  rarity: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34d399",
    marginLeft: 8,
  },
});
