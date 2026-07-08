import { Icon } from "./Icon";
import { Category } from "../lib/types";

export type Section = "inicio" | Category | "combinar" | "organizar" | "ajustes";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "image", label: "Imágenes", icon: "image" },
  { id: "audio", label: "Audio", icon: "audio" },
  { id: "video", label: "Video", icon: "video" },
  { id: "pdf", label: "PDF", icon: "pdf" },
  { id: "combinar", label: "Combinar", icon: "combine" },
  { id: "organizar", label: "Organizar", icon: "folder" },
];

export function Sidebar({
  section, setSection, counts, destLabel, destWarn,
}: {
  section: Section;
  setSection: (s: Section) => void;
  counts: Record<string, number>;
  destLabel: string;
  destWarn: boolean;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.svg" alt="Arcionr" />
        <div>
          <h1>Arcionr</h1>
          <small>conversor offline</small>
        </div>
      </div>

      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${section === n.id ? "active" : ""}`}
          onClick={() => setSection(n.id)}
        >
          <Icon name={n.icon} />
          <span>{n.label}</span>
          {counts[n.id] ? <span className="badge">{counts[n.id]}</span> : null}
        </button>
      ))}

      <div className="nav-spacer" />

      <button
        className={`nav-item ${section === "ajustes" ? "active" : ""}`}
        onClick={() => setSection("ajustes")}
      >
        <Icon name="settings" />
        <span>Ajustes</span>
      </button>

      <button className={`dest ${destWarn ? "warn" : ""}`} onClick={() => setSection("ajustes")} title="Cambiar en Ajustes">
        <span className="dest-cap">Se guarda en</span>
        <span className="dest-val">{destLabel}</span>
      </button>
    </aside>
  );
}
