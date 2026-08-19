// Stockage/chargement de la base d'empreintes visuelles (voir imageHash.js
// pour le calcul de l'empreinte elle-même). Un point important : on ne
// stocke PAS une empreinte par document Firestore (ça ferait des dizaines de
// milliers de documents, et donc de lectures, à chaque redémarrage du
// serveur — largement au-dessus du quota gratuit Firestore de 50 000
// lectures/jour). À la place, les empreintes d'un même jeu sont regroupées
// par lots ("shards") de SHARD_SIZE dans un seul document JSON — un jeu de
// 20 000 cartes tient dans 5 documents au lieu de 20 000, ce qui rend le
// chargement au démarrage (et la mise à jour par le script de peuplement)
// quasiment gratuit en quota Firestore.

import admin from "firebase-admin";

const COLLECTION = "card_image_index";
export const SHARD_SIZE = 4000;

function db() {
  if (!admin.apps.length) {
    throw new Error(
      "Firebase Admin non initialisé — ce module suppose que firestoreCache.js a déjà tourné (import order) ou que FIREBASE_SERVICE_ACCOUNT_BASE64 est configurée."
    );
  }
  return admin.firestore();
}

function shardDocId(game, shardIndex) {
  return `${game}_shard_${shardIndex}`;
}

/**
 * Charge toutes les empreintes déjà enregistrées pour un jeu (tous les
 * shards). Utilisé au démarrage du serveur (voir index.js) et par le script
 * de peuplement pour savoir quelles cartes sont déjà indexées (reprise après
 * interruption).
 * @param {string} game
 * @returns {Promise<Array<{id: string, hash: string, name: string, image: string}>>}
 */
export async function loadGameEntries(game) {
  const snap = await db()
    .collection(COLLECTION)
    .where("game", "==", game)
    .get();
  const entries = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (Array.isArray(data.entries)) entries.push(...data.entries);
  }
  return entries;
}

/**
 * Charge la base complète (tous jeux confondus), regroupée par jeu — utilisé
 * une fois au démarrage du serveur pour construire l'index en mémoire servant
 * aux comparaisons (voir index.js, findBestMatch).
 * @returns {Promise<Record<string, Array<{id: string, hash: string, name: string, image: string}>>>}
 */
export async function loadFullIndex() {
  const snap = await db().collection(COLLECTION).get();
  /** @type {Record<string, Array<any>>} */
  const byGame = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.game || !Array.isArray(data.entries)) continue;
    if (!byGame[data.game]) byGame[data.game] = [];
    byGame[data.game].push(...data.entries);
  }
  return byGame;
}

/**
 * Enregistre l'état complet des empreintes d'un jeu, réparti en shards de
 * SHARD_SIZE. Écrase les shards existants pour ce jeu (appelé par le script
 * de peuplement après avoir fusionné les nouvelles cartes avec celles déjà
 * en base) — un nombre de writes proportionnel au nombre de SHARDS, pas au
 * nombre de cartes.
 * @param {string} game
 * @param {Array<{id: string, hash: string, name: string, image: string}>} entries
 */
export async function saveGameEntries(game, entries) {
  const batch = db().batch();
  const shardCount = Math.max(1, Math.ceil(entries.length / SHARD_SIZE));
  for (let i = 0; i < shardCount; i++) {
    const slice = entries.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
    const ref = db().collection(COLLECTION).doc(shardDocId(game, i));
    batch.set(ref, { game, shard: i, entries: slice, count: slice.length, updatedAt: Date.now() });
  }
  await batch.commit();

  // Nettoyage : si le jeu avait plus de shards avant (rare, seulement si des
  // cartes disparaissent d'un catalogue), on supprime les shards devenus
  // inutiles pour ne pas laisser de doublons fantômes.
  const existing = await db().collection(COLLECTION).where("game", "==", game).get();
  const deletions = existing.docs.filter((d) => (d.data().shard ?? 0) >= shardCount);
  if (deletions.length > 0) {
    const delBatch = db().batch();
    deletions.forEach((d) => delBatch.delete(d.ref));
    await delBatch.commit();
  }
}
