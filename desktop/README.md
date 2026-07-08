<div align="center">
  <img src="public/logo.svg" width="96" alt="Arcionr" />

  # Arcionr

  **Conversor multi-formato — offline, por lotes y sin humo.**

  Convertí imágenes, audio, video y PDF sin subir nada a internet, sin cuentas,
  sin publicidad y sin los conversores online turbios que meten malware.

  > Esta es la app de **escritorio**. La versión Android está en [`../mobile`](../mobile).
</div>

---

## Por qué existe

Los conversores online funcionan… hasta que te dejan un `.exe` raro, te llenan
de anuncios o suben tus archivos a un servidor que no controlás. Arcionr hace lo
mismo pero **en tu compu**: todo el procesamiento ocurre local. Los archivos no
salen de tu disco.

## Identidad visual

La paleta es **neapolitana** — fresa, vainilla y chocolate — porque el gesto de
la app es justamente ese: tomar algo y transformarlo en otra versión de sí mismo.
Cálido, claro, sin parecer una herramienta de sistema fría.

## Qué convierte

| Categoría | De → a | Estado |
|-----------|--------|--------|
| **Imágenes** | png · jpg · webp · bmp · gif · tiff (entre sí) | ✅ Listo (motor Rust) |
| **SVG** | svg → png · jpg · webp (rasterizar) | ✅ Listo (canvas) |
| **Imágenes → PDF** | varias imágenes → un PDF | ✅ Listo |
| **PDF → imágenes** | pdf → png/jpg (una por página) | ✅ Listo |
| **Gestor de páginas** | ver · reordenar · eliminar · exportar | ✅ Listo |
| **Combinar** | unir páginas de varios PDF + imágenes → un PDF | ✅ Listo |
| **Organizar carpeta** | mover archivos a subcarpetas por tipo o extensión | ✅ Listo |
| **Audio** | mp3 · wav · flac · aac · ogg · opus | 🎬 Opcional (FFmpeg) |
| **Video** | mp4 · mkv · webm · mov · avi · extraer audio · gif | 🎬 Opcional (FFmpeg) |
| Vectorizar (imagen → svg) | png/jpg → svg (trazado real) | ✅ Listo |
| AVIF / HEIC | encode/decode | 🔜 Fase 2 |
| Office ↔ PDF | docx/pptx ↔ pdf | ❌ Fuera de alcance (rompe "compacto y offline") |

> 🎬 = **desactivado de fábrica** para que la app compile sin dependencias.
> Se activa colocando FFmpeg y agregando una línea (ver
> [`src-tauri/binaries/README.md`](src-tauri/binaries/README.md)).

## Problemas comunes

- **Pantalla en blanco / todo café al abrir `localhost:1420` en el navegador.**
  Es esperado: Arcionr necesita las APIs nativas de Tauri, que sólo existen dentro
  de la ventana de la app. **Nunca abras localhost en Brave/Chrome** — usá la
  ventana que abre `npm run tauri dev`.
- **`resource path binaries\ffmpeg-... doesn't exist` al compilar.**
  Dejaste `externalBin` activo sin poner el binario de FFmpeg. Quitá esa línea de
  `tauri.conf.json` o colocá el binario (ver README de binaries).

## Cómo se usa

1. **Inicio**: soltás archivos o elegís una carpeta (puede mezclar mp3, jpg, wav…).
2. Arcionr los ordena por tipo y te muestra tarjetas por categoría.
3. Entrás a una sección, elegís el formato destino (por archivo o para todos) y
   convertís. Las salidas van a una subcarpeta `Arcionr/` junto al original.
4. En **PDF** podés reordenar/eliminar páginas antes de exportar.

## Stack

- **Tauri v2** — shell nativo liviano (bundle ~pocos MB vs ~100 MB de Electron).
- **React + TypeScript + Vite** — interfaz.
- **Rust** (`image`) — conversión raster nativa.
- **pdf-lib + pdf.js** — todo lo de PDF, sin binarios extra.
- **FFmpeg** (sidecar) — audio y video.

## Desarrollo

```bash
npm install            # dependencias del frontend
npm run tauri dev      # levanta la app en modo desarrollo
npm run tauri build    # genera el instalador (.exe / .msi / etc.)
```

Requisitos previos de Tauri (Rust + toolchain del SO):
https://tauri.app/start/prerequisites/

## Estructura

```
arcionr/
├─ public/logo.svg            # marca neapolitana
├─ src/
│  ├─ components/             # Sidebar, Intake, FileQueue, PdfManager, Settings…
│  ├─ lib/                    # formats, theme, convert, pdf, fsutil, types
│  ├─ styles/                 # theme.css (paleta) + app.css (layout)
│  └─ App.tsx                 # orquestador
└─ src-tauri/
   ├─ src/lib.rs              # comandos: convert_image, read/write_bytes, list_files
   ├─ binaries/               # FFmpeg va acá
   └─ tauri.conf.json
```

## Hoja de ruta

- [ ] Colocar FFmpeg y validar audio/video end-to-end
- [ ] Carpeta de salida configurable (hoy: subcarpeta `Arcionr/`)
- [ ] Vectorización (png/jpg → svg) con vtracer
- [ ] AVIF/HEIC
- [ ] Empaquetado como `.apk` (sólo imágenes, sin FFmpeg)

---

_Hecho con cariño y paciencia. Si algo se rompe, probablemente sea el sidecar de FFmpeg — revisá su README primero._
