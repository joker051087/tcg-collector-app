// Script de peuplement de la base d'empreintes visuelles (reconnaissance
// visuelle "maison", voir server/imageHash.js et server/imageIndex.js).
//
// À lancer depuis le dossier server/ :
//   node scripts/buildImageIndex.js pokemon
//   node scripts/buildImageIndex.js magic
//   node scripts/buildImageIndex.js all        (les 13 jeux, l'un après l'autre)
//
// Reprise automatique : le script commence par charger ce qui est déjà en
// base pour le jeu demandé et saute les cartes déjà indexées — on peut donc
// l'arrêter (Ctrl+C) et le relancer plus tard sans perdre le travail déjà
// fait. La sauvegarde se fait par lots (toutes les SAVE_EVERY cartes), pas
// carte par carte, pour rester loin des quotas gratuits Firestore.
//
// Ça prend du temps (une image téléchargée + hashée à la fois, avec une
// petite pause polie entre chaque requête pour ne pas marteler les API
// tierces) : compter grosso modo 1h30 pour Pokémon (~19 500 cartes), 1h pour
// Yu-Gi-Oh! (~13 000), plusieurs heures pour Magic (~90 000, de loin le plus
// gros). Le mieux est de le laisser tourner une nuit.

import "dotenv/config";
import "../firestoreCache.js"; // effet de bord : initialise Firebase Admin
import { computeImageHash } from "../imageHash.js";
import { loadGameEntries, saveGameEntries } from "../imageIndex.js";

const DELAY_MS = 150; // pause entre deux cartes (poli envers les API tierces)
const SAVE_EVERY = 200; // sauvegarde Firestore toutes les 200 nouvelles cartes

const POKEMONTCG_API_KEY = process.env.POKEMONTCG_API_KEY || "";
const TCGAPI_KEY = process.env.TCGAPI_KEY || "";
// apitcg.com : service alternatif à tcgapi.dev (nom très proche, mais autre
// service) — couvre 9 des 10 jeux ci-dessous (pas Final Fantasy) avec une
// limite mensuelle plutôt que ~100 requêtes/jour, donc en pratique on peut
// avancer beaucoup plus loin avant de se faire bloquer. Clé gratuite sur
// https://apitcg.com/register puis https://apitcg.com/platform/api-key.
const APITCG_API_KEY = process.env.APITCG_API_KEY || "";

const TCGAPI_SLUGS = {
  onepiece: "one-piece-card-game",
  lorcana: "lorcana-tcg",
  riftbound: "riftbound-league-of-legends-trading-card-game",
  dragonball: "dragon-ball-super-fusion-world",
  digimon: "digimon-card-game",
  fleshandblood: "flesh-and-blood-tcg",
  starwarsunlimited: "star-wars-unlimited",
  unionarena: "union-arena",
  gundam: "gundam-card-game",
  finalfantasy: "final-fantasy-tcg",
};

// Pas de Final Fantasy chez apitcg.com — ce jeu reste sur tcgapi.dev (voir
// iteratorFor plus bas).
const APITCG_SLUGS = {
  onepiece: "one-piece",
  lorcana: "lorcana",
  riftbound: "riftbound",
  dragonball: "dragon-ball-super-fusion-world",
  digimon: "digimon",
  fleshandblood: "flesh-and-blood",
  starwarsunlimited: "star-wars-unlimited",
  unionarena: "union-arena",
  gundam: "gundam",
};

const ALL_GAMES = ["pokemon", "magic", "yugioh", ...Object.keys(TCGAPI_SLUGS)];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Certaines API tierces limitent le nombre de requêtes par minute (429,
// surtout tcgapi.dev), et pokemontcg.io en particulier a un taux d'erreurs
// serveur temporaires (5xx) non négligeable — les deux cas plantaient tout
// le script auparavant (même si des milliers de cartes avaient déjà été
// traitées et sauvegardées). Maintenant, on attend et on réessaie
// automatiquement avant d'abandonner pour de bon.
async function fetchJson(url, init, attempt = 1) {
  const res = await fetch(url, init);
  const isRateLimit = res.status === 429;
  const isServerError = res.status >= 500;
  if (isRateLimit || isServerError) {
    if (attempt > 5) throw new Error(`${url} -> HTTP ${res.status} (trop de tentatives)`);
    // Erreurs serveur temporaires : pause courte (souvent résolu en
    // quelques secondes). Limite de débit : pause longue et croissante
    // (30s, 60s, 90s...) — repartir trop vite ne ferait que reprendre un
    // 429.
    const waitMs = isRateLimit ? attempt * 30_000 : attempt * 5_000;
    console.warn(
      `  ${isRateLimit ? "Limite de débit (429)" : `Erreur serveur (${res.status})`} sur ${url} — pause de ${
        waitMs / 1000
      }s avant nouvelle tentative...`
    );
    await sleep(waitMs);
    return fetchJson(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// Générateurs "async iterable" : renvoient un flux de { id, name, imageUrl }
// pour un jeu donné, un par un, pour ne jamais garder toute la liste des
// cartes d'un gros jeu (Magic...) en mémoire d'un coup.

async function* iteratePokemon() {
  const headers = POKEMONTCG_API_KEY ? { "X-Api-Key": POKEMONTCG_API_KEY } : {};
  const setsJson = await fetchJson("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate", { headers });
  for (const set of setsJson.data ?? []) {
    let page = 1;
    let seen = 0;
    let total = Infinity;
    while (seen < total) {
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(
        `set.id:"${set.id}"`
      )}&pageSize=250&page=${page}&orderBy=id`;
      let json;
      try {
        json = await fetchJson(url, { headers });
      } catch (err) {
        // pokemontcg.io a un taux de 5xx non négligeable, même après
        // plusieurs tentatives (voir fetchJson) — plutôt que de tout
        // arrêter, on passe au set suivant. Le prochain lancement du
        // script (reprise automatique) retentera ce set-là.
        console.warn(`  Abandon du set "${set.id}" (page ${page}) après échecs répétés : ${err.message}`);
        break;
      }
      const cards = json.data ?? [];
      total = json.totalCount ?? cards.length;
      if (cards.length === 0) break;
      for (const card of cards) {
        if (card.images?.small) {
          yield { id: card.id, name: card.name, imageUrl: card.images.small };
        }
      }
      seen += cards.length;
      page++;
    }
  }
}

async function* iterateMagic() {
  const headers = { Accept: "application/json;q=0.9,*/*;q=0.8", "User-Agent": "TCGCollectorApp/0.1 (index)" };
  const setsJson = await fetchJson("https://api.scryfall.com/sets", { headers });
  for (const set of setsJson.data ?? []) {
    let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`set:${set.code}`)}&unique=prints&order=set`;
    while (url) {
      let json;
      try {
        json = await fetchJson(url, { headers });
      } catch (err) {
        // Scryfall renvoie 404 pour un set sans carte "normale" indexable
        // (sets de jetons/promos vides côté recherche) — pas une vraie
        // erreur, on passe juste au set suivant.
        break;
      }
      for (const card of json.data ?? []) {
        const imageUrl = card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small;
        if (imageUrl) yield { id: card.id, name: card.name, imageUrl };
      }
      url = json.has_more ? json.next_page : null;
      if (url) await sleep(DELAY_MS); // Scryfall demande explicitement ~50-100ms entre requêtes
    }
  }
}

async function* iterateYugioh() {
  const json = await fetchJson("https://db.ygoprodeck.com/api/v7/cardinfo.php");
  for (const card of json.data ?? []) {
    const imageUrl = card.card_images?.[0]?.image_url_small ?? card.card_images?.[0]?.image_url;
    if (imageUrl) yield { id: String(card.id), name: card.name, imageUrl };
  }
}

async function* iterateTcgApi(game) {
  if (!TCGAPI_KEY) {
    console.warn(`TCGAPI_KEY non configurée — ${game} ignoré (voir server/.env).`);
    return;
  }
  const slug = TCGAPI_SLUGS[game];
  const setsJson = await fetchJson(`https://api.tcgapi.dev/v1/games/${slug}/sets?per_page=100`, {
    headers: { "X-API-Key": TCGAPI_KEY },
  });
  for (const set of setsJson.data ?? []) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      let json;
      try {
        json = await fetchJson(`https://api.tcgapi.dev/v1/sets/${set.id}/cards?per_page=100&page=${page}`, {
          headers: { "X-API-Key": TCGAPI_KEY },
        });
      } catch (err) {
        console.warn(`  Abandon du set "${set.id}" (page ${page}) après échecs répétés : ${err.message}`);
        break;
      }
      const cards = json.data ?? [];
      for (const card of cards) {
        if (card.image_url) yield { id: String(card.id), name: card.name, imageUrl: card.image_url };
      }
      hasMore = Boolean(json.meta?.has_more) && cards.length > 0;
      page++;
    }
  }
}

// apitcg.com : /api/{tcg}/sets renvoie TOUS les sets d'un coup (pas de
// pagination à gérer là), puis /api/products?tcg=...&set=...&type=card
// paginé (limite 100/page) pour les cartes de chaque set. Format de réponse
// différent de tcgapi.dev (image dans un tableau images[].small, pas
// image_url) — voir docs.apitcg.com pour le détail.
async function* iterateApiTcg(game) {
  if (!APITCG_API_KEY) {
    console.warn(`APITCG_API_KEY non configurée — repli sur tcgapi.dev pour ${game}.`);
    yield* iterateTcgApi(game);
    return;
  }
  const slug = APITCG_SLUGS[game];
  const headers = { "x-api-key": APITCG_API_KEY };
  const setsJson = await fetchJson(`https://api.apitcg.com/api/${slug}/sets`, { headers });
  for (const set of setsJson.data ?? []) {
    let page = 1;
    let seen = 0;
    let total = Infinity;
    while (seen < total) {
      let json;
      try {
        json = await fetchJson(
          `https://api.apitcg.com/api/products?tcg=${slug}&type=card&set=${encodeURIComponent(
            set._id
          )}&limit=100&page=${page}`,
          { headers }
        );
      } catch (err) {
        console.warn(`  Abandon du set "${set._id}" (page ${page}) après échecs répétés : ${err.message}`);
        break;
      }
      const cards = json.data ?? [];
      total = json.total ?? cards.length;
      if (cards.length === 0) break;
      for (const card of cards) {
        const imageUrl = card.images?.[0]?.small ?? card.images?.[0]?.medium;
        if (imageUrl) yield { id: String(card._id), name: card.name, imageUrl };
      }
      seen += cards.length;
      page++;
    }
  }
}

function iteratorFor(game) {
  if (game === "pokemon") return iteratePokemon();
  if (game === "magic") return iterateMagic();
  if (game === "yugioh") return iterateYugioh();
  if (APITCG_SLUGS[game]) return iterateApiTcg(game);
  if (TCGAPI_SLUGS[game]) return iterateTcgApi(game);
  throw new Error(`Jeu inconnu : ${game}`);
}

async function processGame(game) {
  console.log(`\n=== ${game} : chargement de l'existant... ===`);
  const existing = await loadGameEntries(game);
  const existingIds = new Set(existing.map((e) => e.id));
  console.log(`${game} : ${existing.length} cartes déjà indexées, reprise en cours...`);

  const entries = [...existing];
  let processed = 0;
  let added = 0;
  let skipped = 0;
  let failed = 0;
  let sinceLastSave = 0;

  for await (const card of iteratorFor(game)) {
    processed++;
    if (existingIds.has(card.id)) {
      skipped++;
      continue;
    }
    try {
      const imgRes = await fetch(card.imageUrl);
      if (!imgRes.ok) throw new Error(`image HTTP ${imgRes.status}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const hash = await computeImageHash(buffer);
      entries.push({ id: card.id, hash, name: card.name, image: card.imageUrl });
      existingIds.add(card.id);
      added++;
      sinceLastSave++;
    } catch (err) {
      failed++;
      console.warn(`  échec sur "${card.name}" (${card.id}) : ${err.message}`);
    }

    if (processed % 50 === 0) {
      console.log(`  ${game} : ${processed} vues, ${added} ajoutées, ${skipped} déjà connues, ${failed} échecs`);
    }
    if (sinceLastSave >= SAVE_EVERY) {
      await saveGameEntries(game, entries);
      console.log(`  ${game} : sauvegarde intermédiaire (${entries.length} cartes en base)`);
      sinceLastSave = 0;
    }

    await sleep(DELAY_MS);
  }

  await saveGameEntries(game, entries);
  console.log(
    `=== ${game} terminé : ${entries.length} cartes en base (${added} ajoutées cette fois, ${failed} échecs) ===`
  );
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage : node scripts/buildImageIndex.js <pokemon|magic|yugioh|onepiece|...|all>");
    process.exit(1);
  }
  const games = arg === "all" ? ALL_GAMES : [arg];
  for (const game of games) {
    try {
      await processGame(game);
    } catch (err) {
      // Utile surtout pour "all" : un jeu qui échoue complètement (ex. clé
      // API manquante, panne prolongée) ne doit pas empêcher les jeux
      // suivants de la liste de tourner.
      console.error(`Erreur sur "${game}", passage au jeu suivant : ${err.message}`);
    }
  }
  console.log("\nTerminé.");
}

main()
  .catch((err) => {
    console.error("Erreur fatale :", err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    // process.exitCode (plutôt que process.exit()) laisse Node terminer
    // proprement les opérations réseau/Firestore encore en vol — appeler
    // process.exit() directement ici plantait parfois sous Windows
    // ("Assertion failed... UV_HANDLE_CLOSING") quand une requête était
    // encore en cours au moment de l'arrêt brutal.
  });
