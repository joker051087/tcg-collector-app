import { usePortfolioStore } from "../store/portfolioStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useAuthStore } from "../store/authStore";
import {
  fetchCloudPortfolio,
  fetchCloudWishlist,
  pushCloudPortfolio,
  pushCloudWishlist,
} from "./cloudSync";
import { CollectionItem, UnifiedCard } from "../types";

// Fusionne plutôt qu'écrase à la connexion : la collection déjà sur le
// téléphone (créée avant de se connecter, ou depuis un autre appareil pas
// encore synchronisé) ne doit jamais être perdue. itemId (portfolio) / id
// (wishlist) identifient déjà chaque entrée de façon unique dans les stores
// existants (voir portfolioStore.ts / wishlistStore.ts) — la fusion est donc
// une simple union dédupliquée par cette clé, cloud en premier.
function mergePortfolio(cloud: CollectionItem[], local: CollectionItem[]): CollectionItem[] {
  const seen = new Set(cloud.map((i) => i.itemId));
  return [...cloud, ...local.filter((i) => !seen.has(i.itemId))];
}

function mergeWishlist(cloud: UnifiedCard[], local: UnifiedCard[]): UnifiedCard[] {
  const seen = new Set(cloud.map((i) => i.id));
  return [...cloud, ...local.filter((i) => !seen.has(i.id))];
}

const PUSH_DEBOUNCE_MS = 1000;

let currentUid: string | null = null;
let unsubscribePortfolio: (() => void) | null = null;
let unsubscribeWishlist: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush(uid: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushCloudPortfolio(uid, usePortfolioStore.getState().items).catch((err) =>
      console.error("Erreur de synchronisation (collection):", err)
    );
    pushCloudWishlist(uid, useWishlistStore.getState().items).catch((err) =>
      console.error("Erreur de synchronisation (souhaits):", err)
    );
  }, PUSH_DEBOUNCE_MS);
}

function stopWatchingLocalChanges() {
  unsubscribePortfolio?.();
  unsubscribeWishlist?.();
  unsubscribePortfolio = null;
  unsubscribeWishlist = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

async function startSyncing(uid: string) {
  currentUid = uid;

  try {
    const [cloudPortfolio, cloudWishlist] = await Promise.all([
      fetchCloudPortfolio(uid),
      fetchCloudWishlist(uid),
    ]);

    // L'utilisateur a pu se déconnecter pendant l'appel réseau ci-dessus —
    // on abandonne plutôt que d'écrire les données de la mauvaise session.
    if (currentUid !== uid) return;

    const mergedPortfolio = mergePortfolio(cloudPortfolio ?? [], usePortfolioStore.getState().items);
    const mergedWishlist = mergeWishlist(cloudWishlist ?? [], useWishlistStore.getState().items);

    usePortfolioStore.setState({ items: mergedPortfolio });
    useWishlistStore.setState({ items: mergedWishlist });

    await Promise.all([
      pushCloudPortfolio(uid, mergedPortfolio),
      pushCloudWishlist(uid, mergedWishlist),
    ]);
  } catch (err) {
    console.error("Erreur de synchronisation initiale:", err);
  }

  if (currentUid !== uid) return;

  // Ne surveille les changements locaux qu'APRÈS la fusion initiale, pour ne
  // pas pousser une version partielle pendant qu'elle est encore en cours.
  unsubscribePortfolio = usePortfolioStore.subscribe(() => schedulePush(uid));
  unsubscribeWishlist = useWishlistStore.subscribe(() => schedulePush(uid));
}

// Appelé une seule fois au démarrage de l'appli (voir App.tsx), après
// initAuthListener. Observe le store d'authentification et démarre/arrête la
// synchronisation en conséquence — pas besoin d'appeler quoi que ce soit
// ailleurs dans l'appli, portfolioStore/wishlistStore restent inchangés.
export function initSync(): () => void {
  const unsubscribeAuth = useAuthStore.subscribe((state) => {
    if (state.status === "signedIn" && state.user && state.user.uid !== currentUid) {
      stopWatchingLocalChanges();
      startSyncing(state.user.uid);
    } else if (state.status === "signedOut" && currentUid) {
      currentUid = null;
      stopWatchingLocalChanges();
    }
  });

  return () => {
    unsubscribeAuth();
    stopWatchingLocalChanges();
  };
}
