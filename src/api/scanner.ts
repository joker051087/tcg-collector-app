// Client pour les deux routes backend du scanner (voir server/index.js,
// /scan/vision et /scan/ocr, et GUIDE_SCANNER.md pour la configuration des
// clés). Deux méthodes de reconnaissance selon le jeu (voir
// SCRYDEX_VISION_GAMES, src/constants/games.ts) :
//   - Vision : la photo identifie directement la carte (nom, série, image,
//     prix si disponible) — utilisé pour les 6 jeux couverts par Scrydex.
//   - OCR : la photo ne renvoie que le texte lu sur la carte, à réinjecter
//     dans une recherche classique (searchCards) — utilisé pour les 7 autres
//     jeux, voir ScannerScreen.tsx.
import { API_BASE_URL } from "../config/api";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { Game, UnifiedCard } from "../types";
import { SCRYDEX_VISION_GAMES } from "../constants/games";

// React Native accepte un objet { uri, name, type } comme valeur de
// FormData.append pour un fichier local — pas dans les types DOM standard
// (Blob | string) utilisés par TypeScript ici, d'où le cast.
function toFormDataFile(uri: string): Blob {
  return { uri, name: "card.jpg", type: "image/jpeg" } as unknown as Blob;
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? "Erreur du scanner";
}

export interface ScanVisionResult {
  card: UnifiedCard;
  /** Score de confiance renvoyé par Scrydex Vision (généralement 0.7 à 1.3+). */
  score: number;
}

export async function identifyCardByImage(imageUri: string, game: Game): Promise<ScanVisionResult | null> {
  const scrydexGame = SCRYDEX_VISION_GAMES[game];
  const formData = new FormData();
  formData.append("image", toFormDataFile(imageUri));
  if (scrydexGame) formData.append("games", scrydexGame);

  const res = await fetchWithRetry(`${API_BASE_URL}/scan/vision`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await readErrorMessage(res));

  const json = await res.json();
  const m = json.match;
  if (!m) return null;

  const card: UnifiedCard = {
    // Préfixé : cet id vient de Scrydex, pas de l'API habituelle de ce jeu
    // (pokemontcg.io/Scryfall/tcgapi.dev) — jamais réutilisé pour un appel
    // getCardById, seulement affiché directement (presetCard), voir
    // ScannerScreen.tsx.
    id: `scrydex-${m.id}`,
    game,
    name: m.name,
    setName: m.setName ?? "",
    number: m.number ?? undefined,
    rarity: m.rarity ?? undefined,
    imageSmall: m.imageSmall ?? m.imageLarge ?? "",
    imageLarge: m.imageLarge ?? m.imageSmall ?? "",
    marketPriceUsd: m.marketPriceUsd ?? undefined,
  };

  return { card, score: m.score };
}

export async function extractTextFromImage(imageUri: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", toFormDataFile(imageUri));

  const res = await fetchWithRetry(`${API_BASE_URL}/scan/ocr`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await readErrorMessage(res));

  const json = await res.json();
  return (json.text ?? "").trim();
}
