import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuration Firebase — vient d'un projet Firebase créé par l'utilisateur
// (voir GUIDE_FIREBASE.md à la racine du projet pour la marche à suivre
// complète). Ces valeurs ne sont PAS secrètes au sens strict (elles sont
// visibles dans le bundle de n'importe quelle appli Firebase publiée), mais
// on les garde quand même hors du code source via .env, par cohérence avec
// EXPO_PUBLIC_API_BASE_URL (voir src/config/api.ts) et pour ne pas lier ce
// dépôt à un projet Firebase précis.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Vrai seulement si les variables d'env Firebase ont été renseignées — permet
// au reste de l'appli de désactiver proprement la connexion/sync (au lieu de
// planter) tant que l'utilisateur n'a pas terminé la config Firebase, voir
// authStore.ts.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

// initializeAuth (pas getAuth) + getReactNativePersistence : nécessaire côté
// React Native/Expo pour que la session reste connectée après un redémarrage
// de l'appli (sinon Firebase Auth ne persiste qu'en mémoire). Voir la doc
// officielle Firebase, section "Auth state persistence" pour React Native.
export const auth: Auth | null = app
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : null;

export const db = app ? getFirestore(app) : null;
