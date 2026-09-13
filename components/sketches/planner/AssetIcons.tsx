"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { getTrenchCrossCorners } from "@/components/sketches/planner/trenchCrossGeometry";

export type ObjectType =
  | "trenchCross"
  | "trenchPlan"
  | "excavatorSide"
  | "excavatorTop"
  | "truckTop"
  | "spoilPile"
  | "ladder"
  | "barrier"
  | "sheetPile"
  | "trenchBox"
  | "pipe"
  | "escapeRoute";

/** Bytt ut filene i `public/skisse/` med dine eigne PNG (gjerne med gjennomsiktig bakgrunn). */
export const EXCAVATOR_SIDE_PNG = "/skisse/excavator-side.png";
export const EXCAVATOR_TOP_PNG = "/skisse/excavator-top.png";
export const TRUCK_TOP_PNG = "/skisse/truck-top.png";
/** Tverrprofil massehaug — bytt PNG-filene i `public/skisse/` med eigne illustrasjonar. */
export const SPOIL_CROSS_JORD_PNG = "/skisse/spoil-cross-jord.png";
export const SPOIL_CROSS_STEIN_PNG = "/skisse/spoil-cross-stein.png";

/** Plan (1×1 m rute): fyll med dra — bytt PNG i `public/skisse/` (gjerne 50×50 px eller større, `slice` i ruta). */
export const PLAN_TILE_JORD_PNG = "/skisse/plan-tile-jord.png";
export const PLAN_TILE_STEIN_PNG = "/skisse/plan-tile-stein.png";
export const PLAN_TILE_ASFALT_PNG = "/skisse/plan-tile-asfalt.png";

/** Tverrprofil: spunt og grøftekasse — PNG med gjennomsiktig bakgrunn (`public/skisse/`). */
export const SHEET_PILE_CROSS_PNG = "/skisse/sheet-pile-cross.png";
export const TRENCH_BOX_CROSS_PNG = "/skisse/trench-box-cross.png";
/** Plan: rømningsveg med stige — PNG med gjennomsiktig bakgrunn. */
export const ESCAPE_ROUTE_PLAN_PNG = "/skisse/escape-route-plan.png";

export type SpoilCrossMaterial = "jord" | "stein";

/** Massefelt i plan (rutenett). */
export type PlanTerrainMaterial = "jord" | "stein" | "asfalt";

export function spoilCrossPngHref(material: SpoilCrossMaterial | undefined): string {
  return material === "stein" ? SPOIL_CROSS_STEIN_PNG : SPOIL_CROSS_JORD_PNG;
}

/** Standard mål for side-gravemaskin (50 px = 1 m). Brukes til størrelseslider og fast proporsjon. */
export const EXCAVATOR_SIDE_PRESET_WIDTH = 575;
export const EXCAVATOR_SIDE_PRESET_HEIGHT = 250;
export const EXCAVATOR_SIDE_ASPECT = EXCAVATOR_SIDE_PRESET_HEIGHT / EXCAVATOR_SIDE_PRESET_WIDTH;

/**
 * SVG filter: A' = k − (R+G+B) i normalisert sRGB. Gjer kvit/lys grå (inkl. «bake-in» rutenett) gjennomsiktig.
 * Låg k gjer òg lys gul/grå på sjølve teikninga «spøkjelses»-gjennomsiktig — 2,88 er eit kompromiss mot kvit bakgrunn.
 * Senk til ~2,75 om rutenettet dukkar opp att; øk til ~2,92 om fargane framleis er for svake.
 *
 * Etter matrisa køyrer {@link RASTER_KNOCKOUT_ALPHA_BOOST_SLOPE} på alfa slik at køyretøyet vert nær heilt dekke.
 *
 * Gjennomsikt kant: **mask** (`mask-type="alpha"`) frå ufiltrert PNG over det filtrerte biletet.
 */
export const EXCAVATOR_SIDE_LIGHT_BG_KNOCKOUT = 2.88;

/** Lineær alfa etter knockout: ut = slope × inn (clampa 0–1). Senk om lys grått rutenett blir for synleg. */
export const RASTER_KNOCKOUT_ALPHA_BOOST_SLOPE = 2.35;

function RasterAssetIcon(props: IconProps & { href: string }) {
  const { href, x, y, width, height, ...frameRest } = props;
  const sid = useId().replace(/:/g, "");
  const maskId = `raster-alpha-${sid}`;
  const filterId = `raster-knock-${sid}`;
  const knockoutValues = `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 ${EXCAVATOR_SIDE_LIGHT_BG_KNOCKOUT}`;
  return (
    <IconFrame {...frameRest} x={x} y={y} width={width} height={height} withShadow={false}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" {...{ "mask-type": "alpha" }}>
          <image href={href} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet" />
        </mask>
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values={knockoutValues} result="knockRgb" />
          <feComponentTransfer in="knockRgb" colorInterpolationFilters="sRGB">
            <feFuncA type="linear" slope={RASTER_KNOCKOUT_ALPHA_BOOST_SLOPE} intercept={0} />
          </feComponentTransfer>
        </filter>
      </defs>
      <image
        href={href}
        x={x}
        y={y}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${filterId})`}
        mask={`url(#${maskId})`}
      />
    </IconFrame>
  );
}

type IconProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  rotation?: number;
  meta?: {
    slopeRatio?: number;
    slopeAngleLeftDeg?: number;
    slopeAngleRightDeg?: number;
    lengthMeters?: number;
    mirrored?: boolean;
    spoilCrossMaterial?: SpoilCrossMaterial;
    innerBottomWidthPx?: number;
    innerTopWidthPx?: number;
  };
};

function IconFrame({ children, x, y, width, height, rotation = 0, withShadow = true, meta }: IconProps & { children: ReactNode; withShadow?: boolean }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const mirrored = Boolean(meta?.mirrored);
  const mirrorTransform = mirrored ? `translate(${2 * cx} 0) scale(-1 1)` : "";
  return (
    <g transform={`${mirrorTransform} rotate(${rotation} ${cx} ${cy})`.trim()}>
      {withShadow && <ellipse cx={cx} cy={y + height + 6} rx={width * 0.38} ry={Math.max(4, height * 0.06)} fill="#0f172a1f" />}
      {children}
    </g>
  );
}

export function TrenchCrossIcon(props: IconProps) {
  const { x, y, width, height, meta } = props;
  const { topLeft, topRight, bottomLeft, bottomRight } = getTrenchCrossCorners({ x, y, width, height, meta });
  return (
    <IconFrame {...props}>
      <defs>
        <linearGradient id={`trench-cross-${x}-${y}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>
      <polygon
        points={`${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`}
        fill={`url(#trench-cross-${x}-${y})`}
        stroke="#0f172a"
        strokeWidth={2.5}
      />
    </IconFrame>
  );
}

export function TrenchPlanIcon(props: IconProps) {
  const { x, y, width, height, meta } = props;
  const lengthMeters = Math.max(1, Math.round(meta?.lengthMeters ?? width / 50));
  const markers = Array.from({ length: Math.floor(lengthMeters / 5) }, (_, i) => (i + 1) * 5);
  return (
    <IconFrame {...props}>
      <rect x={x} y={y} width={width} height={height} rx={12} fill="#bfdbfe" stroke="#0f172a" strokeWidth={2.5} />
      <line x1={x + 8} y1={y + height / 2} x2={x + width - 8} y2={y + height / 2} stroke="#60a5fa" strokeWidth={2} strokeDasharray="8 6" />
      <line x1={x + 8} y1={y + height * 0.26} x2={x + width - 8} y2={y + height * 0.26} stroke="#ffffff90" strokeWidth={2} />
      {markers.map((meter) => {
        const px = x + (meter / lengthMeters) * width;
        return (
          <g key={meter}>
            <line x1={px} y1={y + height * 0.1} x2={px} y2={y + height * 0.9} stroke="#1e3a8a" strokeWidth={1.2} strokeDasharray="3 3" />
            <text x={px} y={y + height * 0.18} fill="#1e3a8a" fontSize={10} textAnchor="middle">
              {meter}m
            </text>
          </g>
        );
      })}
    </IconFrame>
  );
}

export function ExcavatorSideIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={EXCAVATOR_SIDE_PNG} />;
}

export function ExcavatorTopIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={EXCAVATOR_TOP_PNG} />;
}

export function TruckTopIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={TRUCK_TOP_PNG} />;
}

export function SpoilPileIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={spoilCrossPngHref(props.meta?.spoilCrossMaterial)} />;
}

export function LadderIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <line x1={x + width * 0.28} y1={y} x2={x + width * 0.2} y2={y + height} stroke="#4b5563" strokeWidth={4} />
      <line x1={x + width * 0.72} y1={y} x2={x + width * 0.64} y2={y + height} stroke="#4b5563" strokeWidth={4} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={x + width * 0.22} y1={y + 16 + i * ((height - 30) / 7)} x2={x + width * 0.68} y2={y + 16 + i * ((height - 30) / 7)} stroke="#9ca3af" strokeWidth={3} />
      ))}
    </IconFrame>
  );
}

export function BarrierIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x + width * 0.32} y={y} width={width * 0.35} height={height} fill="#dc2626" />
      <rect x={x + width * 0.32} y={y + height * 0.2} width={width * 0.35} height={height * 0.08} fill="#f8fafc" />
      <rect x={x + width * 0.32} y={y + height * 0.4} width={width * 0.35} height={height * 0.08} fill="#f8fafc" />
      <rect x={x + width * 0.32} y={y + height * 0.6} width={width * 0.35} height={height * 0.08} fill="#f8fafc" />
      <line x1={x + width * 0.35} y1={y + height * 0.1} x2={x + width * 0.62} y2={y + height * 0.1} stroke="#ffffff85" strokeWidth={1.3} />
    </IconFrame>
  );
}

export function SheetPileIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={SHEET_PILE_CROSS_PNG} />;
}

export function TrenchBoxIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={TRENCH_BOX_CROSS_PNG} />;
}

export function PipeIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <circle cx={x + width / 2} cy={y + height / 2} r={Math.min(width, height) * 0.32} fill="#64748b" stroke="#111827" strokeWidth={2} />
      <circle cx={x + width / 2} cy={y + height / 2} r={Math.min(width, height) * 0.15} fill="#94a3b8" />
    </IconFrame>
  );
}

export function EscapeRouteIcon(props: IconProps) {
  return <RasterAssetIcon {...props} href={ESCAPE_ROUTE_PLAN_PNG} />;
}

export function renderAssetIcon(type: ObjectType, props: IconProps) {
  switch (type) {
    case "trenchCross":
      return <TrenchCrossIcon {...props} />;
    case "trenchPlan":
      return <TrenchPlanIcon {...props} />;
    case "excavatorSide":
      return <ExcavatorSideIcon {...props} />;
    case "excavatorTop":
      return <ExcavatorTopIcon {...props} />;
    case "truckTop":
      return <TruckTopIcon {...props} />;
    case "spoilPile":
      return <SpoilPileIcon {...props} />;
    case "ladder":
      return <LadderIcon {...props} />;
    case "barrier":
      return <BarrierIcon {...props} />;
    case "sheetPile":
      return <SheetPileIcon {...props} />;
    case "trenchBox":
      return <TrenchBoxIcon {...props} />;
    case "pipe":
      return <PipeIcon {...props} />;
    case "escapeRoute":
      return <EscapeRouteIcon {...props} />;
    default:
      return null;
  }
}

