// Modo de entrada global: soltás/elegís archivos o una carpeta (que puede mezclar
// MP3, WAV, JPG, etc.), Arcionr detecta a qué formato se puede convertir cada uno
// y te muestra tarjetas por categoría que te llevan a su sección.
import { useState } from "react";
import { Icon } from "./Icon";
import { Section } from "./Sidebar";
import { FileItem, Category } from "../lib/types";
import { CATEGORY_LABEL, TARGETS } from "../lib/formats";
import { pickFiles, pickFolder } from "../lib/fsutil";

const CATS: Exclude<Category, "unknown">[] = ["image", "audio", "video", "pdf"];

export function Intake({
  items, addPaths, setSection, clearAll,
}: {
  items: FileItem[];
  addPaths: (paths: string[]) => void;
  setSection: (s: Section) => void;
  clearAll: () => void;
}) {
  const [drag, setDrag] = useState(false);

  const counts = CATS.reduce((acc, c) => {
    acc[c] = items.filter((i) => i.category === c).length;
    return acc;
  }, {} as Record<Category, number>);
  const unknown = items.filter((i) => i.category === "unknown").length;

  return (
    <div>
      <div className="header">
        <h2>Soltá tus archivos</h2>
        <p>Una carpeta puede mezclar formatos: Arcionr los ordena por tipo y te dice a qué se pueden convertir.</p>
      </div>

      <div className="note">
        <Icon name="settings" size={15} />
        <span>El destino de tus conversiones se define en <b>Ajustes → Carpeta de salida</b>. Por defecto se guardan junto a cada archivo.</span>
      </div>

      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); }}
      >
        <div style={{ fontSize: 15, marginBottom: 4 }}>Arrastrá archivos aquí</div>
        <div className="muted">o elegilos manualmente</div>
        <div className="dz-actions">
          <button className="btn" onClick={async () => addPaths(await pickFiles())}>
            <Icon name="plus" size={15} /> Elegir archivos
          </button>
          <button className="btn" onClick={async () => addPaths(await pickFolder())}>
            <Icon name="folder" size={15} /> Elegir carpeta
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="toolbar" style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Detectado</h2>
            <span className="muted">{items.length} archivo(s)</span>
            <div className="spacer" />
            <button className="btn ghost" onClick={clearAll}>Quitar todo</button>
          </div>
          <div className="cat-grid">
            {CATS.filter((c) => counts[c] > 0).map((c) => (
              <button key={c} className="cat-card" onClick={() => setSection(c)}>
                <span className="n">{counts[c]}</span>
                <span className="l">{CATEGORY_LABEL[c]}</span>
                <span className="s">a {TARGETS[c].slice(0, 4).join(", ")}…</span>
              </button>
            ))}
          </div>
          {unknown > 0 && (
            <p className="muted" style={{ marginTop: 12 }}>
              {unknown} archivo(s) sin formato compatible (se ignoran al convertir).
            </p>
          )}
        </>
      )}
    </div>
  );
}
