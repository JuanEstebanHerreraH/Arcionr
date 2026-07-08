// Arcionr — comandos nativos (Rust).
// Mantengo Rust al mínimo y confiable:
//   - convert_image: conversión raster con el crate `image`.
//   - read_bytes / write_bytes: E/S de archivos por ruta absoluta (para PDF en el front).
//   - list_files: enumerar archivos de una carpeta (para el modo "carpeta").
// Audio/video se hacen desde el front con el sidecar ffmpeg (plugin shell).

use std::fs;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct ConvertResult {
    pub ok: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

fn ext_to_format(ext: &str) -> Option<image::ImageFormat> {
    match ext.to_lowercase().as_str() {
        "png" => Some(image::ImageFormat::Png),
        "jpg" | "jpeg" => Some(image::ImageFormat::Jpeg),
        "webp" => Some(image::ImageFormat::WebP),
        "bmp" => Some(image::ImageFormat::Bmp),
        "gif" => Some(image::ImageFormat::Gif),
        "tif" | "tiff" => Some(image::ImageFormat::Tiff),
        _ => None,
    }
}

#[tauri::command]
fn convert_image(input: String, output: String, format: String, quality: Option<u8>) -> ConvertResult {
    match do_convert_image(&input, &output, &format, quality) {
        Ok(()) => ConvertResult { ok: true, output: Some(output), error: None },
        Err(e) => ConvertResult { ok: false, output: None, error: Some(e) },
    }
}

fn do_convert_image(input: &str, output: &str, format: &str, quality: Option<u8>) -> Result<(), String> {
    let img = image::open(input).map_err(|e| format!("No se pudo abrir la imagen: {e}"))?;
    let fmt = ext_to_format(format)
        .ok_or_else(|| format!("Formato de imagen no soportado: {format}"))?;

    if let Some(parent) = Path::new(output).parent() {
        let _ = fs::create_dir_all(parent);
    }

    // JPEG con control de calidad (necesita RGB8).
    if matches!(fmt, image::ImageFormat::Jpeg) {
        let q = quality.unwrap_or(85).clamp(1, 100);
        let rgb = img.to_rgb8();
        let mut file = fs::File::create(output).map_err(|e| e.to_string())?;
        let mut enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut file, q);
        enc.encode(rgb.as_raw(), rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
            .map_err(|e| format!("Error al codificar JPEG: {e}"))?;
        return Ok(());
    }

    img.save_with_format(output, fmt)
        .map_err(|e| format!("Error al guardar {format}: {e}"))
}

// Decodifica cualquier imagen soportada (png/jpg/webp/bmp/gif/tiff) y la
// devuelve como PNG en memoria. Sirve para Imágenes -> PDF de forma robusta,
// sin depender del canvas del navegador (que no decodifica TIFF).
#[tauri::command]
fn image_to_png_bytes(input: String) -> Result<Vec<u8>, String> {
    let img = image::open(&input).map_err(|e| format!("No se pudo abrir {input}: {e}"))?;
    let mut buf = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| format!("Error al codificar PNG: {e}"))?;
    Ok(buf.into_inner())
}

#[tauri::command]
fn read_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("No se pudo leer {path}: {e}"))
}

#[tauri::command]
fn write_bytes(path: String, data: Vec<u8>) -> Result<String, String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, data).map_err(|e| format!("No se pudo escribir {path}: {e}"))?;
    Ok(path)
}

#[tauri::command]
fn list_files(dir: String, recursive: bool) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    collect(Path::new(&dir), recursive, &mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

fn collect(dir: &Path, recursive: bool, out: &mut Vec<String>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            if recursive {
                collect(&path, recursive, out)?;
            }
        } else if let Some(s) = path.to_str() {
            out.push(s.to_string());
        }
    }
    Ok(())
}

// ---- Organizador de carpeta: mueve archivos a subcarpetas por tipo ----

fn bucket_for(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "bmp" | "gif" | "tif" | "tiff" | "svg" | "avif" | "heic" | "ico" => "Imagenes",
        "mp3" | "wav" | "flac" | "aac" | "m4a" | "ogg" | "opus" | "aiff" | "wma" => "Audio",
        "mp4" | "mkv" | "webm" | "mov" | "avi" | "m4v" | "flv" | "wmv" => "Video",
        "pdf" => "PDF",
        "doc" | "docx" | "odt" | "rtf" | "txt" | "md" | "xls" | "xlsx" | "csv" | "ppt" | "pptx" => "Documentos",
        "zip" | "rar" | "7z" | "tar" | "gz" => "Comprimidos",
        _ => "Otros",
    }
}

#[derive(serde::Serialize)]
pub struct OrganizeResult {
    pub ok: bool,
    pub moved: std::collections::BTreeMap<String, u32>,
    pub error: Option<String>,
}

#[tauri::command]
fn organize_folder(dir: String, by_extension: bool) -> OrganizeResult {
    match do_organize(&dir, by_extension) {
        Ok(m) => OrganizeResult { ok: true, moved: m, error: None },
        Err(e) => OrganizeResult { ok: false, moved: std::collections::BTreeMap::new(), error: Some(e) },
    }
}

fn do_organize(dir: &str, by_extension: bool) -> Result<std::collections::BTreeMap<String, u32>, String> {
    let base = Path::new(dir);
    if !base.is_dir() {
        return Err("La ruta seleccionada no es una carpeta.".into());
    }
    let mut moved = std::collections::BTreeMap::new();
    for entry in fs::read_dir(base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            continue; // no tocar subcarpetas (incluye los buckets ya creados)
        }
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        // Por extensión: carpeta "JPG", "PNG", etc. Por tipo: "Imagenes", "Audio"…
        let bucket: String = if by_extension {
            if ext.is_empty() { "Otros".to_string() } else { ext.to_uppercase() }
        } else {
            bucket_for(ext).to_string()
        };
        let target_dir = base.join(&bucket);
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
        let file_name = path.file_name().ok_or("Nombre de archivo inválido")?;
        let mut dest = target_dir.join(file_name);
        // Evitar sobrescribir: agrega (1), (2), ...
        if dest.exists() {
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("archivo");
            let suffix = if ext.is_empty() { String::new() } else { format!(".{ext}") };
            let mut n = 1;
            loop {
                let cand = target_dir.join(format!("{stem} ({n}){suffix}"));
                if !cand.exists() { dest = cand; break; }
                n += 1;
            }
        }
        fs::rename(&path, &dest).map_err(|e| e.to_string())?;
        *moved.entry(bucket).or_insert(0) += 1;
    }
    Ok(moved)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            convert_image,
            image_to_png_bytes,
            read_bytes,
            write_bytes,
            list_files,
            organize_folder
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Arcionr");
}
