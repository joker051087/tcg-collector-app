import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../store/settingsStore";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from "../i18n";
import { SUPPORTED_CURRENCIES } from "../constants/currencies";
import SelectableChips from "../components/SelectableChips";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <SelectableChips
          options={SUPPORTED_LANGUAGES}
          value={language}
          onChange={setLanguage}
          getLabel={(code) => LANGUAGE_LABELS[code]}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.currency")}</Text>
        <SelectableChips options={SUPPORTED_CURRENCIES} value={currency} onChange={setCurrency} />
      </View>
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
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 10,
  },
});
