// Guardado y compartir en Android:
//  - Copia en el almacenamiento propio de la app (Cache) -> para Compartir, sin permisos.
//  - Guardar en la galería con @capacitor-community/media: crea el álbum "Arcionr"
//    dentro del directorio de medios de la app (sin permisos) y lo escanea a la galería.
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";

const ALBUM = "Arcionr";
let albumIdCache: string | null = null;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error("No se pudo leer el archivo"));
    r.onload = () => {
      const s = String(r.result);
      res(s.slice(s.indexOf(",") + 1));
    };
    r.readAsDataURL(blob);
  });
}

async function writeToCache(blob: Blob, filename: string): Promise<string> {
  const data = await blobToBase64(blob);
  await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, recursive: true });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  return uri;
}

// Crea (una sola vez) el álbum "Arcionr" y devuelve su identificador.
async function ensureAlbumId(): Promise<string> {
  if (albumIdCache) return albumIdCache;
  try {
    await Media.createAlbum({ name: ALBUM });
  } catch {
    // Ya existe: no es error.
  }
  const { albums } = await Media.getAlbums();
  const found = albums.find((a) => a.name === ALBUM);
  if (!found) throw new Error("no se pudo preparar el álbum de la galería");
  albumIdCache = found.identifier;
  return albumIdCache;
}

export interface SaveResult { uri: string; inGallery: boolean; galleryError?: string }

/** Guarda una imagen en la galería (álbum Arcionr) y deja una copia para compartir. */
export async function saveImage(blob: Blob, filename: string): Promise<SaveResult> {
  const uri = await writeToCache(blob, filename);
  try {
    const albumIdentifier = await ensureAlbumId();
    const dot = filename.lastIndexOf(".");
    const fileName = dot > 0 ? filename.slice(0, dot) : filename; // el plugin agrega la extensión
    await Media.savePhoto({ path: uri, albumIdentifier, fileName });
    return { uri, inGallery: true };
  } catch (e) {
    return { uri, inGallery: false, galleryError: String(e) };
  }
}

/** Archivos que no son imagen (PDF): sólo copia para compartir. */
export async function saveForShare(blob: Blob, filename: string): Promise<string> {
  return writeToCache(blob, filename);
}

export async function shareFile(uri: string, title: string): Promise<void> {
  await Share.share({ title, url: uri });
}
