import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SearchStackParamList } from "../navigation/types";
import { searchCards, searchSealedProducts, SearchMode } from "../api";
import { Game, UnifiedCard } from "../types";
import { GAME_LABELS, GAME_PLACEHOLDER_KEYS, SUPPORTED_GAMES, TCGAPI_GAMES } from "../constants/games";
import { useSettingsStore } from "../store/settingsStore";
import CardListItem from "../components/CardListItem";
import SelectableChips from "../components/SelectableChips";
import { colors, radius } from "../theme/colors";

type Props = NativeStackScreenProps<SearchStackParamList, "SearchHome">;

const SEARCH_MODES: SearchMode[] = ["name", "number"];
const SEARCH_MODE_LABEL_KEYS: Record<SearchMode, string> = {
  name: "search.modeName",
  number: "search.modeNumber",
};

// Cartes à l'unité (comportement historique) vs produits scellés (coffrets,
// displays, boosters — voir src/api/sealedProducts.ts). Deux sources de
// données complètement différentes, d'où un toggle séparé du mode
// nom/numéro, qui ne s'applique qu'aux cartes.
type ResultType = "cards" | "sealed";
const RESULT_TYPES: ResultType[] = ["cards", "sealed"];
const RESULT_TYPE_LABEL_KEYS: Record<ResultType, string> = {
  cards: "search.resultTypeCards",
  sealed: "search.resultTypeSealed",
};

export default function SearchScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [game, setGame] = useState<Game>(route.params?.initialGame ?? "pokemon");
  const [resultType, setResultType] = useState<ResultType>("cards");
  const [mode, setMode] = useState<SearchMode>("name");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // tcgapi.dev (One Piece, Lorcana, Riftbound, Dragon Ball) n'a pas de filtre
  // par numéro de carte — voir src/api/tcgApiGames.ts. Le sélecteur
  // Nom/Numéro est masqué pour ces jeux (plus bas), on force donc le mode à
  // "name" pour éviter un mode "number" fantôme si l'utilisateur avait changé
  // de mode avant de changer de jeu.
  const isTcgApiGame = TCGAPI_GAMES.includes(game);

  useEffect(() => {
    if (isTcgApiGame && mode !== "name") setMode("name");
  }, [isTcgApiGame, mode]);

  // Si on arrive depuis la grille "Explorer un jeu" de l'Accueil alors que
  // l'onglet Recherche existe déjà (donc pas de remount), il faut appliquer
  // le nouveau jeu manuellement.
  useEffect(() => {
    if (route.params?.initialGame) setGame(route.params.initialGame);
  }, [route.params?.initialGame]);

  // Retour du Scanner en mode lecture de texte (voir ScannerScreen.tsx) :
  // préremplit la recherche avec le texte lu sur la carte plutôt que de
  // forcer l'utilisateur à le retaper.
  useEffect(() => {
    if (route.params?.initialQuery) setQuery(route.params.initialQuery);
  }, [route.params?.initialQuery]);

  // Bouton scanner dans l'en-tête — ouvre l'appareil photo avec le jeu
  // actuellement sélectionné, voir ScannerScreen.tsx.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Scanner", { initialGame: game })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.scannerHeaderButton}
        >
          <Ionicons name="camera-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, game]);

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
        const cards =
          resultType === "sealed"
            ? await searchSealedProducts(game, query)
            : await searchCards(game, query, language, mode);
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
  }, [query, game, language, mode, resultType]);

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
          options={RESULT_TYPES}
          value={resultType}
          onChange={setResultType}
          getLabel={(r) => t(RESULT_TYPE_LABEL_KEYS[r])}
        />
      </View>

      {resultType === "cards" && !isTcgApiGame && (
        <View style={styles.modeSelector}>
          <SelectableChips
            options={SEARCH_MODES}
            value={mode}
            onChange={setMode}
            getLabel={(m) => t(SEARCH_MODE_LABEL_KEYS[m])}
          />
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder={
          resultType === "sealed"
            ? t("search.placeholderSealed")
            : mode === "number"
              ? t(game === "pokemon" ? "search.placeholderNumberPokemon" : "search.placeholderNumber")
              : t(GAME_PLACEHOLDER_KEYS[game])
        }
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && <ActivityIndicator style={styles.loader} color={colors.accent} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && query.trim() && results.length === 0 && (
        <Text style={styles.empty} numberOfLines={4}>
          {t("search.emptyResults", {
            game: GAME_LABELS[game],
            // Une recherche très longue (ex. texte lu par le scanner) ne
            // doit pas faire déborder ce message hors de l'écran — voir
            // src/api/scanner.ts pour la limite côté scanner elle-même.
            query: query.length > 80 ? `${query.slice(0, 80)}…` : query,
          })}
        </Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardListItem
            card={item}
            onPress={() =>
              navigation.navigate("CardDetail", {
                game,
                cardId: item.id,
                // On a déjà toutes les infos depuis la recherche — inutile de
                // les re-charger via getCardById (voir navigation/types.ts).
                // Indispensable pour les produits scellés et les nouveaux TCG
                // via tcgapi.dev (id propres à ce service), et ça évite un
                // appel réseau superflu pour les autres.
                presetCard: item,
              })
            }
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
    backgroundColor: colors.bg,
  },
  scannerHeaderButton: {
    marginRight: 8,
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
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 15,
  },
  loader: {
    marginTop: 16,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
});
