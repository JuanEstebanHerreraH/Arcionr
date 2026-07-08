import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ThemeMode, applyTheme, getMode, setCustomBg, getCustomBg } from "../lib/theme";

export function Settings({
  outDir, omit, onSetDir,
}: {
  outDir: string | null;
  omit: boolean;
  onSetDir: (dir: string | null) => void;
}) {
  const [mode, setMode] = useState<ThemeMode>(getMode());
  const [bgOn, setBgOn] = useState<boolean>(!!getCustomBg());
  const [bg, setBg] = useState<string>(getCustomBg() || "#F3E1E6");

  const pick = (m: ThemeMode) => { setMode(m); applyTheme(m); };
  const toggleBg = (on: boolean) => { setBgOn(on); setCustomBg(on ? bg : null); };
  const changeBg = (c: string) => { setBg(c); if (bgOn) setCustomBg(c); };

  const chooseFolder = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (dir && !Array.isArray(dir)) onSetDir(dir);
  };

  return (
    <div>
      <div className="header"><h2>Ajustes</h2><p>Apariencia y destino de tus conversiones.</p></div>
      <div className="panel" style={{ maxWidth: 620 }}>
        <div className="field">
          <label>Tema</label>
          <div className="seg">
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
              <button key={m} className={mode === m ? "on" : ""} onClick={() => pick(m)}>
                {m === "light" ? "Claro" : m === "dark" ? "Oscuro" : "Sistema"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Fondo personalizado</label>
          <div className="row">
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={bgOn} onChange={(e) => toggleBg(e.target.checked)} />
              <span className="muted">Usar un color propio</span>
            </label>
            <input type="color" value={bg} onChange={(e) => changeBg(e.target.value)} disabled={!bgOn} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Carpeta de salida</label>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn" onClick={chooseFolder}>Elegir carpeta…</button>
            {outDir ? <button className="btn ghost" onClick={() => onSetDir(null)}>Volver al valor por defecto</button> : null}
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {outDir
              ? <>Todo se guarda en: <b>{outDir}</b></>
              : omit
                ? <>Guardando <b>junto a cada archivo</b> (subcarpeta <b>Arcionr/</b>). Elegí una carpeta si querés un lugar fijo.</>
                : <>Sin carpeta fija todavía. Por defecto se usará una subcarpeta <b>Arcionr/</b> junto a cada archivo.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
