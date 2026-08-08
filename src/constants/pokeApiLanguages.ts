import { LanguageCode } from "../i18n";

// Les codes de langue utilisés par PokeAPI ne correspondent pas toujours
// exactement aux nôtres (notamment le japonais et le portugais). `null`
// signifie "pas besoin de traduire" (source déjà en anglais).
export const POKEAPI_LANGUAGE_CODES: Record<LanguageCode, string | null> = {
  en: null,
  fr: "fr",
  es: "es",
  de: "de",
  it: "it",
  // "ja-Hrkt" = noms en hiragana/katakana, la forme utilisée dans les jeux —
  // c'est ce que les joueurs tapent naturellement, contrairement au romaji.
  ja: "ja-Hrkt",
  // PokeAPI n'a pas de "pt" générique, seulement le portugais brésilien.
  pt: "pt-BR",
};
