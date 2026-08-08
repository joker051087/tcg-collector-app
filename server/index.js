// Backend de cache/proxy pour l'app TCG Collector.
//
// Rôle : centraliser les appels vers les API tierces (pokemontcg.io,
// Scryfall, YGOPRODeck, open.er-api.com, PokeAPI) derrière un cache partagé,
// pour deux raisons (voir Plan_App_TCG.md, section "Risques") :
//   1. Réduire le nombre d'appels réels envoyés à ces API gratuites (limites
//      de débit, et pokemontcg.io en particulier a un taux d'erreur 5xx
//      observé non négligeable) — un même résultat mis en cache profite à
//      toutes les recherches suivantes, pas seulement à un appareil.
//   2. Ne plus exposer la clé API Pokémon (si tu en configures une) dans le
//      bundle de l'app — elle ne vit désormais que côté serveur.
//
// Pour l'instant ce serveur tourne en local sur ta machine, lancé à côté
// d'Expo pendant le dev (voir README.md racine, section "Backend").

import "dotenv/config";
import express from "express";
import cors from "cors";
import { getCached, setCached, cacheStats } from "./cache.js";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;
const POKEMONTCG_API_KEY = process.env.POKEMONTCG_API_KEY || "";
// Clé pour tcgapi.dev (produits scellés : coffrets, displays, boosters...).
// TCGplayer a fermé son API officielle aux nouveaux développeurs (voir
// README.md, section "Produits scellés") — tcgapi.dev est un service tiers
// qui republie ces mêmes données de prix. Clé gratuite sur https://tcgapi.dev/signup.
const TCGAPI_KEY = process.env.TCGAPI_KEY || "";

const TTL = {
  cards: 60 * 60 * 1000, // 1h — recherche/fiche carte (catalogue + prix)
  exchangeRates: 24 * 60 * 60 * 1000, // 24h
  pokemonNames: 7 * 24 * 60 * 60 * 1000, // 7 jours — les noms Pokémon changent rarement
  yugiohFullDb: 24 * 60 * 60 * 1000, // 24h — gros téléchargement (base complète), pas la peine plus souvent
  pokemonSets: 30 * 24 * 60 * 60 * 1000, // 30 jours — la liste des sets ne change qu'à chaque sortie
  sealed: 12 * 60 * 60 * 1000, // 12h — tcgapi.dev ne met à jour ses prix qu'une fois par jour
  setsList: 30 * 24 * 60 * 60 * 1000, // 30 jours — liste des séries par jeu (écran Checklist)
};

async function fetchWithRetry(url, init, retries = 2, delayMs = 500) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastErr;
}

// Sert le cache si frais, sinon interroge l'API en amont, met le résultat en
// cache (seulement en cas de succès — on ne met jamais en cache une erreur),
// et le renvoie tel quel (même forme JSON que l'API d'origine) : les clients
// TS existants n'ont donc pas besoin de changer leur logique de parsing,
// seulement l'URL qu'ils appellent.
async function proxyJson(res, { cacheKey, upstreamUrl, upstreamInit, ttlMs }) {
  const cached = getCached(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    return res.json(cached);
  }

  try {
    const upstreamRes = await fetchWithRetry(upstreamUrl, upstreamInit);
    const text = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(json ?? { error: text });
    }

    setCached(cacheKey, json, ttlMs);
    res.set("X-Cache", "MISS");
    return res.json(json);
  } catch (err) {
    console.error(`Erreur proxy (${cacheKey}):`, err.message);
    return res.status(502).json({ error: "Erreur de communication avec l'API en amont" });
  }
}

// --- Pokémon (pokemontcg.io) ---
app.get("/proxy/pokemon/cards", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Paramètre q requis" });
  // pageSize/orderBy passthrough : utilisé notamment pour parcourir un set
  // entier (ex: recherche par code de set seul, "SFA") où 30 résultats ne
  // suffisent pas et où l'ordre par numéro est plus utile que par date.
  // 250 est le maximum autorisé par pokemontcg.io.
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 30, 1), 250);
  const orderBy = req.query.orderBy || "-set.releaseDate";
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(
    q
  )}&pageSize=${pageSize}&orderBy=${encodeURIComponent(orderBy)}`;
  const headers = POKEMONTCG_API_KEY ? { "X-Api-Key": POKEMONTCG_API_KEY } : {};
  await proxyJson(res, {
    cacheKey: `pokemon:search:${q}:${pageSize}:${orderBy}`,
    upstreamUrl: url,
    upstreamInit: { headers },
    ttlMs: TTL.cards,
  });
});

// Résout un code de set court (ex "PAF") vers l'identifiant interne du set
// (ex "sv4pt5"). Nécessaire car le champ set.ptcgoCode, lui, n'est PAS fiable
// pour filtrer les CARTES : il est présent sur l'objet Set renvoyé par
// /v2/sets, mais manquant sur les cartes elles-mêmes pour certains sets
// (constaté sur Paldean Fates par exemple) — alors que set.id, lui, est
// toujours renseigné sur chaque carte.
app.get("/proxy/pokemon/sets", async (req, res) => {
  const ptcgoCode = req.query.ptcgoCode;
  if (!ptcgoCode) return res.status(400).json({ error: "Paramètre ptcgoCode requis" });
  const headers = POKEMONTCG_API_KEY ? { "X-Api-Key": POKEMONTCG_API_KEY } : {};
  const url = `https://api.pokemontcg.io/v2/sets?q=${encodeURIComponent(`ptcgoCode:${ptcgoCode}`)}`;
  await proxyJson(res, {
    cacheKey: `pokemon:sets:${ptcgoCode}`,
    upstreamUrl: url,
    upstreamInit: { headers },
    ttlMs: TTL.pokemonSets,
  });
});

// Liste complète des sets Pokémon (écran Checklist — "quelles cartes me
// manque-t-il pour compléter telle série ?"). Triée par date de sortie
// décroissante, pour proposer les séries récentes en premier.
app.get("/proxy/pokemon/sets/all", async (req, res) => {
  const headers = POKEMONTCG_API_KEY ? { "X-Api-Key": POKEMONTCG_API_KEY } : {};
  await proxyJson(res, {
    cacheKey: "pokemon:sets:all",
    upstreamUrl: "https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate",
    upstreamInit: { headers },
    ttlMs: TTL.setsList,
  });
});

app.get("/proxy/pokemon/cards/:id", async (req, res) => {
  const { id } = req.params;
  const headers = POKEMONTCG_API_KEY ? { "X-Api-Key": POKEMONTCG_API_KEY } : {};
  await proxyJson(res, {
    cacheKey: `pokemon:card:${id}`,
    upstreamUrl: `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`,
    upstreamInit: { headers },
    ttlMs: TTL.cards,
  });
});

// --- Magic (Scryfall) ---
const SCRYFALL_HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8",
  "User-Agent": "TCGCollectorApp/0.1 (prototype)",
};

app.get("/proxy/magic/cards", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Paramètre q requis" });
  // order/dir passthrough : "order=set" est utilisé pour parcourir un set
  // entier (recherche par code de set seul) dans l'ordre des numéros de
  // collection, plutôt que le tri par date de sortie utilisé par défaut.
  const order = req.query.order || "released";
  const dir = req.query.dir || "asc";
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    q
  )}&unique=cards&order=${encodeURIComponent(order)}&dir=${encodeURIComponent(dir)}`;
  await proxyJson(res, {
    cacheKey: `magic:search:${q}:${order}:${dir}`,
    upstreamUrl: url,
    upstreamInit: { headers: SCRYFALL_HEADERS },
    ttlMs: TTL.cards,
  });
});

// Liste complète des sets Magic (écran Checklist), voir note Pokémon plus haut.
app.get("/proxy/magic/sets", async (req, res) => {
  await proxyJson(res, {
    cacheKey: "magic:sets:all",
    upstreamUrl: "https://api.scryfall.com/sets",
    upstreamInit: { headers: SCRYFALL_HEADERS },
    ttlMs: TTL.setsList,
  });
});

app.get("/proxy/magic/cards/:id", async (req, res) => {
  const { id } = req.params;
  await proxyJson(res, {
    cacheKey: `magic:card:${id}`,
    upstreamUrl: `https://api.scryfall.com/cards/${encodeURIComponent(id)}`,
    upstreamInit: { headers: SCRYFALL_HEADERS },
    ttlMs: TTL.cards,
  });
});

// --- Yu-Gi-Oh! (YGOPRODeck) ---
app.get("/proxy/yugioh/cards", async (req, res) => {
  const { fname, id } = req.query;
  if (!fname && !id) return res.status(400).json({ error: "Paramètre fname ou id requis" });
  const params = fname ? `fname=${encodeURIComponent(fname)}` : `id=${encodeURIComponent(id)}`;
  await proxyJson(res, {
    cacheKey: `yugioh:${params}`,
    upstreamUrl: `https://db.ygoprodeck.com/api/v7/cardinfo.php?${params}`,
    ttlMs: TTL.cards,
  });
});

// YGOPRODeck n'a pas de paramètre de recherche par "numéro/code de set" (ex :
// "SDY-006") sur son endpoint de recherche classique. En revanche, appeler
// cardinfo.php SANS aucun paramètre renvoie la base complète (~13 000
// cartes) — comportement documenté par YGOPRODeck pour les exports en masse.
// On la met en cache 24h et on filtre nous-mêmes par code de set à chaque
// requête, ce qui évite de re-télécharger ~10 Mo à chaque recherche.
async function fetchAllYugiohCards() {
  const cacheKey = "yugioh:all";
  const cached = getCached(cacheKey);
  if (cached) return { cards: cached, hit: true };

  const upstreamRes = await fetchWithRetry("https://db.ygoprodeck.com/api/v7/cardinfo.php");
  if (!upstreamRes.ok) {
    throw new Error(`YGOPRODeck API error: ${upstreamRes.status}`);
  }
  const json = await upstreamRes.json();
  const cards = json.data ?? [];
  setCached(cacheKey, cards, TTL.yugiohFullDb);
  return { cards, hit: false };
}

app.get("/proxy/yugioh/by-number", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Paramètre code requis" });

  try {
    const { cards: allCards, hit } = await fetchAllYugiohCards();
    const needle = String(code).trim().toLowerCase();

    const matches = [];
    for (const card of allCards) {
      const sets = card.card_sets ?? [];
      const matchedSet = sets.find((s) => (s.set_code || "").toLowerCase().includes(needle));
      if (matchedSet) {
        // Remonte le set correspondant en tête de liste : le client affiche
        // toujours card_sets[0] pour le nom d'édition/numéro d'une carte.
        matches.push({
          ...card,
          card_sets: [matchedSet, ...sets.filter((s) => s !== matchedSet)],
        });
      }
    }

    res.set("X-Cache", hit ? "HIT" : "MISS");
    return res.json({ data: matches });
  } catch (err) {
    console.error("Erreur proxy yugioh/by-number:", err.message);
    return res.status(502).json({ error: "Erreur de communication avec YGOPRODeck" });
  }
});

// Liste complète des sets Yu-Gi-Oh! (écran Checklist), voir note Pokémon plus
// haut. YGOPRODeck renvoie directement un tableau (pas de wrapper "data").
app.get("/proxy/yugioh/sets", async (req, res) => {
  await proxyJson(res, {
    cacheKey: "yugioh:sets:all",
    upstreamUrl: "https://db.ygoprodeck.com/api/v7/cardsets.php",
    ttlMs: TTL.setsList,
  });
});

// --- Taux de change (open.er-api.com) ---
app.get("/proxy/exchange-rates", async (req, res) => {
  await proxyJson(res, {
    cacheKey: "exchange-rates",
    upstreamUrl: "https://open.er-api.com/v6/latest/USD",
    ttlMs: TTL.exchangeRates,
  });
});

// --- Dictionnaire de noms Pokémon multilingues (PokeAPI GraphQL) ---
app.get("/proxy/pokemon-names", async (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.status(400).json({ error: "Paramètre lang requis" });

  const cacheKey = `pokemon-names:${lang}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    return res.json(cached);
  }

  const query = `
    query GetPokemonNames($languages: [String!]) {
      pokemon_v2_pokemonspeciesname(
        where: { pokemon_v2_language: { name: { _in: $languages } } }
      ) {
        name
        pokemon_species_id
        pokemon_v2_language { name }
      }
    }
  `;

  try {
    const upstreamRes = await fetchWithRetry("https://beta.pokeapi.co/graphql/v1beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { languages: ["en", lang] } }),
    });
    const json = await upstreamRes.json();
    if (!upstreamRes.ok || json.errors) {
      return res.status(502).json({ error: json.errors?.[0]?.message ?? "Erreur PokeAPI" });
    }
    setCached(cacheKey, json, TTL.pokemonNames);
    res.set("X-Cache", "MISS");
    return res.json(json);
  } catch (err) {
    console.error("Erreur proxy pokemon-names:", err.message);
    return res.status(502).json({ error: "Erreur de communication avec PokeAPI" });
  }
});

// --- Produits scellés (tcgapi.dev — voir note TCGAPI_KEY plus haut) ---
// Endpoint tiers non affilié à TCGplayer/Anthropic. "type=Sealed Products"
// filtre côté tcgapi.dev pour ne retourner que coffrets/displays/boosters
// (pas les cartes à l'unité). Le slug de jeu attendu par tcgapi.dev
// correspond directement à nos clés internes ("pokemon"/"magic"/"yugioh").
app.get("/proxy/sealed/search", async (req, res) => {
  const { q, game } = req.query;
  if (!q || !game) return res.status(400).json({ error: "Paramètres q et game requis" });
  if (!TCGAPI_KEY) {
    return res.status(501).json({
      error: "TCGAPI_KEY non configurée côté serveur — voir server/.env.example",
    });
  }
  const url = `https://api.tcgapi.dev/v1/search?q=${encodeURIComponent(q)}&game=${encodeURIComponent(
    game
  )}&type=${encodeURIComponent("Sealed Products")}&per_page=50`;
  await proxyJson(res, {
    cacheKey: `sealed:${game}:${q}`,
    upstreamUrl: url,
    upstreamInit: { headers: { "X-API-Key": TCGAPI_KEY } },
    ttlMs: TTL.sealed,
  });
});

// --- Autres TCG (One Piece, Lorcana, Riftbound, Dragon Ball...) via
// tcgapi.dev — mêmes clé/service que les produits scellés plus haut, mais
// pour des cartes normales cette fois (type=Cards). Ces jeux n'ont pas d'API
// dédiée gratuite comme pokemontcg.io/Scryfall/YGOPRODeck, d'où le recours au
// même service tiers pour tout, voir src/api/tcgApiGames.ts côté client.
app.get("/proxy/tcgapi/cards/search", async (req, res) => {
  const { q, game } = req.query;
  if (!q || !game) return res.status(400).json({ error: "Paramètres q et game requis" });
  if (!TCGAPI_KEY) {
    return res.status(501).json({
      error: "TCGAPI_KEY non configurée côté serveur — voir server/.env.example",
    });
  }
  const url = `https://api.tcgapi.dev/v1/search?q=${encodeURIComponent(q)}&game=${encodeURIComponent(
    game
  )}&type=${encodeURIComponent("Cards")}&per_page=50`;
  await proxyJson(res, {
    cacheKey: `tcgapi-cards:${game}:${q}`,
    upstreamUrl: url,
    upstreamInit: { headers: { "X-API-Key": TCGAPI_KEY } },
    ttlMs: TTL.sealed,
  });
});

app.get("/proxy/tcgapi/cards/:id", async (req, res) => {
  if (!TCGAPI_KEY) {
    return res.status(501).json({
      error: "TCGAPI_KEY non configurée côté serveur — voir server/.env.example",
    });
  }
  await proxyJson(res, {
    cacheKey: `tcgapi-card:${req.params.id}`,
    upstreamUrl: `https://api.tcgapi.dev/v1/cards/${encodeURIComponent(req.params.id)}`,
    upstreamInit: { headers: { "X-API-Key": TCGAPI_KEY } },
    ttlMs: TTL.cards,
  });
});

// Liste des séries d'un jeu (écran Checklist) — endpoint public de tcgapi.dev
// (pas besoin de clé), on le met quand même en cache côté serveur pour
// cohérence avec le reste de l'app.
app.get("/proxy/tcgapi/games/:slug/sets", async (req, res) => {
  await proxyJson(res, {
    cacheKey: `tcgapi-sets:${req.params.slug}`,
    upstreamUrl: `https://api.tcgapi.dev/v1/games/${encodeURIComponent(req.params.slug)}/sets?per_page=100`,
    ttlMs: TTL.setsList,
  });
});

// Toutes les cartes d'une série (écran Checklist), avec pagination — voir
// src/api/tcgApiGames.ts, fetchCardsBySetId, qui enchaîne les pages tant que
// meta.has_more est vrai (jusqu'à une limite raisonnable).
app.get("/proxy/tcgapi/sets/:id/cards", async (req, res) => {
  if (!TCGAPI_KEY) {
    return res.status(501).json({
      error: "TCGAPI_KEY non configurée côté serveur — voir server/.env.example",
    });
  }
  const page = req.query.page || "1";
  await proxyJson(res, {
    cacheKey: `tcgapi-set-cards:${req.params.id}:${page}`,
    upstreamUrl: `https://api.tcgapi.dev/v1/sets/${encodeURIComponent(
      req.params.id
    )}/cards?per_page=100&page=${encodeURIComponent(page)}`,
    upstreamInit: { headers: { "X-API-Key": TCGAPI_KEY } },
    ttlMs: TTL.sealed,
  });
});

app.get("/health", (req, res) => res.json({ ok: true, cache: cacheStats() }));

app.listen(PORT, () => {
  console.log(`Backend TCG Collector démarré sur http://localhost:${PORT}`);
  console.log(`Depuis ton téléphone (Expo Go), utilise l'IP locale de ce PC, pas "localhost".`);
});
