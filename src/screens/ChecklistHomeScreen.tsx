import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ChecklistStackParamList } from "../navigation/types";
import { listSets } from "../api";
import { Game, UnifiedSet } from "../types";
import { GAME_LABELS, SUPPORTED_GAMES } from "../constants/games";
import SelectableChips from "../components/SelectableChips";

type Props = NativeStackScreenProps<ChecklistStackParamList, "ChecklistHome">;

// Écran 1/2 de la Checklist : choisir un jeu, puis une série dans la liste
// (recherche par nom en filtrant côté client — la liste complète des séries
// d'un jeu est mise en cache 30 jours côté serveur, donc peu coûteuse à
// charger en entier une fois par jeu, voir server/index.js).
export default function ChecklistHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [game, setGame] = useState<Game>("pokemon");
  const [sets, setSets] = useState<UnifiedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSets(game)
      .then((result) => {
        if (!cancelled) setSets(result);
      })
      .catch((err) => {
        console.error("Erreur de chargement des séries:", err);
        if (!cancelled) setError(t("checklist.errorLoadingSets"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game, t]);

  const filteredSets = sets.filter((s) => s.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.gameSelector}>
        <SelectableChips
          options={SUPPORTED_GAMES}
          value={game}
          onChange={setGame}
          getLabel={(g) => GAME_LABELS[g]}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder={t("checklist.searchSetPlaceholder")}
        placeholderTextColor="#6b7280"
        value={filter}
        onChangeText={setFilter}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && <ActivityIndicator style={styles.loader} color="#34d399" />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={filteredSets}
        keyExtractor={(item, index) => `${item.id}-${item.name}-${index}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("SetChecklist", { game, setId: item.id, setName: item.name })
            }
          >
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.cardCount != null && (
              <Text style={styles.rowCount}>{t("checklist.cardsCount", { count: item.cardCount })}</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  gameSelector: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  input: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    fontSize: 15,
  },
  loader: {
    marginTop: 16,
  },
  error: {
    color: "#f87171",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#f3f4f6",
    marginRight: 8,
  },
  rowCount: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
