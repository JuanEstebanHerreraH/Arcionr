// Conversión de imágenes en el WebView (sin código nativo): el sistema hace los códecs.
import { PDFDocument } from "pdf-lib";

export type Target = "png" | "jpg" | "webp";

const MIME: Record<Target, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("No se pudo leer la imagen (formato no soportado por el dispositivo)"));
    i.src = src;
  });
}

export async function convertImage(file: File | Blob, target: Target, quality = 0.9): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 1024;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo convertir"))), MIME[target], quality)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const f of files) {
    const png = await convertImage(f, "png");
    const bytes = new Uint8Array(await png.arrayBuffer());
    const img = await pdf.embedPng(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const out = await pdf.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}
