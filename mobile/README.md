<div align="center">
  <img src="public/logo.svg" width="88" alt="Arcionr" />

  # Arcionr Mobile

  **Conversor de imágenes offline para Android.** PNG · JPG · WEBP, por lotes, sin conexión.
</div>

---

## Qué hace

- Convierte imágenes entre **PNG, JPG y WEBP** (lo hace el propio Android, vía WebView).
- Varias a la vez, con formato por imagen o global.
- **Imágenes → PDF** en un solo archivo.
- Guarda cada imagen en tu **galería** y permite **Compartir** el resultado (a WhatsApp, Drive, Fotos, etc.).
- 100% offline. Sin cuentas, sin publicidad.

No incluye audio ni video (necesitarían código nativo con MediaCodec) ni organizador de
carpetas (el almacenamiento con permisos de Android no lo permite como en escritorio).

## Stack

- **Capacitor 7** (envoltorio Android, sin Rust ni NDK).
- **React + TypeScript + Vite** (la misma base de UI del escritorio).
- Conversión en **canvas**; PDF con **pdf-lib**; guardar/compartir con los plugins
  **@capacitor/filesystem** y **@capacitor/share**.

## Requisitos para compilar (en tu compu)

- Node.js (ya lo tenés).
- **Android Studio** + Android SDK (Capacitor lo usa para compilar).
- JDK 17 (viene con Android Studio).
- No hace falta Rust ni NDK.

## Comandos

```bash
npm install                       # dependencias
npm run build                     # compila la web (dist/)
npx cap sync android              # copia la web al proyecto Android
npx cap open android              # abre Android Studio (recomendado la 1ª vez)
```

Desde Android Studio: Run ▶ para probar en un teléfono/emulador, o
**Build → Build APK(s)** para generar el .apk.

Por línea de comandos (si ya tenés el SDK configurado):

```bash
cd android
./gradlew assembleDebug           # genera el APK de prueba
```

## Dónde queda el APK

```
android/app/build/outputs/apk/debug/app-debug.apk
```

(Para publicar necesitás una versión firmada: `assembleRelease` + firma.)

## Qué necesita el usuario final

- Un Android **6.0 o superior**.
- Instalar el `app-debug.apk`: al abrirlo, Android pedirá permitir
  **“Instalar apps de orígenes desconocidos”** (normal en APKs fuera de Play Store).
- Nada más: funciona sin conexión. La primera vez que guardes, Android puede pedir
  permiso de archivos.

## Flujo de trabajo al cambiar código

Cada vez que edites la web: `npm run build && npx cap sync android`, y recompilás.
