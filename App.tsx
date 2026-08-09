import "./src/i18n";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { initAuthListener } from "./src/store/authStore";
import { initSync } from "./src/services/syncService";

export default function App() {
  // Démarré une seule fois pour toute l'appli : initAuthListener tient
  // authStore à jour (connexion/déconnexion Google, voir authStore.ts),
  // initSync s'appuie dessus pour synchroniser collection/wishlist avec
  // Firestore quand un compte est connecté (voir services/syncService.ts).
  // Les deux ne font rien si Firebase n'est pas configuré (voir
  // src/config/firebase.ts) — sans danger de laisser en place avant que la
  // config Firebase soit terminée.
  useEffect(() => {
    const unsubscribeAuth = initAuthListener();
    const unsubscribeSync = initSync();
    return () => {
      unsubscribeAuth();
      unsubscribeSync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
