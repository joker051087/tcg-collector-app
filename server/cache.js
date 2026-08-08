// Cache très simple, en mémoire + persisté sur disque (cache-data.json) pour
// survivre aux redémarrages du serveur pendant le dev. Pas de dépendance
// externe (pas de SQLite/Redis) pour rester facile à installer et à faire
// tourner sur n'importe quelle machine sans compilation native.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "cache-data.json");

let store = new Map();
let dirty = false;

function load() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const obj = JSON.parse(raw);
    store = new Map(Object.entries(obj));
    console.log(`Cache chargé depuis le disque (${store.size} entrée(s)).`);
  } catch {
    store = new Map();
  }
}

function persist() {
  const obj = Object.fromEntries(store);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), "utf-8");
}

load();

// On persiste toutes les 5s si quelque chose a changé, plutôt qu'à chaque
// écriture (évite de spammer le disque sur une rafale de requêtes).
setInterval(() => {
  if (dirty) {
    persist();
    dirty = false;
  }
}, 5000).unref();

process.on("SIGINT", () => {
  if (dirty) persist();
  process.exit(0);
});

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    dirty = true;
    return null;
  }
  return entry.data;
}

export function setCached(key, data, ttlMs) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
  dirty = true;
}

export function cacheStats() {
  return { entries: store.size };
}
