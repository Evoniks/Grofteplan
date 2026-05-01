"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";

type SymbolType = "sirkel" | "trekant" | "firkant";

type Props = {
  title: string;
  length: number;
  topWidth: number;
  massDistance: number;
  hasInstallations: boolean;
  terrainLabel: string;
  pipeLabel: string;
  massesLabel: string;
  showSymbols: boolean;
  pipeSymbol: SymbolType;
  massesSymbol: SymbolType;
  soil: string;
};

function RenderSymbol({
  x,
  y,
  symbol,
  color
}: {
  x: number;
  y: number;
  symbol: SymbolType;
  color: string;
}) {
  if (symbol === "sirkel") return <circle cx={x} cy={y} r="8" fill={color} />;
  if (symbol === "trekant")
    return <polygon points={`${x},${y - 9} ${x - 8},${y + 8} ${x + 8},${y + 8}`} fill={color} />;
  return <rect x={x - 8} y={y - 8} width="16" height="16" fill={color} />;
}

export function PlanViewSketch({
  title,
  length,
  topWidth,
  massDistance,
  hasInstallations,
  terrainLabel,
  pipeLabel,
  massesLabel,
  showSymbols,
  pipeSymbol,
  massesSymbol,
  soil
}: Props) {
  type DragKey = "excavator" | "truck" | "pipe" | "masses";
  type RotateKey = "excavator" | "truck";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [offsets, setOffsets] = useState({
    excavator: { x: 0, y: 0 },
    truck: { x: 0, y: 0 },
    pipe: { x: 0, y: 0 },
    masses: { x: 0, y: 0 }
  });
  const [headingIndex, setHeadingIndex] = useState<Record<RotateKey, 0 | 1 | 2 | 3>>({
    excavator: 0,
    truck: 0
  });
  const [activeDrag, setActiveDrag] = useState<DragKey | null>(null);
  const dragBoundsRef = useRef({
    excavator: { x: 0, y: 0, width: 0, height: 0 },
    truck: { x: 0, y: 0, width: 0, height: 0 },
    pipe: { x: 0, y: 0, width: 0, height: 0 },
    masses: { x: 0, y: 0, width: 0, height: 0 }
  });
  const dragStartRef = useRef<{
    key: DragKey;
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const safeLength = Math.max(length, 1);
  const safeWidth = Math.max(topWidth, 0.5);
  const safeMassDistance = Math.max(massDistance, 0);
  const trafficSide = hasInstallations ? "Trafikkert side / infrastruktur" : "Arbeidsområde uten registrert infrastruktur";
  const getPoint = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 900,
      y: ((event.clientY - rect.top) / rect.height) * 380
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = getPoint(event);
    if (!p) return;
    const keys = ["excavator", "truck", "masses", "pipe"] as const;
    const key = keys.find((k) => {
      const b = dragBoundsRef.current[k];
      return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
    });
    if (!key) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      key,
      pointerX: p.x,
      pointerY: p.y,
      startX: offsets[key].x,
      startY: offsets[key].y
    };
    setActiveDrag(key);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = getPoint(event);
    const drag = dragStartRef.current;
    if (!p || !drag) return;
    const dx = p.x - drag.pointerX;
    const dy = p.y - drag.pointerY;
    setOffsets((prev) => ({
      ...prev,
      [drag.key]: {
        x: Math.max(-180, Math.min(180, drag.startX + dx)),
        y: Math.max(-90, Math.min(90, drag.startY + dy))
      }
    }));
  };

  const onPointerEnd = () => {
    dragStartRef.current = null;
    setActiveDrag(null);
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const p = getPoint(event);
    if (!p) return;
    const rotateTarget = (["excavator", "truck"] as const).find((k) => {
      const b = dragBoundsRef.current[k];
      return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
    });
    if (!rotateTarget) return;
    setHeadingIndex((prev) => ({
      ...prev,
      [rotateTarget]: ((prev[rotateTarget] + 1) % 4) as 0 | 1 | 2 | 3
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(900 * dpr);
    canvas.height = Math.floor(380 * dpr);
    canvas.style.width = "900px";
    canvas.style.height = "380px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const scene = { x: 70, y: 84, w: 760, h: 190 };
    const trenchY = scene.y + 56;
    const maxVisualLength = Math.max(safeLength, 30);
    const pxPerMeter = Math.min(26, (scene.w - 120) / maxVisualLength);
    const trenchLengthPx = Math.max(120, safeLength * pxPerMeter);
    const trenchWidthPx = Math.max(20, safeWidth * pxPerMeter);
    const trenchLeft = scene.x + 66;
    const trenchTop = trenchY;
    const trenchRight = Math.min(scene.x + scene.w - 30, trenchLeft + trenchLengthPx);
    const trenchBottom = trenchTop + trenchWidthPx;
    const centerY = trenchTop + trenchWidthPx / 2;

    // Approximate real machines in meters
    const excavatorMeters = { length: 7.2, width: 2.5 };
    const truckMeters = { length: 8.5, width: 2.5 };
    const excavatorPx = { w: excavatorMeters.length * pxPerMeter, h: excavatorMeters.width * pxPerMeter };
    const truckPx = { w: truckMeters.length * pxPerMeter, h: truckMeters.width * pxPerMeter };

    const truckX = scene.x + 8 + offsets.truck.x;
    const truckY = scene.y + 22 + offsets.truck.y;
    const excavatorX = Math.min(scene.x + scene.w - excavatorPx.w - 8, trenchRight + 20 + offsets.excavator.x);
    const excavatorY = trenchBottom + 8 + offsets.excavator.y;

    const pipeX = trenchLeft + Math.max(42, trenchLengthPx * 0.12) + offsets.pipe.x;
    const pipeY = centerY + offsets.pipe.y;
    const massesX = Math.min(scene.x + scene.w - 20, trenchRight + safeMassDistance * pxPerMeter + offsets.masses.x);
    const massesY = trenchTop - 16 + offsets.masses.y;

    ctx.clearRect(0, 0, 900, 380);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 900, 380);

    ctx.fillStyle = "#334155";
    ctx.font = "13px sans-serif";
    ctx.fillText("Start", 48, 34);
    ctx.fillText("Slutt", 810, 34);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 40);
    ctx.lineTo(830, 40);
    ctx.stroke();

    // Area + grid in metric scale
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(scene.x, scene.y, scene.w, scene.h);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(scene.x, scene.y, scene.w, scene.h);
    ctx.strokeStyle = "#d6dde7";
    ctx.lineWidth = 1;
    for (let x = scene.x; x <= scene.x + scene.w; x += pxPerMeter) {
      ctx.beginPath();
      ctx.moveTo(x, scene.y);
      ctx.lineTo(x, scene.y + scene.h);
      ctx.stroke();
    }
    for (let y = scene.y; y <= scene.y + scene.h; y += pxPerMeter) {
      ctx.beginPath();
      ctx.moveTo(scene.x, y);
      ctx.lineTo(scene.x + scene.w, y);
      ctx.stroke();
    }

    // Trench
    ctx.fillStyle = "#bfdbfe";
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.fillRect(trenchLeft, trenchTop, trenchRight - trenchLeft, trenchWidthPx);
    ctx.strokeRect(trenchLeft, trenchTop, trenchRight - trenchLeft, trenchWidthPx);
    ctx.strokeStyle = "#60a5fa";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(trenchLeft, centerY);
    ctx.lineTo(trenchRight, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1e3a8a";
    ctx.font = "12px sans-serif";
    ctx.fillText("Grøftetrase (plan)", trenchLeft + 8, trenchTop - 8);
    ctx.fillStyle = "#334155";
    ctx.fillText(terrainLabel, 90, 78);

    const headingDegrees = [-90, 180, 90, 0] as const;
    const headingLabel = ["Nord", "Vest", "Sor", "Ost"] as const;
    const truckCenterX = truckX + truckPx.w * 0.5;
    const truckCenterY = truckY + truckPx.h * 0.5;
    const truckRotation = (headingDegrees[headingIndex.truck] * Math.PI) / 180;

    // Truck top view (scaled + cardinal rotation)
    ctx.save();
    ctx.translate(truckCenterX, truckCenterY);
    ctx.rotate(truckRotation);
    ctx.fillStyle = "#1e3a8a";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.2;
    ctx.fillRect(-truckPx.w * 0.5, -truckPx.h * 0.5, truckPx.w * 0.62, truckPx.h);
    ctx.strokeRect(-truckPx.w * 0.5, -truckPx.h * 0.5, truckPx.w * 0.62, truckPx.h);
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(-truckPx.w * 0.47, -truckPx.h * 0.38, truckPx.w * 0.54, truckPx.h * 0.76);
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(truckPx.w * 0.12, -truckPx.h * 0.34, truckPx.w * 0.26, truckPx.h * 0.68);
    ctx.strokeStyle = "#7c2d12";
    ctx.strokeRect(truckPx.w * 0.12, -truckPx.h * 0.34, truckPx.w * 0.26, truckPx.h * 0.68);
    // front nose marker
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(truckPx.w * 0.38, 0);
    ctx.lineTo(truckPx.w * 0.24, -truckPx.h * 0.18);
    ctx.lineTo(truckPx.w * 0.24, truckPx.h * 0.18);
    ctx.closePath();
    ctx.fill();
    // cabin window
    ctx.fillStyle = "#bfdbfe";
    ctx.fillRect(truckPx.w * 0.16, -truckPx.h * 0.22, truckPx.w * 0.16, truckPx.h * 0.44);
    ctx.strokeStyle = "#1f2937";
    ctx.strokeRect(truckPx.w * 0.16, -truckPx.h * 0.22, truckPx.w * 0.16, truckPx.h * 0.44);
    ctx.fillStyle = "#111827";
    ctx.fillRect(-truckPx.w * 0.52, -truckPx.h * 0.55, 5, truckPx.h * 1.1);
    ctx.fillRect(truckPx.w * 0.39, -truckPx.h * 0.55, 5, truckPx.h * 1.1);
    ctx.restore();
    ctx.fillStyle = "#7c2d12";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Lastebil (${headingLabel[headingIndex.truck]})`, truckX, truckY - 4);

    const excavatorCenterX = excavatorX + excavatorPx.w * 0.5;
    const excavatorCenterY = excavatorY + excavatorPx.h * 0.5;
    const excavatorRotation = (headingDegrees[headingIndex.excavator] * Math.PI) / 180;

    // Excavator top view (scaled + cardinal rotation)
    ctx.save();
    ctx.translate(excavatorCenterX, excavatorCenterY);
    ctx.rotate(excavatorRotation);
    // tracks
    ctx.fillStyle = "#111827";
    ctx.fillRect(-excavatorPx.w * 0.52, -excavatorPx.h * 0.5, excavatorPx.w * 0.16, excavatorPx.h);
    ctx.fillRect(excavatorPx.w * 0.1, -excavatorPx.h * 0.5, excavatorPx.w * 0.16, excavatorPx.h);
    // body
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-excavatorPx.w * 0.34, -excavatorPx.h * 0.36, excavatorPx.w * 0.48, excavatorPx.h * 0.72);
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-excavatorPx.w * 0.34, -excavatorPx.h * 0.36, excavatorPx.w * 0.48, excavatorPx.h * 0.72);
    // cabin
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(-excavatorPx.w * 0.25, -excavatorPx.h * 0.26, excavatorPx.w * 0.18, excavatorPx.h * 0.52);
    ctx.strokeStyle = "#1f2937";
    ctx.strokeRect(-excavatorPx.w * 0.25, -excavatorPx.h * 0.26, excavatorPx.w * 0.18, excavatorPx.h * 0.52);
    // boom and bucket nose (front marker)
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = Math.max(2, pxPerMeter * 0.12);
    ctx.beginPath();
    ctx.moveTo(excavatorPx.w * 0.14, -excavatorPx.h * 0.02);
    ctx.lineTo(excavatorPx.w * 0.34, -excavatorPx.h * 0.12);
    ctx.lineTo(excavatorPx.w * 0.46, -excavatorPx.h * 0.02);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(excavatorPx.w * 0.5, 0);
    ctx.lineTo(excavatorPx.w * 0.42, -excavatorPx.h * 0.08);
    ctx.lineTo(excavatorPx.w * 0.42, excavatorPx.h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#334155";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Gravemaskin (${headingLabel[headingIndex.excavator]})`, excavatorX, excavatorY + excavatorPx.h + 24);

    // Symbols
    if (pipeSymbol === "sirkel") {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(pipeX, pipeY, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (pipeSymbol === "trekant") {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.moveTo(pipeX, pipeY - 9);
      ctx.lineTo(pipeX - 8, pipeY + 8);
      ctx.lineTo(pipeX + 8, pipeY + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(pipeX - 8, pipeY - 8, 16, 16);
    }
    ctx.fillStyle = "#1e293b";
    ctx.font = "12px sans-serif";
    ctx.fillText(pipeLabel, pipeX + 14, pipeY + 4);

    if (massesSymbol === "sirkel") {
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.arc(massesX, massesY, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (massesSymbol === "trekant") {
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.moveTo(massesX, massesY - 9);
      ctx.lineTo(massesX - 8, massesY + 8);
      ctx.lineTo(massesX + 8, massesY + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#d97706";
      ctx.fillRect(massesX - 8, massesY - 8, 16, 16);
    }
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(trenchRight, trenchTop + 6);
    ctx.lineTo(massesX - 10, massesY - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#7c2d12";
    ctx.fillText(massesLabel, massesX + 12, massesY + 4);
    ctx.fillStyle = "#c2410c";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Avstand: ${safeMassDistance.toFixed(2)} m`, Math.min(660, trenchRight + 16), trenchTop + 18);

    // Metadata footer
    ctx.strokeStyle = "#475569";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(trenchLeft, scene.y + scene.h + 12);
    ctx.lineTo(trenchRight, scene.y + scene.h + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Bredde topp: ${safeWidth.toFixed(2)} m`, trenchLeft + 6, scene.y + scene.h + 30);
    ctx.fillText(`Trase lengde: ${safeLength.toFixed(0)} m`, 90, 322);
    ctx.fillText(`Jordart: ${soil}`, 330, 322);
    ctx.fillText(`Masser fra kant: ${safeMassDistance.toFixed(2)} m`, 560, 322);
    ctx.fillStyle = "#7c2d12";
    ctx.font = "11px sans-serif";
    ctx.fillText(trafficSide, 90, 342);
    if (showSymbols) {
      ctx.fillStyle = "#334155";
      ctx.fillText(`Symbolbruk aktiv. Installasjoner registrert: ${hasInstallations ? "Ja" : "Nei"}`, 410, 342);
    }

    // Meter scale legend
    const scaleMeters = 5;
    const scaleWidth = scaleMeters * pxPerMeter;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(690, 58);
    ctx.lineTo(690 + scaleWidth, 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(690, 54);
    ctx.lineTo(690, 62);
    ctx.moveTo(690 + scaleWidth, 54);
    ctx.lineTo(690 + scaleWidth, 62);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${scaleMeters} m`, 694 + scaleWidth / 2 - 8, 50);

    dragBoundsRef.current = {
      excavator: {
        x: excavatorCenterX - Math.max(excavatorPx.w, excavatorPx.h) * 0.7,
        y: excavatorCenterY - Math.max(excavatorPx.w, excavatorPx.h) * 0.7,
        width: Math.max(excavatorPx.w, excavatorPx.h) * 1.4,
        height: Math.max(excavatorPx.w, excavatorPx.h) * 1.4
      },
      truck: {
        x: truckCenterX - Math.max(truckPx.w, truckPx.h) * 0.65,
        y: truckCenterY - Math.max(truckPx.w, truckPx.h) * 0.65,
        width: Math.max(truckPx.w, truckPx.h) * 1.3,
        height: Math.max(truckPx.w, truckPx.h) * 1.3
      },
      pipe: { x: pipeX - 12, y: pipeY - 12, width: 24, height: 24 },
      masses: { x: massesX - 12, y: massesY - 12, width: 24, height: 24 }
    };
  }, [
    hasInstallations,
    massesLabel,
    massesSymbol,
    offsets,
    pipeLabel,
    pipeSymbol,
    safeLength,
    safeMassDistance,
    safeWidth,
    showSymbols,
    soil,
    terrainLabel,
    trafficSide,
    headingIndex
  ]);

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <p className="mb-2 text-xs text-slate-600">
        Grid: 1 rute ~ 1 meter. Dra objekter med mus. Dobbelklikk venstre musetast pa gravemaskin/lastebil for rotasjon i rekkefolge Nord, Vest, Sor, Ost.
      </p>
      <div className="w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="h-auto w-full min-w-[760px] touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerLeave={onPointerEnd}
          onDoubleClick={onDoubleClick}
          style={{ cursor: activeDrag ? "grabbing" : "grab" }}
          aria-label={title}
        />
      </div>
    </div>
  );
}
