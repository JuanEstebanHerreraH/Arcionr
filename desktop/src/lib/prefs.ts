// Preferencias de salida (persisten en localStorage).
const KEY_OUT = "arcionr.outdir";
const KEY_OMIT = "arcionr.omitdest";

/** Carpeta de salida elegida, o null = "junto a cada archivo" (subcarpeta Arcionr/). */
export function getOutputDir(): string | null {
  return localStorage.getItem(KEY_OUT);
}
export function setOutputDir(dir: string | null) {
  if (dir) localStorage.setItem(KEY_OUT, dir);
  else localStorage.removeItem(KEY_OUT);
}

/** El usuario aceptó guardar junto a cada archivo (omitió elegir carpeta fija). */
export function getOmitDest(): boolean {
  return localStorage.getItem(KEY_OMIT) === "1";
}
export function setOmitDest(v: boolean) {
  if (v) localStorage.setItem(KEY_OMIT, "1");
  else localStorage.removeItem(KEY_OMIT);
}
