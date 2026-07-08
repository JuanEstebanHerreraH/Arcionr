import { ReactNode, useState } from "react";
import { FileItem, Category } from "../lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "En espera", working: "Convirtiendo…", done: "Listo", error: "Error",
};

export function FileQueue({
  category, items, targets, onUpdate, onRemove, onConvert, onManage, onClearAll, extraActions,
}: {
  category: Category;
  items: FileItem[];
  targets: string[];
  onUpdate: (id: string, patch: Partial<FileItem>) => void;
  onRemove: (id: string) => void;
  onConvert: (ids: string[]) => void;
  onManage?: (item: FileItem) => void;   // sólo PDF: gestionar páginas de ESE archivo
  onClearAll?: () => void;               // quitar todos los archivos de esta sección
  extraActions?: ReactNode;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const allChecked = items.length > 0 && sel.size === items.length;

  const toggle = (id: string) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(items.map((i) => i.id)));

  const targetIds = () => (sel.size ? [...sel] : items.map((i) => i.id));
  const bulkTarget = (t: string) => targetIds().forEach((id) => onUpdate(id, { target: t }));

  if (items.length === 0)
    return <div className="empty">No hay archivos de este tipo. Agregalos desde <b>Inicio</b>.</div>;

  return (
    <div>
      <div className="toolbar">
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          <span className="muted">{sel.size ? `${sel.size} seleccionado(s)` : "Seleccionar todo"}</span>
        </label>

        <div className="row" style={{ gap: 6 }}>
          <span className="muted">Convertir a</span>
          <select className="fmt" defaultValue="" onChange={(e) => e.target.value && bulkTarget(e.target.value)}>
            <option value="" disabled>elegir…</option>
            {targets.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="spacer" />
        {onClearAll ? <button className="btn ghost" onClick={onClearAll}>Quitar todos</button> : null}
        {extraActions}
        <button className="btn primary" onClick={() => onConvert(targetIds())}>
          Convertir {sel.size ? "seleccionados" : "todo"}
        </button>
      </div>

      <table className="queue">
        <thead>
          <tr>
            <th></th><th>Archivo</th><th>Origen</th>
            {category === "pdf" ? <th>Páginas</th> : null}
            <th>Convertir a</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td><input type="checkbox" checked={sel.has(it.id)} onChange={() => toggle(it.id)} /></td>
              <td className="name" title={it.path}>{it.name}</td>
              <td><span className={`badge ${category}`}>{it.ext}</span></td>
              {category === "pdf" ? (
                <td className="muted">{it.pages != null ? `${it.pages} pág.` : "…"}</td>
              ) : null}
              <td>
                <select className="fmt" value={it.target} onChange={(e) => onUpdate(it.id, { target: e.target.value })}>
                  {targets.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td>
                <span className={`status ${it.status}`}>{STATUS_LABEL[it.status]}</span>
                {it.message && (it.status === "error" || it.status === "done")
                  ? <div className="muted" style={{ fontSize: 11, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }} title={it.message}>{it.message}</div>
                  : null}
              </td>
              <td>
                <div className="row" style={{ gap: 4 }}>
                  {onManage ? <button className="btn ghost" onClick={() => onManage(it)}>Páginas</button> : null}
                  <button className="btn ghost" onClick={() => onRemove(it.id)}>Quitar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
