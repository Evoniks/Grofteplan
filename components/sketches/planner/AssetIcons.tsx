"use client";

import type { ReactNode } from "react";
import { getTrenchCrossCorners } from "@/components/sketches/planner/trenchCrossGeometry";

export type ObjectType =
  | "trenchCross"
  | "trenchPlan"
  | "excavatorSide"
  | "excavatorTop"
  | "truckTop"
  | "spoilPile"
  | "spoilPileLong"
  | "ladder"
  | "barrier"
  | "sheetPile"
  | "trenchBox"
  | "pipe"
  | "escapeRoute";

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
  const { x, y, width, height } = props;
  const w = width;
  const h = height;
  const gx = (px: number) => x + w * px;
  const gy = (py: number) => y + h * py;
  const m = Math.min(w, h);
  const outline = Math.max(1.5, m * 0.014);
  const jointR = m * 0.038;
  /* Sideprofil: venstre=bak (klosett), høgre=fram/bom. Brøkar = andel av ikonboks (matcher skala når 1 rute på canvas = 1 m). */
  const DECK_LEFT = 0.12; // nedkant motorhus / overbygg (ikkje utanpå belte)
  const DECK_RIGHT = 0.38;
  const CAB_LEFT = 0.175; // framkant maskin — på gult dekk, ikkje over klosett
  const CAB_RIGHT = 0.318;
  const CAB_TOP = 0.35;
  const CAB_FLOOR = 0.718;
  const SWING_CX = (DECK_LEFT + DECK_RIGHT) / 2 + 0.02; // litt mot fram for bomfeste
  const SWING_CY = 0.72;
  /* Fylte ledd-armar, belte, skuffe — proporsjonar ~11,5×5 m i boksen */
  return (
    <IconFrame {...props}>
      <ellipse cx={gx(0.48)} cy={gy(0.93)} rx={w * 0.42} ry={h * 0.04} fill="#0f172a18" />
      {/* Belter: ytre ramme + indre skygge + kjettingstreker + drev foran/bak */}
      <path
        d={`M ${gx(0.035)} ${gy(0.795)} L ${gx(0.05)} ${gy(0.765)} L ${gx(0.495)} ${gy(0.765)} L ${gx(0.515)} ${gy(0.795)} L ${gx(0.515)} ${gy(0.885)} L ${gx(0.495)} ${gy(0.905)} L ${gx(0.05)} ${gy(0.905)} L ${gx(0.03)} ${gy(0.885)} Z`}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <path
        d={`M ${gx(0.065)} ${gy(0.785)} L ${gx(0.485)} ${gy(0.785)} L ${gx(0.495)} ${gy(0.875)} L ${gx(0.055)} ${gy(0.875)} Z`}
        fill="#0f172a33"
      />
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`tread-${i}`}
          x1={gx(0.07 + i * 0.048)}
          y1={gy(0.792)}
          x2={gx(0.07 + i * 0.048)}
          y2={gy(0.888)}
          stroke="#334155"
          strokeWidth={Math.max(1, m * 0.012)}
        />
      ))}
      <circle cx={gx(0.075)} cy={gy(0.835)} r={m * 0.048} fill="#292f3d" stroke="#0f172a" strokeWidth={outline * 0.8} />
      <circle cx={gx(0.475)} cy={gy(0.835)} r={m * 0.048} fill="#292f3d" stroke="#0f172a" strokeWidth={outline * 0.8} />
      <circle cx={gx(0.075)} cy={gy(0.835)} r={m * 0.022} fill="#475569" />
      <circle cx={gx(0.475)} cy={gy(0.835)} r={m * 0.022} fill="#475569" />
      {/* Motorklosett / mot bak */}
      <path
        d={`M ${gx(0.06)} ${gy(0.72)} L ${gx(0.14)} ${gy(0.72)} L ${gx(0.14)} ${gy(0.52)} L ${gx(0.07)} ${gy(0.5)} Z`}
        fill="#ca8a04"
        stroke="#111827"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      {/* Hovedkropp + motordekk */}
      <path
        d={`M ${gx(0.12)} ${gy(0.72)} L ${gx(0.38)} ${gy(0.72)} L ${gx(0.405)} ${gy(0.455)} L ${gx(0.125)} ${gy(0.415)} Z`}
        fill="#f59e0b"
        stroke="#111827"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <line x1={gx(0.22)} y1={gy(0.495)} x2={gx(0.36)} y2={gy(0.515)} stroke="#111827" strokeWidth={outline * 0.9} />
      <line x1={gx(0.22)} y1={gy(0.555)} x2={gx(0.36)} y2={gy(0.575)} stroke="#111827" strokeWidth={outline * 0.9} />
      <line x1={gx(0.22)} y1={gy(0.615)} x2={gx(0.36)} y2={gy(0.635)} stroke="#111827" strokeWidth={outline * 0.9} />
      {/* Dekkplate = same breidd som motorhus nedkant (DECK_LEFT–DECK_RIGHT), ikkje ut over belte */}
      <rect
        x={gx(DECK_LEFT)}
        y={gy(0.698)}
        width={w * (DECK_RIGHT - DECK_LEFT)}
        height={h * 0.026}
        rx={h * 0.012}
        fill="#fbbf24"
        stroke="#111827"
        strokeWidth={outline * 0.75}
      />
      {/* Svingkrans (midt framfor bak på dekk) */}
      <ellipse cx={gx(SWING_CX)} cy={gy(SWING_CY)} rx={w * 0.055} ry={h * 0.022} fill="#d97706" stroke="#111827" strokeWidth={outline * 0.85} />
      {/* Førerhus på framkant av overbygg — innanfor [DECK_LEFT,DECK_RIGHT], venstre for bomfeste */}
      <path
        d={`M ${gx(CAB_LEFT)} ${gy(CAB_FLOOR)} L ${gx(CAB_LEFT)} ${gy(CAB_TOP)} L ${gx(CAB_RIGHT)} ${gy(CAB_TOP)} L ${gx(CAB_RIGHT)} ${gy(CAB_FLOOR)} Z`}
        fill="#eab308"
        stroke="#111827"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <rect
        x={gx(CAB_LEFT + 0.02)}
        y={gy(CAB_TOP + 0.05)}
        width={w * 0.1}
        height={h * 0.13}
        rx={2}
        fill="#bfdbfe"
        stroke="#1e3a5f"
        strokeWidth={outline * 0.6}
      />
      <rect
        x={gx(CAB_RIGHT - 0.045)}
        y={gy(CAB_TOP + 0.07)}
        width={w * 0.028}
        height={h * 0.095}
        rx={1}
        fill="#93c5fd"
        stroke="#1e3a5f"
        strokeWidth={outline * 0.5}
      />
      <line
        x1={gx(CAB_LEFT + 0.008)}
        y1={gy(0.715)}
        x2={gx(CAB_RIGHT - 0.008)}
        y2={gy(0.715)}
        stroke="#ca8a04"
        strokeWidth={outline * 0.5}
        opacity={0.85}
      />
      {/* Bom: tjukk fylt firkantring (ikkje stroke-boge) */}
      <path
        d={`M ${gx(0.335)} ${gy(0.695)} L ${gx(0.395)} ${gy(0.655)} L ${gx(0.735)} ${gy(0.095)} L ${gx(0.695)} ${gy(0.125)} Z`}
        fill="#ca8a04"
        stroke="#111827"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <path
        d={`M ${gx(0.345)} ${gy(0.685)} L ${gx(0.385)} ${gy(0.66)} L ${gx(0.715)} ${gy(0.115)} L ${gx(0.705)} ${gy(0.12)} Z`}
        fill="#fde04755"
      />
      {/* Bom-sylinder (stempel + foring) */}
      <line x1={gx(0.2)} y1={gy(0.665)} x2={gx(0.52)} y2={gy(0.32)} stroke="#1f2937" strokeWidth={m * 0.055} strokeLinecap="round" />
      <line x1={gx(0.22)} y1={gy(0.64)} x2={gx(0.5)} y2={gy(0.34)} stroke="#94a3b8" strokeWidth={m * 0.028} strokeLinecap="round" />
      {/* Albue-ledd */}
      <circle cx={gx(0.715)} cy={gy(0.11)} r={jointR} fill="#57534e" stroke="#111827" strokeWidth={outline} />
      <circle cx={gx(0.715)} cy={gy(0.11)} r={jointR * 0.45} fill="#a8a29e" />
      {/* Stikkarm */}
      <path
        d={`M ${gx(0.695)} ${gy(0.13)} L ${gx(0.74)} ${gy(0.085)} L ${gx(0.895)} ${gy(0.575)} L ${gx(0.855)} ${gy(0.595)} Z`}
        fill="#ca8a04"
        stroke="#111827"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <path
        d={`M ${gx(0.705)} ${gy(0.125)} L ${gx(0.73)} ${gy(0.095)} L ${gx(0.875)} ${gy(0.565)} L ${gx(0.865)} ${gy(0.57)} Z`}
        fill="#fde04744"
      />
      {/* Stikk-sylinder */}
      <line x1={gx(0.62)} y1={gy(0.22)} x2={gx(0.78)} y2={gy(0.42)} stroke="#1f2937" strokeWidth={m * 0.042} strokeLinecap="round" />
      <line x1={gx(0.64)} y1={gy(0.25)} x2={gx(0.76)} y2={gy(0.39)} stroke="#94a3b8" strokeWidth={m * 0.02} strokeLinecap="round" />
      {/* Skuffe med bunnkurve og tenner */}
      <path
        d={`M ${gx(0.84)} ${gy(0.56)} L ${gx(0.975)} ${gy(0.6)} L ${gx(0.955)} ${gy(0.72)} Q ${gx(0.9)} ${gy(0.9)} ${gx(0.815)} ${gy(0.895)} L ${gx(0.795)} ${gy(0.68)} Z`}
        fill="#374151"
        stroke="#0f172a"
        strokeWidth={outline}
        strokeLinejoin="round"
      />
      <path
        d={`M ${gx(0.825)} ${gy(0.885)} L ${gx(0.865)} ${gy(0.895)} L ${gx(0.905)} ${gy(0.902)} L ${gx(0.935)} ${gy(0.898)}`}
        fill="none"
        stroke="#0f172a"
        strokeWidth={outline * 1.1}
        strokeLinecap="square"
      />
      {[
        [0.835, 0.888],
        [0.87, 0.895],
        [0.905, 0.9],
        [0.935, 0.896],
      ].map(([px, py], i) => (
        <path
          key={`tooth-${i}`}
          d={`M ${gx(px)} ${gy(py)} L ${gx(px + 0.012)} ${gy(py + 0.035)} L ${gx(px - 0.01)} ${gy(py + 0.03)} Z`}
          fill="#1f2937"
          stroke="#0f172a"
          strokeWidth={outline * 0.5}
        />
      ))}
      <ellipse cx={gx(0.93)} cy={gy(0.915)} rx={w * 0.035} ry={h * 0.022} fill="#0f172a22" />
      {/* Eksos */}
      <rect x={gx(0.275)} y={gy(0.375)} width={w * 0.075} height={h * 0.048} rx={2} fill="#f59e0b" stroke="#111827" strokeWidth={outline * 0.7} />
      <line x1={gx(0.31)} y1={gy(0.375)} x2={gx(0.31)} y2={gy(0.305)} stroke="#111827" strokeWidth={outline * 1.1} />
      <line x1={gx(0.14)} y1={gy(0.45)} x2={gx(0.28)} y2={gy(0.465)} stroke="#ffffff85" strokeWidth={outline * 1.2} />
    </IconFrame>
  );
}

export function ExcavatorTopIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x + width * 0.04} y={y + height * 0.08} width={width * 0.2} height={height * 0.84} fill="#111827" />
      <rect x={x + width * 0.62} y={y + height * 0.08} width={width * 0.2} height={height * 0.84} fill="#111827" />
      <rect x={x + width * 0.24} y={y + height * 0.18} width={width * 0.42} height={height * 0.64} fill="#f59e0b" stroke="#111827" strokeWidth={2} />
      <rect x={x + width * 0.34} y={y + height * 0.26} width={width * 0.16} height={height * 0.48} fill="#bfdbfe" stroke="#1f2937" strokeWidth={1.5} />
      <line x1={x + width * 0.28} y1={y + height * 0.28} x2={x + width * 0.6} y2={y + height * 0.28} stroke="#fff" strokeWidth={1.7} />
      <polygon points={`${x + width * 0.9},${y + height * 0.5} ${x + width * 0.76},${y + height * 0.4} ${x + width * 0.76},${y + height * 0.6}`} fill="#111827" />
    </IconFrame>
  );
}

export function TruckTopIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x} y={y + height * 0.16} width={width * 0.68} height={height * 0.68} fill="#60a5fa" stroke="#111827" strokeWidth={2} />
      <rect x={x + width * 0.7} y={y + height * 0.24} width={width * 0.24} height={height * 0.52} fill="#fb923c" stroke="#7c2d12" strokeWidth={2} />
      <rect x={x + width * 0.74} y={y + height * 0.32} width={width * 0.13} height={height * 0.36} fill="#bfdbfe" stroke="#1f2937" strokeWidth={1.2} />
      <line x1={x + width * 0.04} y1={y + height * 0.26} x2={x + width * 0.62} y2={y + height * 0.26} stroke="#fff" strokeWidth={1.6} />
    </IconFrame>
  );
}

export function SpoilPileIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props} withShadow={false}>
      <polygon
        points={`${x + width * 0.36},${y + height * 0.06} ${x + width * 0.64},${y + height * 0.06} ${x + width * 0.86},${y + height * 0.94} ${x + width * 0.14},${y + height * 0.94}`}
        fill="#b08968"
        stroke="#3f3f46"
        strokeWidth={2}
      />
    </IconFrame>
  );
}

export function SpoilPileLongIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props} withShadow={false}>
      <polygon
        points={`${x + width * 0.18},${y + height * 0.06} ${x + width * 0.82},${y + height * 0.06} ${x + width * 0.96},${y + height * 0.94} ${x + width * 0.04},${y + height * 0.94}`}
        fill="#b08968"
        stroke="#3f3f46"
        strokeWidth={2}
      />
    </IconFrame>
  );
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
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      {/* Spunt: to tynne, vertikale elementer uten tverrliggere */}
      <rect x={x + width * 0.16} y={y + height * 0.06} width={width * 0.08} height={height * 0.88} fill="#334155" stroke="#0f172a" strokeWidth={2} />
      <rect x={x + width * 0.76} y={y + height * 0.06} width={width * 0.08} height={height * 0.88} fill="#334155" stroke="#0f172a" strokeWidth={2} />
    </IconFrame>
  );
}

export function TrenchBoxIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      {/* Grøftekasse: samme prinsipp, men kraftigere enn spunt */}
      <rect x={x + width * 0.14} y={y + height * 0.08} width={width * 0.12} height={height * 0.84} fill="#7c3aed" stroke="#4c1d95" strokeWidth={2} />
      <rect x={x + width * 0.74} y={y + height * 0.08} width={width * 0.12} height={height * 0.84} fill="#7c3aed" stroke="#4c1d95" strokeWidth={2} />
      <line x1={x + width * 0.26} y1={y + height * 0.22} x2={x + width * 0.74} y2={y + height * 0.22} stroke="#a78bfa" strokeWidth={4} />
      <line x1={x + width * 0.26} y1={y + height * 0.78} x2={x + width * 0.74} y2={y + height * 0.78} stroke="#a78bfa" strokeWidth={4} />
    </IconFrame>
  );
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
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <line x1={x + width * 0.24} y1={y + height * 0.18} x2={x + width * 0.14} y2={y + height * 0.86} stroke="#14532d" strokeWidth={4} />
      <line x1={x + width * 0.64} y1={y + height * 0.18} x2={x + width * 0.54} y2={y + height * 0.86} stroke="#14532d" strokeWidth={4} />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={x + width * 0.16}
          y1={y + height * (0.36 + i * 0.16)}
          x2={x + width * 0.58}
          y2={y + height * (0.36 + i * 0.16)}
          stroke="#22c55e"
          strokeWidth={4}
        />
      ))}
      <polygon points={`${x + width * 0.92},${y + height * 0.55} ${x + width * 0.7},${y + height * 0.38} ${x + width * 0.7},${y + height * 0.72}`} fill="#14532d" />
    </IconFrame>
  );
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
    case "spoilPileLong":
      return <SpoilPileLongIcon {...props} />;
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

