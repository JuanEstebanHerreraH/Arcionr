// Operaciones PDF 100% en el front (sin binarios externos):
//   - pdf.js  -> render/miniaturas y PDF -> imagen
//   - pdf-lib -> Imágenes -> PDF, reordenar y eliminar páginas
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function getDoc(bytes: Uint8Array) {
  // pdf.js transfiere el ArrayBuffer subyacente al worker (para no copiarlo),
  // lo que lo deja vacío en el hilo principal ("detached"). Si el mismo
  // Uint8Array se reutiliza después -p. ej. para exportar con pdf-lib en
  // rebuildPdf/buildMergedPdf- aparece con longitud 0 y pdf-lib falla con
  // "No PDF header found". Le pasamos una copia (.slice()) para que el
  // array original de quien nos llama nunca se vea afectado.
  return await pdfjs.getDocument({ data: bytes.slice() }).promise;
}

export async function renderPage(
  doc: Awaited<ReturnType<typeof getDoc>>,
  pageNumber: number,
  scale = 1.2
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function canvasToBytes(canvas: HTMLCanvasElement, mime = "image/png", quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("No se pudo exportar el lienzo"));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      mime,
      quality
    );
  });
}

// Imágenes (ya en PNG) -> un único PDF.
export async function pngListToPdf(pngList: Uint8Array[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const png of pngList) {
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdf.save();
}

// Reordenar / eliminar páginas: `order` es la lista de índices (0-based) a conservar, en el orden deseado.
export async function rebuildPdf(originalBytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(originalBytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return await out.save();
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  const src = await PDFDocument.load(bytes);
  return src.getPageCount();
}

// --- Combinar páginas de PDF e imágenes en un solo PDF ---
export interface MergeItem {
  kind: "pdf" | "image";
  pdfBytes?: Uint8Array;   // pdf: bytes del PDF de origen
  pageIndex?: number;      // pdf: índice de página (0-based)
  pngBytes?: Uint8Array;   // image: bytes PNG a incrustar
}

export async function buildMergedPdf(items: MergeItem[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const cache = new Map<Uint8Array, PDFDocument>();
  for (const it of items) {
    if (it.kind === "pdf" && it.pdfBytes && it.pageIndex != null) {
      let src = cache.get(it.pdfBytes);
      if (!src) { src = await PDFDocument.load(it.pdfBytes); cache.set(it.pdfBytes, src); }
      const [p] = await out.copyPages(src, [it.pageIndex]);
      out.addPage(p);
    } else if (it.kind === "image" && it.pngBytes) {
      const img = await out.embedPng(it.pngBytes);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
  }
  return out.save();
}
