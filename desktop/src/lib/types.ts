export type Category = "image" | "audio" | "video" | "pdf" | "unknown";

export type Status = "pending" | "working" | "done" | "error";

export interface FileItem {
  id: string;
  path: string;       // ruta absoluta en disco
  name: string;       // nombre con extensión
  ext: string;        // extensión en minúscula, sin punto
  category: Category;
  target: string;     // formato destino elegido
  status: Status;
  message?: string;   // error o ruta de salida
  pages?: number;     // sólo PDF: cantidad de páginas
}
