// Gestor de páginas: ver, reordenar (arrastrando con el mouse) y eliminar, luego exportar.
// Usa eventos de puntero en vez de HTML5 drag-and-drop, porque Tauri intercepta
// el arrastrar-soltar nativo y bloquea el DnD del navegador dentro de la ventana.
import { useEffect, useRef, useState } from "react";
import { FileItem } from "../lib/types";
import { readBytes, writeBytes, outputPath } from "../lib/fsutil";
import { getDoc, renderPage, rebuildPdf } from "../lib/pdf";

export function PdfManager({ item, onClose, notify }: {
  item: FileItem;
  onClose: () => void;
  notify: (msg: string, kind?: "ok" | "error") => void;
}) {
  const [order, setOrder] = useState<number[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(true);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [overPos, setOverPos] = useState<number | null>(null);
  const bytesRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const bytes = await readBytes(item.path);
        bytesRef.current = bytes;
        const doc = await getDoc(bytes);
        if (!alive) return;
        setOrder(Array.from({ length: doc.numPages }, (_, i) => i));
        const t: Record<number, string> = {};
        for (let p = 1; p <= doc.numPages; p++) {
          const c = await renderPage(doc, p, 0.4);
          t[p - 1] = c.toDataURL("image/png");
          if (!alive) return;
          setThumbs({ ...t });
        }
      } catch (e) {
        notify("No se pudo abrir el PDF: " + String(e), "error");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [item.id]);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const n = [...order];
    const [moved] = n.splice(from, 1);
    n.splice(to, 0, moved);
    setOrder(n);
  };
  const remove = (pos: number) => setOrder(order.filter((_, i) => i !== pos));

  // --- Reordenamiento por puntero ---
  const posUnderPointer = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-pos]") as HTMLElement | null;
    if (!el) return null;
    const p = Number(el.dataset.pos);
    return Number.isNaN(p) ? null : p;
  };
  const onPointerDown = (e: React.PointerEvent, pos: number) => {
    e.preventDefault();
    setDragPos(pos); setOverPos(pos);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragPos === null) return;
    const p = posUnderPointer(e.clientX, e.clientY);
    if (p !== null) setOverPos(p);
  };
  const onPointerUp = () => {
    if (dragPos !== null && overPos !== null) reorder(dragPos, overPos);
    setDragPos(null); setOverPos(null);
  };

  const exportPdf = async () => {
    if (!bytesRef.current) return;
    if (order.length === 0) return notify("No quedan páginas para exportar.", "error");
    try {
      const out = await rebuildPdf(bytesRef.current, order);
      const path = await writeBytes(outputPath(item.path, "pdf", "-editado"), out);
      notify("PDF exportado: " + path, "ok");
      onClose();
    } catch (e) { notify("Error al exportar: " + String(e), "error"); }
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn ghost" onClick={onClose}>← Volver</button>
        <b>{item.name}</b>
        <span className="muted">{order.length} página(s)</span>
        <div className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>Arrastrá para reordenar</span>
        <button className="btn primary" onClick={exportPdf} disabled={busy}>Exportar PDF</button>
      </div>

      {busy && order.length === 0 ? <div className="empty">Cargando páginas…</div> : (
        <div className="pages">
          {order.map((orig, pos) => (
            <div
              key={orig}
              data-pos={pos}
              className={`page-card ${overPos === pos && dragPos !== null ? "over" : ""} ${dragPos === pos ? "dragging" : ""}`}
              onPointerDown={(e) => onPointerDown(e, pos)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {thumbs[orig] ? <img src={thumbs[orig]} alt={`Página ${orig + 1}`} draggable={false} /> : <div className="thumb-ph">…</div>}
              <button
                className="corner-x"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={() => remove(pos)}
                title="Eliminar página"
              >✕</button>
              <div className="ptools">
                <span className="pnum">pág. {orig + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
