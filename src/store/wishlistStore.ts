import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnifiedCard } from "../types";

// Liste de souhaits : cartes qu'on n'a pas encore mais qu'on veut acheter
// (typiquement ajoutées depuis les cartes "manquantes" de la Checklist, ou
// directement depuis une fiche carte). Séparée du portfolio (qui représente
// ce qu'on possède déjà) — mêmes principes de stockage (Zustand + AsyncStorage,
// voir portfolioStore.ts) mais un modèle plus simple : pas de quantité/état/
// prix d'achat, juste "je veux cette carte".
interface WishlistState {
  items: UnifiedCard[];
  addItem: (card: UnifiedCard) => void;
  removeItem: (cardId: string) => void;
  toggleItem: (card: UnifiedCard) => void;
  isInWishlist: (cardId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (card) =>
        set((state) =>
          state.items.some((i) => i.id === card.id) ? state : { items: [...state.items, card] }
        ),

      removeItem: (cardId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== cardId) })),

      toggleItem: (card) =>
        set((state) =>
          state.items.some((i) => i.id === card.id)
            ? { items: state.items.filter((i) => i.id !== card.id) }
            : { items: [...state.items, card] }
        ),

      isInWishlist: (cardId) => get().items.some((i) => i.id === cardId),

      clear: () => set({ items: [] }),
    }),
    {
      name: "tcg-wishlist-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
