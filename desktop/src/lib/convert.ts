// Despacho de conversión por categoría.
//   imagen raster -> comando Rust (crate image)
//   SVG           -> rasterizado en canvas (png/jpg/webp)
//   raster -> SVG -> vectorización real (trazado) con imagetracerjs
//   audio/video   -> sidecar ffmpeg (plugin shell)
//   pdf           -> render por página a imagen (pdf.js)
import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import ImageTracer from "imagetracerjs";
import { FileItem } from "./types";
import { outputPath, outputFolder, readBytes, writeBytes, splitPath } from "./fsutil";
import { getDoc, renderPage, canvasToBytes } from "./pdf";

interface RustConvert { ok: boolean; output?: string; error?: string }

const CANVAS_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
// Formatos que el crate `image` de Rust decodifica de forma confiable.
const RUST_READABLE = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"];

async function decodeToCanvas(path: string): Promise<HTMLCanvasElement> {
  const { ext } = splitPath(path);
  const bytes = await readBytes(path);
  const mime = ext === "svg" ? "image/svg+xml" : CANVAS_MIME[ext] ?? "image/png";
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("No se pudo decodificar la imagen"));
      img.src = url;
    });
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Convierte cualquier imagen a PNG (para Imágenes -> PDF).
 *  Usa Rust para formatos raster (incluye TIFF, que el canvas no decodifica). */
export async function imageToPngBytes(path: string): Promise<Uint8Array> {
  const { ext } = splitPath(path);
  if (ext === "svg") return canvasToBytes(await decodeToCanvas(path), "image/png");
  if (RUST_READABLE.includes(ext)) {
    const arr = await invoke<number[]>("image_to_png_bytes", { input: path });
    return new Uint8Array(arr);
  }
  return canvasToBytes(await decodeToCanvas(path), "image/png"); // fallback (avif/heic…)
}

/** Vectorización real (trazado) raster -> SVG. Interpretativa y con pérdida:
 *  ideal para logos/ilustraciones de color plano, no para fotografías. */
async function rasterToSvg(path: string): Promise<string> {
  const canvas = await decodeToCanvas(path);
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return ImageTracer.imagedataToSVG(imgData, "detailed");
}

function ffArgs(item: FileItem, out: string): string[] {
  const t = item.target;
  if (item.category === "audio") return ["-y", "-i", item.path, out];
  if (t.startsWith("mp3")) return ["-y", "-i", item.path, "-vn", "-q:a", "2", out];
  if (t === "gif") return ["-y", "-i", item.path, "-vf", "fps=12,scale=480:-1:flags=lanczos", out];
  return ["-y", "-i", item.path, out];
}

function targetExt(item: FileItem): string {
  return item.target.startsWith("mp3") ? "mp3" : item.target;
}

/** Convierte un ítem. Devuelve la ruta (o resumen) de salida. */
export async function convertItem(item: FileItem): Promise<string> {
  const ext = targetExt(item);

  if (item.category === "image") {
    // raster -> SVG (vectorizar)
    if (ext === "svg") {
      if (item.ext === "svg") throw new Error("El archivo ya es un SVG.");
      const svg = await rasterToSvg(item.path);
      return writeBytes(outputPath(item.path, "svg"), new TextEncoder().encode(svg));
    }
    // SVG -> raster (rasterizar)
    if (item.ext === "svg") {
      const mime = CANVAS_MIME[ext];
      if (!mime) throw new Error("Desde SVG sólo se puede exportar a png, jpg o webp.");
      const bytes = await canvasToBytes(await decodeToCanvas(item.path), mime);
      return writeBytes(outputPath(item.path, ext), bytes);
    }
    // raster -> raster (motor Rust)
    const out = outputPath(item.path, ext === "jpg" ? "jpg" : ext);
    const res = await invoke<RustConvert>("convert_image", {
      input: item.path, output: out, format: ext, quality: 85,
    });
    if (!res.ok) throw new Error(res.error || "Error de conversión");
    return res.output!;
  }

  if (item.category === "audio" || item.category === "video") {
    const out = outputPath(item.path, ext);
    const result = await Command.sidecar("binaries/ffmpeg", ffArgs(item, out)).execute();
    if (result.code !== 0) throw new Error(shortErr(result.stderr));
    return out;
  }

  if (item.category === "pdf") {
    const bytes = await readBytes(item.path);
    const doc = await getDoc(bytes);
    const mime = ext === "jpg" ? "image/jpeg" : "image/png";
    for (let p = 1; p <= doc.numPages; p++) {
      const canvas = await renderPage(doc, p, 1.5);
      const imgBytes = await canvasToBytes(canvas, mime);
      await writeBytes(outputPath(item.path, ext, `-p${String(p).padStart(2, "0")}`), imgBytes);
    }
    return `${doc.numPages} pág. → ${outputFolder(item.path)}`;
  }

  throw new Error("Formato sin soporte");
}

function shortErr(stderr: string): string {
  const lines = stderr.trim().split("\n");
  return lines[lines.length - 1] || "ffmpeg falló";
}
