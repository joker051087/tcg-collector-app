import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";

// Nécessaire pour que la fenêtre de connexion Google se ferme correctement
// et redonne la main à l'appli (sinon elle peut rester ouverte après la
// connexion) — appelé une seule fois au niveau module, comme recommandé par
// la doc expo-auth-session.
WebBrowser.maybeCompleteAuthSession();

// Connexion Google compatible Expo Go (pas besoin d'un build natif/EAS) :
// expo-auth-session ouvre le navigateur pour l'écran de connexion Google
// standard, puis on échange le jeton obtenu contre une session Firebase.
// Les 3 client ID (web/iOS/Android) viennent d'un projet Google Cloud/
// Firebase créé par l'utilisateur — voir GUIDE_FIREBASE.md. Seul le web
// client ID est strictement nécessaire pour tester dans Expo Go ; les deux
// autres ne servent que pour un futur build natif autonome (EAS Build).
export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  // expo-auth-session exige un identifiant correspondant à la plateforme en
  // cours (Android/iOS/Web) et plante l'appli au montage si celui-ci est
  // absent — même si l'utilisateur n'a jamais cliqué sur "Se connecter".
  // Tant qu'il n'existe pas de client ID Android/iOS dédié (nécessaire
  // seulement pour un futur build natif EAS, voir GUIDE_FIREBASE.md), on
  // retombe sur le web client ID pour éviter le crash ; canSignIn (plus bas)
  // continue de désactiver proprement le bouton tant que rien n'est configuré.
  const fallbackClientId = webClientId ?? iosClientId ?? androidClientId ?? "expo-auth-session-unconfigured";

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: webClientId ?? fallbackClientId,
    iosClientId: iosClientId ?? fallbackClientId,
    androidClientId: androidClientId ?? fallbackClientId,
  });

  useEffect(() => {
    if (response?.type !== "success" || !auth) return;
    const idToken = response.params?.id_token;
    if (!idToken) return;

    setIsSigningIn(true);
    setError(null);
    const credential = GoogleAuthProvider.credential(idToken);
    signInWithCredential(auth, credential)
      .catch((err) => {
        console.error("Erreur de connexion Google:", err);
        setError(err.message ?? String(err));
      })
      .finally(() => setIsSigningIn(false));
  }, [response]);

  const canSignIn = isFirebaseConfigured && Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) && !!request;

  return {
    canSignIn,
    isSigningIn,
    error,
    signIn: () => promptAsync(),
  };
}
