"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ObjectType =
  | "trenchCross"
  | "trenchPlan"
  | "excavatorSide"
  | "excavatorTop"
  | "truckTop"
  | "spoilPile"
  | "ladder"
  | "barrier";

type SnapPointType = "trenchEdgeLeft" | "trenchEdgeRight" | "nearestTrackEdge" | "nearestBaseEdge" | "nearestWheelEdge";

type CanvasObject = {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SnapPoint = {
  objectId: string;
  type: SnapPointType;
  x: number;
  y: number;
};

type Measurement = {
  id: string;
  from: SnapPoint;
  to: SnapPoint;
  label: string;
};

const VIEW_W = 1600;
const VIEW_H = 900;

const objectPresets: Record<ObjectType, Omit<CanvasObject, "id" | "x" | "y">> = {
  trenchCross: { type: "trenchCross", width: 500, height: 250 },
  trenchPlan: { type: "trenchPlan", width: 700, height: 120 },
  excavatorSide: { type: "excavatorSide", width: 180, height: 100 },
  excavatorTop: { type: "excavatorTop", width: 140, height: 80 },
  truckTop: { type: "truckTop", width: 190, height: 90 },
  spoilPile: { type: "spoilPile", width: 170, height: 90 },
  ladder: { type: "ladder", width: 52, height: 170 },
  barrier: { type: "barrier", width: 24, height: 90 }
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSnapPoints(o: CanvasObject): SnapPoint[] {
  const left = o.x;
  const right = o.x + o.width;
  const top = o.y;
  const bottom = o.y + o.height;
  const midY = o.y + o.height / 2;
  const midX = o.x + o.width / 2;

  switch (o.type) {
    case "trenchCross":
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: left + o.width * 0.23, y: top + o.height * 0.08 },
        { objectId: o.id, type: "trenchEdgeRight", x: right - o.width * 0.23, y: top + o.height * 0.08 }
      ];
    case "trenchPlan":
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: left, y: midY },
        { objectId: o.id, type: "trenchEdgeRight", x: right, y: midY }
      ];
    case "spoilPile":
      return [{ objectId: o.id, type: "nearestBaseEdge", x: left, y: bottom - 2 }];
    case "excavatorSide":
    case "excavatorTop":
      return [{ objectId: o.id, type: "nearestTrackEdge", x: left, y: midY }];
    case "truckTop":
      return [{ objectId: o.id, type: "nearestWheelEdge", x: left, y: midY }];
    default:
      return [{ objectId: o.id, type: "nearestBaseEdge", x: midX, y: midY }];
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function MeasurementArrows({ m }: { m: Measurement }) {
  const dx = m.to.x - m.from.x;
  const dy = m.to.y - m.from.y;
  const angle = Math.atan2(dy, dx);
  const head = 12;
  const labelX = (m.from.x + m.to.x) / 2;
  const labelY = (m.from.y + m.to.y) / 2 - 18;

  return (
    <g>
      <line x1={m.from.x} y1={m.from.y} x2={m.to.x} y2={m.to.y} stroke="#0f172a" strokeWidth={2.5} />
      <line x1={m.from.x} y1={m.from.y} x2={m.from.x + Math.cos(angle + Math.PI - Math.PI / 7) * head} y2={m.from.y + Math.sin(angle + Math.PI - Math.PI / 7) * head} stroke="#0f172a" strokeWidth={2.5} />
      <line x1={m.from.x} y1={m.from.y} x2={m.from.x + Math.cos(angle + Math.PI + Math.PI / 7) * head} y2={m.from.y + Math.sin(angle + Math.PI + Math.PI / 7) * head} stroke="#0f172a" strokeWidth={2.5} />
      <line x1={m.to.x} y1={m.to.y} x2={m.to.x + Math.cos(angle - Math.PI / 7) * head} y2={m.to.y + Math.sin(angle - Math.PI / 7) * head} stroke="#0f172a" strokeWidth={2.5} />
      <line x1={m.to.x} y1={m.to.y} x2={m.to.x + Math.cos(angle + Math.PI / 7) * head} y2={m.to.y + Math.sin(angle + Math.PI / 7) * head} stroke="#0f172a" strokeWidth={2.5} />
      <rect x={labelX - 66} y={labelY - 16} width={132} height={28} rx={6} fill="white" stroke="#334155" />
      <text x={labelX} y={labelY + 3} fill="#0f172a" fontSize={14} textAnchor="middle" fontWeight={600}>
        {m.label}
      </text>
    </g>
  );
}

function RenderObject({ o, selected }: { o: CanvasObject; selected: boolean }) {
  const stroke = selected ? "#2563eb" : "#1f2937";
  switch (o.type) {
    case "trenchCross":
      return (
        <g>
          <polygon
            points={`${o.x + o.width * 0.18},${o.y + o.height * 0.03} ${o.x + o.width * 0.82},${o.y + o.height * 0.03} ${o.x + o.width * 0.63},${o.y + o.height * 0.95} ${o.x + o.width * 0.37},${o.y + o.height * 0.95}`}
            fill="#dbeafe"
            stroke={stroke}
            strokeWidth={3}
          />
        </g>
      );
    case "trenchPlan":
      return <rect x={o.x} y={o.y} width={o.width} height={o.height} rx={10} fill="#bfdbfe" stroke={stroke} strokeWidth={3} />;
    case "excavatorSide":
      return (
        <g>
          <rect x={o.x + 10} y={o.y + 16} width={o.width * 0.48} height={o.height * 0.4} fill="#f59e0b" stroke={stroke} />
          <rect x={o.x + 22} y={o.y + 52} width={o.width * 0.62} height={o.height * 0.2} fill="#475569" stroke={stroke} />
          <line x1={o.x + o.width * 0.58} y1={o.y + 24} x2={o.x + o.width * 0.92} y2={o.y + 8} stroke={stroke} strokeWidth={6} />
        </g>
      );
    case "excavatorTop":
      return (
        <g>
          <rect x={o.x + 8} y={o.y + 8} width={o.width * 0.2} height={o.height * 0.84} fill="#111827" />
          <rect x={o.x + o.width * 0.58} y={o.y + 8} width={o.width * 0.2} height={o.height * 0.84} fill="#111827" />
          <rect x={o.x + o.width * 0.2} y={o.y + 16} width={o.width * 0.5} height={o.height * 0.68} fill="#f59e0b" stroke={stroke} />
        </g>
      );
    case "truckTop":
      return (
        <g>
          <rect x={o.x} y={o.y + 12} width={o.width * 0.72} height={o.height * 0.72} fill="#60a5fa" stroke={stroke} />
          <rect x={o.x + o.width * 0.72} y={o.y + 20} width={o.width * 0.24} height={o.height * 0.56} fill="#fb923c" stroke={stroke} />
        </g>
      );
    case "spoilPile":
      return <ellipse cx={o.x + o.width / 2} cy={o.y + o.height * 0.75} rx={o.width / 2} ry={o.height * 0.3} fill="#b08968" stroke={stroke} strokeWidth={2} />;
    case "ladder":
      return (
        <g>
          <line x1={o.x + 14} y1={o.y} x2={o.x + 10} y2={o.y + o.height} stroke={stroke} strokeWidth={4} />
          <line x1={o.x + 38} y1={o.y} x2={o.x + 34} y2={o.y + o.height} stroke={stroke} strokeWidth={4} />
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={o.x + 11} y1={o.y + 18 + i * 20} x2={o.x + 37} y2={o.y + 18 + i * 20} stroke={stroke} strokeWidth={3} />
          ))}
        </g>
      );
    case "barrier":
      return (
        <g>
          <rect x={o.x + 8} y={o.y} width={8} height={o.height} fill="#dc2626" />
          <rect x={o.x + 8} y={o.y + 18} width={8} height={6} fill="#f8fafc" />
          <rect x={o.x + 8} y={o.y + 36} width={8} height={6} fill="#f8fafc" />
        </g>
      );
    default:
      return null;
  }
}

export function TrenchPlanner() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([
    { id: makeId("trench"), ...objectPresets.trenchCross, x: 420, y: 170 },
    { id: makeId("trench"), ...objectPresets.trenchPlan, x: 360, y: 560 },
    { id: makeId("spoil"), ...objectPresets.spoilPile, x: 250, y: 150 },
    { id: makeId("exc"), ...objectPresets.excavatorSide, x: 980, y: 120 }
  ]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [pendingMeasure, setPendingMeasure] = useState<SnapPoint | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);

  const snapPoints = useMemo(() => objects.flatMap((o) => getSnapPoints(o)), [objects]);

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * VIEW_W;
    const sy = ((clientY - rect.top) / rect.height) * VIEW_H;
    return {
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom
    };
  };

  const addObject = (type: ObjectType) => {
    const preset = objectPresets[type];
    setObjects((prev) => [...prev, { id: makeId(type), ...preset, x: 120 + prev.length * 16, y: 120 + prev.length * 10 }]);
  };

  const nearestSnap = (point: { x: number; y: number }) => {
    if (!snapPoints.length) return null;
    let best = snapPoints[0];
    let bestDist = distance(point, best);
    for (const sp of snapPoints.slice(1)) {
      const d = distance(point, sp);
      if (d < bestDist) {
        best = sp;
        bestDist = d;
      }
    }
    return { snap: best, dist: bestDist };
  };

  const shortestPairBetweenObjects = (aId: string, bId: string) => {
    const aPoints = snapPoints.filter((s) => s.objectId === aId);
    const bPoints = snapPoints.filter((s) => s.objectId === bId);
    if (!aPoints.length || !bPoints.length) return null;
    let bestA = aPoints[0];
    let bestB = bPoints[0];
    let bestDist = distance(bestA, bestB);
    for (const ap of aPoints) {
      for (const bp of bPoints) {
        const d = distance(ap, bp);
        if (d < bestDist) {
          bestA = ap;
          bestB = bp;
          bestDist = d;
        }
      }
    }
    return { a: bestA, b: bestB };
  };

  const onMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;

    if (isMeasureMode) {
      const snapHit = nearestSnap(world);
      if (!snapHit) return;
      const current = snapHit.snap;
      if (!pendingMeasure) {
        setPendingMeasure(current);
      } else {
        let from = pendingMeasure;
        let to = current;
        if (pendingMeasure.objectId !== current.objectId) {
          const shortest = shortestPairBetweenObjects(pendingMeasure.objectId, current.objectId);
          if (shortest) {
            from = shortest.a;
            to = shortest.b;
          }
        }
        setMeasurements((prev) => [...prev, { id: makeId("m"), from, to, label: "Min. 1,0 m" }]);
        setPendingMeasure(null);
      }
      return;
    }

    const hit = [...objects]
      .reverse()
      .find((o) => world.x >= o.x && world.x <= o.x + o.width && world.y >= o.y && world.y <= o.y + o.height);
    if (hit) {
      setSelectedId(hit.id);
      setDragging({ id: hit.id, offsetX: world.x - hit.x, offsetY: world.y - hit.y });
    } else {
      setSelectedId(null);
      setPanning({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  };

  const onMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;
    if (dragging) {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === dragging.id
            ? {
                ...o,
                x: world.x - dragging.offsetX,
                y: world.y - dragging.offsetY
              }
            : o
        )
      );
      return;
    }
    if (panning) {
      setPan({
        x: event.clientX - panning.x,
        y: event.clientY - panning.y
      });
    }
  };

  const onMouseUp = () => {
    setDragging(null);
    setPanning(null);
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.max(0.35, Math.min(3, z * factor)));
  };

  const editMeasurement = (id: string) => {
    const m = measurements.find((x) => x.id === id);
    if (!m) return;
    const updated = window.prompt("Rediger måletekst", m.label);
    if (updated === null) return;
    setMeasurements((prev) => prev.map((x) => (x.id === id ? { ...x, label: updated } : x)));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Objekter</h2>
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => addObject("trenchCross")}>Trench (cross)</Button>
          <Button variant="outline" onClick={() => addObject("trenchPlan")}>Trench (plan)</Button>
          <Button variant="outline" onClick={() => addObject("excavatorSide")}>Excavator (side)</Button>
          <Button variant="outline" onClick={() => addObject("excavatorTop")}>Excavator (top)</Button>
          <Button variant="outline" onClick={() => addObject("truckTop")}>Truck (top)</Button>
          <Button variant="outline" onClick={() => addObject("spoilPile")}>Spoil pile</Button>
          <Button variant="outline" onClick={() => addObject("ladder")}>Ladder</Button>
          <Button variant="outline" onClick={() => addObject("barrier")}>Barrier</Button>
        </div>
        <div className="border-t border-slate-200 pt-4">
          <Button onClick={() => setIsMeasureMode((v) => !v)}>{isMeasureMode ? "Avslutt måling" : "Legg til måling"}</Button>
          <p className="mt-2 text-xs text-slate-600">Klikk to snap points. Målingen snapper til nærmeste punkter og bruker korteste avstand mellom objekter.</p>
        </div>
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <Button variant="outline" onClick={() => setShowGrid((v) => !v)}>{showGrid ? "Skjul grid" : "Vis grid"}</Button>
          <div className="text-xs text-slate-600">Zoom: {zoom.toFixed(2)}x</div>
        </div>
      </aside>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="aspect-video w-full overflow-hidden rounded-md border border-slate-300">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-full w-full bg-slate-50"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {showGrid &&
                Array.from({ length: 33 }).map((_, i) => (
                  <line key={`gx-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={VIEW_H} stroke="#e2e8f0" strokeWidth={1} />
                ))}
              {showGrid &&
                Array.from({ length: 19 }).map((_, i) => (
                  <line key={`gy-${i}`} x1={0} y1={i * 50} x2={VIEW_W} y2={i * 50} stroke="#e2e8f0" strokeWidth={1} />
                ))}

              {objects.map((o) => (
                <g key={o.id}>
                  <RenderObject o={o} selected={o.id === selectedId} />
                </g>
              ))}

              {snapPoints.map((sp, idx) => (
                <circle key={`${sp.objectId}-${idx}`} cx={sp.x} cy={sp.y} r={5.5} fill={isMeasureMode ? "#dc2626" : "#2563eb"} />
              ))}

              {measurements.map((m) => (
                <g key={m.id} onDoubleClick={() => editMeasurement(m.id)} style={{ cursor: "pointer" }}>
                  <MeasurementArrows m={m} />
                </g>
              ))}

              {pendingMeasure && <circle cx={pendingMeasure.x} cy={pendingMeasure.y} r={8} fill="#f59e0b" />}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

