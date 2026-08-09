import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { CollectionItem, UnifiedCard } from "../types";

// Un document par utilisateur et par type de donnée (pas une sous-collection
// par carte) : la collection/wishlist d'un utilisateur reste de l'ordre de
// quelques centaines de cartes maximum, donc un seul document (limite
// Firestore : 1 Mo) est largement suffisant et beaucoup plus simple à
// synchroniser qu'une sous-collection carte par carte (pas besoin de gérer
// les suppressions une par une, un simple "setDoc" écrase tout le tableau).
function portfolioDocRef(uid: string) {
  if (!db) throw new Error("Firestore non configuré");
  return doc(db, "users", uid, "data", "portfolio");
}

function wishlistDocRef(uid: string) {
  if (!db) throw new Error("Firestore non configuré");
  return doc(db, "users", uid, "data", "wishlist");
}

export async function fetchCloudPortfolio(uid: string): Promise<CollectionItem[] | null> {
  const snap = await getDoc(portfolioDocRef(uid));
  if (!snap.exists()) return null;
  return (snap.data().items as CollectionItem[]) ?? [];
}

export async function pushCloudPortfolio(uid: string, items: CollectionItem[]): Promise<void> {
  await setDoc(portfolioDocRef(uid), { items, updatedAt: Date.now() });
}

export async function fetchCloudWishlist(uid: string): Promise<UnifiedCard[] | null> {
  const snap = await getDoc(wishlistDocRef(uid));
  if (!snap.exists()) return null;
  return (snap.data().items as UnifiedCard[]) ?? [];
}

export async function pushCloudWishlist(uid: string, items: UnifiedCard[]): Promise<void> {
  await setDoc(wishlistDocRef(uid), { items, updatedAt: Date.now() });
}
