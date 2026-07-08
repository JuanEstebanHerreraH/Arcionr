// Utilidades de archivos: diálogos, E/S por ruta y derivación de rutas de salida.
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getOutputDir } from "./prefs";

export function splitPath(path: string) {
  const norm = path.replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/");
  const dir = idx >= 0 ? path.slice(0, idx) : "";
  const base = idx >= 0 ? path.slice(idx + 1) : path;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  return { dir, base, stem, ext };
}

const SEP = navigator.userAgent.includes("Windows") ? "\\" : "/";

// Salida: carpeta elegida en Ajustes, o subcarpeta "Arcionr" junto al original.
export function outputFolder(inputPath: string): string {
  const { dir } = splitPath(inputPath);
  const custom = getOutputDir();
  return custom ? custom : dir ? `${dir}${SEP}Arcionr` : "Arcionr";
}

export function outputPath(inputPath: string, targetExt: string, suffix = ""): string {
  const { stem } = splitPath(inputPath);
  return `${outputFolder(inputPath)}${SEP}${stem}${suffix}.${targetExt}`;
}

export async function pickFiles(): Promise<string[]> {
  const res = await open({ multiple: true, directory: false });
  if (!res) return [];
  return Array.isArray(res) ? res : [res];
}

export async function pickFolder(): Promise<string[]> {
  const dir = await open({ directory: true, multiple: false });
  if (!dir || Array.isArray(dir)) return [];
  return await invoke<string[]>("list_files", { dir, recursive: false });
}

export async function readBytes(path: string): Promise<Uint8Array> {
  const arr = await invoke<number[]>("read_bytes", { path });
  return new Uint8Array(arr);
}

export async function writeBytes(path: string, data: Uint8Array): Promise<string> {
  return await invoke<string>("write_bytes", { path, data: Array.from(data) });
}
