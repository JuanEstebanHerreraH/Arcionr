# Binario de FFmpeg (sidecar) — OPCIONAL

Arcionr usa **FFmpeg** para audio y video. **Por defecto está desactivado** para
que la app compile y corra sin él (imágenes, PDF y vectorización funcionan igual).
Cuando quieras habilitar audio/video, seguí estos 3 pasos UNA sola vez.

## 1. Descargar FFmpeg
- Windows: https://www.gyan.dev/ffmpeg/builds/ (build "essentials")
- macOS:   `brew install ffmpeg`  (o https://evermeet.cx/ffmpeg/)
- Linux:   `sudo apt install ffmpeg`

## 2. Renombrarlo con el "target triple" y ponerlo en esta carpeta
Averiguá tu triple con:

```bash
rustc -Vv | grep host      # ej: host: x86_64-pc-windows-msvc
```

Copiá el ejecutable acá con ese nombre:

| Plataforma        | Nombre del archivo aquí                 |
|-------------------|------------------------------------------|
| Windows (Intel)   | `ffmpeg-x86_64-pc-windows-msvc.exe`      |
| macOS (Apple)     | `ffmpeg-aarch64-apple-darwin`            |
| macOS (Intel)     | `ffmpeg-x86_64-apple-darwin`             |
| Linux (Intel)     | `ffmpeg-x86_64-unknown-linux-gnu`        |

## 3. Reactivar el sidecar en `src-tauri/tauri.conf.json`
Dentro de `"bundle"`, volvé a agregar la línea `externalBin` (Tauri le pone el
triple solo):

```jsonc
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [ ... ],
  "externalBin": ["binaries/ffmpeg"]   // <-- agregar esta línea
}
```

Volvé a correr `npm run tauri dev`. Ahora audio y video funcionan. Si el binario
NO está pero dejás la línea, el build va a fallar con
"resource path ... doesn't exist" — por eso viene desactivado de fábrica.
