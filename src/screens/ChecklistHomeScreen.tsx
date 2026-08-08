import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ChecklistStackParamList } from "../navigation/types";
import { listSets } from "../api";
import { findSetBoosterImage } from "../api/sealedProducts";
import { Game, UnifiedSet } from "../types";
import { GAME_LABELS, SUPPORTED_GAMES, TCGAPI_GAMES } from "../constants/games";
import SelectableChips from "../components/SelectableChips";
import GameLogo from "../components/GameLogo";
import { usePortfolioStore } from "../store/portfolioStore";

type Props = NativeStackScreenProps<ChecklistStackParamList, "ChecklistHome">;

// En dehors du composant : FlatList veut un objet stable (sinon avertissement
// "changing viewabilityConfig on the fly is not supported").
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 40 };

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
  const portfolioItems = usePortfolioStore((state) => state.items);

  // Image "générique" d'une série (voir tcgApiGames.ts, listSets) parfois
  // trompeuse — pas forcément le booster (peut être une carte au hasard).
  // On va chercher le vrai visuel du booster à la demande, uniquement pour
  // les séries qui défilent réellement à l'écran (voir onViewabledItemsChanged
  // plus bas) : faire ça pour les 70+ séries d'un jeu d'un coup dépasserait
  // largement la quota tcgapi.dev (100 requêtes/jour, partagée par toute
  // l'app) — voir aussi SetChecklistScreen.tsx pour le même principe.
  const [boosterImages, setBoosterImages] = useState<Record<string, string>>({});
  const fetchedSetIds = useRef<Set<string>>(new Set());
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
    fetchedSetIds.current = new Set();
    setBoosterImages({});
  }, [game]);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: UnifiedSet }[] }) => {
      const currentGame = gameRef.current;
      if (!TCGAPI_GAMES.includes(currentGame)) return;
      for (const { item } of viewableItems) {
        if (fetchedSetIds.current.has(item.id)) continue;
        fetchedSetIds.current.add(item.id);
        findSetBoosterImage(currentGame, item.name).then((url) => {
          if (url) setBoosterImages((prev) => ({ ...prev, [item.id]: url }));
        });
      }
    }
  ).current;

  // % de possession par série, calculé uniquement à partir de la collection
  // déjà en mémoire (aucun appel réseau supplémentaire — voir demande
  // utilisateur : un % par série dans la liste ne doit pas ralentir le
  // chargement). On compte les cartes possédées par nom de série plutôt que
  // par id, car UnifiedCard ne stocke que setName (le nom affiché, ex "Écarlate
  // et Violet 151") — pas l'id interne du set. Ce nom vient de la même API que
  // la liste des séries, donc la correspondance est fiable en pratique.
  const ownedCountBySetName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of portfolioItems) {
      if (item.card.game !== game) continue;
      counts.set(item.card.setName, (counts.get(item.card.setName) ?? 0) + 1);
    }
    return counts;
  }, [portfolioItems, game]);

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
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        renderItem={({ item }) => {
          const owned = Math.min(ownedCountBySetName.get(item.name) ?? 0, item.cardCount ?? Infinity);
          const percent =
            item.cardCount && item.cardCount > 0 ? Math.round((owned / item.cardCount) * 100) : null;
          const boosterImage = boosterImages[item.id];
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("SetChecklist", {
                  game,
                  setId: item.id,
                  setName: item.name,
                  setImageUrl: boosterImage ?? item.imageUrl,
                })
              }
            >
              <GameLogo
                game={game}
                uri={boosterImage ?? item.imageUrl}
                size={36}
                shape={TCGAPI_GAMES.includes(game) ? "square" : "circle"}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.cardCount != null && (
                  <Text style={styles.rowCount}>
                    {t("checklist.cardsCount", { count: item.cardCount })}
                  </Text>
                )}
              </View>
              {percent != null && (
                <Text style={[styles.percentBadge, percent >= 100 && styles.percentBadgeComplete]}>
                  {percent}%
                </Text>
              )}
            </Pressable>
          );
        }}
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
  rowInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  rowCount: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  percentBadge: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    minWidth: 42,
    textAlign: "right",
  },
  percentBadgeComplete: {
    color: "#34d399",
  },
});
