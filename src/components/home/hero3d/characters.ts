export type HeroCharacter = {
  id: "child" | "woman" | "man";
  label: string;
  /** Local, licensed GLB containing a textured bust and fitted optical glasses. */
  model: string | null;
};

// Activate only after all three real assets and web distribution rights are verified.
export const heroCharacters: readonly HeroCharacter[] = [
  { id: "woman", label: "Mujer", model: "/models/hero/woman.glb" },
  { id: "man", label: "Hombre", model: "/models/hero/man.glb" },
  { id: "child", label: "Niño", model: null },
];
export const CHARACTER_INTERVAL_MS = 3800;
export const hasCompleteCast = (characters: readonly HeroCharacter[]) =>
  characters.length === 3 && characters.every(({ model }) => Boolean(model));
export const availableCharacters = heroCharacters.filter((character) => character.model !== null);
