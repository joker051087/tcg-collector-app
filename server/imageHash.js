// Reconnaissance visuelle "maison" (gratuite, illimitée) : chaque image de
// carte est réduite à une empreinte numérique de 64 bits (voir dHash
// ci-dessous), et deux images se ressemblent visuellement si leurs
// empreintes ne diffèrent que par peu de bits (distance de Hamming). C'est
// la même famille de technique que "trouver les doublons/quasi-doublons
// d'images" (utilisée par ex. par Google Images, TinEye) — pas un modèle
// d'IA entraîné comme Scrydex Vision, mais robuste et gratuit pour ce genre
// de comparaison "cette photo, quelle carte du catalogue lui ressemble le
// plus ?".
//
// Principe du dHash (difference hash) :
//   1. Réduire l'image à 9x8 pixels en niveaux de gris (perd tous les
//      détails fins, ne garde que les grandes zones claires/sombres — cette
//      perte est volontaire : elle rend le hash insensible aux petites
//      variations de compression JPEG, de luminosité, de bruit caméra).
//   2. Pour chaque ligne (8 lignes), comparer chaque pixel à son voisin de
//      droite (9 pixels → 8 comparaisons) : bit à 1 si le pixel est plus
//      clair que son voisin, sinon 0.
//   3. 8 lignes × 8 bits = 64 bits, encodés en chaîne hexadécimale (16
//      caractères) pour un stockage/comparaison simples.
//
// Deux images quasi identiques (même carte, photo légèrement différente)
// auront des empreintes très proches (quelques bits d'écart) ; deux images
// différentes auront des empreintes qui diffèrent sur ~32 bits en moyenne
// (comportement aléatoire attendu sur 64 bits).

import sharp from "sharp";

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/**
 * Calcule l'empreinte dHash (64 bits, hex 16 caractères) d'une image.
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>}
 */
export async function computeImageHash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .rotate() // respecte l'orientation EXIF avant de réduire
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < HASH_HEIGHT; row++) {
    for (let col = 0; col < HASH_WIDTH - 1; col++) {
      const left = data[row * HASH_WIDTH + col];
      const right = data[row * HASH_WIDTH + col + 1];
      bits += left > right ? "1" : "0";
    }
  }

  // 64 bits binaires -> BigInt -> hex (padStart pour une longueur fixe de
  // 16 caractères, utile pour trier/comparer les chaînes directement).
  const asBigInt = BigInt(`0b${bits}`);
  return asBigInt.toString(16).padStart(16, "0");
}

/**
 * Distance de Hamming entre deux empreintes hex (nombre de bits différents,
 * de 0 = identiques à 64 = totalement opposées). Plus c'est bas, plus les
 * images se ressemblent.
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function hammingDistance(hexA, hexB) {
  let xor = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}
