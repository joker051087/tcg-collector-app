// Les API TCG gratuites (Pokémon en particulier) renvoient de temps en temps
// une erreur serveur transitoire (5xx) sans raison liée à notre requête. En
// attendant un backend avec cache (qui absorbera ce genre de problème côté
// serveur), on réessaie automatiquement quelques fois côté client avant
// d'abandonner et de remonter une erreur à l'utilisateur.

interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  { retries = 2, retryDelayMs = 500 }: RetryOptions = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      // On ne réessaie que sur les erreurs serveur (5xx) — une 404 ou une
      // 400 sont des réponses valides (ex: "aucun résultat") qu'il ne faut
      // pas retenter.
      if (res.status >= 500 && attempt < retries) {
        await delay(retryDelayMs * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await delay(retryDelayMs * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed after retries");
}
