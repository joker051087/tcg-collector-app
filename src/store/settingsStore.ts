import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { detectDeviceLanguage, LanguageCode } from "../i18n";
import { CurrencyCode } from "../constants/currencies";

interface SettingsState {
  language: LanguageCode;
  currency: CurrencyCode;
  setLanguage: (language: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: detectDeviceLanguage(),
      currency: "USD",
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set({ language });
      },
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "tcg-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Au redémarrage de l'app, la langue sauvegardée doit être réappliquée
      // à i18next (qui, lui, redémarre toujours sur la langue détectée par
      // défaut avant que ce store ne soit réhydraté depuis le stockage).
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
