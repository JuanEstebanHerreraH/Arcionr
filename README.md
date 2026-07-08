<div align="center">
  <img src="desktop/public/logo.svg" width="96" alt="Arcionr" />

  # Arcionr

  **Conversor de archivos offline, por lotes y sin humo — para escritorio y Android.**

  Convertí imágenes, audio, video y PDF sin subir nada a internet, sin cuentas y
  sin publicidad. Todo el procesamiento ocurre en tu equipo.
</div>

---

## Dos apps, un mismo espíritu

Este repositorio contiene **dos proyectos**: la app de escritorio (Windows/macOS/Linux)
y la app de Android. Comparten identidad y filosofía, pero cada plataforma hace lo
que puede hacer bien.

| | 🖥️ Escritorio (`desktop/`) | 📱 Android (`mobile/`) |
|---|---|---|
| **Base** | Tauri v2 + React + Rust | Capacitor + React |
| **Imágenes** | png · jpg · webp · bmp · gif · tiff | png · jpg · webp |
| **SVG → raster** | ✅ | — |
| **Vectorizar (img → svg)** | ✅ | — |
| **Imágenes → PDF** | ✅ | ✅ |
| **PDF → imágenes** | ✅ | — |
| **Gestor de páginas** (reordenar/eliminar) | ✅ | — |
| **Combinar** (unir PDFs + imágenes) | ✅ | — |
| **Organizar carpeta** por tipo/extensión | ✅ | — |
| **Audio / Video** (FFmpeg) | ✅ opcional | — |
| **Guardar** | Carpeta local | Galería + Compartir |

> En móvil el foco es lo que el teléfono hace bien y sin permisos: convertir
> imágenes y armar PDFs. Audio, video y organización de carpetas son de escritorio.

## Estructura

```
arcionr/
├─ desktop/   # App de escritorio (Tauri) — ver desktop/README.md
├─ mobile/    # App de Android (Capacitor) — ver mobile/README.md
└─ README.md  # este archivo
```

## Cómo compilar

Cada proyecto tiene su propio README con los pasos detallados.

**Escritorio** (necesita Node + Rust + toolchain del SO):
```bash
cd desktop
npm install
npm run tauri dev      # desarrollo
npm run tauri build    # instalador .exe / .msi
```

**Android** (necesita Node + Android SDK; no necesita Rust):
```bash
cd mobile
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # genera el APK
```

## Descargas (binarios)

Los ejecutables **no se versionan** en el repo (son grandes y se regeneran). Se
publican en la pestaña **Releases** de GitHub:
- Escritorio: el instalador `.exe` / `.msi`.
- Android: el `app-debug.apk`.

Así la gente descarga sin necesidad de compilar.

## Identidad visual

Paleta **neapolitana** — fresa, vainilla y chocolate — porque el gesto de la app
es justamente ese: tomar algo y transformarlo en otra versión de sí mismo.

## Estado y notas

FFmpeg (audio/video) viene **desactivado de fábrica**
en escritorio para que cualquiera pueda clonar y compilar sin dependencias; se activa
en un paso (ver `desktop/src-tauri/binaries/README.md`). La app de Android cubre
imágenes y PDF por las limitaciones de audio/video en móvil.

## Licencia

MIT.
