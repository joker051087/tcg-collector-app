// Cache permanent basé sur Firestore (remplace cache.js, qui stockait tout en
// mémoire + un fichier local — perdu à chaque redémarrage du serveur, et sur
// Render en particulier, le serveur redémarre très souvent (plan gratuit qui
// s'endort après 15 min d'inactivité, et à chaque redéploiement). Résultat
// avec l'ancien cache : dès qu'on redéployait, tout le catalogue déjà
// consulté devait être re-téléchargé depuis les API tierces (pokemontcg.io,
// tcgapi.dev...), ce qui remangeait leur quota de requêtes pour rien.
//
// Avec Firestore, une fois qu'une série/carte/prix a été consultée une
// première fois, elle reste en base pour toujours (ou jusqu'à expiration du
// TTL, voir index.js pour les durées par type de donnée) — les redémarrages
// du serveur n'ont plus d'impact, et le catalogue de l'app se construit tout
// seul au fil de l'usage, sans dépendre du quota des API tierces à chaque
// requête utilisateur.
//
// Nécessite la variable d'env FIREBASE_SERVICE_ACCOUNT_BASE64 (le contenu
// JSON de la clé de service Firebase Admin, encodé en base64 — voir
// GUIDE_FIREBASE.md, étape 10) — à NE JAMAIS committer sur git
// (contrairement à google-services.json, cette clé donne un accès admin
// complet au projet Firebase). L'encodage base64 évite tout souci de
// mise en forme (le JSON de la clé tient sur plusieurs lignes, ce qui casse
// facilement en le collant tel quel dans une variable d'env classique).
// FIREBASE_SERVICE_ACCOUNT_JSON (JSON brut, une seule ligne) reste accepté
// en repli si jamais préféré.

import crypto from "node:crypto";
import admin from "firebase-admin";

const COLLECTION = "api_cache";

let db = null;
let memoryFallback = new Map();

function initFirestore() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = base64
    ? Buffer.from(base64, "base64").toString("utf-8")
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 non configurée — le cache tourne en mémoire uniquement (perdu au redémarrage), voir GUIDE_FIREBASE.md."
    );
    return null;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    console.log("Cache Firestore initialisé.");
    return admin.firestore();
  } catch (err) {
    console.error("Erreur d'initialisation Firestore (cache) :", err.message);
    return null;
  }
}

db = initFirestore();

// Les clés de cache (voir index.js, ex `pokemon:search:set.id:"sv4":250:1:id`)
// peuvent contenir des caractères interdits dans un identifiant de document
// Firestore ("/", trop long, etc.) — on les transforme en hash fixe et sûr,
// tout en gardant la clé d'origine comme champ pour pouvoir déboguer/lister
// le contenu du cache si besoin.
function docIdFor(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function getCached(key) {
  if (!db) {
    const entry = memoryFallback.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryFallback.delete(key);
      return null;
    }
    return entry.data;
  }

  try {
    const snap = await db.collection(COLLECTION).doc(docIdFor(key)).get();
    if (!snap.exists) return null;
    const entry = snap.data();
    if (Date.now() > entry.expiresAt) {
      // Pas besoin d'attendre la suppression pour répondre — best effort.
      snap.ref.delete().catch(() => {});
      return null;
    }
    return JSON.parse(entry.dataJson);
  } catch (err) {
    console.error(`Erreur lecture cache Firestore (${key}) :`, err.message);
    return null;
  }
}

export async function setCached(key, data, ttlMs) {
  if (!db) {
    memoryFallback.set(key, { data, expiresAt: Date.now() + ttlMs });
    return;
  }

  try {
    await db
      .collection(COLLECTION)
      .doc(docIdFor(key))
      .set({
        key,
        dataJson: JSON.stringify(data),
        expiresAt: Date.now() + ttlMs,
        updatedAt: Date.now(),
      });
  } catch (err) {
    console.error(`Erreur écriture cache Firestore (${key}) :`, err.message);
  }
}

export function cacheStats() {
  return {
    backend: db ? "firestore" : "memoire (FIREBASE_SERVICE_ACCOUNT_JSON manquante)",
    memoryFallbackEntries: memoryFallback.size,
  };
}
