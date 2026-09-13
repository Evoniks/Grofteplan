"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CanvasObject, type CanvasObjectData } from "@/components/sketches/planner/CanvasObject";
import {
  PlanProfileRulerLayer,
  defaultPlanProfileRulerState,
  planProfileRulerSvgMarkup,
  type PlanProfileRulerState
} from "@/components/sketches/planner/planProfileRuler";
import {
  EXCAVATOR_SIDE_ASPECT,
  EXCAVATOR_SIDE_LIGHT_BG_KNOCKOUT,
  EXCAVATOR_SIDE_PNG,
  RASTER_KNOCKOUT_ALPHA_BOOST_SLOPE,
  EXCAVATOR_SIDE_PRESET_HEIGHT,
  EXCAVATOR_SIDE_PRESET_WIDTH,
  EXCAVATOR_TOP_PNG,
  TRUCK_TOP_PNG,
  ESCAPE_ROUTE_PLAN_PNG,
  SHEET_PILE_CROSS_PNG,
  TRENCH_BOX_CROSS_PNG,
  PLAN_TILE_ASFALT_PNG,
  PLAN_TILE_JORD_PNG,
  PLAN_TILE_STEIN_PNG,
  spoilCrossPngHref,
  type ObjectType,
  type PlanTerrainMaterial,
  type SpoilCrossMaterial
} from "@/components/sketches/planner/AssetIcons";
import { MeasurementLine, type MeasurementView } from "@/components/sketches/planner/MeasurementLine";
import { ObjectToolbar } from "@/components/sketches/planner/ObjectToolbar";
import { useCanvasHistory } from "@/components/sketches/planner/useCanvasHistory";
import { saveTrenchPlannerExport } from "@/lib/trench-planner-storage";
import { embedExternalImagesInSvg } from "@/lib/sketch-pdf-export";
import {
  clampWallAngleDeg,
  getTrenchCrossCorners,
  initialTrenchInnerBottomWidthPx,
  MAX_WALL_ANGLE_DEG,
  MIN_WALL_ANGLE_DEG,
  resolveTrenchWallAngles,
  TRENCH_Y_TOP_FRAC
} from "@/components/sketches/planner/trenchCrossGeometry";

type TabKey = "cross" | "plan";

const EXCAVATOR_TOP_PRESET_WIDTH = 160;
const EXCAVATOR_TOP_PRESET_HEIGHT = 340;
const EXCAVATOR_TOP_ASPECT = EXCAVATOR_TOP_PRESET_HEIGHT / EXCAVATOR_TOP_PRESET_WIDTH;
const SPOIL_CROSS_ASPECT = 120 / 260;
const TRUCK_TOP_PRESET_WIDTH = 520;
const TRUCK_TOP_PRESET_HEIGHT = 130;
const TRUCK_TOP_ASPECT = TRUCK_TOP_PRESET_HEIGHT / TRUCK_TOP_PRESET_WIDTH;
/** Justering av grøftevegg: V = venstre, H = høyre, begge = V + H */
type TrenchWallEditScope = "begge" | "venstre" | "hoyre";
type Selection = { kind: "object" | "measurement" | "textLabel"; id: string } | null;

type OverlapPickState = {
  clientX: number;
  clientY: number;
  world: { x: number; y: number };
  candidates: CanvasObjectData[];
};

/** Fritekst på skisse (tverrprofil og plan). */
type CanvasTextLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  /** Kvit avrunda rektangel bak teksten (betre lesbarheit). */
  boxed?: boolean;
};
type SnapPointType = "trenchEdgeLeft" | "trenchEdgeRight" | "nearestTrackEdge" | "nearestBaseEdge" | "nearestWheelEdge";
type SnapPoint = { objectId: string; type: SnapPointType; x: number; y: number };
/** Målepunkt: festa til objekt, eller fritt punkt (når grid er av). */
type MeasureEndpoint =
  | { kind: "snap"; objectId: string; type: SnapPointType }
  | { kind: "world"; x: number; y: number };
type MeasurementData = { id: string; from: MeasureEndpoint; to: MeasureEndpoint; label: string };

type PendingMeasure =
  | { kind: "snap"; objectId: string; type: SnapPointType; x: number; y: number }
  | { kind: "world"; x: number; y: number };
type CanvasState = {
  objects: CanvasObjectData[];
  measurements: MeasurementData[];
  /** Plan: masse per rute (nøkkel "i,j" i grid-indeks, 1 rute = 1 m). */
  planTerrainTiles?: Record<string, PlanTerrainMaterial>;
  /** Fritekstmerke på aktiv flate. */
  textLabels?: CanvasTextLabel[];
  /** Plan: profilnummer / kjetting langs grøfta. */
  planProfileRuler?: PlanProfileRulerState;
};

type PlanFillTool = PlanTerrainMaterial | "erase" | null;

type TerrainDragSession =
  | { mode: "paint"; material: PlanTerrainMaterial; cells: Record<string, PlanTerrainMaterial> }
  | { mode: "erase"; keys: string[] };
type WorkPlanData = {
  lengthProfile: string;
  soilAndInstallations: string;
  typicalCrossSection: string;
  spoilPlacement: string;
  workInstruction: string;
};

const VIEW_W = 1600;
const VIEW_H = 900;
const GRID_UNIT = 50; // 1 rute = 1 meter
// Grunnlinje i tverrprofil: grøftekant / bakkeplan ligg fast på y=250.
const CROSS_GROUND_Y = 250;
// Belt-botn (underkant belte) er 52 % nede i PNG-boks – avleia frå default-plassering y=120, h=250.
const EXCAVATOR_SIDE_BELT_FRAC = 0.52;
/** Litt større flis enn ruta slik at nabofliser overlappar – skjuler ofte PNG-kantar og synlege skøyt mot grid. */
const PLAN_TILE_BLEED = 2;

function planTileDrawRect(i: number, j: number) {
  const x = i * GRID_UNIT - PLAN_TILE_BLEED;
  const y = j * GRID_UNIT - PLAN_TILE_BLEED;
  const w = GRID_UNIT + 2 * PLAN_TILE_BLEED;
  const h = GRID_UNIT + 2 * PLAN_TILE_BLEED;
  return { x, y, width: w, height: h };
}

function worldPointToTerrainCellKey(wx: number, wy: number): string {
  const i = Math.floor(wx / GRID_UNIT);
  const j = Math.floor(wy / GRID_UNIT);
  return `${i},${j}`;
}

/** Fyll alle ruter trekket kryssar (motvirkar «hopp» ved rask dra). */
function collectTerrainKeysAlongStroke(a: { x: number; y: number }, b: { x: number; y: number }): string[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const step = GRID_UNIT * 0.25;
  const n = Math.max(1, Math.ceil(d / step));
  const seen = new Set<string>();
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    seen.add(worldPointToTerrainCellKey(x, y));
  }
  return [...seen];
}

function startTerrainSession(tool: PlanFillTool, world: { x: number; y: number }): TerrainDragSession | null {
  if (tool == null) return null;
  const key = worldPointToTerrainCellKey(world.x, world.y);
  if (tool === "erase") return { mode: "erase", keys: [key] };
  return { mode: "paint", material: tool, cells: { [key]: tool } };
}

function extendTerrainDragSession(prev: TerrainDragSession, keys: string[]): TerrainDragSession {
  if (prev.mode === "erase") {
    const kset = new Set(prev.keys);
    for (const k of keys) kset.add(k);
    return { mode: "erase", keys: [...kset] };
  }
  const cells = { ...prev.cells };
  for (const k of keys) cells[k] = prev.material;
  return { mode: "paint", material: prev.material, cells };
}

function mergePlanTerrainForDisplay(
  base: Record<string, PlanTerrainMaterial> | undefined,
  session: TerrainDragSession | null
): Record<string, PlanTerrainMaterial> {
  const b: Record<string, PlanTerrainMaterial> = base ? { ...base } : {};
  if (!session) return b;
  if (session.mode === "paint") return { ...b, ...session.cells };
  for (const k of session.keys) delete b[k];
  return b;
}

const TEXT_LABEL_MIN_WIDTH = 40;
const TEXT_LABEL_BOX_PAD = 6;

function textLabelBounds(t: CanvasTextLabel) {
  const lines = t.text.split("\n");
  const maxChars = Math.max(1, ...lines.map((l) => l.length));
  const w = Math.min(1400, Math.max(TEXT_LABEL_MIN_WIDTH, maxChars * t.fontSize * 0.52));
  const h = Math.max(t.fontSize * 1.1, lines.length * t.fontSize * 1.2);
  return { x: t.x, y: t.y, width: w, height: h };
}

/** Ytre rute for treffflate / kvit boks (inkl. padding når `boxed`). */
function textLabelHitOuterBounds(t: CanvasTextLabel) {
  const b = textLabelBounds(t);
  const pad = t.boxed ? TEXT_LABEL_BOX_PAD : 0;
  return { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad };
}

function hitTextLabelAt(p: { x: number; y: number }, labels: CanvasTextLabel[] | undefined): CanvasTextLabel | null {
  if (!labels?.length) return null;
  for (let i = labels.length - 1; i >= 0; i--) {
    const t = labels[i];
    const b = textLabelHitOuterBounds(t);
    if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) return t;
  }
  return null;
}

function planTileHref(mat: PlanTerrainMaterial): string {
  if (mat === "stein") return PLAN_TILE_STEIN_PNG;
  if (mat === "asfalt") return PLAN_TILE_ASFALT_PNG;
  return PLAN_TILE_JORD_PNG;
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function parseNumericInput(input: string) {
  const cleaned = input.trim().replace(",", ".");
  if (!cleaned) return null;
  if (cleaned.includes("/")) {
    const m = cleaned.match(/^([0-9]*\.?[0-9]+)\s*\/\s*([0-9]*\.?[0-9]+)$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

const presets: Record<ObjectType, Omit<CanvasObjectData, "id" | "x" | "y" | "rotation">> = {
  // Målestokk: 50 px = 1 m
  trenchCross: {
    type: "trenchCross",
    width: 500,
    height: 200,
    meta: { slopeAngleLeftDeg: 45, slopeAngleRightDeg: 45 }
  }, // ca 10 m toppbredde, 4 m dybde
  trenchPlan: { type: "trenchPlan", width: 750, height: 130 }, // 15 m lengde, 2.6 m korridor
  excavatorSide: { type: "excavatorSide", width: EXCAVATOR_SIDE_PRESET_WIDTH, height: EXCAVATOR_SIDE_PRESET_HEIGHT },
  excavatorTop: { type: "excavatorTop", width: EXCAVATOR_TOP_PRESET_WIDTH, height: EXCAVATOR_TOP_PRESET_HEIGHT },
  truckTop: { type: "truckTop", width: TRUCK_TOP_PRESET_WIDTH, height: TRUCK_TOP_PRESET_HEIGHT },
  spoilPile: { type: "spoilPile", width: 260, height: 120, meta: { spoilCrossMaterial: "jord" } },
  ladder: { type: "ladder", width: 60, height: 220 },
  barrier: { type: "barrier", width: 30, height: 96 },
  sheetPile: { type: "sheetPile", width: 260, height: 240 },
  trenchBox: { type: "trenchBox", width: 300, height: 220 },
  pipe: { type: "pipe", width: 56, height: 56 },
  escapeRoute: { type: "escapeRoute", width: 220, height: 72 }
};

/** Stige (tverrprofil): bevar proporsjon frå preset ved skalering (breidd → høgde). */
const LADDER_ASPECT = presets.ladder.height / presets.ladder.width;
/** Stige i plan: same sideforhold som rømningsvei-PNG (`escape-route-plan.png`). */
const LADDER_PLAN_RASTER_ASPECT = presets.escapeRoute.height / presets.escapeRoute.width;
const LADDER_WIDTH_MIN = 35;
/** Tverrprofil – rimeleg maks. */
const LADDER_WIDTH_MAX_CROSS = 320;
/** Plan – større symbol (grøfta er lang); typisk behov for høgare maks enn i tverrprofil. */
const LADDER_WIDTH_MAX_PLAN = 560;
/** Startbreidd (px) når stige legg inn i plan – same som rømningsvei-default. */
const LADDER_PLAN_DEFAULT_WIDTH = presets.escapeRoute.width;

const crossObjects: ObjectType[] = ["trenchCross", "excavatorSide", "spoilPile", "ladder", "barrier"];
const crossSafetyObjects: ObjectType[] = ["sheetPile", "trenchBox"];
const planObjects: ObjectType[] = ["trenchPlan", "excavatorTop", "truckTop", "ladder", "barrier", "escapeRoute"];
const objectLabels: Record<ObjectType, string> = {
  trenchCross: "Grøft (tverrprofil)",
  trenchPlan: "Grøft (plan)",
  excavatorSide: "Gravemaskin (side)",
  excavatorTop: "Gravemaskin (ovenfra)",
  truckTop: "Lastebil (ovenfra)",
  spoilPile: "Massehaug",
  ladder: "Stige",
  barrier: "Sikring",
  sheetPile: "Spunt",
  trenchBox: "Grøftekasse",
  pipe: "Ledning / rør",
  escapeRoute: "Rømningsvei"
};

function paletteLabel(type: ObjectType, tab: TabKey): string {
  if (tab === "cross") {
    if (type === "trenchCross") return "Grøft";
    if (type === "excavatorSide") return "Gravemaskin";
    if (type === "barrier") return "Sikring";
  }
  if (tab === "plan") {
    if (type === "trenchPlan") return "Grøft";
    if (type === "excavatorTop") return "Gravemaskin";
    if (type === "truckTop") return "Lastebil";
    if (type === "ladder") return "Stige";
    if (type === "barrier") return "Sikring";
    if (type === "escapeRoute") return "Rømningsvei";
  }
  return objectLabels[type];
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const defaultCrossSectionObjects: CanvasObjectData[] = [
  {
    id: uid("trench"),
    ...presets.trenchCross,
    x: 520,
    // y + h*0.04 = grøftetopp på grid (250)
    y: 242,
    rotation: 0,
    meta: {
      slopeAngleLeftDeg: 45,
      slopeAngleRightDeg: 45,
      innerBottomWidthPx: initialTrenchInnerBottomWidthPx(500, 200, {
        slopeAngleLeftDeg: 45,
        slopeAngleRightDeg: 45
      })
    }
  },
  // y + h = nedre kant av masse-ramme (PNG) på grid (250)
  { id: uid("spoil"), ...presets.spoilPile, x: 210, y: 130, rotation: 0 },
  { id: uid("exc"), ...presets.excavatorSide, x: 990, y: 120, rotation: 0 },
  { id: uid("lad"), ...presets.ladder, x: 760, y: 220, rotation: -14 },
  { id: uid("bar"), ...presets.barrier, x: 1370, y: 150, rotation: 0 }
];

const defaultPlanObjects: CanvasObjectData[] = [
  { id: uid("trench"), ...presets.trenchPlan, x: 360, y: 460, rotation: 0, meta: { lengthMeters: 15 } },
  { id: uid("exc"), ...presets.excavatorTop, x: 1030, y: 340, rotation: 0 },
  { id: uid("truck"), ...presets.truckTop, x: 940, y: 620, rotation: 180 },
  { id: uid("bar"), ...presets.barrier, x: 1310, y: 360, rotation: 0 },
  { id: uid("escape"), ...presets.escapeRoute, x: 740, y: 640, rotation: 0 }
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
  const bottom = o.y + o.height;
  const midY = o.y + o.height / 2;

  switch (o.type) {
    case "trenchCross": {
      const c = getTrenchCrossCorners({ x: o.x, y: o.y, width: o.width, height: o.height, meta: o.meta });
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: c.topLeft.x, y: c.topLeft.y },
        { objectId: o.id, type: "trenchEdgeRight", x: c.topRight.x, y: c.topRight.y }
      ];
    }
    case "trenchPlan":
      return [
        { objectId: o.id, type: "trenchEdgeLeft", x: left, y: midY },
        { objectId: o.id, type: "trenchEdgeRight", x: right, y: midY }
      ];
    case "spoilPile":
      return [{ objectId: o.id, type: "nearestBaseEdge", x: left + o.width / 2, y: bottom }];
    case "excavatorSide":
    case "excavatorTop":
      return [{ objectId: o.id, type: "nearestTrackEdge", x: left, y: midY }];
    case "truckTop":
      return [{ objectId: o.id, type: "nearestWheelEdge", x: left, y: midY }];
    default:
      return [{ objectId: o.id, type: "nearestBaseEdge", x: left + o.width / 2, y: midY }];
  }
}

/** Teikne- og treff-rekkefølgje i plan: lågare tal teiknast først (under). Gravemaskin over lastebil. */
function planObjectPaintOrder(t: ObjectType): number {
  switch (t) {
    case "trenchPlan":
      return 0;
    case "barrier":
      return 1;
    case "escapeRoute":
      return 2;
    case "ladder":
      return 3;
    case "truckTop":
      return 10;
    case "excavatorTop":
      return 20;
    default:
      return 5;
  }
}

function sortPlanObjectsByZOrder(objects: CanvasObjectData[]): CanvasObjectData[] {
  return [...objects]
    .map((o, i) => ({ o, i }))
    .sort((a, b) => {
      const z = planObjectPaintOrder(a.o.type) - planObjectPaintOrder(b.o.type);
      if (z !== 0) return z;
      return a.i - b.i;
    })
    .map(({ o }) => o);
}

function canvasObjectsInPaintOrder(tab: TabKey, objects: CanvasObjectData[]): CanvasObjectData[] {
  if (tab === "plan") return sortPlanObjectsByZOrder(objects);
  return objects;
}

function canvasStateIsPlanView(objects: CanvasObjectData[]): boolean {
  return objects.some((o) => o.type === "trenchPlan");
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function snapScalarToGrid(v: number) {
  return Math.round(v / GRID_UNIT) * GRID_UNIT;
}

const MAX_VIEWPORT_GRID_LINES = 420;

/**
 * Verdsruter (1 m = GRID_UNIT) som er synlege i viewBox etter translate(pan) + scale(zoom).
 * Linjene teiknast i visingsrommet (0⬦VIEW_W — 0⬦VIEW_H) slik at rutenettet fyller viewport ved pan/zoom.
 */
function viewportGridWorldLines(panX: number, panY: number, zoom: number): { verticals: number[]; horizontals: number[] } {
  const z = Math.max(zoom, 1e-4);
  const minWx = Math.floor(((0 - panX) / z) / GRID_UNIT - 1e-9) * GRID_UNIT;
  const maxWx = Math.ceil(((VIEW_W - panX) / z) / GRID_UNIT + 1e-9) * GRID_UNIT;
  const minWy = Math.floor(((0 - panY) / z) / GRID_UNIT - 1e-9) * GRID_UNIT;
  const maxWy = Math.ceil(((VIEW_H - panY) / z) / GRID_UNIT + 1e-9) * GRID_UNIT;
  const verticals: number[] = [];
  let n = 0;
  for (let wx = minWx; wx <= maxWx && n < MAX_VIEWPORT_GRID_LINES; wx += GRID_UNIT) {
    verticals.push(wx);
    n++;
  }
  const horizontals: number[] = [];
  n = 0;
  for (let wy = minWy; wy <= maxWy && n < MAX_VIEWPORT_GRID_LINES; wy += GRID_UNIT) {
    horizontals.push(wy);
    n++;
  }
  return { verticals, horizontals };
}

/** Nedste Y (SVG) for stigereil etter rotasjon om bbox-senter (same som IconFrame i AssetIcons). */
function ladderRailBottomWorldY(o: CanvasObjectData, originX: number, originY: number): number {
  const w = o.width;
  const h = o.height;
  const cx = originX + w / 2;
  const cy = originY + h / 2;
  const rad = (o.rotation * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const footPts = [
    { x: originX + w * 0.2, y: originY + h },
    { x: originX + w * 0.64, y: originY + h }
  ];
  return Math.max(
    ...footPts.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return sin * dx + cos * dy + cy;
    })
  );
}

/**
 * I tverrprofil: sikrar at viktige horisontale linjer (grøftetopp, massebunn, stigebunn)
 * ligg på grid-linjer når rutenett er på. Forutset at (x,y) allereie er snapa til grid som bbox-hjørne.
 */
function snapCrossSectionGeometryToGrid(o: CanvasObjectData, x: number, y: number): { x: number; y: number } {
  const nx = snapScalarToGrid(x);
  let ny = snapScalarToGrid(y);
  switch (o.type) {
    case "trenchCross": {
      const yTop = ny + o.height * TRENCH_Y_TOP_FRAC;
      ny += snapScalarToGrid(yTop) - yTop;
      break;
    }
    case "spoilPile": {
      const yBottom = ny + o.height;
      ny += snapScalarToGrid(yBottom) - yBottom;
      break;
    }
    case "ladder": {
      const yBottom = ladderRailBottomWorldY(o, nx, ny);
      ny += snapScalarToGrid(yBottom) - yBottom;
      break;
    }
    case "excavatorSide": {
      // Snap underkant belte (EXCAVATOR_SIDE_BELT_FRAC nede i boks) til næraste gridlinje.
      const yBeltBottom = ny + o.height * EXCAVATOR_SIDE_BELT_FRAC;
      ny += snapScalarToGrid(yBeltBottom) - yBeltBottom;
      break;
    }
    default:
      break;
  }
  return { x: nx, y: ny };
}

function measurementTouchesObject(m: MeasurementData, objectId: string) {
  return (
    (m.from.kind === "snap" && m.from.objectId === objectId) ||
    (m.to.kind === "snap" && m.to.objectId === objectId)
  );
}

function resolveMeasureEndpointPixel(ep: MeasureEndpoint, byObj: Map<string, SnapPoint[]>): { x: number; y: number } | null {
  if (ep.kind === "world") return { x: ep.x, y: ep.y };
  const pts = byObj.get(ep.objectId) || [];
  const hit = pts.find((s) => s.type === ep.type);
  return hit ? { x: hit.x, y: hit.y } : null;
}

function formatMetersLabel(meters: number, decimals: number) {
  return `${meters.toFixed(decimals).replace(".", ",")} m`;
}

function formatMetersValue(meters: number, decimals: number) {
  return meters.toFixed(decimals).replace(".", ",");
}

/** Ferdig tekst for måling: min/maks ut frå faktisk lengd (ikkje kortaste akselengd). */
function measurementAxisLabels(from: { x: number; y: number }, to: { x: number; y: number }) {
  const exactM = dist(from, to) / GRID_UNIT;
  const v1 = formatMetersValue(exactM, 1);
  const v2 = formatMetersValue(exactM, 2);
  return {
    min: `≥ ${v1} m`,
    max: `≤ ${v1} m`,
    exact: `= ${v2} m`
  };
}

/** Behold ≥ / ≤ / = ved endringsdrag; oppdater berre tallet. */
function measurementLabelAfterLengthChange(
  label: string,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  const exactM = dist(from, to) / GRID_UNIT;
  const v1 = formatMetersValue(exactM, 1);
  const v2 = formatMetersValue(exactM, 2);
  if (label.startsWith("≥")) return `≥ ${v1} m`;
  if (label.startsWith("≤")) return `≤ ${v1} m`;
  if (label.startsWith("=")) return `= ${v2} m`;
  return label;
}

function autoMeasurementLabel(from: { x: number; y: number }, to: { x: number; y: number }, snapToGridStyle: boolean) {
  const meters = dist(from, to) / GRID_UNIT;
  if (snapToGridStyle) {
    return formatMetersLabel(Math.round(meters * 10) / 10, 1);
  }
  return formatMetersLabel(meters, 2);
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
      const from = resolveMeasureEndpointPixel(m.from, byObj);
      const to = resolveMeasureEndpointPixel(m.to, byObj);
      if (!from || !to) return null;
      return { id: m.id, from, to, label: m.label };
    })
    .filter(Boolean) as MeasurementView[];
}

/** Samme trinn som {@link LadderIcon} — brukt i buildPrintableSvg (PDF/utskrift). */
function ladderPrintMarkup(o: CanvasObjectData): string {
  const rungCount = 7;
  const rungs = Array.from({ length: rungCount }, (_, i) => {
    const y = o.y + 16 + i * ((o.height - 30) / rungCount);
    return `<line x1="${o.x + o.width * 0.22}" y1="${y}" x2="${o.x + o.width * 0.68}" y2="${y}" stroke="#9ca3af" stroke-width="3" />`;
  }).join("");
  return `<line x1="${o.x + o.width * 0.28}" y1="${o.y}" x2="${o.x + o.width * 0.2}" y2="${o.y + o.height}" stroke="#4b5563" stroke-width="4" />
          <line x1="${o.x + o.width * 0.72}" y1="${o.y}" x2="${o.x + o.width * 0.64}" y2="${o.y + o.height}" stroke="#4b5563" stroke-width="4" />
          ${rungs}`;
}

function buildPrintableSvg(state: CanvasState, assetOrigin = "") {
  const measurements = resolveMeasurements(state);
  const excavatorSideImgSrc = `${assetOrigin}${EXCAVATOR_SIDE_PNG}`;
  const excavatorTopImgSrc = `${assetOrigin}${EXCAVATOR_TOP_PNG}`;
  const truckTopImgSrc = `${assetOrigin}${TRUCK_TOP_PNG}`;
  const rasterKnockoutId = `raster-print-knock-${Math.random().toString(36).slice(2, 10)}`;
  const rasterKnockoutValues = `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 ${EXCAVATOR_SIDE_LIGHT_BG_KNOCKOUT}`;
  const printMaskId = (objectId: string) => `pm-${objectId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const printRasterImage = (o: CanvasObjectData, href: string) => {
    const mid = printMaskId(o.id);
    return `<defs><mask id="${mid}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="alpha"><image href="${href}" xlink:href="${href}" x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" preserveAspectRatio="xMidYMid meet"/></mask></defs><image href="${href}" xlink:href="${href}" filter="url(#${rasterKnockoutId})" mask="url(#${mid})" x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" preserveAspectRatio="xMidYMid meet"/>`;
  };
  const printObject = (o: CanvasObjectData) => {
    switch (o.type) {
      case "trenchCross": {
        const c = getTrenchCrossCorners({ x: o.x, y: o.y, width: o.width, height: o.height, meta: o.meta });
        return `<polygon points="${c.topLeft.x},${c.topLeft.y} ${c.topRight.x},${c.topRight.y} ${c.bottomRight.x},${c.bottomRight.y} ${c.bottomLeft.x},${c.bottomLeft.y}" fill="#bfdbfe" stroke="#0f172a" stroke-width="2.5" />`;
      }
      case "trenchPlan": {
        const lengthMeters = Math.max(1, Math.round(o.meta?.lengthMeters ?? o.width / GRID_UNIT));
        const markerLines = Array.from({ length: Math.floor(lengthMeters / 5) }, (_, i) => (i + 1) * 5)
          .map((meter) => {
            const px = o.x + (meter / lengthMeters) * o.width;
            return `<line x1="${px}" y1="${o.y + o.height * 0.1}" x2="${px}" y2="${o.y + o.height * 0.9}" stroke="#1e3a8a" stroke-width="1.2" stroke-dasharray="3 3" />
                    <text x="${px}" y="${o.y + o.height * 0.18}" fill="#1e3a8a" font-size="10" text-anchor="middle">${meter}m</text>`;
          })
          .join("");
        return `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" rx="12" fill="#bfdbfe" stroke="#0f172a" stroke-width="2.5" />
                <line x1="${o.x + 8}" y1="${o.y + o.height / 2}" x2="${o.x + o.width - 8}" y2="${o.y + o.height / 2}" stroke="#60a5fa" stroke-width="2" stroke-dasharray="8 6" />
                <line x1="${o.x + 8}" y1="${o.y + o.height * 0.26}" x2="${o.x + o.width - 8}" y2="${o.y + o.height * 0.26}" stroke="#ffffff90" stroke-width="2" />
                ${markerLines}`;
      }
      case "excavatorSide":
        return printRasterImage(o, excavatorSideImgSrc);
      case "excavatorTop":
        return printRasterImage(o, excavatorTopImgSrc);
      case "truckTop":
        return printRasterImage(o, truckTopImgSrc);
      case "spoilPile":
        return printRasterImage(o, `${assetOrigin}${spoilCrossPngHref(o.meta?.spoilCrossMaterial)}`);
      case "ladder":
        if (canvasStateIsPlanView(state.objects))
          return printRasterImage(o, `${assetOrigin}${ESCAPE_ROUTE_PLAN_PNG}`);
        return ladderPrintMarkup(o);
      case "barrier":
        return `<rect x="${o.x + o.width * 0.32}" y="${o.y}" width="${o.width * 0.35}" height="${o.height}" fill="#dc2626" />
                <rect x="${o.x + o.width * 0.32}" y="${o.y + o.height * 0.2}" width="${o.width * 0.35}" height="${o.height * 0.08}" fill="#f8fafc" />
                <rect x="${o.x + o.width * 0.32}" y="${o.y + o.height * 0.4}" width="${o.width * 0.35}" height="${o.height * 0.08}" fill="#f8fafc" />
                <rect x="${o.x + o.width * 0.32}" y="${o.y + o.height * 0.6}" width="${o.width * 0.35}" height="${o.height * 0.08}" fill="#f8fafc" />
                <line x1="${o.x + o.width * 0.35}" y1="${o.y + o.height * 0.1}" x2="${o.x + o.width * 0.62}" y2="${o.y + o.height * 0.1}" stroke="#ffffff85" stroke-width="1.3" />`;
      case "sheetPile":
        return printRasterImage(o, `${assetOrigin}${SHEET_PILE_CROSS_PNG}`);
      case "trenchBox":
        return printRasterImage(o, `${assetOrigin}${TRENCH_BOX_CROSS_PNG}`);
      case "pipe":
        return `<circle cx="${o.x + o.width / 2}" cy="${o.y + o.height / 2}" r="${Math.min(o.width, o.height) * 0.32}" fill="#64748b" stroke="#111827" stroke-width="2" />
                <circle cx="${o.x + o.width / 2}" cy="${o.y + o.height / 2}" r="${Math.min(o.width, o.height) * 0.15}" fill="#94a3b8" />`;
      case "escapeRoute":
        return printRasterImage(o, `${assetOrigin}${ESCAPE_ROUTE_PLAN_PNG}`);
      default:
        return "";
    }
  };
  const objectsForPrint = canvasStateIsPlanView(state.objects) ? sortPlanObjectsByZOrder(state.objects) : state.objects;
  const objectMarkup = objectsForPrint
    .map((o) => {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      if (o.type === "excavatorSide") {
        const mir = o.meta?.mirrored ? `translate(${2 * cx} 0) scale(-1 1) ` : "";
        return `
      <g transform="${mir}rotate(${o.rotation} ${cx} ${cy})">
        ${printObject(o)}
      </g>
    `;
      }
      return `
      <g transform="rotate(${o.rotation} ${cx} ${cy})">
        ${printObject(o)}
      </g>
    `;
    })
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
    ${Array.from({ length: Math.floor(VIEW_W / GRID_UNIT) + 1 }).map((_, i) => `<line x1="${i * GRID_UNIT}" y1="0" x2="${i * GRID_UNIT}" y2="${VIEW_H}" stroke="#e2e8f0" stroke-width="1" />`).join("")}
    ${Array.from({ length: Math.floor(VIEW_H / GRID_UNIT) + 1 }).map((_, i) => `<line x1="0" y1="${i * GRID_UNIT}" x2="${VIEW_W}" y2="${i * GRID_UNIT}" stroke="#e2e8f0" stroke-width="1" />`).join("")}
  `;
  const terrainPlanMarkup =
    state.planTerrainTiles && Object.keys(state.planTerrainTiles).length > 0
      ? Object.entries(state.planTerrainTiles)
          .map(([key, mat]) => {
            const [i, j] = key.split(",").map(Number);
            const href = `${assetOrigin}${planTileHref(mat)}`;
            const r = planTileDrawRect(i, j);
            return `<image href="${href}" xlink:href="${href}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" preserveAspectRatio="none"/>`;
          })
          .join("")
      : "";
  const planTrenchForPrint = state.objects.find((o) => o.type === "trenchPlan");
  const profileRulerMarkup = canvasStateIsPlanView(state.objects)
    ? planProfileRulerSvgMarkup(planTrenchForPrint, state.planProfileRuler, GRID_UNIT)
    : "";
  const textLabelsMarkup = (state.textLabels ?? [])
    .map((t) => {
      const lines = t.text.split("\n");
      const lh = t.fontSize * 1.2;
      const tspans = lines
        .map((line, i) => `<tspan x="${t.x}" dy="${i === 0 ? 0 : lh}">${escapeHtml(line)}</tspan>`)
        .join("");
      const outer = textLabelHitOuterBounds(t);
      const box = t.boxed
        ? `<rect x="${outer.x}" y="${outer.y}" width="${outer.width}" height="${outer.height}" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>`
        : "";
      const text = `<text x="${t.x}" y="${t.y + t.fontSize}" xml:space="preserve" font-size="${t.fontSize}" fill="#0f172a" font-family="system-ui,Segoe UI,Arial,sans-serif">${tspans}</text>`;
      return `${box}${text}`;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="100%" style="background:#f8fafc;">
      <defs>
        <filter id="${rasterKnockoutId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="${rasterKnockoutValues}" result="knockRgb" />
          <feComponentTransfer in="knockRgb" color-interpolation-filters="sRGB">
            <feFuncA type="linear" slope="${RASTER_KNOCKOUT_ALPHA_BOOST_SLOPE}" intercept="0" />
          </feComponentTransfer>
        </filter>
      </defs>
      ${gridMarkup}
      ${terrainPlanMarkup}
      ${objectMarkup}
      ${profileRulerMarkup}
      ${measurementMarkup}
      ${textLabelsMarkup}
      <rect x="2" y="2" width="${VIEW_W - 4}" height="${VIEW_H - 4}" fill="none" stroke="#94a3b8" stroke-width="6" rx="14" ry="14" pointer-events="none"/>
    </svg>
  `;
}

export type TrenchPlannerCanvasState = CanvasState;

export function TrenchPlanner({
  initialCross,
  initialPlan,
}: {
  initialCross?: CanvasState;
  initialPlan?: CanvasState;
} = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("cross");
  const [selection, setSelection] = useState<Selection>(null);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [pendingMeasure, setPendingMeasure] = useState<PendingMeasure | null>(null);
  const [draggingMeasureEndpoint, setDraggingMeasureEndpoint] = useState<{
    id: string;
    end: "from" | "to";
  } | null>(null);
  const [scalingLadder, setScalingLadder] = useState<{ id: string; planRaster: boolean } | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingTextLabel, setDraggingTextLabel] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  const [planFillTool, setPlanFillTool] = useState<PlanFillTool>(null);
  const [terrainDragSession, setTerrainDragSession] = useState<TerrainDragSession | null>(null);
  const terrainDragSessionRef = useRef<TerrainDragSession | null>(null);
  const lastTerrainWorldRef = useRef<{ x: number; y: number } | null>(null);
  const [slopeInputLeft, setSlopeInputLeft] = useState("45,0");
  const [slopeInputRight, setSlopeInputRight] = useState("45,0");
  const [trenchWallScope, setTrenchWallScope] = useState<TrenchWallEditScope>("begge");
  const [trenchWallsLinked, setTrenchWallsLinked] = useState(false);
  const [objectSettingsDockOpen, setObjectSettingsDockOpen] = useState(false);
  const [overlapPick, setOverlapPick] = useState<OverlapPickState | null>(null);
  const [workPlan, setWorkPlan] = useState<WorkPlanData>({
    lengthProfile: "",
    soilAndInstallations: "",
    typicalCrossSection: "Tverrprofil med valgt skråning og sikring er vist i skissen.",
    spoilPlacement: "Gravemasser plasseres minimum 1,0 m fra grøftekant.",
    workInstruction: ""
  });
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const crossHistory = useCanvasHistory<CanvasState>(initialCross ?? {
    objects: defaultCrossSectionObjects,
    measurements: defaultCrossMeasurements,
    textLabels: []
  });
  const planHistory = useCanvasHistory<CanvasState>(initialPlan ?? {
    objects: defaultPlanObjects,
    measurements: defaultPlanMeasurements,
    planTerrainTiles: {},
    textLabels: [],
    planProfileRuler: defaultPlanProfileRulerState()
  });

  const current = activeTab === "cross" ? crossHistory : planHistory;
  const setCurrent = current.update;

  const patchPlanProfileRuler = (patch: Partial<PlanProfileRulerState>) => {
    planHistory.update((s) => ({
      ...s,
      planProfileRuler: { ...(s.planProfileRuler ?? defaultPlanProfileRulerState()), ...patch }
    }));
  };

  const planProfileRulerConfig = planHistory.present.planProfileRuler ?? defaultPlanProfileRulerState();

  useEffect(() => {
    const t = window.setTimeout(() => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      saveTrenchPlannerExport({
        crossSvg: buildPrintableSvg(crossHistory.present, origin),
        planSvg: buildPrintableSvg(planHistory.present, origin),
        workPlan
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [crossHistory.present, planHistory.present, workPlan]);

  const measurementViews: MeasurementView[] = useMemo(() => resolveMeasurements(current.present), [current.present]);

  const objectsInPaintOrder = useMemo(
    () => canvasObjectsInPaintOrder(activeTab, current.present.objects),
    [activeTab, current.present.objects]
  );

  const planTerrainForView = useMemo(
    () =>
      activeTab === "plan"
        ? mergePlanTerrainForDisplay(planHistory.present.planTerrainTiles, terrainDragSession)
        : {},
    [activeTab, planHistory.present.planTerrainTiles, terrainDragSession]
  );

  const viewportGridLines = useMemo(() => viewportGridWorldLines(pan.x, pan.y, zoom), [pan.x, pan.y, zoom]);

  const commitTerrainSession = (session: TerrainDragSession) => {
    if (session.mode === "paint") {
      planHistory.update((s) => ({
        ...s,
        planTerrainTiles: { ...(s.planTerrainTiles ?? {}), ...session.cells }
      }));
    } else {
      planHistory.update((s) => {
        const next = { ...(s.planTerrainTiles ?? {}) };
        for (const k of session.keys) delete next[k];
        return { ...s, planTerrainTiles: next };
      });
    }
  };

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const blockPageScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    host.addEventListener("wheel", blockPageScroll, { passive: false });
    return () => host.removeEventListener("wheel", blockPageScroll);
  }, []);

  useEffect(() => {
    if (selection?.kind === "object" && activeTab === "cross") {
      const obj = current.present.objects.find((o) => o.id === selection.id);
      if (obj?.type === "trenchCross") {
        setObjectSettingsDockOpen(true);
        return;
      }
    }
    setObjectSettingsDockOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.kind, selection?.id, activeTab]);

  useEffect(() => {
    setOverlapPick(null);
  }, [activeTab]);

  useEffect(() => {
    if (!overlapPick) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlapPick(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlapPick]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const t = event.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      const deleteKey = event.key === "Delete" || event.key === "Backspace";
      if (deleteKey && selection) {
        event.preventDefault();
        if (selection.kind === "object") {
          setCurrent((prev) => ({
            ...prev,
            objects: prev.objects.filter((o) => o.id !== selection.id),
            measurements: prev.measurements.filter((m) => !measurementTouchesObject(m, selection.id))
          }));
        } else if (selection.kind === "textLabel") {
          setCurrent((prev) => ({
            ...prev,
            textLabels: (prev.textLabels ?? []).filter((t) => t.id !== selection.id)
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
      if (event.key === "Escape") {
        terrainDragSessionRef.current = null;
        setTerrainDragSession(null);
        lastTerrainWorldRef.current = null;
        setPlanFillTool(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, crossHistory, planHistory, selection, setCurrent]);

  useEffect(() => {
    setSelection(null);
    setPendingMeasure(null);
    terrainDragSessionRef.current = null;
    setTerrainDragSession(null);
    lastTerrainWorldRef.current = null;
  }, [activeTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(null);
        setDragging(null);
        setOverlapPick(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    setCurrent((prev) => {
      const trench = prev.objects.find((o) => o.type === "trenchCross");
      const isCrossSafety = type === "sheetPile" || type === "trenchBox";
      const fittedWidth = trench ? Math.max(120, trench.width - 24) : preset.width;
      const fittedX = trench ? trench.x + (trench.width - fittedWidth) / 2 : 140 + prev.objects.length * 16;
      const fittedY = trench ? trench.y + 4 : 120 + prev.objects.length * 10;
      let x = isCrossSafety ? fittedX : 140 + prev.objects.length * 16;
      let y = isCrossSafety ? fittedY : 120 + prev.objects.length * 10;
      if (showGrid) {
        x = snapScalarToGrid(x);
        y = snapScalarToGrid(y);
        if (activeTab === "cross") {
          const w = isCrossSafety ? fittedWidth : preset.width;
          const aligned = snapCrossSectionGeometryToGrid(
            { id: "", type, x, y, width: w, height: preset.height, rotation: 0, meta: preset.meta },
            x,
            y
          );
          x = aligned.x;
          y = aligned.y;
        }
      }
      const baseMeta =
        type === "trenchCross"
          ? {
              ...preset.meta,
              innerBottomWidthPx: initialTrenchInnerBottomWidthPx(preset.width, preset.height, preset.meta)
            }
          : preset.meta;
      const ladderInPlan = type === "ladder" && activeTab === "plan";
      const ladderW = ladderInPlan ? LADDER_PLAN_DEFAULT_WIDTH : preset.width;
      const ladderH = ladderInPlan ? Math.round(ladderW * LADDER_PLAN_RASTER_ASPECT) : preset.height;
      return {
        ...prev,
        objects: [
          ...prev.objects,
          {
            id: uid(type),
            ...preset,
            width: isCrossSafety ? fittedWidth : ladderInPlan ? ladderW : preset.width,
            height: ladderInPlan ? ladderH : preset.height,
            x,
            y,
            rotation: 0,
            meta: baseMeta
          }
        ]
      };
    });
  };

  const addTextLabel = () => {
    const newId = uid("txt");
    let x = Math.round(VIEW_W * 0.22);
    let y = Math.round(VIEW_H * 0.28);
    if (showGrid) {
      x = snapScalarToGrid(x);
      y = snapScalarToGrid(y);
    }
    setCurrent((prev) => ({
      ...prev,
      textLabels: [...(prev.textLabels ?? []), { id: newId, text: "Tekstmerke", x, y, fontSize: 20, boxed: true }]
    }));
    setSelection({ kind: "textLabel", id: newId });
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
      const pickWorldEndpoint = (): PendingMeasure => {
        if (showGrid) {
          return { kind: "world", x: snapScalarToGrid(world.x), y: snapScalarToGrid(world.y) };
        }
        return { kind: "world", x: world.x, y: world.y };
      };

      const endpoint = pickWorldEndpoint();

      if (!pendingMeasure) {
        setPendingMeasure(endpoint);
        return;
      }

      const from = pendingMeasure;
      const fromPt = { x: from.x, y: from.y };
      const toPt = { x: endpoint.x, y: endpoint.y };
      const fromEp: MeasureEndpoint = { kind: "world", x: from.x, y: from.y };
      const toEp: MeasureEndpoint = { kind: "world", x: endpoint.x, y: endpoint.y };

      const label = autoMeasurementLabel(fromPt, toPt, showGrid);
      const newId = uid("m");

      setCurrent((prev) => ({
        ...prev,
        measurements: [...prev.measurements, { id: newId, from: fromEp, to: toEp, label }]
      }));
      setPendingMeasure(null);
      setSelection({ kind: "measurement", id: newId });
      setObjectSettingsDockOpen(false);
      return;
    }

    const orderedTopFirst = [...canvasObjectsInPaintOrder(activeTab, current.present.objects)].reverse();
    const objectHits = orderedTopFirst.filter(
      (o) => world.x >= o.x && world.x <= o.x + o.width && world.y >= o.y && world.y <= o.y + o.height
    );

    if (objectHits.length > 1) {
      // Om det valde objektet er blant treffene: drag det direkte utan picker
      const alreadySelected = selection?.kind === "object"
        ? objectHits.find((h) => h.id === selection.id)
        : null;
      if (alreadySelected) {
        setDragging({
          id: alreadySelected.id,
          offsetX: world.x - alreadySelected.x,
          offsetY: world.y - alreadySelected.y
        });
        return;
      }
      // Ingenting valt (eller anna objekt valt) — vis picker
      event.preventDefault();
      setOverlapPick({
        clientX: event.clientX,
        clientY: event.clientY,
        world,
        candidates: objectHits
      });
      return;
    }

    const objectHit = objectHits[0];
    if (objectHit) {
      setSelection({ kind: "object", id: objectHit.id });
      setDragging({ id: objectHit.id, offsetX: world.x - objectHit.x, offsetY: world.y - objectHit.y });
      if (objectHit.type === "trenchCross") setObjectSettingsDockOpen(true);
      return;
    }

    const measurementId = selectMeasurementAtPoint(world);
    if (measurementId) {
      setSelection({ kind: "measurement", id: measurementId });
      setObjectSettingsDockOpen(false);
      return;
    }

    const textHit = hitTextLabelAt(world, current.present.textLabels);
    if (textHit && event.button === 0) {
      setSelection({ kind: "textLabel", id: textHit.id });
      setDraggingTextLabel({ id: textHit.id, offsetX: world.x - textHit.x, offsetY: world.y - textHit.y });
      return;
    }

    if (activeTab === "plan" && planFillTool && !isMeasureMode && event.button === 0) {
      const session = startTerrainSession(planFillTool, world);
      if (session) {
        terrainDragSessionRef.current = session;
        setTerrainDragSession(session);
        lastTerrainWorldRef.current = world;
        setSelection(null);
        return;
      }
    }

    setSelection(null);
    setPanning({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const onCanvasMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;
    if (terrainDragSessionRef.current) {
      const last = lastTerrainWorldRef.current;
      if (last) {
        const keys = collectTerrainKeysAlongStroke(last, world);
        const prev = terrainDragSessionRef.current;
        const next = extendTerrainDragSession(prev, keys);
        terrainDragSessionRef.current = next;
        setTerrainDragSession(next);
      }
      lastTerrainWorldRef.current = world;
      return;
    }
    if (scalingLadder) {
      const o = current.present.objects.find((obj) => obj.id === scalingLadder.id && obj.type === "ladder");
      if (!o) return;
      const aspect = scalingLadder.planRaster ? LADDER_PLAN_RASTER_ASPECT : LADDER_ASPECT;
      const maxW = scalingLadder.planRaster ? LADDER_WIDTH_MAX_PLAN : LADDER_WIDTH_MAX_CROSS;
      let w = world.x - o.x;
      if (showGrid) w = snapScalarToGrid(w);
      w = Math.max(LADDER_WIDTH_MIN, Math.min(maxW, Math.round(w / 5) * 5));
      const h = Math.round(w * aspect);
      setCurrent((prev) => ({
        ...prev,
        objects: prev.objects.map((obj) =>
          obj.id === scalingLadder.id && obj.type === "ladder" ? { ...obj, width: w, height: h } : obj
        )
      }));
      return;
    }
    if (draggingMeasureEndpoint) {
      let x = world.x;
      let y = world.y;
      if (showGrid) {
        x = snapScalarToGrid(x);
        y = snapScalarToGrid(y);
      }
      const { id, end } = draggingMeasureEndpoint;
      setCurrent((prev) => {
        const byObj = new Map(prev.objects.map((o) => [o.id, getSnapPoints(o)]));
        return {
          ...prev,
          measurements: prev.measurements.map((m) => {
            if (m.id !== id) return m;
            const nextFrom: MeasureEndpoint =
              end === "from" ? { kind: "world", x, y } : m.from;
            const nextTo: MeasureEndpoint = end === "to" ? { kind: "world", x, y } : m.to;
            const fromPx = resolveMeasureEndpointPixel(nextFrom, byObj);
            const toPx = resolveMeasureEndpointPixel(nextTo, byObj);
            if (!fromPx || !toPx) {
              return { ...m, from: nextFrom, to: nextTo };
            }
            return {
              ...m,
              from: nextFrom,
              to: nextTo,
              label: measurementLabelAfterLengthChange(m.label, fromPx, toPx)
            };
          })
        };
      });
      return;
    }
    if (draggingTextLabel) {
      let nx = world.x - draggingTextLabel.offsetX;
      let ny = world.y - draggingTextLabel.offsetY;
      if (showGrid) {
        nx = snapScalarToGrid(nx);
        ny = snapScalarToGrid(ny);
      }
      setCurrent((prev) => ({
        ...prev,
        textLabels: (prev.textLabels ?? []).map((t) => (t.id === draggingTextLabel.id ? { ...t, x: nx, y: ny } : t))
      }));
      return;
    }
    if (dragging) {
      let nx = world.x - dragging.offsetX;
      let ny = world.y - dragging.offsetY;
      if (showGrid) {
        nx = snapScalarToGrid(nx);
        ny = snapScalarToGrid(ny);
      }
      setCurrent((prev) => {
        const o = prev.objects.find((obj) => obj.id === dragging.id);
        if (o && showGrid && activeTab === "cross") {
          const aligned = snapCrossSectionGeometryToGrid(o, nx, ny);
          nx = aligned.x;
          ny = aligned.y;
        }
        return {
          ...prev,
          objects: prev.objects.map((obj) => (obj.id === dragging.id ? { ...obj, x: nx, y: ny } : obj))
        };
      });
      return;
    }
    if (panning) {
      setPan({ x: event.clientX - panning.x, y: event.clientY - panning.y });
    }
  };

  const onCanvasMouseUp = () => {
    const sess = terrainDragSessionRef.current;
    if (sess) {
      commitTerrainSession(sess);
      terrainDragSessionRef.current = null;
      setTerrainDragSession(null);
      lastTerrainWorldRef.current = null;
    }
    setDragging(null);
    setDraggingTextLabel(null);
    setDraggingMeasureEndpoint(null);
    setScalingLadder(null);
    setPanning(null);
  };

  const onCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.max(0.35, Math.min(3, z * factor)));
  };

  const selectedObject = selection?.kind === "object" ? current.present.objects.find((o) => o.id === selection.id) || null : null;
  const selectedTextLabel =
    selection?.kind === "textLabel" ? current.present.textLabels?.find((t) => t.id === selection.id) ?? null : null;

  const selectedToolbarPos = selectedObject
    ? {
        x: ((selectedObject.x + selectedObject.width / 2) * zoom + pan.x) / VIEW_W * 100,
        y: ((selectedObject.y - 8) * zoom + pan.y) / VIEW_H * 100
      }
    : null;

  const selectedMeasurement =
    selection?.kind === "measurement"
      ? current.present.measurements.find((m) => m.id === selection.id) ?? null
      : null;
  const selectedMeasurementView = selectedMeasurement
    ? measurementViews.find((v) => v.id === selectedMeasurement.id) ?? null
    : null;

  const updateSelectedMeasurementLabel = (label: string, trim = false) => {
    if (!selectedMeasurement) return;
    const next = trim ? label.trim() : label;
    setCurrent((prev) => ({
      ...prev,
      measurements: prev.measurements.map((m) => (m.id === selectedMeasurement.id ? { ...m, label: next } : m))
    }));
  };

  const applyMeasurementPresetLabel = (preset: "min" | "max" | "exact") => {
    if (!selectedMeasurementView) return;
    const labels = measurementAxisLabels(selectedMeasurementView.from, selectedMeasurementView.to);
    const text = preset === "min" ? labels.min : preset === "max" ? labels.max : labels.exact;
    updateSelectedMeasurementLabel(text, true);
  };

  const deleteSelected = () => {
    if (!selection) return;
    if (selection.kind === "object") {
      setCurrent((prev) => ({
        ...prev,
        objects: prev.objects.filter((o) => o.id !== selection.id),
        measurements: prev.measurements.filter((m) => !measurementTouchesObject(m, selection.id))
      }));
    } else if (selection.kind === "textLabel") {
      setCurrent((prev) => ({
        ...prev,
        textLabels: (prev.textLabels ?? []).filter((t) => t.id !== selection.id)
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
    if (selection?.kind === "textLabel" && selectedTextLabel) {
      const t = selectedTextLabel;
      const newId = uid("txt");
      let nx = t.x + 30;
      let ny = t.y + 24;
      if (showGrid) {
        nx = snapScalarToGrid(nx);
        ny = snapScalarToGrid(ny);
      }
      setCurrent((prev) => ({
        ...prev,
        textLabels: [...(prev.textLabels ?? []), { ...t, id: newId, x: nx, y: ny }]
      }));
      setSelection({ kind: "textLabel", id: newId });
      return;
    }
    if (!selectedObject) return;
    let nx = selectedObject.x + 30;
    let ny = selectedObject.y + 24;
    if (showGrid) {
      nx = snapScalarToGrid(nx);
      ny = snapScalarToGrid(ny);
      if (activeTab === "cross") {
        const aligned = snapCrossSectionGeometryToGrid(selectedObject, nx, ny);
        nx = aligned.x;
        ny = aligned.y;
      }
    }
    setCurrent((prev) => ({
      ...prev,
      objects: [...prev.objects, { ...selectedObject, id: uid(selectedObject.type), x: nx, y: ny }]
    }));
  };

  const rotateSelected = () => {
    if (!selectedObject) return;
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        // I tverrprofil skal gravemaskin speilvendes (ikke roteres 90 grader).
        if (activeTab === "cross" && o.type === "excavatorSide") {
          return { ...o, meta: { ...o.meta, mirrored: !o.meta?.mirrored } };
        }
        return { ...o, rotation: (o.rotation + 90) % 360 };
      })
    }));
  };

  const clearActiveCanvas = () => {
    if (!window.confirm("Er du sikker på at du vil tømme aktiv arbeidsflate?")) return;
    if (activeTab === "plan") {
      setCurrent((prev) => ({
        objects: [],
        measurements: [],
        planTerrainTiles: {},
        textLabels: [],
        planProfileRuler: prev.planProfileRuler ?? defaultPlanProfileRulerState()
      }));
    } else {
      setCurrent({ objects: [], measurements: [], textLabels: [] });
    }
    setSelection(null);
  };

  const clearBoth = () => {
    if (!window.confirm("Er du sikker på at du vil tømme begge arbeidsflater?")) return;
    crossHistory.update({ objects: [], measurements: [], textLabels: [] });
    planHistory.update({
      objects: [],
      measurements: [],
      planTerrainTiles: {},
      textLabels: [],
      planProfileRuler: defaultPlanProfileRulerState()
    });
    setSelection(null);
  };

  const clearPlanTerrainTiles = () => {
    planHistory.update((s) => ({ ...s, planTerrainTiles: {} }));
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const firstTrenchCross = current.present.objects.find((o) => o.type === "trenchCross");
  const activeTrenchPlan = current.present.objects.find((o) => o.type === "trenchPlan");
  const currentPlanLengthMeters = activeTrenchPlan?.meta?.lengthMeters ?? Math.round((activeTrenchPlan?.width ?? 750) / GRID_UNIT);
  const currentPlanWidthMeters = (activeTrenchPlan?.height ?? 130) / GRID_UNIT;
  const trenchDepthMeters = firstTrenchCross ? firstTrenchCross.height / GRID_UNIT : 0;
  const showSafetyMeasures = activeTab === "cross" && trenchDepthMeters > 2;
  const selectedPlanTrench = selectedObject?.type === "trenchPlan" ? current.present.objects.find((o) => o.id === selectedObject.id) : null;
  const selectedExcavatorTop = selectedObject?.type === "excavatorTop" ? current.present.objects.find((o) => o.id === selectedObject.id) : null;
  const selectedTruckTop = selectedObject?.type === "truckTop" ? current.present.objects.find((o) => o.id === selectedObject.id) : null;

  const patchTrenchWallAnglesFor = (objectId: string, patch: { leftDeg?: number; rightDeg?: number }) => {
    setCurrent((prev) => {
      const trench = prev.objects.find((o) => o.id === objectId && o.type === "trenchCross");
      if (!trench) return prev;
      const cur = resolveTrenchWallAngles(trench.meta);
      const leftDeg = clampWallAngleDeg(patch.leftDeg ?? cur.leftDeg);
      const rightDeg = clampWallAngleDeg(patch.rightDeg ?? cur.rightDeg);
      return {
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === objectId && o.type === "trenchCross"
            ? { ...o, meta: { ...o.meta, slopeAngleLeftDeg: leftDeg, slopeAngleRightDeg: rightDeg } }
            : o
        )
      };
    });
  };

  const updateLadderHelning = (objectId: string, angle: number) => {
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === objectId && o.type === "ladder" ? { ...o, rotation: angle } : o))
    }));
  };

  const updateLadderWidth = (
    objectId: string,
    widthPx: number,
    maxWidth: number = LADDER_WIDTH_MAX_PLAN,
    aspectHeightOverWidth: number = LADDER_ASPECT
  ) => {
    const w = Math.max(LADDER_WIDTH_MIN, Math.min(maxWidth, Math.round(widthPx / 5) * 5));
    const h = Math.round(w * aspectHeightOverWidth);
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === objectId && o.type === "ladder" ? { ...o, width: w, height: h } : o))
    }));
  };

  const updateSpoilCrossMaterial = (objectId: string, material: SpoilCrossMaterial) => {
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) =>
        o.id === objectId && o.type === "spoilPile" ? { ...o, meta: { ...o.meta, spoilCrossMaterial: material } } : o
      )
    }));
  };

  const updateSafetyWidth = (width: number) => {
    if (!selectedObject || (selectedObject.type !== "sheetPile" && selectedObject.type !== "trenchBox")) return;
    const nextWidth = Math.max(100, Math.min(900, width));
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        const center = o.x + o.width / 2;
        return { ...o, width: nextWidth, x: center - nextWidth / 2 };
      })
    }));
  };

  /** Bevar nedre kant (bunn av grøfta) når høgda endrast – typisk for tverrprofil mot «bakken». */
  const updateTrenchCrossHeight = (objectId: string, heightPx: number) => {
    setCurrent((prev) => {
      const o = prev.objects.find((obj) => obj.id === objectId && obj.type === "trenchCross");
      if (!o) return prev;
      const h = Math.max(100, Math.min(520, Math.round(heightPx / 5) * 5));
      const bottom = o.y + o.height;
      const newY = bottom - h;
      return {
        ...prev,
        objects: prev.objects.map((obj) => (obj.id === objectId && obj.type === "trenchCross" ? { ...obj, height: h, y: newY } : obj))
      };
    });
  };

  const updateTrenchCrossTopWidth = (objectId: string, widthPx: number) => {
    setCurrent((prev) => {
      const o = prev.objects.find((obj) => obj.id === objectId && obj.type === "trenchCross");
      if (!o) return prev;
      const w = Math.max(50, Math.min(1200, Math.round(widthPx / 5) * 5));
      const cx = o.x + o.width / 2;
      // Lås inn botn viss han ikkje alt er lagra — hindrar at geometrien reknar han dynamisk frå topp
      const lockedBottom = o.meta?.innerBottomWidthPx
        ?? initialTrenchInnerBottomWidthPx(o.width, o.height, o.meta);
      return {
        ...prev,
        objects: prev.objects.map((obj) =>
          obj.id === objectId
            ? { ...obj, width: w, x: cx - w / 2, meta: { ...obj.meta, innerBottomWidthPx: lockedBottom } }
            : obj
        )
      };
    });
  };


  const updateTrenchInnerBottomWidthPx = (objectId: string, innerBottomPx: number) => {
    setCurrent((prev) => {
      const o = prev.objects.find((obj) => obj.id === objectId && obj.type === "trenchCross");
      if (!o) return prev;
      // Topp og bunn er uavhengige; begge 25–500 px (0,5–10 m)
      const clamped = Math.max(25, Math.min(500, Math.round(innerBottomPx / 2) * 2));
      return {
        ...prev,
        objects: prev.objects.map((obj) =>
          obj.id === objectId && obj.type === "trenchCross"
            ? { ...obj, meta: { ...obj.meta, innerBottomWidthPx: clamped } }
            : obj
        )
      };
    });
  };

  const updateSpoilPileWidth = (width: number) => {
    if (!selectedObject || selectedObject.type !== "spoilPile") return;
    const nextW = Math.max(120, Math.min(700, Math.round(width / 5) * 5));
    const nextH = Math.round(nextW * SPOIL_CROSS_ASPECT);
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        return { ...o, width: nextW, height: nextH, x: cx - nextW / 2, y: cy - nextH / 2 };
      })
    }));
  };

  const updateExcavatorSideWidth = (width: number) => {
    if (!selectedObject || selectedObject.type !== "excavatorSide") return;
    const nextW = Math.max(180, Math.min(1400, Math.round(width / 5) * 5));
    const nextH = Math.round(nextW * EXCAVATOR_SIDE_ASPECT);
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        return { ...o, width: nextW, height: nextH, x: cx - nextW / 2, y: cy - nextH / 2 };
      })
    }));
  };

  const updateExcavatorTopWidth = (width: number) => {
    if (!selectedObject || selectedObject.type !== "excavatorTop") return;
    const nextW = Math.max(80, Math.min(420, Math.round(width / 5) * 5));
    const nextH = Math.round(nextW * EXCAVATOR_TOP_ASPECT);
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        return { ...o, width: nextW, height: nextH, x: cx - nextW / 2, y: cy - nextH / 2 };
      })
    }));
  };

  const updateTruckTopWidth = (width: number) => {
    if (!selectedObject || selectedObject.type !== "truckTop") return;
    const nextW = Math.max(200, Math.min(900, Math.round(width / 5) * 5));
    const nextH = Math.round(nextW * TRUCK_TOP_ASPECT);
    setCurrent((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        return { ...o, width: nextW, height: nextH, x: cx - nextW / 2, y: cy - nextH / 2 };
      })
    }));
  };

  const updatePlanLength = (lengthMeters: number) => {
    const targetId = selectedObject?.type === "trenchPlan" ? selectedObject.id : null;
    setCurrent((prev) => {
      const firstTrench = prev.objects.find((o) => o.type === "trenchPlan");
      const activeId = targetId ?? firstTrench?.id;
      if (!activeId) return prev;
      return {
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === activeId
            ? {
                ...o,
                width: lengthMeters * GRID_UNIT,
                meta: { ...o.meta, lengthMeters }
              }
            : o
        )
      };
    });
  };

  const updatePlanWidth = (widthMeters: number) => {
    const targetId = selectedObject?.type === "trenchPlan" ? selectedObject.id : null;
    setCurrent((prev) => {
      const firstTrench = prev.objects.find((o) => o.type === "trenchPlan");
      const activeId = targetId ?? firstTrench?.id;
      if (!activeId) return prev;
      return {
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === activeId
            ? {
                ...o,
                height: Math.max(60, widthMeters * GRID_UNIT)
              }
            : o
        )
      };
    });
  };

  useEffect(() => {
    if (activeTab !== "cross" || selectedObject?.type !== "trenchCross") return;
    const a = resolveTrenchWallAngles(selectedObject.meta);
    setSlopeInputLeft(a.leftDeg.toFixed(1).replace(".", ","));
    setSlopeInputRight(a.rightDeg.toFixed(1).replace(".", ","));
  }, [activeTab, selectedObject?.type, selectedObject?.id, selectedObject?.meta]);

  const renderSymbolSettingsMenu = (): ReactNode => {
    if (!selectedObject) return undefined;

    if (selectedObject.type === "ladder" && activeTab === "plan") {
      const lid = selectedObject.id;
      const o = selectedObject;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-800">Skalering (plan)</div>
            <p className="text-[10px] leading-snug text-slate-600">
              Juster storleik – symbolet er ikkje målestokk, berre for å synleggjere rømningsvegar. Høgda følgjer same sideforhold som rømningsvei-PNG.
            </p>
            <input
              type="range"
              min={LADDER_WIDTH_MIN}
              max={LADDER_WIDTH_MAX_PLAN}
              step={5}
              value={o.width}
              onChange={(e) => updateLadderWidth(lid, Number(e.target.value), LADDER_WIDTH_MAX_PLAN, LADDER_PLAN_RASTER_ASPECT)}
              className="w-full"
            />
          </div>
          <div className="space-y-1 border-t border-slate-200 pt-2">
            <div className="text-xs font-medium text-slate-800">Helning</div>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={o.rotation}
              onChange={(e) => updateLadderHelning(lid, Number(e.target.value))}
              className="w-full"
            />
            <div className="text-[11px] text-slate-600">{o.rotation}° (bruk «Roter 90°» for grov rotering)</div>
          </div>
        </div>
      );
    }

    if (activeTab !== "cross") return undefined;
    if (selectedObject.type === "trenchCross") {
      const tid = selectedObject.id;
      const trenchWallAngles = resolveTrenchWallAngles(selectedObject.meta);
      const scopeName = `trench-wall-scope-${tid}`;
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-800">Grøftevegger</div>
          <p className="text-[11px] text-slate-600">
            Helning mot horisontal: <strong>45°</strong> skrå, <strong>90°</strong> loddrett mot bunn.
          </p>
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Juster</div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
              <input
                type="radio"
                name={scopeName}
                checked={trenchWallScope === "begge"}
                onChange={() => setTrenchWallScope("begge")}
              />
              Begge (V og H)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
              <input
                type="radio"
                name={scopeName}
                checked={trenchWallScope === "venstre"}
                onChange={() => setTrenchWallScope("venstre")}
              />
              Kun venstre (V)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
              <input
                type="radio"
                name={scopeName}
                checked={trenchWallScope === "hoyre"}
                onChange={() => setTrenchWallScope("hoyre")}
              />
              Kun høyre (H)
            </label>
          </div>
          {trenchWallScope === "begge" && (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={trenchWallsLinked}
                onChange={(e) => setTrenchWallsLinked(e.target.checked)}
              />
              Samme helning på V og H
            </label>
          )}
          {trenchWallScope === "begge" && trenchWallsLinked && (
            <div className="space-y-1">
              <input
                type="range"
                min={MIN_WALL_ANGLE_DEG}
                max={MAX_WALL_ANGLE_DEG}
                step={0.1}
                value={trenchWallAngles.leftDeg}
                onChange={(e) => {
                  const v = clampWallAngleDeg(Number(e.target.value));
                  patchTrenchWallAnglesFor(tid, { leftDeg: v, rightDeg: v });
                }}
                className="w-full"
              />
              <div className="text-[11px] text-slate-600">
                Helning begge: {trenchWallAngles.leftDeg.toFixed(1).replace(".", ",")}°
              </div>
            </div>
          )}
          {trenchWallScope === "begge" && !trenchWallsLinked && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-medium text-slate-700">
                  <span>Venstre (V)</span>
                  <input
                    className="h-7 w-20 rounded border border-slate-300 px-1 text-xs"
                    inputMode="decimal"
                    value={slopeInputLeft}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSlopeInputLeft(value);
                      const parsed = parseNumericInput(value);
                      if (parsed === null) return;
                      patchTrenchWallAnglesFor(tid, { leftDeg: clampWallAngleDeg(parsed) });
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={MIN_WALL_ANGLE_DEG}
                  max={MAX_WALL_ANGLE_DEG}
                  step={0.1}
                  value={trenchWallAngles.leftDeg}
                  onChange={(e) =>
                    patchTrenchWallAnglesFor(tid, { leftDeg: clampWallAngleDeg(Number(e.target.value)) })
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-medium text-slate-700">
                  <span>Høyre (H)</span>
                  <input
                    className="h-7 w-20 rounded border border-slate-300 px-1 text-xs"
                    inputMode="decimal"
                    value={slopeInputRight}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSlopeInputRight(value);
                      const parsed = parseNumericInput(value);
                      if (parsed === null) return;
                      patchTrenchWallAnglesFor(tid, { rightDeg: clampWallAngleDeg(parsed) });
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={MIN_WALL_ANGLE_DEG}
                  max={MAX_WALL_ANGLE_DEG}
                  step={0.1}
                  value={trenchWallAngles.rightDeg}
                  onChange={(e) =>
                    patchTrenchWallAnglesFor(tid, { rightDeg: clampWallAngleDeg(Number(e.target.value)) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
          {trenchWallScope === "venstre" && (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-medium text-slate-700">
                <span>Venstre (V)</span>
                <input
                  className="h-7 w-20 rounded border border-slate-300 px-1 text-xs"
                  inputMode="decimal"
                  value={slopeInputLeft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSlopeInputLeft(value);
                    const parsed = parseNumericInput(value);
                    if (parsed === null) return;
                    patchTrenchWallAnglesFor(tid, { leftDeg: clampWallAngleDeg(parsed) });
                  }}
                />
              </div>
              <input
                type="range"
                min={MIN_WALL_ANGLE_DEG}
                max={MAX_WALL_ANGLE_DEG}
                step={0.1}
                value={trenchWallAngles.leftDeg}
                onChange={(e) =>
                  patchTrenchWallAnglesFor(tid, { leftDeg: clampWallAngleDeg(Number(e.target.value)) })
                }
                className="w-full"
              />
            </div>
          )}
          {trenchWallScope === "hoyre" && (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-medium text-slate-700">
                <span>Høyre (H)</span>
                <input
                  className="h-7 w-20 rounded border border-slate-300 px-1 text-xs"
                  inputMode="decimal"
                  value={slopeInputRight}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSlopeInputRight(value);
                    const parsed = parseNumericInput(value);
                    if (parsed === null) return;
                    patchTrenchWallAnglesFor(tid, { rightDeg: clampWallAngleDeg(parsed) });
                  }}
                />
              </div>
              <input
                type="range"
                min={MIN_WALL_ANGLE_DEG}
                max={MAX_WALL_ANGLE_DEG}
                step={0.1}
                value={trenchWallAngles.rightDeg}
                onChange={(e) =>
                  patchTrenchWallAnglesFor(tid, { rightDeg: clampWallAngleDeg(Number(e.target.value)) })
                }
                className="w-full"
              />
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Tillatt: {MIN_WALL_ANGLE_DEG}°{MAX_WALL_ANGLE_DEG}°.
          </p>
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="text-[11px] font-medium text-slate-800">Breiddar</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Dybde / høgde (m)</span>
                <span>{(selectedObject.height / GRID_UNIT).toFixed(2).replace(".", ",")}</span>
              </div>
              <input
                type="range"
                min={100}
                max={520}
                step={5}
                value={selectedObject.height}
                onChange={(e) => updateTrenchCrossHeight(tid, Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-slate-500">Nedre kant held seg på same nivå (bakkelinje).</p>
            </div>
            {/* Topp grøft — styrer bbox-breidda direkte */}
            {(() => {
              const margin = selectedObject.width * 0.02;
              const innerTopW = Math.round(selectedObject.width - 2 * margin);
              const currentBottom = selectedObject.meta?.innerBottomWidthPx ??
                initialTrenchInnerBottomWidthPx(selectedObject.width, selectedObject.height, selectedObject.meta);
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Topp grøft (m)</span>
                    <span>{(innerTopW / GRID_UNIT).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={500}
                    step={2}
                    value={innerTopW}
                    onChange={(e) => {
                      const innerPx = Number(e.target.value);
                      // Konverter frå innerTopW til bbox-breidde: bbox = innerTopW / 0.96
                      updateTrenchCrossTopWidth(tid, Math.round(innerPx / 0.96));
                    }}
                    className="w-full"
                  />
                  {innerTopW <= currentBottom && (
                    <p className="text-[10px] text-amber-600">Topp = bunn → loddrette veggar</p>
                  )}
                </div>
              );
            })()}
            {/* Bunn grøft */}
            {(() => {
              const margin = selectedObject.width * 0.02;
              const innerTopW = Math.round(selectedObject.width - 2 * margin);
              const currentBottom = selectedObject.meta?.innerBottomWidthPx ??
                initialTrenchInnerBottomWidthPx(selectedObject.width, selectedObject.height, selectedObject.meta);
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Bunn grøft (m)</span>
                    <span>{(currentBottom / GRID_UNIT).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={500}
                    step={2}
                    value={currentBottom}
                    onChange={(e) => updateTrenchInnerBottomWidthPx(tid, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              );
            })()}
          </div>
        </div>
      );
    }
    if (selectedObject.type === "ladder") {
      const lid = selectedObject.id;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-800">Skalering</div>
            <input
              type="range"
              min={LADDER_WIDTH_MIN}
              max={LADDER_WIDTH_MAX_CROSS}
              step={5}
              value={selectedObject.width}
              onChange={(e) => updateLadderWidth(lid, Number(e.target.value), LADDER_WIDTH_MAX_CROSS)}
              className="w-full"
            />
            <p className="text-[10px] leading-snug text-slate-600">Ikkje målestokk – synleggjer rømningsveg. Proporsjon held.</p>
          </div>
          <div className="space-y-1 border-t border-slate-200 pt-2">
            <div className="text-xs font-medium text-slate-800">Helning (stige)</div>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={selectedObject.rotation}
              onChange={(e) => updateLadderHelning(lid, Number(e.target.value))}
              className="w-full"
            />
            <div className="text-[11px] text-slate-600">{selectedObject.rotation}°</div>
          </div>
        </div>
      );
    }
    if (selectedObject.type === "spoilPile") {
      const pid = selectedObject.id;
      const mat: SpoilCrossMaterial = selectedObject.meta?.spoilCrossMaterial ?? "jord";
      const grp = `spoil-cross-mat-${pid}`;
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-800">Massetype (tverrprofil)</div>
          <p className="text-[10px] leading-snug text-slate-600">
            Bytt PNG-filene i public/skisse/: spoil-cross-jord.png og spoil-cross-stein.png (same pipeline som gravemaskin, med lys-bakgrunn-knockout).
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
            <input type="radio" name={grp} checked={mat === "jord"} onChange={() => updateSpoilCrossMaterial(pid, "jord")} />
            Jord
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
            <input type="radio" name={grp} checked={mat === "stein"} onChange={() => updateSpoilCrossMaterial(pid, "stein")} />
            Stein
          </label>
        </div>
      );
    }
    if (selectedObject.type === "sheetPile" || selectedObject.type === "trenchBox") {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-800">
            Bredde ({selectedObject.type === "sheetPile" ? "spunt" : "grøftekasse"})
          </div>
          <input
            type="range"
            min={100}
            max={900}
            step={5}
            value={selectedObject.width}
            onChange={(e) => updateSafetyWidth(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-[11px] text-slate-600">{(selectedObject.width / GRID_UNIT).toFixed(1).replace(".", ",")} m</div>
        </div>
      );
    }
    return undefined;
  };

  const resetAll = () => {
    if (!window.confirm("Er du sikker på at du vil tilbakestille hele arbeidsflaten?")) return;
    crossHistory.reset({
      objects: cloneObjects(defaultCrossSectionObjects),
      measurements: cloneMeasurements(defaultCrossMeasurements),
      textLabels: []
    });
    planHistory.reset({
      objects: cloneObjects(defaultPlanObjects),
      measurements: cloneMeasurements(defaultPlanMeasurements),
      planTerrainTiles: {},
      textLabels: [],
      planProfileRuler: defaultPlanProfileRulerState()
    });
    setSelection(null);
    setPendingMeasure(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const exportPrint = async () => {
    setExportMessage(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const renderSketchTitle = (title: string) => `<h2 class="sketch-title">${escapeHtml(title)}</h2>`;
    const renderPlanField = (title: string, value: string) =>
      `<p class="plan-field"><strong>${escapeHtml(title)}:</strong> ${value.trim() ? escapeHtml(value) : "<em>Ikke utfylt</em>"}</p>`;

    try {
      const [crossSvg, planSvg] = await Promise.all([
        embedExternalImagesInSvg(buildPrintableSvg(crossHistory.present, origin)),
        embedExternalImagesInSvg(buildPrintableSvg(planHistory.present, origin))
      ]);

      const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8"/>
<title>Grøfteplan skisse</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    line-height: 1.25;
    color: #0f172a;
  }
  .sheet {
    width: 100%;
    max-width: 190mm;
    min-height: 277mm;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .sketches-stack {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 3mm;
    min-height: 0;
  }
  .sketch-block {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .sketch-title {
    flex: 0 0 auto;
    font-size: 9.5pt;
    font-weight: 700;
    margin: 0 0 1.5mm;
  }
  .sketch-media {
    flex: 1 1 auto;
    height: 113mm;
    max-height: 113mm;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
    background: #f8fafc;
  }
  .sketch-media svg {
    display: block;
    width: 100%;
    max-width: 100%;
    max-height: 113mm;
    height: auto;
    border: none !important;
    border-radius: 0 !important;
    background: transparent;
  }
  .plan-text {
    flex: 0 0 auto;
    margin-top: 3mm;
    padding-top: 2.5mm;
    border-top: 1px solid #cbd5e1;
  }
  .plan-text h2 {
    font-size: 9.5pt;
    font-weight: 700;
    margin: 0 0 1.5mm;
  }
  .plan-field { margin: 0.8mm 0; }
  @media print {
    .sheet {
      min-height: 277mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sketches-stack, .plan-text {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="sketches-stack">
      <section class="sketch-block">
        ${renderSketchTitle("Tverrprofil")}
        <div class="sketch-media">${crossSvg}</div>
      </section>
      <section class="sketch-block">
        ${renderSketchTitle("Plan (ovenfra)")}
        <div class="sketch-media">${planSvg}</div>
      </section>
    </div>
    <section class="plan-text">
      <h2>Plan for arbeidet (§ 21-5)</h2>
      ${renderPlanField("a) Lengdeprofil", workPlan.lengthProfile)}
      ${renderPlanField("a) Jordarter/installasjoner", workPlan.soilAndInstallations)}
      ${renderPlanField("b) Typiske tverrprofiler / avstivning", workPlan.typicalCrossSection)}
      ${renderPlanField("c) Plassering av gravemasser", workPlan.spoilPlacement)}
      ${renderPlanField("d) Arbeidsinstruks", workPlan.workInstruction)}
    </section>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");

      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "grofteplan-skisse.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExportMessage("Popup blokkert — skissen ble lastet ned som HTML.");
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        return;
      }

      w.addEventListener("load", () => {
        URL.revokeObjectURL(url);
        w.focus();
        w.print();
      });
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setExportMessage("Eksport feilet. Prøv «Generer PDF» på skjema-siden (/plan).");
    }
  };

  const renderVehicleToolbarStrip = (): ReactNode => {
    if (!selectedObject) return null;
    if (activeTab === "cross" && selectedObject.type === "excavatorSide") {
      const o = selectedObject;
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-700">Skalering</div>
          <input
            type="range"
            min={180}
            max={1400}
            step={5}
            value={o.width}
            onChange={(e) => updateExcavatorSideWidth(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">Illustrasjon – ikkje målestokk.</p>
        </div>
      );
    }
    if (activeTab === "plan" && selectedObject.type === "excavatorTop" && selectedExcavatorTop) {
      const o = selectedExcavatorTop;
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-700">Skalering</div>
          <input
            type="range"
            min={80}
            max={420}
            step={5}
            value={o.width}
            onChange={(e) => updateExcavatorTopWidth(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">Illustrasjon – ikkje målestokk.</p>
        </div>
      );
    }
    if (activeTab === "plan" && selectedObject.type === "truckTop" && selectedTruckTop) {
      const o = selectedTruckTop;
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-700">Skalering</div>
          <input
            type="range"
            min={200}
            max={900}
            step={5}
            value={o.width}
            onChange={(e) => updateTruckTopWidth(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">Illustrasjon – ikkje målestokk.</p>
        </div>
      );
    }
    if (activeTab === "plan" && selectedObject.type === "ladder") {
      const o = selectedObject;
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-700">Skalering (stige)</div>
          <input
            type="range"
            min={LADDER_WIDTH_MIN}
            max={LADDER_WIDTH_MAX_PLAN}
            step={5}
            value={o.width}
            onChange={(e) => updateLadderWidth(o.id, Number(e.target.value), LADDER_WIDTH_MAX_PLAN, LADDER_PLAN_RASTER_ASPECT)}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">Illustrasjon — dra blå punkt øvst til høgre, eller bruk slider.</p>
        </div>
      );
    }
    if (activeTab === "cross" && selectedObject.type === "spoilPile") {
      const o = selectedObject;
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-700">Skalering (masse)</div>
          <input
            type="range"
            min={120}
            max={700}
            step={5}
            value={o.width}
            onChange={(e) => updateSpoilPileWidth(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">Illustrasjon – ikkje målestokk.</p>
        </div>
      );
    }
    return null;
  };

  const activePalette =
    activeTab === "cross" ? (showSafetyMeasures ? [...crossObjects, ...crossSafetyObjects] : crossObjects) : planObjects;
  const activeUndo = activeTab === "cross" ? crossHistory.canUndo : planHistory.canUndo;
  const symbolSettingsMenu = renderSymbolSettingsMenu();

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/80 p-3">
          <p className="text-xs font-medium text-slate-900">Neste steg</p>
          <p className="text-[10px] leading-snug text-slate-600">
            Skissene lagres automatisk. Gå til skjemaet for å fylle ut grøfteplanen og laste ned PDF med alt innhold.
          </p>
          <Link href="/plan?fra=skisse#generer-pdf" className="block">
            <Button type="button" className="w-full" size="sm">
              Gå til skjema og generer PDF
            </Button>
          </Link>
          <Link href="/plan" className="block text-center text-[10px] text-brand-700 underline">
            Bare åpne skjema
          </Link>
        </div>

        <h2 className="font-semibold text-slate-900">Objekter</h2>
        <div className="grid gap-2">
          {activePalette.map((type) => (
            <Button key={type} variant="outline" onClick={() => addObject(type)}>
              {paletteLabel(type, activeTab)}
            </Button>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <Button onClick={() => setIsMeasureMode((v) => !v)}>{isMeasureMode ? "Avslutt måling" : "Legg til måling"}</Button>
          <p className="text-[10px] leading-snug text-slate-600">
            Med <strong>grid på</strong> snapper målepunkter til rutenett (1 m). Med <strong>grid av</strong> er målinga fri flytande. Ingen blå snap-prikkar.
          </p>
          <Button variant="outline" onClick={deleteSelected}>Slett valgt</Button>
          <Button variant="outline" onClick={() => (activeTab === "cross" ? crossHistory.undo() : planHistory.undo())} disabled={!activeUndo}>Angre</Button>
          <Button variant="outline" onClick={clearActiveCanvas}>Tøm arbeidsflate</Button>
          <Button variant="outline" onClick={clearBoth}>Tøm begge</Button>
          <Button variant="outline" onClick={resetAll} className="border-red-300 text-red-700 hover:bg-red-50">Tilbakestill alt</Button>
          <Button variant="secondary" onClick={() => void exportPrint()}>
            Eksporter/utskrift
          </Button>
          <p className="text-[10px] leading-snug text-slate-600">
            Kun skisser på én side. For hele grøfteplanen med skjema og risikovurdering: bruk knappen «Gå til skjema og
            generer PDF» over.
          </p>
          {exportMessage ? <p className="text-[10px] text-amber-800">{exportMessage}</p> : null}
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={() => setShowGrid((v) => !v)}>{showGrid ? "Skjul grid" : "Vis grid"}</Button>
          <Button variant="outline" onClick={resetZoom}>Tilbakestill zoom til 1,00x</Button>
          <div className="text-xs text-slate-600">Zoom: {(zoom * 100).toFixed(0)}%</div>
          <div className="text-xs text-slate-600">Grid: 1 rute = 1 x 1 meter</div>
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Tekst på skisse</h3>
          <p className="text-[10px] leading-snug text-slate-600">
            Gjelder både tverrprofil og plan. Klikk merket for å velje, dra for å flytte. Ny linje i tekstfelt: Enter. Du kan t.d. skrive «Eksisterande veg».
          </p>
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addTextLabel}>
            Legg til tekstmerke
          </Button>
          {selectedTextLabel && (
            <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <label className="text-[11px] font-medium text-slate-800" htmlFor="sketch-text-label">
                Tekst
              </label>
              <Textarea
                id="sketch-text-label"
                className="min-h-[72px] text-xs"
                value={selectedTextLabel.text}
                onChange={(e) => {
                  const id = selectedTextLabel.id;
                  const v = e.target.value;
                  setCurrent((prev) => ({
                    ...prev,
                    textLabels: (prev.textLabels ?? []).map((t) => (t.id === id ? { ...t, text: v } : t))
                  }));
                }}
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(selectedTextLabel.boxed)}
                  onChange={(e) => {
                    const id = selectedTextLabel.id;
                    const boxed = e.target.checked;
                    setCurrent((prev) => ({
                      ...prev,
                      textLabels: (prev.textLabels ?? []).map((t) => (t.id === id ? { ...t, boxed } : t))
                    }));
                  }}
                />
                Kvit bakgrunn rundt tekst
              </label>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-700">
                  <span>Skriftstorleik</span>
                  <span>{selectedTextLabel.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={44}
                  step={1}
                  value={selectedTextLabel.fontSize}
                  onChange={(e) => {
                    const id = selectedTextLabel.id;
                    const fs = Number(e.target.value);
                    setCurrent((prev) => ({
                      ...prev,
                      textLabels: (prev.textLabels ?? []).map((t) => (t.id === id ? { ...t, fontSize: fs } : t))
                    }));
                  }}
                  className="w-full"
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={duplicateSelected}>
                Dupliser merke
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          {activeTab === "cross" ? (
            <>
              <p className="text-xs text-slate-600">
                Vel eit symbol og trykk <strong>Innstillingar</strong> på verktøylinja over symbolet for grøfteveggar (V/H),{" "}
                <strong>helning</strong> på stige, og <strong>bredde</strong> på spunt eller grøftekasse. Kvar stige og kvar grøft har eigne verdiar.{" "}
                <strong>Skalering</strong> av gravemaskin (side) er på same flytande verktøylinje som Slett / Speilvend. Spunt og grøftekasse i tverrprofil brukar PNG i{" "}
                <span className="font-mono text-[10px]">public/skisse/</span>:{" "}
                <span className="font-mono text-[10px]">sheet-pile-cross.png</span>,{" "}
                <span className="font-mono text-[10px]">trench-box-cross.png</span>.
              </p>
              {showSafetyMeasures && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                  Grøftedybde over 2,0 m: vurder spunt eller grøftekasse.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="text-xs font-medium text-slate-800">Masse i ruter (plan)</div>
                <p className="text-[10px] leading-snug text-slate-600">
                  Vel type under, klikk på <strong>tom flate</strong> (ikkje på symbol) og dra med venstreknapp over rutenettet. Kvar rute er 1—1 m. PNG-filer:{" "}
                  <span className="font-mono text-[10px]">public/skisse/plan-tile-jord.png</span>,{" "}
                  <span className="font-mono text-[10px]">plan-tile-stein.png</span>,{" "}
                  <span className="font-mono text-[10px]">plan-tile-asfalt.png</span>.
                </p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-800">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-fill-tool"
                      checked={planFillTool === null}
                      onChange={() => setPlanFillTool(null)}
                    />
                    Vanleg (flytt kart / vel symbol)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-fill-tool"
                      checked={planFillTool === "jord"}
                      onChange={() => setPlanFillTool("jord")}
                    />
                    Jord – måla ruter
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-fill-tool"
                      checked={planFillTool === "stein"}
                      onChange={() => setPlanFillTool("stein")}
                    />
                    Stein – måla ruter
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-fill-tool"
                      checked={planFillTool === "asfalt"}
                      onChange={() => setPlanFillTool("asfalt")}
                    />
                    Veg (asfalt) – måla ruter
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-fill-tool"
                      checked={planFillTool === "erase"}
                      onChange={() => setPlanFillTool("erase")}
                    />
                    Visk – fjern ruter (dra)
                  </label>
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={clearPlanTerrainTiles}>
                  Tøm alle masse-ruter
                </Button>
              </div>
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="text-xs font-medium text-slate-800">Profilnummer / kjetting langs grøft</div>
                <p className="text-[10px] leading-snug text-slate-600">
                  Talllinje med merke etter kvart <strong>heile</strong> intervall du set (t.d. 10). Lina følgjer grøfta (vel grøft for å justere lengde når du har fleire). Ulik skala frå rutenett – berre oversikt.
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={planProfileRulerConfig.show}
                    onChange={(e) => patchPlanProfileRuler({ show: e.target.checked })}
                  />
                  Vis talllinje
                </label>
                <div className="flex flex-col gap-1.5 text-xs text-slate-800">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-pr-labeling"
                      checked={planProfileRulerConfig.labeling === "profile"}
                      onChange={() => patchPlanProfileRuler({ labeling: "profile" })}
                    />
                    Profilnummer (skriv start sjølv)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="plan-pr-labeling"
                      checked={planProfileRulerConfig.labeling === "chainage"}
                      onChange={() => patchPlanProfileRuler({ labeling: "chainage" })}
                    />
                    Meter langs grøft (0 ved start)
                  </label>
                </div>
                {planProfileRulerConfig.labeling === "profile" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700" htmlFor="plan-pr-start">
                      Start profilnummer
                    </label>
                    <Input
                      id="plan-pr-start"
                      type="number"
                      step={0.1}
                      className="h-8 text-xs"
                      value={planProfileRulerConfig.startProfile}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        patchPlanProfileRuler({ startProfile: v });
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700" htmlFor="plan-pr-interval">
                    Intervall mellom hovudmerke (m)
                  </label>
                  <Input
                    id="plan-pr-interval"
                    type="number"
                    step={1}
                    min={1}
                    className="h-8 text-xs"
                    value={planProfileRulerConfig.intervalMeters}
                    onChange={(e) => {
                      const v = Math.max(1, Math.round(Number(e.target.value)));
                      if (!Number.isFinite(v)) return;
                      patchPlanProfileRuler({ intervalMeters: v });
                    }}
                  />
                </div>
                {planProfileRulerConfig.labeling === "profile" && (
                  <div className="flex flex-col gap-1.5 text-xs text-slate-800">
                    <span className="text-[11px] font-medium text-slate-700">Slutt</span>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="plan-pr-end"
                        checked={planProfileRulerConfig.endMode === "trenchLength"}
                        onChange={() => patchPlanProfileRuler({ endMode: "trenchLength" })}
                      />
                      Start + grøftelengde (langs grøft i teikninga)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="plan-pr-end"
                        checked={planProfileRulerConfig.endMode === "manualProfileEnd"}
                        onChange={() => patchPlanProfileRuler({ endMode: "manualProfileEnd" })}
                      />
                      Egen slutt (profilnummer)
                    </label>
                    {planProfileRulerConfig.endMode === "manualProfileEnd" && (
                      <Input
                        type="number"
                        step={0.1}
                        className="h-8 text-xs"
                        value={planProfileRulerConfig.endProfile}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          patchPlanProfileRuler({ endProfile: v });
                        }}
                      />
                    )}
                  </div>
                )}
                <div className="space-y-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Lina over grøft (px)</span>
                    <span>{planProfileRulerConfig.offsetAboveTrenchPx}</span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={120}
                    step={2}
                    value={planProfileRulerConfig.offsetAboveTrenchPx}
                    onChange={(e) => patchPlanProfileRuler({ offsetAboveTrenchPx: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="text-sm font-medium text-slate-800">Grøftelengde (meter)</div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={selectedPlanTrench ? selectedPlanTrench.width / GRID_UNIT : currentPlanLengthMeters}
                onChange={(e) => updatePlanLength(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-slate-600">
                Lengde: {(selectedPlanTrench ? selectedPlanTrench.width / GRID_UNIT : currentPlanLengthMeters).toFixed(1).replace(".", ",")} m
              </div>
              <div className="pt-2 text-sm font-medium text-slate-800">Grøftebredde (meter)</div>
              <input
                type="range"
                min={1}
                max={6}
                step={0.1}
                value={selectedPlanTrench ? selectedPlanTrench.height / GRID_UNIT : currentPlanWidthMeters}
                onChange={(e) => updatePlanWidth(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-slate-600">
                Bredde: {(selectedPlanTrench ? selectedPlanTrench.height / GRID_UNIT : currentPlanWidthMeters).toFixed(1).replace(".", ",")} m
              </div>
              <p className="text-xs text-slate-600">
                <strong>Talllinje</strong> over: profilnummer eller meter langs grøft. <strong>Skalering</strong> av gravemaskin og lastebil (illustrasjon) på flytande verktøylinje. Rømningsveg og stige:{" "}
                <span className="font-mono text-[10px]">public/skisse/escape-route-plan.png</span>.
              </p>
              <div className="text-xs text-slate-500">Tips: bruk «Masse i ruter» for massar i plan; vel grøft for å justere når du har fleire.</div>
            </>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Plan for arbeidet (§ 21-5)</h3>
          <textarea
            className="min-h-[60px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="a) Lengdeprofil med nivå og beskrivelse."
            value={workPlan.lengthProfile}
            onChange={(e) => setWorkPlan((prev) => ({ ...prev, lengthProfile: e.target.value }))}
          />
          <textarea
            className="min-h-[60px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="a) Jordarter ned til 1 m under utgravingsnivå + installasjoner i grunnen."
            value={workPlan.soilAndInstallations}
            onChange={(e) => setWorkPlan((prev) => ({ ...prev, soilAndInstallations: e.target.value }))}
          />
          <textarea
            className="min-h-[52px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="b) Typiske tverrprofiler og planlagt avstivning."
            value={workPlan.typicalCrossSection}
            onChange={(e) => setWorkPlan((prev) => ({ ...prev, typicalCrossSection: e.target.value }))}
          />
          <textarea
            className="min-h-[52px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="c) Plassering av gravemasser."
            value={workPlan.spoilPlacement}
            onChange={(e) => setWorkPlan((prev) => ({ ...prev, spoilPlacement: e.target.value }))}
          />
          <textarea
            className="min-h-[70px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="d) Arbeidsinstruks for sikker gjennomføring."
            value={workPlan.workInstruction}
            onChange={(e) => setWorkPlan((prev) => ({ ...prev, workInstruction: e.target.value }))}
          />
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

        <div
          ref={canvasHostRef}
          className="relative aspect-video w-full touch-none overscroll-contain overflow-hidden rounded-md border border-slate-300"
          onWheel={onCanvasWheel}
        >
          {selectedObject && selectedToolbarPos && (
            <ObjectToolbar
              key={selectedObject.id}
              xPercent={selectedToolbarPos.x}
              yPercent={selectedToolbarPos.y}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onRotate={rotateSelected}
              rotateLabel={activeTab === "cross" && selectedObject?.type === "excavatorSide" ? "Speilvend" : "Roter 90°"}
              stripExtras={renderVehicleToolbarStrip()}
              hasSettingsMenu={Boolean(symbolSettingsMenu)}
              settingsMenuDockBelow
              settingsOpen={objectSettingsDockOpen}
              onSettingsOpenChange={setObjectSettingsDockOpen}
            />
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={
              activeTab === "plan" && planFillTool ? "h-full w-full cursor-crosshair bg-slate-50" : "h-full w-full bg-slate-50"
            }
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            {showGrid && (
              <g className="pointer-events-none" aria-hidden="true">
                {viewportGridLines.verticals.map((wx) => {
                  const xs = wx * zoom + pan.x;
                  return (
                    <line key={`vgx-${wx}`} x1={xs} y1={0} x2={xs} y2={VIEW_H} stroke="#e2e8f0" strokeWidth={1} />
                  );
                })}
                {viewportGridLines.horizontals.map((wy) => {
                  const ys = wy * zoom + pan.y;
                  return (
                    <line key={`vgy-${wy}`} x1={0} y1={ys} x2={VIEW_W} y2={ys} stroke="#e2e8f0" strokeWidth={1} />
                  );
                })}
              </g>
            )}
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {/* Grunnlinje i tverrprofil – berre synleg på tverrprofil-fana */}
              {activeTab === "cross" && (
                <g className="pointer-events-none" aria-hidden="true">
                  {/* Jord-fyll under bakken */}
                  <rect
                    x={-9000} y={CROSS_GROUND_Y}
                    width={20000} height={9000}
                    fill="#b45309" opacity={0.08}
                  />
                  {/* Skravurmønster: korte striper */}
                  {Array.from({ length: 120 }, (_, i) => {
                    const ox = (i % 30) * 80 - 2400;
                    const row = Math.floor(i / 30);
                    return (
                      <line
                        key={`hatch-${i}`}
                        x1={ox + row * 20} y1={CROSS_GROUND_Y + row * 40 + 8}
                        x2={ox + row * 20 + 30} y2={CROSS_GROUND_Y + row * 40 + 8}
                        stroke="#92400e" strokeWidth={1.5} opacity={0.18}
                      />
                    );
                  })}
                  {/* Sjølve grunnlinja */}
                  <line
                    x1={-9000} y1={CROSS_GROUND_Y}
                    x2={20000} y2={CROSS_GROUND_Y}
                    stroke="#57534e" strokeWidth={2.5} opacity={0.55}
                    strokeDasharray="none"
                  />
                  {/* Etikett */}
                  <text
                    x={28} y={CROSS_GROUND_Y - 6}
                    fontSize={13} fill="#78716c" fontFamily="sans-serif"
                    opacity={0.85}
                  >Bakkeplan</text>
                </g>
              )}

              {activeTab === "plan" &&
                Object.entries(planTerrainForView).map(([key, mat]) => {
                  const [i, j] = key.split(",").map(Number);
                  const href = planTileHref(mat);
                  const r = planTileDrawRect(i, j);
                  return (
                    <image
                      key={`terr-${key}`}
                      href={href}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      preserveAspectRatio="none"
                      className="pointer-events-none"
                    />
                  );
                })}
              {objectsInPaintOrder.map((o) => (
                <CanvasObject
                  key={o.id}
                  object={o}
                  selected={selection?.kind === "object" && selection.id === o.id}
                  ladderAsPlanRaster={activeTab === "plan"}
                  onResizeHandleMouseDown={
                    o.type === "ladder" && activeTab === "plan" && selection?.kind === "object" && selection.id === o.id
                      ? (e) => {
                          e.stopPropagation();
                          setScalingLadder({ id: o.id, planRaster: true });
                        }
                      : undefined
                  }
                />
              ))}
              {activeTab === "plan" && (
                <PlanProfileRulerLayer
                  trench={selectedPlanTrench ?? activeTrenchPlan}
                  cfg={planProfileRulerConfig}
                  gridUnit={GRID_UNIT}
                />
              )}

              {measurementViews.map((m) => (
                <MeasurementLine
                  key={m.id}
                  measurement={m}
                  selected={selection?.kind === "measurement" && selection.id === m.id}
                  onSelect={() => {
                    setSelection({ kind: "measurement", id: m.id });
                    setObjectSettingsDockOpen(false);
                  }}
                  onEditLabel={() => {
                    setSelection({ kind: "measurement", id: m.id });
                    setObjectSettingsDockOpen(false);
                  }}
                  onEndpointDragStart={(end) => {
                    setSelection({ kind: "measurement", id: m.id });
                    setObjectSettingsDockOpen(false);
                    setDraggingMeasureEndpoint({ id: m.id, end });
                  }}
                />
              ))}

              {(current.present.textLabels ?? []).map((t) => {
                const lines = t.text.split("\n");
                const outer = textLabelHitOuterBounds(t);
                const sel = selection?.kind === "textLabel" && selection.id === t.id;
                return (
                  <g key={t.id} style={{ cursor: "move" }}>
                    {t.boxed && (
                      <rect
                        x={outer.x}
                        y={outer.y}
                        width={outer.width}
                        height={outer.height}
                        rx={4}
                        fill="#ffffff"
                        stroke="#e2e8f0"
                        strokeWidth={1}
                        className="pointer-events-none"
                      />
                    )}
                    <text
                      x={t.x}
                      y={t.y + t.fontSize}
                      fontSize={t.fontSize}
                      fill="#0f172a"
                      className="pointer-events-none select-none"
                    >
                      {lines.map((line, i) => (
                        <tspan key={i} x={t.x} dy={i === 0 ? 0 : t.fontSize * 1.2}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                    {sel && (
                      <rect
                        x={outer.x - 4}
                        y={outer.y - 4}
                        width={outer.width + 8}
                        height={outer.height + 8}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        className="pointer-events-none"
                      />
                    )}
                    <rect x={outer.x} y={outer.y} width={outer.width} height={outer.height} fill="transparent" pointerEvents="all" />
                  </g>
                );
              })}

              {pendingMeasure && <circle cx={pendingMeasure.x} cy={pendingMeasure.y} r={8} fill="#f59e0b" />}
            </g>
          </svg>
        </div>

        {isMeasureMode && !selectedMeasurement && (
          <p className="mt-2 text-xs text-slate-600">
            Klikk to punkt på teikninga for ny måling. Velg ei linje etterpå for å endre tekst og dra dei blå endepunkta for finjustering.
          </p>
        )}

        {selectedMeasurement && selectedMeasurementView && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/95 px-3 py-2 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="text-xs font-semibold text-slate-800">Måletekst</span>
              <button
                type="button"
                className="text-[11px] text-slate-500 underline hover:text-slate-800"
                onClick={() => setSelection(null)}
              >
                Lukk
              </button>
            </div>
            <p className="text-[11px] leading-snug text-slate-600">
              Min / maks / eksakt fyller inn 0, 0 eller =. Dra dei blå punktene på linja for å flytte endar.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => applyMeasurementPresetLabel("min")}>
                Min
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyMeasurementPresetLabel("max")}>
                Maks
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyMeasurementPresetLabel("exact")}>
                Eksakt
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={deleteSelected}>
                Slett måling
              </Button>
            </div>
            <Input
              className="mt-2 h-9 text-sm"
              value={selectedMeasurement.label}
              onChange={(e) => updateSelectedMeasurementLabel(e.target.value)}
              onBlur={(e) => updateSelectedMeasurementLabel(e.target.value, true)}
            />
          </div>
        )}

        {objectSettingsDockOpen && symbolSettingsMenu && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/95 px-3 py-2 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="text-xs font-semibold text-slate-800">Innstillingar for valgt symbol</span>
              <button
                type="button"
                className="text-[11px] text-slate-500 underline hover:text-slate-800"
                onClick={() => setObjectSettingsDockOpen(false)}
              >
                Lukk
              </button>
            </div>
            <div className="max-h-[min(55vh,520px)] overflow-y-auto text-xs">{symbolSettingsMenu}</div>
          </div>
        )}
      </div>
    </div>

    {overlapPick && (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[90] cursor-default bg-transparent"
          aria-label="Lukk val av objekt"
          onClick={() => setOverlapPick(null)}
        />
        <div
          className="fixed z-[95] max-w-[min(92vw,16rem)] rounded-lg border border-slate-300 bg-white p-2 shadow-xl"
          style={{ left: overlapPick.clientX, top: overlapPick.clientY, transform: "translate(8px, 8px)" }}
          role="dialog"
          aria-label="Velg objekt"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1.5 text-xs font-semibold text-slate-800">Kva vil du velje?</div>
          <div className="flex flex-col gap-1">
            {overlapPick.candidates.map((o) => (
              <Button
                key={o.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto justify-start py-2 text-left text-xs"
                onClick={() => {
                  setSelection({ kind: "object", id: o.id });
                  if (o.type === "trenchCross") setObjectSettingsDockOpen(true);
                  setOverlapPick(null);
                }}
              >
                {paletteLabel(o.type, activeTab)}
              </Button>
            ))}
          </div>
        </div>
      </>
    )}

    </>
  );
}

