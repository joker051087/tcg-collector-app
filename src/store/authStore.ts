import { create } from "zustand";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// "unavailable" : Firebase n'est pas configuré (variables d'env manquantes,
// voir src/config/firebase.ts) — la connexion est désactivée proprement
// plutôt que de planter, voir SettingsScreen.tsx.
type AuthStatus = "loading" | "signedIn" | "signedOut" | "unavailable";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  signOut: () => Promise<void>;
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: isFirebaseConfigured ? "loading" : "unavailable",
  user: null,
  signOut: async () => {
    if (auth) await firebaseSignOut(auth);
  },
}));

// Appelé une seule fois au démarrage de l'appli (voir App.tsx) — tient le
// store à jour à chaque connexion/déconnexion, y compris la reconnexion
// automatique au lancement grâce à la persistance AsyncStorage (voir
// src/config/firebase.ts).
export function initAuthListener(): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => {
    useAuthStore.setState({
      status: user ? "signedIn" : "signedOut",
      user: user ? toAuthUser(user) : null,
    });
  });
}
