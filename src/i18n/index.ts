import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";

export const SUPPORTED_LANGUAGES = ["fr", "en", "es", "de", "ja", "it", "pt"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ja: "日本語",
  it: "Italiano",
  pt: "Português",
};

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  ja: { translation: ja },
  it: { translation: it },
  pt: { translation: pt },
};

function isSupportedLanguage(code: string): code is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

// Détecte la langue de l'appareil au premier lancement. L'utilisateur peut
// ensuite la changer manuellement dans Réglages (voir settingsStore), ce qui
// prime sur cette détection et est persisté.
export function detectDeviceLanguage(): LanguageCode {
  const deviceLocales = Localization.getLocales();
  const primary = deviceLocales[0]?.languageCode;
  if (primary && isSupportedLanguage(primary)) {
    return primary;
  }
  return "fr";
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  // "v3" utilise les règles de pluriel intégrées à i18next plutôt que
  // l'API Intl.PluralRules — on ne s'en sert pas (aucune clé au pluriel
  // dans nos traductions) et ça évite de dépendre d'une API dont le
  // support est inégal selon les moteurs JS (Hermes sur Android en
  // particulier). Un polyfill testé pour combler ce manque s'est avéré
  // lui-même buggé sur cet environnement, d'où ce choix plus simple et
  // plus robuste.
  compatibilityJSON: "v3",
});

export default i18n;
