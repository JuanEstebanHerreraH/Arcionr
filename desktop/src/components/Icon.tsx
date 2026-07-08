// Íconos SVG mínimos (sin dependencias, sin emojis).
import type { ReactElement } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p: Record<string, ReactElement> = {
    home: <path d="M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
    audio: <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />,
    video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></>,
    pdf: <><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    combine: <><path d="M12 2 3 7l9 5 9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
}
