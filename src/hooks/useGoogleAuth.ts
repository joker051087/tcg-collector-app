import { useCallback, useState } from "react";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";

// Remplace l'ancienne implémentation basée sur expo-auth-session (flux
// navigateur) : Google la bloque désormais dans les vraies builds Android
// avec "Erreur 400 : invalid_request", quel que soit le client OAuth
// configuré — c'est documenté comme dépréciée par Expo lui-même (voir
// https://docs.expo.dev/guides/google-authentication/), qui recommande cette
// librairie native à la place. Elle utilise le SDK Google Sign-In natif
// (via Play Services), pas un aller-retour navigateur, donc pas de problème
// de redirect_uri ni de "politique OAuth 2.0".
//
// Nécessite un vrai build natif (dev client / EAS Build) — ne fonctionne pas
// dans Expo Go. webClientId (PAS androidClientId) est ce qui permet
// d'obtenir un idToken exploitable par Firebase (voir GUIDE_FIREBASE.md).
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (webClientId) {
  GoogleSignin.configure({ webClientId });
}

export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSignIn = isFirebaseConfigured && Boolean(webClientId);

  const signIn = useCallback(async () => {
    if (!auth || !canSignIn) return;
    setError(null);
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      // L'utilisateur a fermé la fenêtre sans se connecter — pas une erreur.
      if (!isSuccessResponse(response)) return;

      const idToken = response.data.idToken;
      if (!idToken) throw new Error("Google n'a renvoyé aucun jeton d'identification.");

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      // SIGN_IN_CANCELLED / IN_PROGRESS : l'utilisateur a annulé ou a déjà une
      // tentative en cours — pas la peine d'afficher une erreur pour ça.
      if (
        isErrorWithCode(err) &&
        (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS)
      ) {
        return;
      }
      console.error("Erreur de connexion Google:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSigningIn(false);
    }
  }, [canSignIn]);

  return {
    canSignIn,
    isSigningIn,
    error,
    signIn,
  };
}
