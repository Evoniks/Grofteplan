"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CanvasObject, type CanvasObjectData } from "@/components/sketches/planner/CanvasObject";
import { type ObjectType } from "@/components/sketches/planner/AssetIcons";
import { MeasurementLine, type MeasurementView } from "@/components/sketches/planner/MeasurementLine";
import { ObjectToolbar } from "@/components/sketches/planner/ObjectToolbar";
import { useCanvasHistory } from "@/components/sketches/planner/useCanvasHistory";

type TabKey = "cross" | "plan";
type Selection = { kind: "object" | "measurement"; id: string } | null;
type SnapPointType = "trenchEdgeLeft" | "trenchEdgeRight" | "nearestTrackEdge" | "nearestBaseEdge" | "nearestWheelEdge";
type SnapPoint = { objectId: string; type: SnapPointType; x: number; y: number };
type SnapRef = { objectId: string; type: SnapPointType };
type MeasurementData = { id: string; from: SnapRef; to: SnapRef; label: string };
type CanvasState = { objects: CanvasObjectData[]; measurements: MeasurementData[] };

const VIEW_W = 1600;
const VIEW_H = 900;

const presets: Record<ObjectType, Omit<CanvasObjectData, "id" | "x" | "y" | "rotation">> = {
  trenchCross: { type: "trenchCross", width: 520, height: 250 },
  trenchPlan: { type: "trenchPlan", width: 740, height: 120 },
  excavatorSide: { type: "excavatorSide", width: 200, height: 110 },
  excavatorTop: { type: "excavatorTop", width: 150, height: 86 },
  truckTop: { type: "truckTop", width: 200, height: 94 },
  spoilPile: { type: "spoilPile", width: 180, height: 90 },
  spoilPileLong: { type: "spoilPileLong", width: 260, height: 72 },
  ladder: { type: "ladder", width: 60, height: 180 },
  barrier: { type: "barrier", width: 30, height: 96 },
  pipe: { type: "pipe", width: 52, height: 52 },
  escapeRoute: { type: "escapeRoute", width: 180, height: 64 }
};

const crossObjects: ObjectType[] = ["trenchCross", "excavatorSide", "spoilPile", "ladder", "barrier", "pipe"];
const planObjects: ObjectType[] = ["trenchPlan", "excavatorTop", "truckTop", "spoilPileLong", "barrier", "escapeRoute"];
const objectLabels: Record<ObjectType, string> = {
  trenchCross: "Grøft (tverrprofil)",
  trenchPlan: "Grøft (plan)",
  excavatorSide: "Gravemaskin (side)",
  excavatorTop: "Gravemaskin (ovenfra)",
  truckTop: "Lastebil (ovenfra)",
  spoilPile: "Massehaug",
  spoilPileLong: "Massehaug lang",
  ladder: "Stige",
  barrier: "Barrier",
  pipe: "Ledning / rør",
  escapeRoute: "Rømningsvei"
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const defaultCrossSectionObjects: CanvasObjectData[] = [
  { id: uid("trench"), ...presets.trenchCross, x: 420, y: 170, rotation: 0 },
  { id: uid("spoil"), ...presets.spoilPile, x: 230, y: 125, rotation: 0 },
  { id: uid("exc"), ...presets.excavatorSide, x: 980, y: 118, rotation: 0 },
  { id: uid("lad"), ...presets.ladder, x: 760, y: 235, rotation: -14 },
  { id: uid("bar"), ...presets.barrier, x: 1170, y: 132, rotation: 0 },
  { id: uid("pipe"), ...presets.pipe, x: 768, y: 350, rotation: 0 }
];

const defaultPlanObjects: CanvasObjectData[] = [
  { id: uid("trench"), ...presets.trenchPlan, x: 360, y: 470, rotation: 0 },
  { id: uid("spoil"), ...presets.spoilPileLong, x: 190, y: 380, rotation: 0 },
  { id: uid("exc"), ...presets.excavatorTop, x: 980, y: 405, rotation: 0 },
  { id: uid("truck"), ...presets.truckTop, x: 990, y: 625, rotation: 180 },
  { id: uid("bar"), ...presets.barrier, x: 1210, y: 380, rotation: 0 },
  { id: uid("escape"), ...presets.escapeRoute, x: 720, y: 628, rotation: 0 }
];

const defaultCrossMeasurements: MeasurementData[] = [];
const defaultPlanMeasurements: MeasurementData[] = [];

function cloneObjects(items: CanvasObjectData[]) {
  return items.map((o) => ({ ...o, id: uid(o.type) }));
}

function cloneMeasurements(items: MeasurementData[]) {
  return items.map((m) => ({ ...m, id: uid("m") }));
}

function getSnapPoints(o: CanvasObjectData): SnapPoint[] {
  const left = o.x;
  const right = o.x + o.width;
  const top = o.y;
  const bottom = o.y + o.height;
  const midY = o.y + o.height / 2;

  switch (o.type) {
    case "trenchCross":
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: left + o.width * 0.22, y: top + o.height * 0.08 },
        { objectId: o.id, type: "trenchEdgeRight", x: right - o.width * 0.22, y: top + o.height * 0.08 }
      ];
    case "trenchPlan":
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: left, y: midY },
        { objectId: o.id, type: "trenchEdgeRight", x: right, y: midY }
      ];
    case "spoilPile":
    case "spoilPileLong":
      return [{ objectId: o.id, type: "nearestBaseEdge", x: left, y: bottom - 2 }];
    case "excavatorSide":
    case "excavatorTop":
      return [{ objectId: o.id, type: "nearestTrackEdge", x: left, y: midY }];
    case "truckTop":
      return [{ objectId: o.id, type: "nearestWheelEdge", x: left, y: midY }];
    default:
      return [{ objectId: o.id, type: "nearestBaseEdge", x: left + o.width / 2, y: midY }];
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegmentDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function resolveMeasurements(state: CanvasState): MeasurementView[] {
  const byObj = new Map(state.objects.map((o) => [o.id, getSnapPoints(o)]));
  return state.measurements
    .map((m) => {
      const from = (byObj.get(m.from.objectId) || []).find((s) => s.type === m.from.type);
      const to = (byObj.get(m.to.objectId) || []).find((s) => s.type === m.to.type);
      if (!from || !to) return null;
      return { id: m.id, from, to, label: m.label };
    })
    .filter(Boolean) as MeasurementView[];
}

function buildPrintableSvg(state: CanvasState) {
  const measurements = resolveMeasurements(state);
  const printObject = (o: CanvasObjectData) => {
    switch (o.type) {
      case "trenchCross":
        return `<polygon points="${o.x + o.width * 0.16},${o.y + o.height * 0.04} ${o.x + o.width * 0.84},${o.y + o.height * 0.04} ${o.x + o.width * 0.63},${o.y + o.height * 0.95} ${o.x + o.width * 0.37},${o.y + o.height * 0.95}" fill="#bfdbfe" stroke="#0f172a" stroke-width="2.5" />`;
      case "trenchPlan":
        return `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" rx="12" fill="#bfdbfe" stroke="#0f172a" stroke-width="2.5" />
                <line x1="${o.x + 8}" y1="${o.y + o.height / 2}" x2="${o.x + o.width - 8}" y2="${o.y + o.height / 2}" stroke="#60a5fa" stroke-width="2" stroke-dasharray="8 6" />
                <line x1="${o.x + 8}" y1="${o.y + o.height * 0.26}" x2="${o.x + o.width - 8}" y2="${o.y + o.height * 0.26}" stroke="#ffffff90" stroke-width="2" />`;
      case "excavatorSide":
        return `<rect x="${o.x + o.width * 0.09}" y="${o.y + o.height * 0.18}" width="${o.width * 0.36}" height="${o.height * 0.38}" fill="#f59e0b" stroke="#111827" stroke-width="2" />
                <rect x="${o.x + o.width * 0.16}" y="${o.y + o.height * 0.57}" width="${o.width * 0.54}" height="${o.height * 0.2}" fill="#475569" stroke="#111827" stroke-width="2" />
                <line x1="${o.x + o.width * 0.47}" y1="${o.y + o.height * 0.24}" x2="${o.x + o.width * 0.83}" y2="${o.y + o.height * 0.08}" stroke="#374151" stroke-width="5" />
                <line x1="${o.x + o.width * 0.13}" y1="${o.y + o.height * 0.26}" x2="${o.x + o.width * 0.41}" y2="${o.y + o.height * 0.26}" stroke="#ffffff95" stroke-width="2" />`;
      case "excavatorTop":
        return `<rect x="${o.x + o.width * 0.04}" y="${o.y + o.height * 0.08}" width="${o.width * 0.2}" height="${o.height * 0.84}" fill="#111827" />
                <rect x="${o.x + o.width * 0.62}" y="${o.y + o.height * 0.08}" width="${o.width * 0.2}" height="${o.height * 0.84}" fill="#111827" />
                <rect x="${o.x + o.width * 0.24}" y="${o.y + o.height * 0.18}" width="${o.width * 0.42}" height="${o.height * 0.64}" fill="#f59e0b" stroke="#111827" stroke-width="2" />
                <line x1="${o.x + o.width * 0.28}" y1="${o.y + o.height * 0.28}" x2="${o.x + o.width * 0.6}" y2="${o.y + o.height * 0.28}" stroke="#fff" stroke-width="1.7" />`;
      case "truckTop":
        return `<rect x="${o.x}" y="${o.y + o.height * 0.16}" width="${o.width * 0.68}" height="${o.height * 0.68}" fill="#60a5fa" stroke="#111827" stroke-width="2" />
                <rect x="${o.x + o.width * 0.7}" y="${o.y + o.height * 0.24}" width="${o.width * 0.24}" height="${o.height * 0.52}" fill="#fb923c" stroke="#7c2d12" stroke-width="2" />
                <line x1="${o.x + o.width * 0.04}" y1="${o.y + o.height * 0.26}" x2="${o.x + o.width * 0.62}" y2="${o.y + o.height * 0.26}" stroke="#fff" stroke-width="1.6" />`;
      case "spoilPile":
        return `<ellipse cx="${o.x + o.width / 2}" cy="${o.y + o.height * 0.72}" rx="${o.width * 0.48}" ry="${o.height * 0.3}" fill="#b08968" stroke="#3f3f46" stroke-width="2" />
                <ellipse cx="${o.x + o.width / 2}" cy="${o.y + o.height * 0.62}" rx="${o.width * 0.35}" ry="${o.height * 0.16}" fill="#ffffff33" />`;
      case "spoilPileLong":
        return `<rect x="${o.x}" y="${o.y + o.height * 0.24}" width="${o.width}" height="${o.height * 0.56}" rx="${o.height * 0.25}" fill="#b08968" stroke="#3f3f46" stroke-width="2" />
                <line x1="${o.x + o.width * 0.08}" y1="${o.y + o.height * 0.36}" x2="${o.x + o.width * 0.9}" y2="${o.y + o.height * 0.36}" stroke="#ffffff40" stroke-width="2" />`;
      case "ladder":
        return `<line x1="${o.x + o.width * 0.28}" y1="${o.y}" x2="${o.x + o.width * 0.2}" y2="${o.y + o.height}" stroke="#4b5563" stroke-width="4" />
                <line x1="${o.x + o.width * 0.72}" y1="${o.y}" x2="${o.x + o.width * 0.64}" y2="${o.y + o.height}" stroke="#4b5563" stroke-width="4" />`;
      case "barrier":
        return `<rect x="${o.x + o.width * 0.32}" y="${o.y}" width="${o.width * 0.35}" height="${o.height}" fill="#dc2626" />
                <line x1="${o.x + o.width * 0.35}" y1="${o.y + o.height * 0.1}" x2="${o.x + o.width * 0.62}" y2="${o.y + o.height * 0.1}" stroke="#ffffff85" stroke-width="1.3" />`;
      case "pipe":
        return `<circle cx="${o.x + o.width / 2}" cy="${o.y + o.height / 2}" r="${Math.min(o.width, o.height) * 0.32}" fill="#64748b" stroke="#111827" stroke-width="2" />
                <circle cx="${o.x + o.width / 2}" cy="${o.y + o.height / 2}" r="${Math.min(o.width, o.height) * 0.15}" fill="#94a3b8" />`;
      case "escapeRoute":
        return `<rect x="${o.x}" y="${o.y + o.height * 0.28}" width="${o.width * 0.78}" height="${o.height * 0.44}" rx="6" fill="#22c55e" stroke="#14532d" stroke-width="2" />
                <line x1="${o.x + o.width * 0.08}" y1="${o.y + o.height * 0.4}" x2="${o.x + o.width * 0.52}" y2="${o.y + o.height * 0.4}" stroke="#bbf7d0" stroke-width="2" />`;
      default:
        return "";
    }
  };
  const objectMarkup = state.objects
    .map(
      (o) => `
      <g transform="rotate(${o.rotation} ${o.x + o.width / 2} ${o.y + o.height / 2})">
        ${printObject(o)}
      </g>
    `
    )
    .join("");
  const measurementMarkup = measurements
    .map(
      (m) => `
      <line x1="${m.from.x}" y1="${m.from.y}" x2="${m.to.x}" y2="${m.to.y}" stroke="#0f172a" stroke-width="2.2" />
      <rect x="${(m.from.x + m.to.x) / 2 - 60}" y="${(m.from.y + m.to.y) / 2 - 24}" width="120" height="22" fill="#fff" stroke="#334155" />
      <text x="${(m.from.x + m.to.x) / 2}" y="${(m.from.y + m.to.y) / 2 - 9}" text-anchor="middle" fill="#0f172a" font-size="13">${m.label}</text>
    `
    )
    .join("");
  const gridMarkup = `
    ${Array.from({ length: 33 }).map((_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${VIEW_H}" stroke="#e2e8f0" stroke-width="1" />`).join("")}
    ${Array.from({ length: 19 }).map((_, i) => `<line x1="0" y1="${i * 50}" x2="${VIEW_W}" y2="${i * 50}" stroke="#e2e8f0" stroke-width="1" />`).join("")}
  `;

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="100%" style="border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;">
      ${gridMarkup}
      ${objectMarkup}
      ${measurementMarkup}
    </svg>
  `;
}

export function TrenchPlanner() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("cross");
  const [selection, setSelection] = useState<Selection>(null);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [pendingMeasure, setPendingMeasure] = useState<SnapPoint | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);

  const crossHistory = useCanvasHistory<CanvasState>({
    objects: defaultCrossSectionObjects,
    measurements: defaultCrossMeasurements
  });
  const planHistory = useCanvasHistory<CanvasState>({
    objects: defaultPlanObjects,
    measurements: defaultPlanMeasurements
  });

  const current = activeTab === "cross" ? crossHistory : planHistory;
  const setCurrent = current.update;

  const snapPoints = useMemo(() => current.present.objects.flatMap((o) => getSnapPoints(o)), [current.present.objects]);

  const measurementViews: MeasurementView[] = useMemo(() => resolveMeasurements(current.present), [current.present]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const deleteKey = event.key === "Delete" || event.key === "Backspace";
      if (deleteKey && selection) {
        event.preventDefault();
        if (selection.kind === "object") {
          setCurrent((prev) => ({
            ...prev,
            objects: prev.objects.filter((o) => o.id !== selection.id),
            measurements: prev.measurements.filter((m) => m.from.objectId !== selection.id && m.to.objectId !== selection.id)
          }));
        } else {
          setCurrent((prev) => ({
            ...prev,
            measurements: prev.measurements.filter((m) => m.id !== selection.id)
          }));
        }
        setSelection(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (activeTab === "cross") crossHistory.undo();
        else planHistory.undo();
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, crossHistory, planHistory, selection, setCurrent]);

  useEffect(() => {
    setSelection(null);
    setPendingMeasure(null);
  }, [activeTab]);

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * VIEW_W;
    const sy = ((clientY - rect.top) / rect.height) * VIEW_H;
    return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
  };

  const addObject = (type: ObjectType) => {
    const preset = presets[type];
    setCurrent((prev) => ({
      ...prev,
      objects: [...prev.objects, { id: uid(type), ...preset, x: 140 + prev.objects.length * 16, y: 120 + prev.objects.length * 10, rotation: 0 }]
    }));
  };

  const nearestSnap = (p: { x: number; y: number }) => {
    if (!snapPoints.length) return null;
    let best = snapPoints[0];
    let bestDist = dist(p, best);
    for (const s of snapPoints.slice(1)) {
      const d = dist(p, s);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    return best;
  };

  const shortestPairBetweenObjects = (aId: string, bId: string) => {
    const aPoints = snapPoints.filter((s) => s.objectId === aId);
    const bPoints = snapPoints.filter((s) => s.objectId === bId);
    if (!aPoints.length || !bPoints.length) return null;
    let bestA = aPoints[0];
    let bestB = bPoints[0];
    let bestD = dist(bestA, bestB);
    for (const ap of aPoints) {
      for (const bp of bPoints) {
        const d = dist(ap, bp);
        if (d < bestD) {
          bestA = ap;
          bestB = bp;
          bestD = d;
        }
      }
    }
    return { a: bestA, b: bestB };
  };

  const selectMeasurementAtPoint = (p: { x: number; y: number }) => {
    const hit = measurementViews.find((m) => pointToSegmentDistance(p, m.from, m.to) <= 10);
    if (!hit) return null;
    return hit.id;
  };

  const onCanvasMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;

    if (isMeasureMode) {
      const snap = nearestSnap(world);
      if (!snap) return;
      if (!pendingMeasure) {
        setPendingMeasure(snap);
      } else {
        let from = pendingMeasure;
        let to = snap;
        if (from.objectId !== to.objectId) {
          const shortest = shortestPairBetweenObjects(from.objectId, to.objectId);
          if (shortest) {
            from = shortest.a;
            to = shortest.b;
          }
        }
        setCurrent((prev) => ({
          ...prev,
          measurements: [
            ...prev.measurements,
            {
              id: uid("m"),
              from: { objectId: from.objectId, type: from.type },
              to: { objectId: to.objectId, type: to.type },
              label: "Min. 1,0 m"
            }
          ]
        }));
        setPendingMeasure(null);
      }
      return;
    }

    const objectHit = [...current.present.objects]
      .reverse()
      .find((o) => world.x >= o.x && world.x <= o.x + o.width && world.y >= o.y && world.y <= o.y + o.height);

    if (objectHit) {
      setSelection({ kind: "object", id: objectHit.id });
      setDragging({ id: objectHit.id, offsetX: world.x - objectHit.x, offsetY: world.y - objectHit.y });
      return;
    }

    const measurementId = selectMeasurementAtPoint(world);
    if (measurementId) {
      setSelection({ kind: "measurement", id: measurementId });
      return;
    }

    setSelection(null);
    setPanning({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const onCanvasMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;
    if (dragging) {
      setCurrent((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => (o.id === dragging.id ? { ...o, x: world.x - dragging.offsetX, y: world.y - dragging.offsetY } : o))
      }));
      return;
    }
    if (panning) {
      setPan({ x: event.clientX - panning.x, y: event.clientY - panning.y });
    }
  };

  const onCanvasMouseUp = () => {
    setDragging(null);
    setPanning(null);
  };

  const onCanvasWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.max(0.35, Math.min(3, z * factor)));
  };

  const selectedObject = selection?.kind === "object" ? current.present.objects.find((o) => o.id === selection.id) || null : null;

  const selectedToolbarPos = selectedObject
    ? {
        x: ((selectedObject.x + selectedObject.width / 2) * zoom + pan.x) / VIEW_W * 100,
        y: ((selectedObject.y - 8) * zoom + pan.y) / VIEW_H * 100
      }
    : null;

  const updateSelectedMeasurementLabel = (id: string) => {
    const found = current.present.measurements.find((m) => m.id === id);
    if (!found) return;
    const label = window.prompt("Rediger måletekst", found.label);
    if (label == null) return;
    setCurrent((prev) => ({
      ...prev,
      measurements: prev.measurements.map((m) => (m.id === id ? { ...m, label } : m))
    }));
  };

  const deleteSelected = () => {
    if (!selection) return;
    if (selection.kind === "object") {
      setCurrent((prev) => ({
        ...prev,
        objects: prev.objects.filter((o) => o.id !== selection.id),
        measurements: prev.measurements.filter((m) => m.from.objectId !== selection.id && m.to.objectId !== selection.id)
      }));
    } else {
      setCurrent((prev) => ({
        ...prev,
        measurements: prev.measurements.filter((m) => m.id !== selection.id)
      }));
    }
    setSelection(null);
  };

  const duplicateSelected = () => {
    if (!selectedObject) return;
    setCurrent((prev) => ({
      ...prev,
      objects: [...prev.objects, { ...selectedObject, id: uid(selectedObject.type), x: selectedObject.x + 30, y: selectedObject.y + 24 }]
    }));
  };

  const rotateSelected = () => {
    if (!selectedObject) return;
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === selectedObject.id ? { ...o, rotation: (o.rotation + 90) % 360 } : o))
    }));
  };

  const reorderSelected = (dir: "backward" | "forward") => {
    if (!selectedObject) return;
    setCurrent((prev) => {
      const idx = prev.objects.findIndex((o) => o.id === selectedObject.id);
      if (idx < 0) return prev;
      const target = dir === "forward" ? idx + 1 : idx - 1;
      if (target < 0 || target >= prev.objects.length) return prev;
      const list = [...prev.objects];
      const [item] = list.splice(idx, 1);
      list.splice(target, 0, item);
      return { ...prev, objects: list };
    });
  };

  const clearActiveCanvas = () => {
    if (!window.confirm("Er du sikker på at du vil tømme aktiv arbeidsflate?")) return;
    setCurrent({ objects: [], measurements: [] });
    setSelection(null);
  };

  const clearBoth = () => {
    if (!window.confirm("Er du sikker på at du vil tømme begge arbeidsflater?")) return;
    crossHistory.update({ objects: [], measurements: [] });
    planHistory.update({ objects: [], measurements: [] });
    setSelection(null);
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const resetAll = () => {
    if (!window.confirm("Er du sikker på at du vil tilbakestille hele arbeidsflaten?")) return;
    crossHistory.reset({ objects: cloneObjects(defaultCrossSectionObjects), measurements: cloneMeasurements(defaultCrossMeasurements) });
    planHistory.reset({ objects: cloneObjects(defaultPlanObjects), measurements: cloneMeasurements(defaultPlanMeasurements) });
    setSelection(null);
    setPendingMeasure(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const exportPrint = () => {
    const render = (title: string) => `<h2 style="font-family:Arial,sans-serif;margin:16px 0 8px;">${title}</h2>`;
    const w = window.open("", "_blank", "noopener,noreferrer,width=1400,height=1000");
    if (!w) return;
    w.document.write(`
      <html><head><title>Grøfteplan eksport</title></head>
      <body style="font-family:Arial,sans-serif;padding:16px;">
        ${render("Tverrprofil")}
        ${buildPrintableSvg(crossHistory.present)}
        ${render("Plan (ovenfra)")}
        ${buildPrintableSvg(planHistory.present)}
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const activePalette = activeTab === "cross" ? crossObjects : planObjects;
  const activeUndo = activeTab === "cross" ? crossHistory.canUndo : planHistory.canUndo;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Objekter</h2>
        <div className="grid gap-2">
          {activePalette.map((type) => (
            <Button key={type} variant="outline" onClick={() => addObject(type)}>
              {objectLabels[type]}
            </Button>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <Button onClick={() => setIsMeasureMode((v) => !v)}>{isMeasureMode ? "Avslutt måling" : "Legg til måling"}</Button>
          <Button variant="outline" onClick={deleteSelected}>Slett valgt</Button>
          <Button variant="outline" onClick={() => (activeTab === "cross" ? crossHistory.undo() : planHistory.undo())} disabled={!activeUndo}>Angre</Button>
          <Button variant="outline" onClick={clearActiveCanvas}>Tøm arbeidsflate</Button>
          <Button variant="outline" onClick={clearBoth}>Tøm begge</Button>
          <Button variant="outline" onClick={resetAll} className="border-red-300 text-red-700 hover:bg-red-50">Tilbakestill alt</Button>
          <Button variant="secondary" onClick={exportPrint}>Eksporter/PDF</Button>
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={() => setShowGrid((v) => !v)}>{showGrid ? "Skjul grid" : "Vis grid"}</Button>
          <Button variant="outline" onClick={resetZoom}>Tilbakestill zoom til 1,00x</Button>
          <div className="text-xs text-slate-600">Zoom: {(zoom * 100).toFixed(0)}%</div>
        </div>
      </aside>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex gap-2">
          <Button variant={activeTab === "cross" ? "default" : "outline"} onClick={() => setActiveTab("cross")}>
            Tverrprofil
          </Button>
          <Button variant={activeTab === "plan" ? "default" : "outline"} onClick={() => setActiveTab("plan")}>
            Plan (ovenfra)
          </Button>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-300">
          {selectedObject && selectedToolbarPos && (
            <ObjectToolbar
              xPercent={selectedToolbarPos.x}
              yPercent={selectedToolbarPos.y}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onRotate={rotateSelected}
              onSendBackward={() => reorderSelected("backward")}
              onBringForward={() => reorderSelected("forward")}
            />
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-full w-full bg-slate-50"
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onWheel={onCanvasWheel}
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

              {current.present.objects.map((o) => (
                <CanvasObject
                  key={o.id}
                  object={o}
                  selected={selection?.kind === "object" && selection.id === o.id}
                  onMouseDown={() => setSelection({ kind: "object", id: o.id })}
                />
              ))}

              {snapPoints.map((sp, idx) => (
                <circle key={`${sp.objectId}-${idx}`} cx={sp.x} cy={sp.y} r={5.5} fill={isMeasureMode ? "#dc2626" : "#2563eb"} />
              ))}

              {measurementViews.map((m) => (
                <MeasurementLine
                  key={m.id}
                  measurement={m}
                  selected={selection?.kind === "measurement" && selection.id === m.id}
                  onSelect={() => setSelection({ kind: "measurement", id: m.id })}
                  onEditLabel={() => updateSelectedMeasurementLabel(m.id)}
                />
              ))}

              {pendingMeasure && <circle cx={pendingMeasure.x} cy={pendingMeasure.y} r={8} fill="#f59e0b" />}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

