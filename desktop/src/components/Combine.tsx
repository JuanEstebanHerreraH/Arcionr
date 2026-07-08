// Combinar: subís PDFs e imágenes; cada PDF es una columna con sus páginas.
// Arrastrás páginas/imágenes entre columnas, borrás, y descargás cada PDF o todo junto.
import { useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Icon } from "./Icon";
import { pickFiles, readBytes, splitPath, writeBytes } from "../lib/fsutil";
import { getDoc, renderPage, buildMergedPdf, type MergeItem } from "../lib/pdf";
import { imageToPngBytes } from "../lib/convert";
import { detectCategory } from "../lib/formats";

interface Source { id: string; name: string; kind: "pdf" | "image"; path: string; bytes: Uint8Array }
interface Item { id: string; srcId: string; kind: "pdf" | "image"; pageIndex?: number; thumb?: string; label: string }
interface Lane { id: string; name: string; items: Item[] }
type Pos = { laneId: string; pos: number };

export function Combine({ notify }: { notify: (msg: string, kind?: "ok" | "error") => void }) {
  const sources = useRef<Record<string, Source>>({});
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({}); // clave: `${srcId}:${pageIndex}`
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<Pos | null>(null);
  const [over, setOver] = useState<Pos | null>(null);

  const addFiles = async () => {
    const paths = await pickFiles();
    for (const path of paths) {
      const { base, ext } = splitPath(path);
      const cat = detectCategory(ext);
      if (cat !== "pdf" && cat !== "image") continue;
      const id = crypto.randomUUID();
      const bytes = await readBytes(path);
      sources.current[id] = { id, name: base, kind: cat, path, bytes };

      if (cat === "pdf") {
        const doc = await getDoc(bytes);
        const items: Item[] = Array.from({ length: doc.numPages }, (_, i) => ({
          id: crypto.randomUUID(), srcId: id, kind: "pdf", pageIndex: i, label: `p${i + 1}`,
        }));
        setLanes((prev) => [...prev, { id: crypto.randomUUID(), name: base, items }]);
        for (let p = 1; p <= doc.numPages; p++) {
          const c = await renderPage(doc, p, 0.4);
          const url = c.toDataURL("image/png");
          setThumbs((t) => ({ ...t, [`${id}:${p - 1}`]: url }));
        }
      } else {
        const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const thumb = URL.createObjectURL(new Blob([bytes], { type: mime }));
        const item: Item = { id: crypto.randomUUID(), srcId: id, kind: "image", thumb, label: base };
        setLanes((prev) => {
          const lanes = prev.map((l) => ({ ...l, items: [...l.items] }));
          let img = lanes.find((l) => l.name === "Imágenes");
          if (!img) { img = { id: crypto.randomUUID(), name: "Imágenes", items: [] }; lanes.push(img); }
          img.items.push(item);
          return lanes;
        });
      }
    }
  };

  const thumbOf = (it: Item) => it.kind === "image" ? it.thumb : thumbs[`${it.srcId}:${it.pageIndex}`];

  const moveItem = (from: Pos, to: Pos) => {
    setLanes((prev) => {
      const lanes = prev.map((l) => ({ ...l, items: [...l.items] }));
      const src = lanes.find((l) => l.id === from.laneId);
      const dst = lanes.find((l) => l.id === to.laneId);
      if (!src || !dst) return prev;
      const [item] = src.items.splice(from.pos, 1);
      if (!item) return prev;
      let idx = to.pos;
      if (from.laneId === to.laneId && from.pos < to.pos) idx--;
      dst.items.splice(Math.max(0, Math.min(idx, dst.items.length)), 0, item);
      return lanes.filter((l) => l.items.length > 0 || l.name !== "Imágenes");
    });
  };

  const removeItem = (laneId: string, pos: number) =>
    setLanes((prev) => prev.map((l) => l.id === laneId ? { ...l, items: l.items.filter((_, i) => i !== pos) } : l));

  const removeLane = (laneId: string) => setLanes((prev) => prev.filter((l) => l.id !== laneId));
  const clearAll = () => { setLanes([]); sources.current = {}; };

  // --- Arrastre por puntero (entre columnas) ---
  const findPos = (x: number, y: number): Pos | null => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-lane]") as HTMLElement | null;
    if (!el) return null;
    const laneId = el.dataset.lane!;
    const pos = Number(el.dataset.pos);
    return Number.isNaN(pos) ? null : { laneId, pos };
  };
  const onDown = (e: RPointerEvent, laneId: string, pos: number) => {
    e.preventDefault();
    setDrag({ laneId, pos }); setOver({ laneId, pos });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => { if (!drag) return; const p = findPos(e.clientX, e.clientY); if (p) setOver(p); };
  const onUp = () => { if (drag && over) moveItem(drag, over); setDrag(null); setOver(null); };

  const laneToMerge = async (items: Item[]): Promise<MergeItem[]> => {
    const out: MergeItem[] = [];
    for (const it of items) {
      const s = sources.current[it.srcId];
      if (!s) continue;
      if (it.kind === "pdf") out.push({ kind: "pdf", pdfBytes: s.bytes, pageIndex: it.pageIndex });
      else out.push({ kind: "image", pngBytes: await imageToPngBytes(s.path) });
    }
    return out;
  };

  const exportItems = async (items: Item[], defaultName: string) => {
    if (!items.length) return notify("No hay páginas para exportar.", "error");
    setBusy(true);
    try {
      const pdf = await buildMergedPdf(await laneToMerge(items));
      const dest = await save({ defaultPath: `${defaultName}.pdf`, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!dest) return;
      await writeBytes(dest, pdf);
      notify("PDF guardado: " + dest, "ok");
    } catch (e) { notify("Error al exportar: " + String(e), "error"); }
    finally { setBusy(false); }
  };

  const combineAll = () => exportItems(lanes.flatMap((l) => l.items), "Combinado");

  return (
    <div>
      <div className="header">
        <h2>Combinar</h2>
        <p>Subí PDFs e imágenes. Arrastrá páginas o imágenes entre columnas, borrá lo que no quieras y descargá.</p>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={addFiles}><Icon name="plus" size={15} /> Agregar PDFs / imágenes</button>
        <div className="spacer" />
        {lanes.length ? <button className="btn ghost" onClick={clearAll}>Quitar todo</button> : null}
        <button className="btn primary" onClick={combineAll} disabled={busy || !lanes.length}>Combinar todo → 1 PDF</button>
      </div>

      {lanes.length === 0 ? (
        <div className="empty">Agregá PDFs o imágenes para empezar.</div>
      ) : (
        <div className="combine-board">
          {lanes.map((lane) => (
            <div className="lane" key={lane.id}>
              <div className="lane-head">
                <span className="lane-name" title={lane.name}>{lane.name}</span>
                <span className="count">{lane.items.length}</span>
                <div className="spacer" />
                <button className="btn ghost" style={{ padding: "4px 8px", minHeight: 0 }} onClick={() => exportItems(lane.items, lane.name)} disabled={busy}>Descargar</button>
                <button className="x" onClick={() => removeLane(lane.id)} title="Quitar columna">✕</button>
              </div>
              <div className="lane-body" data-lane={lane.id} data-pos={lane.items.length}>
                {lane.items.map((it, i) => (
                  <div
                    key={it.id}
                    data-lane={lane.id}
                    data-pos={i}
                    className={`pcard ${over && over.laneId === lane.id && over.pos === i && drag ? "over" : ""} ${drag && drag.laneId === lane.id && drag.pos === i ? "dragging" : ""}`}
                    onPointerDown={(e) => onDown(e, lane.id, i)}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                  >
                    {thumbOf(it) ? <img src={thumbOf(it)} alt={it.label} draggable={false} /> : <div className="thumb-ph">…</div>}
                    <button
                      className="corner-x"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={() => removeItem(lane.id, i)}
                      title="Eliminar"
                    >✕</button>
                    <div className="pcard-foot">
                      <span>{it.kind === "image" ? "img" : it.label}</span>
                    </div>
                  </div>
                ))}
                <div className="lane-drop" data-lane={lane.id} data-pos={lane.items.length}>soltar aquí</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
