import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Optionnel : affiche un libellé différent de la valeur brute (ex: "pokemon" -> "Pokémon"). */
  getLabel?: (option: T) => string;
}

// Sélecteur simple en "chips" pour éviter une dépendance native supplémentaire
// (type @react-native-picker/picker) dans le prototype.
export default function SelectableChips<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {getLabel ? getLabel(option) : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  chipSelected: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  chipText: {
    color: "#d1d5db",
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
