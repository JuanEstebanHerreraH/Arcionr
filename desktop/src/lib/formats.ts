import { Category } from "./types";

// Extensiones de origen reconocidas por categoría.
const SOURCE: Record<Exclude<Category, "unknown">, string[]> = {
  image: ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff", "svg", "avif", "heic"],
  audio: ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "wma"],
  video: ["mp4", "mkv", "webm", "mov", "avi", "m4v", "flv", "wmv"],
  pdf:   ["pdf"],
};

// Formatos destino ofrecidos por categoría (el primero es el default).
export const TARGETS: Record<Exclude<Category, "unknown">, string[]> = {
  image: ["png", "jpg", "webp", "bmp", "gif", "tiff", "svg"],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "opus"],
  video: ["mp4", "mkv", "webm", "mov", "avi", "mp3 (audio)", "gif"],
  pdf:   ["png", "jpg"],
};

export const CATEGORY_LABEL: Record<Category, string> = {
  image: "Imágenes",
  audio: "Audio",
  video: "Video",
  pdf: "PDF",
  unknown: "Sin soporte",
};

export function detectCategory(ext: string): Category {
  const e = ext.toLowerCase();
  for (const cat of Object.keys(SOURCE) as (keyof typeof SOURCE)[]) {
    if (SOURCE[cat].includes(e)) return cat;
  }
  return "unknown";
}

export function defaultTarget(cat: Category): string {
  if (cat === "unknown") return "";
  return TARGETS[cat][0];
}
