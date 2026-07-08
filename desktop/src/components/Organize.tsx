// Organizador: elegís una carpeta y Arcionr crea subcarpetas y mueve cada archivo.
// Por tipo (Imagenes, Audio…) o, si querés, por extensión exacta (JPG, PNG, MP3…).
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Icon } from "./Icon";

interface OrganizeResult { ok: boolean; moved: Record<string, number>; error?: string }

export function Organize({ notify }: { notify: (msg: string, kind?: "ok" | "error") => void }) {
  const [dir, setDir] = useState<string | null>(null);
  const [byExtension, setByExtension] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const choose = async () => {
    const d = await open({ directory: true, multiple: false });
    if (d && !Array.isArray(d)) { setDir(d); setResult(null); }
  };

  const run = async () => {
    if (!dir) return;
    setBusy(true); setResult(null);
    try {
      const res = await invoke<OrganizeResult>("organize_folder", { dir, byExtension });
      if (!res.ok) throw new Error(res.error || "Error");
      setResult(res.moved);
      const total = Object.values(res.moved).reduce((a, b) => a + b, 0);
      notify(`Listo: ${total} archivo(s) organizado(s).`, "ok");
    } catch (e) {
      notify("No se pudo organizar: " + String(e), "error");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="header">
        <h2>Organizar carpeta</h2>
        <p>Elegí una carpeta y Arcionr crea subcarpetas y mueve cada archivo a la suya.</p>
      </div>

      <div className="panel" style={{ maxWidth: 620 }}>
        <div className="warnbox">
          <b>Cuidado:</b> esto <b>mueve</b> los archivos dentro de la carpeta (no hace copias).
          Los desconocidos van a <i>Otros</i>. Las subcarpetas existentes no se tocan.
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Cómo separar</label>
          <div className="seg">
            <button className={!byExtension ? "on" : ""} onClick={() => setByExtension(false)}>Por tipo</button>
            <button className={byExtension ? "on" : ""} onClick={() => setByExtension(true)}>Por extensión</button>
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {byExtension
              ? "Una carpeta por cada extensión: JPG, PNG, MP3, WAV…"
              : "Carpetas por tipo: Imagenes, Audio, Video, PDF, Documentos, Comprimidos."}
          </p>
        </div>

        <div className="row" style={{ marginTop: 6, flexWrap: "wrap" }}>
          <button className="btn" onClick={choose}><Icon name="folder" size={15} /> Elegir carpeta…</button>
          <button className="btn primary" onClick={run} disabled={!dir || busy}>
            {busy ? "Organizando…" : "Organizar"}
          </button>
        </div>
        {dir ? <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>Carpeta: <b>{dir}</b></p> : null}

        {result ? (
          <div style={{ marginTop: 16 }}>
            <label style={{ fontWeight: 600 }}>Resultado</label>
            <table className="queue" style={{ marginTop: 6 }}>
              <tbody>
                {Object.entries(result).map(([bucket, n]) => (
                  <tr key={bucket}><td>{bucket}</td><td className="muted">{n} archivo(s)</td></tr>
                ))}
                {Object.keys(result).length === 0 ? <tr><td className="muted">No había archivos sueltos para mover.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
