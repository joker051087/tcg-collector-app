import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
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
        <Text style={styles.sectionTitle}>{t("settings.account")}</Text>
        <AccountSection />
      </View>

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

// Connexion Google + statut de synchronisation — voir authStore.ts,
// useGoogleAuth.ts et services/syncService.ts. Isolé dans son propre
// composant pour ne pas re-render tout SettingsScreen à chaque changement
// d'état de connexion.
function AccountSection() {
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { canSignIn, isSigningIn, error, signIn } = useGoogleAuth();

  if (status === "unavailable") {
    return <Text style={styles.accountHint}>{t("settings.accountUnavailable")}</Text>;
  }

  if (status === "loading") {
    return <ActivityIndicator color="#34d399" style={styles.accountLoader} />;
  }

  if (status === "signedIn" && user) {
    return (
      <View style={styles.accountRow}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(user.displayName ?? user.email ?? "?")[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>
            {user.displayName ?? user.email}
          </Text>
          <Text style={styles.accountSynced}>{t("settings.accountSynced")}</Text>
        </View>
        <TouchableOpacity onPress={() => signOut()} style={styles.signOutButton}>
          <Text style={styles.signOutButtonText}>{t("settings.signOut")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.signInButton, !canSignIn && styles.signInButtonDisabled]}
        onPress={() => signIn()}
        disabled={!canSignIn || isSigningIn}
      >
        {isSigningIn ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text style={styles.signInButtonText}>{t("settings.signInWithGoogle")}</Text>
        )}
      </TouchableOpacity>
      {!canSignIn && <Text style={styles.accountHint}>{t("settings.accountUnavailable")}</Text>}
      {error && <Text style={styles.accountError}>{error}</Text>}
      <Text style={styles.accountHint}>{t("settings.accountHint")}</Text>
    </View>
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
  accountLoader: {
    marginVertical: 8,
  },
  accountHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },
  accountError: {
    fontSize: 12,
    color: "#f87171",
    marginTop: 8,
  },
  signInButton: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2937",
    borderRadius: 10,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#34d399",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "600",
  },
  accountSynced: {
    color: "#34d399",
    fontSize: 11,
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signOutButtonText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
  },
});
