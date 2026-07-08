import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Target } from "./lib/convert";
import { convertImage, imagesToPdf } from "./lib/convert";
import { saveImage, saveForShare, shareFile } from "./lib/save";

type Status = "pending" | "working" | "done" | "error";
interface Item {
  id: string;
  file: File;
  name: string;      // nombre sin extensión
  target: Target;
  status: Status;
  thumb: string;
  uri?: string;      // ubicación del archivo convertido
  msg?: string;
}

const TARGETS: Target[] = ["png", "jpg", "webp"];
const STATUS_LABEL: Record<Status, string> = { pending: "", working: "Convirtiendo…", done: "Guardado", error: "Error" };

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<Target>("jpg");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "error" } | null>(null);
  const [dark, setDark] = useState(document.documentElement.getAttribute("data-theme") === "dark");
  const inputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, kind: "ok" | "error" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setDark(!dark);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const created: Item[] = files.map((file) => {
      const dot = file.name.lastIndexOf(".");
      return {
        id: crypto.randomUUID(),
        file,
        name: dot > 0 ? file.name.slice(0, dot) : file.name,
        target,
        status: "pending",
        thumb: URL.createObjectURL(file),
      };
    });
    setItems((prev) => [...prev, ...created]);
    e.target.value = "";
  };

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) =>
    setItems((prev) => { const it = prev.find((x) => x.id === id); if (it) URL.revokeObjectURL(it.thumb); return prev.filter((x) => x.id !== id); });
  const clearAll = () => { items.forEach((i) => URL.revokeObjectURL(i.thumb)); setItems([]); };

  const setAllTarget = (t: Target) => { setTarget(t); setItems((prev) => prev.map((i) => (i.status === "done" ? i : { ...i, target: t }))); };

  // Compartir sin que la cancelación del usuario cuente como error
  // (Android a veces reporta "cancelado" aunque el compartir haya salido bien).
  const doShare = (uri: string, name: string) => { shareFile(uri, name).catch(() => {}); };

  const convertAll = async () => {
    if (!items.length) return;
    setBusy(true);
    let ok = 0, fail = 0, gallery = 0;
    for (const it of items) {
      if (it.status === "done") continue;
      update(it.id, { status: "working", msg: undefined });
      await new Promise((r) => setTimeout(r, 0));
      try {
        const blob = await convertImage(it.file, it.target);
        const { uri, inGallery, galleryError } = await saveImage(blob, `${it.name}.${it.target}`);
        if (inGallery) gallery++;
        update(it.id, {
          status: "done",
          uri,
          msg: inGallery ? "Guardada en la galería" : galleryError ? `Galería: ${galleryError}` : "Lista para compartir",
        });
        ok++;
      } catch (err) {
        update(it.id, { status: "error", msg: String(err) });
        fail++;
      }
    }
    setBusy(false);
    notify(
      `${ok} convertida(s)` + (gallery ? `, ${gallery} en la galería` : "") + (fail ? `, ${fail} con error` : ""),
      fail ? "error" : "ok"
    );
  };

  const makePdf = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const pdf = await imagesToPdf(items.map((i) => i.file));
      const uri = await saveForShare(pdf, "Arcionr.pdf");
      notify("PDF listo. En el menú, tocá “Guardar en archivos” para descargarlo.", "ok");
      doShare(uri, "Arcionr.pdf");
    } catch (err) {
      notify("No se pudo crear el PDF: " + String(err), "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="app">
      <header className="topbar">
        <img src="/logo.svg" alt="Arcionr" />
        <div>
          <h1>Arcionr</h1>
          <small>conversor offline</small>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={toggleTheme} aria-label="Cambiar tema">{dark ? "☾" : "☀"}</button>
      </header>

      <main className="content">
        <p className="hint">Convertí imágenes entre PNG, JPG y WEBP sin conexión. Los resultados se <b>guardan en tu galería</b> y también podés <b>compartirlos</b>.</p>

        <div className="addzone">
          <div className="big">Agregá tus imágenes</div>
          <button className="btn primary" onClick={() => inputRef.current?.click()}>Elegir imágenes</button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        </div>

        {items.length > 0 && (
          <>
            <div className="rowlabel">
              <span className="l">Convertir todo a</span>
              <span className="grow" />
              <button className="btn ghost" onClick={clearAll} style={{ padding: "6px 10px", minHeight: 0 }}>Quitar todo</button>
            </div>
            <div className="seg">
              {TARGETS.map((t) => (
                <button key={t} className={target === t ? "on" : ""} onClick={() => setAllTarget(t)}>{t.toUpperCase()}</button>
              ))}
            </div>

            <div className="rowlabel">
              <span className="l">Imágenes</span>
              <span className="count">{items.length}</span>
            </div>

            {items.map((it) => (
              <div className="card" key={it.id}>
                <img className="thumb" src={it.thumb} alt="" />
                <div className="info">
                  <div className="name">{it.name}</div>
                  <div className="meta">{(it.file.size / 1024).toFixed(0)} KB · a {it.target.toUpperCase()}</div>
                  {it.status !== "pending" && (
                    <div className={`status ${it.status}`}>
                      {it.status === "done" ? (it.msg || "Listo") : STATUS_LABEL[it.status]}
                      {it.status === "error" && it.msg ? `: ${it.msg}` : ""}
                    </div>
                  )}
                </div>
                {it.status === "done" && it.uri ? (
                  <button className="share" onClick={() => doShare(it.uri!, `${it.name}.${it.target}`)}>Compartir</button>
                ) : (
                  <>
                    <select value={it.target} onChange={(e) => update(it.id, { target: e.target.value as Target })}>
                      {TARGETS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <button className="x" onClick={() => remove(it.id)} aria-label="Quitar">✕</button>
                  </>
                )}
              </div>
            ))}

            <button className="btn block" style={{ marginTop: 10 }} onClick={makePdf} disabled={busy}>Imágenes → PDF</button>
          </>
        )}

        {items.length === 0 && <div className="empty">Todavía no agregaste imágenes.</div>}
      </main>

      {items.length > 0 && (
        <div className="actionbar">
          <button className="btn primary block" onClick={convertAll} disabled={busy}>
            {busy ? "Convirtiendo…" : "Convertir y guardar"}
          </button>
        </div>
      )}

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </div>
  );
}
