import { create } from "zustand";
import { deleteUser, onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../config/firebase";

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
  deleteAccount: () => Promise<void>;
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

  // Exigé par les règles de l'App Store (5.1.1(v)) quand une appli propose la
  // création de compte : l'utilisateur doit pouvoir supprimer son compte et
  // ses données depuis l'appli, pas seulement par email. On supprime d'abord
  // les documents Firestore (le compte Auth n'existant plus après deleteUser,
  // les règles de sécurité — voir firestore.rules — bloqueraient l'accès
  // ensuite), puis le compte Firebase Auth lui-même. Si la session est trop
  // ancienne, Firebase refuse deleteUser avec le code "auth/requires-recent-
  // login" — remonté tel quel à l'appelant (voir SettingsScreen.tsx) pour
  // lui proposer de se reconnecter avant de réessayer.
  deleteAccount: async () => {
    if (!auth?.currentUser) return;
    const uid = auth.currentUser.uid;

    if (db) {
      await Promise.all([
        deleteDoc(doc(db, "users", uid, "data", "portfolio")).catch(() => {}),
        deleteDoc(doc(db, "users", uid, "data", "wishlist")).catch(() => {}),
      ]);
    }

    await deleteUser(auth.currentUser);
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
