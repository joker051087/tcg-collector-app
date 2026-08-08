import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SearchStackParamList } from "../navigation/types";
import { searchCards, SearchMode } from "../api";
import { Game, UnifiedCard } from "../types";
import { GAME_LABELS, GAME_PLACEHOLDER_KEYS, SUPPORTED_GAMES } from "../constants/games";
import { useSettingsStore } from "../store/settingsStore";
import CardListItem from "../components/CardListItem";
import SelectableChips from "../components/SelectableChips";

type Props = NativeStackScreenProps<SearchStackParamList, "SearchHome">;

const SEARCH_MODES: SearchMode[] = ["name", "number"];
const SEARCH_MODE_LABEL_KEYS: Record<SearchMode, string> = {
  name: "search.modeName",
  number: "search.modeNumber",
};

export default function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [game, setGame] = useState<Game>("pokemon");
  const [mode, setMode] = useState<SearchMode>("name");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const cards = await searchCards(game, query, language, mode);
        setResults(cards);
      } catch (err) {
        console.error("Erreur de recherche:", err);
        setError(t("common.errorLoadingResults"));
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, game, language, mode]);

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

      <View style={styles.modeSelector}>
        <SelectableChips
          options={SEARCH_MODES}
          value={mode}
          onChange={setMode}
          getLabel={(m) => t(SEARCH_MODE_LABEL_KEYS[m])}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder={
          mode === "number"
            ? t(game === "pokemon" ? "search.placeholderNumberPokemon" : "search.placeholderNumber")
            : t(GAME_PLACEHOLDER_KEYS[game])
        }
        placeholderTextColor="#6b7280"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && <ActivityIndicator style={styles.loader} color="#34d399" />}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && query.trim() && results.length === 0 && (
        <Text style={styles.empty}>
          {t("search.emptyResults", { game: GAME_LABELS[game], query })}
        </Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardListItem
            card={item}
            onPress={() => navigation.navigate("CardDetail", { game, cardId: item.id })}
          />
        )}
        keyboardShouldPersistTaps="handled"
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
  modeSelector: {
    paddingHorizontal: 12,
    paddingTop: 8,
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
  empty: {
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 16,
  },
});
