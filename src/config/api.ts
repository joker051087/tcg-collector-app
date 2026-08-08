// URL du backend local (cache + proxy vers pokemontcg.io / Scryfall /
// YGOPRODeck / open.er-api.com / PokeAPI — voir server/README dans le
// dossier server/ et le README racine, section "Backend").
//
// En dev, "localhost" ne fonctionne QUE si l'app tourne dans un navigateur
// sur ce même PC. Depuis le téléphone (Expo Go), "localhost" désignerait le
// téléphone lui-même, pas le PC qui fait tourner le serveur — il faut donc
// renseigner l'adresse IP locale du PC dans EXPO_PUBLIC_API_BASE_URL (voir
// .env.example).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
