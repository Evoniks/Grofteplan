import type { TrenchPlannerExport } from "@/lib/trench-planner-storage";

export type TrenchSketchPdfImages = {
  cross: string;
  plan: string;
};

/** Erstatt /skisse/… og http-URL-er med data-URL i SVG (nødvendig for PDF og data-URI). */
export async function embedExternalImagesInSvg(svgMarkup: string): Promise<string> {
  if (typeof window === "undefined") return svgMarkup;

  const hrefs = new Set<string>();
  const re = /(?:href|xlink:href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svgMarkup)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("data:") || href.startsWith("#")) continue;
    hrefs.add(href);
  }

  let out = svgMarkup;
  for (const href of hrefs) {
    const absolute = href.startsWith("http")
      ? href
      : `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;
    try {
      const res = await fetch(absolute);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Kunne ikke lese bilde"));
        reader.readAsDataURL(blob);
      });
      out = out.split(href).join(dataUrl);
    } catch {
      /* hopp over enkelt-asset */
    }
  }
  return out;
}

function parseSvgViewBox(svg: string): { w: number; h: number } {
  const m = svg.match(/viewBox=["']\s*0\s+0\s+([\d.]+)\s+([\d.]+)/i);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  return { w: 1600, h: 900 };
}

/** Rasteriser SVG til PNG data-URL (react-pdf håndterer dette pålitelig). */
export async function svgMarkupToPngDataUri(svgMarkup: string, scale = 0.75): Promise<string> {
  const embedded = await embedExternalImagesInSvg(svgMarkup);
  const { w, h } = parseSvgViewBox(embedded);
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  return new Promise((resolve, reject) => {
    const blob = new Blob([embedded], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas ikke tilgjengelig"));
          return;
        }
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunne ikke rasterisere skisse"));
    };
    img.src = url;
  });
}

export async function prepareTrenchSketchesForPdf(
  exportData: TrenchPlannerExport | null
): Promise<TrenchSketchPdfImages | null> {
  if (!exportData?.crossSvg?.trim() || !exportData?.planSvg?.trim()) return null;
  try {
    const [cross, plan] = await Promise.all([
      svgMarkupToPngDataUri(exportData.crossSvg),
      svgMarkupToPngDataUri(exportData.planSvg)
    ]);
    return { cross, plan };
  } catch {
    return null;
  }
}
