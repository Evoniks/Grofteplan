"use client";

import { useEffect, useMemo, useState } from "react";
import type { SkisseMal } from "@/types/plan";

const FALLBACK_TEMPLATE_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#f3f4f6" />
    <rect x="24" y="24" width="520" height="56" fill="#ffffff" stroke="#111827" stroke-width="2"/>
    <text x="42" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#111827">GENERERT SKISSE - FALLBACK MAL</text>
    <rect x="24" y="120" width="1552" height="340" fill="#ffffff" stroke="#9ca3af" />
    <rect x="24" y="492" width="1552" height="300" fill="#ffffff" stroke="#9ca3af" />
    <text x="40" y="160" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#334155">TVERRPROFIL</text>
    <text x="40" y="532" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#334155">PLAN (OVENFRA)</text>
    <line x1="120" y1="260" x2="1480" y2="260" stroke="#334155" stroke-width="4" />
    <polygon points="620,260 980,260 900,420 700,420" fill="#dbeafe" stroke="#1e3a8a" stroke-width="4" />
    <rect x="240" y="600" width="1120" height="100" rx="12" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="4"/>
    <line x1="240" y1="650" x2="1360" y2="650" stroke="#60a5fa" stroke-width="3" stroke-dasharray="12 8"/>
    <text x="40" y="850" font-family="Arial, sans-serif" font-size="20" fill="#475569">Legg inn SVG-maler i public/templates for full grafisk kvalitet.</text>
  </svg>
`);

type Props = {
  depth: number;
  bottomWidth: number;
  topWidth: number;
  length: number;
  massDistance: number;
  method: string;
  template: SkisseMal;
};

export function PosterTemplateSketch({ depth, bottomWidth, topWidth, length, massDistance, method, template }: Props) {
  const templateSvgSrc = `/templates/${template}.svg`;
  const templatePngSrc = `/templates/${template}.png`;
  const fallbackImageSrc = FALLBACK_TEMPLATE_DATA_URI;
  const [displaySrc, setDisplaySrc] = useState(templateSvgSrc);

  useEffect(() => {
    setDisplaySrc(templateSvgSrc);
  }, [templateSvgSrc]);

  const labels = useMemo(
    () => {
      const base = [
      {
        key: "depth",
        n: 1,
        text: `Dybde: ${depth.toFixed(2)} m`,
        left: "42.8%",
        top: "35.8%",
        toX: "45.8%",
        toY: "41.6%"
      },
      {
        key: "bottom",
        n: 2,
        text: `Bunnbredde: ${bottomWidth.toFixed(2)} m`,
        left: "38.7%",
        top: "51.5%",
        toX: "42.4%",
        toY: "50.3%"
      },
      {
        key: "top",
        n: 3,
        text: `Toppbredde: ${topWidth.toFixed(2)} m`,
        left: "24.7%",
        top: "14.1%",
        toX: "32.5%",
        toY: "20.2%"
      },
      {
        key: "length",
        n: 4,
        text: `Trase lengde: ${length.toFixed(0)} m`,
        left: "37.9%",
        top: "79.6%",
        toX: "49%",
        toY: "73%"
      },
      {
        key: "mass",
        n: 5,
        text: `Masser fra kant: ${massDistance.toFixed(2)} m`,
        left: "28.4%",
        top: "66.3%",
        toX: "29.6%",
        toY: "61.6%"
      },
      {
        key: "method",
        n: 6,
        text: `Sikring: ${method}`,
        left: "77.6%",
        top: "33.4%",
        toX: "74%",
        toY: "30.4%"
      }
      ];

      if (template === "template-02-groftekasse") {
        return base.map((item) => ({
          ...item,
          left: `${Number.parseFloat(item.left) + (item.key === "length" ? -4 : 0)}%`,
          top: `${Number.parseFloat(item.top) + (item.key === "method" ? -2 : -1)}%`
        }));
      }

      if (template === "template-05-dyp-spunt-avstiving") {
        return base.map((item) => ({
          ...item,
          left: `${Number.parseFloat(item.left) + (item.key === "method" ? -5 : 1)}%`,
          top: `${Number.parseFloat(item.top) + (item.key === "mass" ? -1.5 : 0.5)}%`
        }));
      }

      return base;
    },
    [bottomWidth, depth, length, massDistance, method, template, topWidth]
  );

  const templateTitleMap: Record<SkisseMal, string> = {
    "template-01-skraasider": "Generert skisse (1. Skrå sider)",
    "template-02-groftekasse": "Generert skisse (2. Grøftekasse)",
    "template-03-spunt": "Generert skisse (3. Spunt)",
    "template-04-avstiving-horisontal": "Generert skisse (4. Avstiving horisontal)",
    "template-05-dyp-spunt-avstiving": "Generert skisse (5. Dyp grøft spunt/avstiving)",
    "template-06-trafikkert-omraade": "Generert skisse (6. Trafikkert område)"
  };
  const templateTitle = templateTitleMap[template];

  const drawPosterToCanvas = async () => {
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Kunne ikke laste ${src}`));
        image.src = src;
      });

    let img: HTMLImageElement | null = null;
    for (const src of [templateSvgSrc, templatePngSrc, fallbackImageSrc]) {
      try {
        img = await loadImage(src);
        break;
      } catch {
        // Try next candidate source.
      }
    }
    if (!img) throw new Error("Kunne ikke laste mal (hverken SVG, PNG eller fallback)");

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Kunne ikke opprette canvas-kontekst");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.font = `${Math.max(14, Math.round(canvas.width * 0.012))}px sans-serif`;
    ctx.textBaseline = "middle";

    for (const label of labels) {
      const x = (Number.parseFloat(label.left) / 100) * canvas.width;
      const y = (Number.parseFloat(label.top) / 100) * canvas.height;
      const textWidth = ctx.measureText(label.text).width;
      const padX = 10;
      const boxH = Math.max(24, Math.round(canvas.height * 0.04));

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(15,23,42,0.3)";
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, textWidth + padX * 2, boxH);
      ctx.strokeRect(x, y, textWidth + padX * 2, boxH);
      ctx.fillStyle = label.key === "method" ? "#92400e" : "#0f172a";
      ctx.fillText(label.text, x + padX, y + boxH / 2);
    }

    return canvas;
  };

  const handleExportPng = async () => {
    try {
      const canvas = await drawPosterToCanvas();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "grofteplan-plakat.png";
      a.click();
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportPdf = async () => {
    try {
      const canvas = await drawPosterToCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head><title>Grøfteplan plakat</title></head>
          <body style="margin:0;padding:16px;background:#fff;">
            <img src="${dataUrl}" style="width:100%;height:auto;display:block;" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{templateTitle}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPng}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Eksporter PNG
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Eksporter PDF
          </button>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">Standard eksportmodus</span>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-md border border-slate-400 bg-slate-100">
        <img
          src={displaySrc}
          alt="Skissemal for grøfteplan"
          className="h-auto w-full"
          onError={(event) => {
            const current = event.currentTarget.src;
            if (current.includes(".svg")) {
              setDisplaySrc(templatePngSrc);
              return;
            }
            if (current.includes(".png")) {
              setDisplaySrc(fallbackImageSrc);
              return;
            }
            event.currentTarget.onerror = null;
          }}
        />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {labels.map((label) => (
            <line
              key={`line-${label.key}`}
              x1={label.left.replace("%", "")}
              y1={(Number.parseFloat(label.top) + 2.2).toString()}
              x2={label.toX.replace("%", "")}
              y2={label.toY.replace("%", "")}
              stroke="#0f172a"
              strokeWidth="0.25"
              strokeDasharray="1.2 0.8"
            />
          ))}
        </svg>
        {labels.map((label) => (
          <div key={label.key}>
            <div
              className="pointer-events-none absolute flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-[10px] font-bold text-white shadow"
              style={{ left: `calc(${label.left} - 22px)`, top: `calc(${label.top} + 2px)` }}
            >
              {label.n}
            </div>
            <div
              className="pointer-events-none absolute rounded border border-slate-400 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-900 shadow-sm"
              style={{ left: label.left, top: label.top }}
            >
              {label.text}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Dette er visningen som skal brukes for presentasjon og eksport. Tall fra skjema fylles direkte inn i mal med faste faglige plasseringer.
      </p>
    </div>
  );
}

