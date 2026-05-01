"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Props = {
  title: string;
  depth: number;
  bottomWidth: number;
  topWidth: number;
  massDistance: number;
  method: string;
  terrainLabel: string;
  pipeLabel: string;
  massesLabel: string;
  showSymbols: boolean;
  pipeSymbol: "sirkel" | "trekant" | "firkant";
  massesSymbol: "sirkel" | "trekant" | "firkant";
};

const WIDTH = 900;
const HEIGHT = 390;
const DRAG_KEYS = ["excavator", "masses", "pipe"] as const;
type DragKey = (typeof DRAG_KEYS)[number];
type Offset = { x: number; y: number };
type Offsets = Record<DragKey, Offset>;
type Bounds = { x: number; y: number; width: number; height: number };

const INITIAL_OFFSETS: Offsets = {
  excavator: { x: 0, y: 0 },
  masses: { x: 0, y: 0 },
  pipe: { x: 0, y: 0 }
};

function isDragKey(value: string): value is DragKey {
  return DRAG_KEYS.includes(value as DragKey);
}

function clampOffset(value: Offset, key: DragKey): Offset {
  if (key === "pipe") {
    return {
      x: Math.max(-120, Math.min(120, value.x)),
      y: Math.max(-48, Math.min(30, value.y))
    };
  }
  if (key === "masses") {
    return {
      x: Math.max(-150, Math.min(120, value.x)),
      y: Math.max(-36, Math.min(30, value.y))
    };
  }
  return {
    x: Math.max(-170, Math.min(120, value.x)),
    y: Math.max(-45, Math.min(35, value.y))
  };
}

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: "sirkel" | "trekant" | "firkant",
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  if (symbol === "sirkel") {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (symbol === "trekant") {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.55);
    ctx.lineTo(x - size * 0.5, y + size * 0.45);
    ctx.lineTo(x + size * 0.5, y + size * 0.45);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillRect(x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9);
}

function dashedLine(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

function drawNumberMarker(ctx: CanvasRenderingContext2D, n: number, x: number, y: number) {
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(String(n), x - 3, y + 4);
}

function drawSoilTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "#d8c7ab";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#bfa17a";
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 12) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + 16, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

export function CrossSectionCanvasSketch({
  title,
  depth,
  bottomWidth,
  topWidth,
  massDistance,
  method,
  terrainLabel,
  pipeLabel,
  massesLabel,
  showSymbols,
  pipeSymbol,
  massesSymbol
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [offsets, setOffsets] = useState<Offsets>(INITIAL_OFFSETS);
  const [activeDrag, setActiveDrag] = useState<DragKey | null>(null);
  const dragBoundsRef = useRef<Record<DragKey, Bounds>>({
    excavator: { x: 0, y: 0, width: 0, height: 0 },
    masses: { x: 0, y: 0, width: 0, height: 0 },
    pipe: { x: 0, y: 0, width: 0, height: 0 }
  });
  const dragStartRef = useRef<{ key: DragKey; pointerX: number; pointerY: number; startOffset: Offset } | null>(null);

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    if (!point) return;
    const keys: DragKey[] = ["excavator", "masses", "pipe"];
    const hitKey = keys.find((key) => {
      const b = dragBoundsRef.current[key];
      return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
    });
    if (!hitKey) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      key: hitKey,
      pointerX: point.x,
      pointerY: point.y,
      startOffset: offsets[hitKey]
    };
    setActiveDrag(hitKey);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const dragStart = dragStartRef.current;
    if (!point || !dragStart) return;

    const dx = point.x - dragStart.pointerX;
    const dy = point.y - dragStart.pointerY;
    const next = clampOffset(
      {
        x: dragStart.startOffset.x + dx,
        y: dragStart.startOffset.y + dy
      },
      dragStart.key
    );
    setOffsets((prev) => ({ ...prev, [dragStart.key]: next }));
  };

  const endDrag = () => {
    dragStartRef.current = null;
    setActiveDrag(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(WIDTH * dpr);
    canvas.height = Math.floor(HEIGHT * dpr);
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const safeDepth = Math.max(depth, 0.5);
    const safeBottom = Math.max(bottomWidth, 0.4);
    const safeTop = Math.max(topWidth, safeBottom);
    const safeMassDistance = Math.max(massDistance, 0);

    const maxDepth = 3.5;
    const maxTopWidth = 4.5;
    const centerX = WIDTH * 0.5;
    const groundY = 112;
    const depthPx = 78 + (Math.min(safeDepth, maxDepth) / maxDepth) * 96;
    const topWidthPx = 210 + (Math.min(safeTop, maxTopWidth) / maxTopWidth) * 190;
    const bottomWidthPx = Math.max(86, topWidthPx * Math.min(0.8, safeBottom / safeTop));

    const topLeftX = centerX - topWidthPx / 2;
    const topRightX = centerX + topWidthPx / 2;
    const bottomLeftX = centerX - bottomWidthPx / 2;
    const bottomRightX = centerX + bottomWidthPx / 2;
    const bottomY = groundY + depthPx;
    const massXBase = Math.min(WIDTH - 90, topRightX + 74 + safeMassDistance * 56);
    const excavatorBaseX = topLeftX - 38;
    const excavatorBaseY = groundY - 30;
    const pipeXBase = centerX;
    const pipeYBase = bottomY - 44;
    const massX = massXBase + offsets.masses.x;
    const massY = groundY - 16 + offsets.masses.y;
    const excavatorX = excavatorBaseX + offsets.excavator.x;
    const excavatorY = excavatorBaseY + offsets.excavator.y;
    const pipeX = pipeXBase + offsets.pipe.x;
    const pipeY = pipeYBase + offsets.pipe.y;
    const slopeRule =
      method === "skrå gravesider" ? (safeDepth <= 2 ? "Dybde x 0,5 (ca. 63°)" : "Dybde x 0,75 (ca. 53°)") : "Avstivet grøft";

    // Background
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(18, 16, 278, 34);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(18, 16, 278, 34);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("TVERRPROFIL - STANDARD GROFT", 28, 38);
    drawSoilTexture(ctx, 24, groundY + 1, WIDTH - 48, 20);

    // Ground line
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(38, groundY);
    ctx.lineTo(WIDTH - 38, groundY);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.font = "13px sans-serif";
    ctx.fillText(terrainLabel, 50, 78);

    // Trench polygon
    ctx.fillStyle = "#ece7dc";
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(topLeftX, groundY);
    ctx.lineTo(topRightX, groundY);
    ctx.lineTo(bottomRightX, bottomY);
    ctx.lineTo(bottomLeftX, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#b8a88d";
    ctx.lineWidth = 1;
    for (let y = groundY + 8; y < bottomY - 8; y += 8) {
      const leftX = topLeftX + ((bottomLeftX - topLeftX) * (y - groundY)) / (bottomY - groundY);
      const rightX = topRightX + ((bottomRightX - topRightX) * (y - groundY)) / (bottomY - groundY);
      ctx.beginPath();
      ctx.moveTo(leftX + 3, y);
      ctx.lineTo(leftX + 11, y + 5);
      ctx.moveTo(rightX - 3, y);
      ctx.lineTo(rightX - 11, y + 5);
      ctx.stroke();
    }
    drawSoilTexture(ctx, bottomLeftX + 2, bottomY - 18, bottomRightX - bottomLeftX - 4, 18);

    // Pipe symbol
    drawSymbol(ctx, pipeSymbol, pipeX, pipeY, 18, "#334155");
    ctx.fillStyle = "#1e293b";
    ctx.font = "13px sans-serif";
    ctx.fillText(pipeLabel, pipeX + 18, pipeY + 6);

    // Masses symbol and callout
    drawSymbol(ctx, massesSymbol, massX, massY, 18, "#d97706");
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.5;
    dashedLine(ctx, topRightX + 4, groundY + 8, massX - 14, massY + 4);
    ctx.fillStyle = "#7c2d12";
    ctx.font = "12px sans-serif";
    ctx.fillText(massesLabel, massX + 14, massY + 6);
    ctx.fillStyle = "#c2410c";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Avstand masser: ${safeMassDistance.toFixed(2)} m`, Math.min(WIDTH - 230, topRightX + 14), groundY + 24);

    // Top width
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.5;
    dashedLine(ctx, topLeftX, groundY + 14, topRightX, groundY + 14);
    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Bredde topp: ${safeTop.toFixed(2)} m`, topLeftX + 4, groundY + 32);

    // Bottom width
    dashedLine(ctx, bottomLeftX, bottomY + 22, bottomRightX, bottomY + 22);
    ctx.fillText(`Bredde bunn: ${safeBottom.toFixed(2)} m`, bottomLeftX + 4, bottomY + 40);

    // Depth indicator
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topLeftX - 36, groundY);
    ctx.lineTo(topLeftX - 36, bottomY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(topLeftX - 40, groundY);
    ctx.lineTo(topLeftX - 32, groundY);
    ctx.moveTo(topLeftX - 40, bottomY);
    ctx.lineTo(topLeftX - 32, bottomY);
    ctx.stroke();
    ctx.fillStyle = "#991b1b";
    ctx.fillText(`Dybde: ${safeDepth.toFixed(2)} m`, topLeftX - 126, groundY + depthPx * 0.5);

    // Excavator (styled)
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(excavatorX, excavatorY, 40, 20);
    ctx.fillStyle = "#475569";
    ctx.fillRect(excavatorX + 8, excavatorY + 16, 60, 13);
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(excavatorX + 24, excavatorY + 2, 10, 14);
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(excavatorX + 24, excavatorY + 34, 8, 0, Math.PI * 2);
    ctx.arc(excavatorX + 58, excavatorY + 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(excavatorX + 40, excavatorY);
    ctx.lineTo(excavatorX + 84, excavatorY - 20);
    ctx.lineTo(excavatorX + 110, excavatorY - 12);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "11px sans-serif";
    ctx.fillText("Gravemaskin", excavatorX - 6, excavatorY - 28);

    const postX = massX + 96;
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(postX, groundY - 14, 8, 34);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(postX, groundY - 8, 8, 4);
    ctx.fillRect(postX, groundY + 2, 8, 4);
    ctx.fillStyle = "#111827";
    ctx.font = "11px sans-serif";
    ctx.fillText("Avsperring", postX - 8, groundY - 20);

    // Footer
    ctx.fillStyle = "#0f172a";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Sikringsmetode: ${method}`, 40, HEIGHT - 38);
    ctx.fillText(`Masser fra kant: ${safeMassDistance.toFixed(2)} m`, WIDTH - 330, HEIGHT - 38);
    ctx.fillStyle = "#7c2d12";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Veiledende profil: ${slopeRule}`, 40, HEIGHT - 20);
    if (showSymbols) {
      ctx.fillStyle = "#334155";
      ctx.fillText(`Symboler: ledning=${pipeSymbol}, masser=${massesSymbol}`, WIDTH - 360, HEIGHT - 20);
    }

    const legendX = 24;
    const legendY = 162;
    const legendW = 210;
    const legendH = 152;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;
    ctx.fillRect(legendX, legendY, legendW, legendH);
    ctx.strokeRect(legendX, legendY, legendW, legendH);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("FORKLARING", legendX + 10, legendY + 18);
    ctx.font = "12px sans-serif";
    ctx.fillText("1. Gravemasser (min. 1,0 m)", legendX + 10, legendY + 40);
    ctx.fillText("2. Avsperring/sikring", legendX + 10, legendY + 58);
    ctx.fillText("3. Gravemaskin", legendX + 10, legendY + 76);
    ctx.fillText("4. Romningsvei (stige)", legendX + 10, legendY + 94);
    ctx.fillText("5. Skraning/avstiving", legendX + 10, legendY + 112);
    ctx.fillText("6. Fundament/ledningssone", legendX + 10, legendY + 130);

    const noteX = WIDTH - 244;
    const noteY = 176;
    const noteW = 220;
    const noteH = 138;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111827";
    ctx.fillRect(noteX, noteY, noteW, noteH);
    ctx.strokeRect(noteX, noteY, noteW, noteH);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("MERKNADER", noteX + 10, noteY + 18);
    ctx.font = "12px sans-serif";
    ctx.fillText("- Ikke belast groftekant", noteX + 10, noteY + 40);
    ctx.fillText("- Romningsvei maks 25 m", noteX + 10, noteY + 58);
    ctx.fillText("- Dybde over 1,25 m: plan krav", noteX + 10, noteY + 76);
    ctx.fillText("- Dybde over 2,0 m: sikring krav", noteX + 10, noteY + 94);
    ctx.fillText("- Arbeid etter SHA-plan", noteX + 10, noteY + 112);

    drawNumberMarker(ctx, 1, topLeftX - 54, groundY - 56);
    drawNumberMarker(ctx, 2, postX + 20, groundY - 46);
    drawNumberMarker(ctx, 3, excavatorX + 86, excavatorY - 34);
    drawNumberMarker(ctx, 4, bottomRightX + 18, bottomY - 42);
    drawNumberMarker(ctx, 5, bottomRightX + 86, groundY + 104);
    drawNumberMarker(ctx, 6, pipeX - 22, pipeY);

    dragBoundsRef.current = {
      excavator: { x: excavatorX - 8, y: excavatorY - 24, width: 130, height: 70 },
      masses: { x: massX - 18, y: massY - 18, width: 36, height: 36 },
      pipe: { x: pipeX - 18, y: pipeY - 18, width: 36, height: 36 }
    };
  }, [bottomWidth, depth, massesLabel, massesSymbol, massDistance, method, offsets, pipeLabel, pipeSymbol, showSymbols, terrainLabel, topWidth]);

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <p className="mb-2 text-xs text-slate-600">Dra symboler med mus: gravemaskin, masser og ledning.</p>
      <div className="w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="h-auto w-full min-w-[760px] touch-none"
          aria-label={title}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          style={{ cursor: activeDrag ? "grabbing" : "grab" }}
        />
      </div>
    </div>
  );
}

