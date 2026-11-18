<p align="center"><img src="desktop/public/logo.svg" width="88" alt="Arcionr"></p>

# Arcionr

**Convierte archivos y trabaja con PDF sin subirlos a un servidor.**

Dos aplicaciones con una misma identidad: escritorio para imágenes, PDF y organización de carpetas; Android para convertir imágenes y crear PDF. El audio y el video en escritorio requieren FFmpeg opcional.

## Descargas disponibles

| Plataforma | Archivo publicado | Observación |
| --- | --- | --- |
| Windows x64 | [Instalador de Arcionr 0.1.0](https://github.com/JuanEstebanHerreraH/Arcionr/releases/download/Arcionr/Arcionr_0.1.0_x64-setup.exe) | Aplicación de escritorio Tauri. |
| Android | [APK de prueba](https://github.com/JuanEstebanHerreraH/Arcionr/releases/download/Arcionr/app-debug.apk) | Compilación debug distribuida fuera de Google Play. |

[Todos los archivos y notas de la versión](https://github.com/JuanEstebanHerreraH/Arcionr/releases/tag/Arcionr) · [Reportar un problema](https://github.com/JuanEstebanHerreraH/Arcionr/issues)

El código de escritorio también puede compilarse para otros sistemas con los requisitos de Tauri, pero las descargas anteriores corresponden a Windows y Android.

## Qué hace cada versión

| Función | Escritorio | Android |
| --- | --- | --- |
| Imágenes | PNG, JPG, WebP, BMP, GIF y TIFF | PNG, JPG y WebP |
| Procesamiento por lotes | Sí | Sí |
| Imágenes → PDF | Sí | Sí |
| PDF → imágenes | Sí | No |
| Reordenar, eliminar y combinar páginas | Sí | No |
| Rasterizar SVG y vectorizar imágenes | Sí | No |
| Organizar una carpeta por tipo de archivo | Sí | No |
| Audio y video | Con FFmpeg opcional | No |
| Guardado | Carpeta local | Galería y menú Compartir |

## Cómo usarlo

1. Selecciona los archivos de entrada.
2. Elige la categoría y el formato de salida; en escritorio, abre la sección PDF para gestionar páginas.
3. Convierte y revisa la salida antes de usarla en otro trabajo.

En escritorio, las salidas se guardan en una subcarpeta Arcionr junto al original. Las operaciones de organización de carpetas sí pueden mover archivos; conviene probarlas primero con una carpeta de ejemplo.

## Decisión de implementación

La interfaz comparte React y TypeScript. En escritorio, Tauri y Rust permiten acceder al sistema de archivos y convertir imágenes de forma nativa; en Android, Capacitor integra el guardado y el menú de compartir del teléfono. La diferencia de funciones entre plataformas responde a sus APIs y permisos disponibles.

## Límites actuales

- FFmpeg viene desactivado en la configuración base. No todas las compilaciones incluyen audio/video.
- AVIF/HEIC y conversión Office ↔ PDF no forman parte de las funciones disponibles documentadas.
- La versión Android tiene menos herramientas PDF que escritorio.
- La interfaz de escritorio necesita las APIs nativas de Tauri; abrir solo el servidor web no reproduce todas las funciones.

<details>
<summary><strong>Desarrollo y compilación</strong></summary>

### Escritorio

Requiere Node.js, npm, Rust y los requisitos de Tauri para tu sistema.

~~~sh
git clone https://github.com/JuanEstebanHerreraH/Arcionr.git
cd Arcionr/desktop
npm install
npm run tauri dev
~~~

Para construir: `npm run tauri build`. Consulta [desktop/README.md](desktop/README.md) y la [configuración opcional de FFmpeg](desktop/src-tauri/binaries/README.md).

### Android

Requiere Node.js, npm, JDK y Android Studio con el SDK configurado.

~~~sh
cd mobile
npm install
npm run build
npx cap sync android
npx cap open android
~~~

Desde la raíz del repositorio usa `cd mobile`; si estás en `desktop/`, vuelve primero al directorio superior. La guía completa está en [mobile/README.md](mobile/README.md).

</details>

## Licencia

Código bajo [licencia MIT](LICENSE.txt). FFmpeg y las dependencias conservan sus propias licencias.
