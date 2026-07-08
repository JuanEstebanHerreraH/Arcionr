import { useEffect, useState, useCallback } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { Sidebar, Section } from "./components/Sidebar";
import { Intake } from "./components/Intake";
import { FileQueue } from "./components/FileQueue";
import { PdfManager } from "./components/PdfManager";
import { Organize } from "./components/Organize";
import { Combine } from "./components/Combine";
import { Settings } from "./components/Settings";
import { FileItem, Category } from "./lib/types";
import { detectCategory, defaultTarget, TARGETS, CATEGORY_LABEL } from "./lib/formats";
import { splitPath, writeBytes, readBytes } from "./lib/fsutil";
import { convertItem, imageToPngBytes } from "./lib/convert";
import { pngListToPdf, pageCount } from "./lib/pdf";
import { getOutputDir, setOutputDir, getOmitDest, setOmitDest } from "./lib/prefs";

interface Toast { id: string; msg: string; kind: "ok" | "error" | "info" }

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [section, setSection] = useState<Section>("inicio");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pdfItem, setPdfItem] = useState<FileItem | null>(null);

  const [outDir, setOutDirState] = useState<string | null>(getOutputDir());
  const [omit, setOmitState] = useState<boolean>(getOmitDest());
  const [pending, setPending] = useState<string[] | null>(null); // ids esperando destino

  const notify = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const addPaths = useCallback((paths: string[]) => {
    if (!paths.length) return;
    setItems((prev) => {
      const existing = new Set(prev.map((p) => p.path));
      const created: FileItem[] = [];
      for (const path of paths) {
        if (existing.has(path)) continue;
        const { base, ext } = splitPath(path);
        const category = detectCategory(ext);
        created.push({
          id: crypto.randomUUID(), path, name: base, ext, category,
          target: defaultTarget(category), status: "pending",
        });
      }
      // Conteo de páginas para PDFs nuevos (asíncrono).
      created.filter((i) => i.category === "pdf").forEach(async (it) => {
        try {
          const n = await pageCount(await readBytes(it.path));
          setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, pages: n } : x)));
        } catch { /* ignora si no se puede leer */ }
      });
      return [...prev, ...created];
    });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent((ev) => {
          if (ev.payload.type === "drop") addPaths(ev.payload.paths);
        });
      } catch { /* fuera de Tauri: sin drag-drop nativo */ }
    })();
    return () => { unlisten?.(); };
  }, [addPaths]);

  const updateItem = (id: string, patch: Partial<FileItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearAll = () => { setItems([]); setPdfItem(null); notify("Se quitó todo lo cargado.", "ok"); };
  const clearCategory = (cat: Category) => {
    setItems((prev) => prev.filter((i) => i.category !== cat));
    if (cat === "pdf") setPdfItem(null);
    notify(`Se quitaron los archivos de ${CATEGORY_LABEL[cat]}.`, "ok");
  };

  const setDir = (dir: string | null) => {
    setOutputDir(dir); setOutDirState(dir);
    if (dir) { setOmitDest(false); setOmitState(false); }
  };

  // --- Guardia de destino antes de convertir ---
  const requestConvert = (ids: string[]) => {
    if (!getOutputDir() && !getOmitDest()) { setPending(ids); return; }
    convertIds(ids);
  };
  const chooseFolderThenConvert = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (dir && !Array.isArray(dir)) {
      setDir(dir);
      const ids = pending; setPending(null);
      if (ids) convertIds(ids);
    }
  };
  const omitThenConvert = () => {
    setOmitDest(true); setOmitState(true);
    const ids = pending; setPending(null);
    if (ids) convertIds(ids);
  };

  const convertIds = async (ids: string[]) => {
    let ok = 0, fail = 0;
    for (const id of ids) {
      const item = items.find((i) => i.id === id);
      if (!item || item.category === "unknown") continue;
      updateItem(id, { status: "working", message: undefined });
      // Cede el hilo para que la UI pinte el estado antes del trabajo pesado.
      await new Promise((r) => setTimeout(r, 0));
      try {
        const out = await convertItem({ ...item });
        updateItem(id, { status: "done", message: out });
        ok++;
      } catch (e) {
        updateItem(id, { status: "error", message: String(e) });
        fail++;
      }
    }
    notify(`Conversión terminada: ${ok} ok${fail ? `, ${fail} con error` : ""}`, fail ? "error" : "ok");
  };

  const imagesToPdf = async () => {
    const imgs = items.filter((i) => i.category === "image");
    if (!imgs.length) return notify("No hay imágenes en la cola.", "error");
    try {
      notify("Generando PDF…", "info");
      const pngs: Uint8Array[] = [];
      for (const im of imgs) pngs.push(await imageToPngBytes(im.path));
      const pdf = await pngListToPdf(pngs);
      const dest = await save({ defaultPath: "Arcionr.pdf", filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!dest) return;
      await writeBytes(dest, pdf);
      notify("PDF creado: " + dest, "ok");
    } catch (e) { notify("Error creando PDF: " + String(e), "error"); }
  };

  const counts: Record<string, number> = {};
  (["image", "audio", "video", "pdf"] as Category[]).forEach(
    (c) => (counts[c] = items.filter((i) => i.category === c).length)
  );

  const destLabel = outDir ? splitPath(outDir).base : "Junto a cada archivo";
  const destWarn = !outDir;

  const renderSection = () => {
    if (section === "inicio")
      return <Intake items={items} addPaths={addPaths} setSection={setSection} clearAll={clearAll} />;
    if (section === "organizar") return <Organize notify={notify} />;
    if (section === "combinar") return <Combine notify={notify} />;
    if (section === "ajustes") return <Settings outDir={outDir} omit={omit} onSetDir={setDir} />;

    const cat = section as Category;
    const catItems = items.filter((i) => i.category === cat);

    if (cat === "pdf" && pdfItem)
      return <PdfManager item={pdfItem} onClose={() => setPdfItem(null)} notify={notify} />;

    return (
      <div>
        <div className="header">
          <h2>{CATEGORY_LABEL[cat]}</h2>
          <p>
            {cat === "pdf"
              ? "Convertí PDF a imágenes, o entrá a “Páginas” para reordenar/eliminar."
              : "Elegí el formato de cada archivo o aplicá uno a todos."}
          </p>
        </div>
        <div className="panel">
          <FileQueue
            category={cat}
            items={catItems}
            targets={TARGETS[cat as Exclude<Category, "unknown">]}
            onUpdate={updateItem}
            onRemove={removeItem}
            onConvert={requestConvert}
            onManage={cat === "pdf" ? (it) => setPdfItem(it) : undefined}
            onClearAll={catItems.length ? () => clearCategory(cat) : undefined}
            extraActions={
              cat === "image"
                ? <button className="btn" onClick={imagesToPdf}>Imágenes → PDF</button>
                : null
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <Sidebar section={section} setSection={setSection} counts={counts} destLabel={destLabel} destWarn={destWarn} />
      <main className="main">{renderSection()}</main>

      {pending !== null && (
        <div className="modal-overlay" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>¿Dónde guardo las conversiones?</h3>
            <p className="muted">Todavía no elegiste una carpeta fija. Elegí una, o guardá junto a cada archivo original.</p>
            <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={chooseFolderThenConvert}>Elegir carpeta…</button>
              <button className="btn" onClick={omitThenConvert}>Guardar junto a cada archivo</button>
              <button className="btn ghost" onClick={() => setPending(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}
