import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CardCondition,
  CollectionItem,
  GradingCompany,
  OwnershipType,
  UnifiedCard,
} from "../types";

interface AddItemInput {
  card: UnifiedCard;
  quantity: number;
  condition: CardCondition;
  ownershipType: OwnershipType;
  gradingCompany?: GradingCompany;
  grade?: number;
  purchasePrice?: number;
}

interface PortfolioState {
  items: CollectionItem[];
  addItem: (input: AddItemInput) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              itemId: generateId(),
              cardId: input.card.id,
              card: input.card,
              quantity: input.quantity,
              condition: input.condition,
              ownershipType: input.ownershipType,
              gradingCompany: input.gradingCompany,
              grade: input.grade,
              purchasePrice: input.purchasePrice,
              addedAt: new Date().toISOString(),
            },
          ],
        })),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.itemId !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.itemId === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),
    }),
    {
      name: "tcg-portfolio-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
