// Gestión de temas: claro / oscuro / sistema + color de fondo personalizado.
// Persistencia en localStorage (funciona en la webview real de Tauri).

export type ThemeMode = "light" | "dark" | "system";

const KEY_MODE = "arcionr.theme";
const KEY_BG = "arcionr.custombg";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(KEY_MODE, mode);
}

export function getMode(): ThemeMode {
  return (localStorage.getItem(KEY_MODE) as ThemeMode) || "system";
}

export function setCustomBg(color: string | null) {
  const root = document.documentElement;
  if (color) {
    root.style.setProperty("--bg-custom", color);
    root.setAttribute("data-custombg", "on");
    localStorage.setItem(KEY_BG, color);
  } else {
    root.removeAttribute("data-custombg");
    localStorage.removeItem(KEY_BG);
  }
}

export function getCustomBg(): string | null {
  return localStorage.getItem(KEY_BG);
}

export function initTheme() {
  applyTheme(getMode());
  const bg = getCustomBg();
  if (bg) setCustomBg(bg);
  // Reaccionar a cambios del sistema cuando el modo es "system".
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getMode() === "system") applyTheme("system");
  });
}
