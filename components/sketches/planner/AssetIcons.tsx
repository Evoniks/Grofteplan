"use client";

import type { ReactNode } from "react";

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
  | "pipe"
  | "escapeRoute";

type IconProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  rotation?: number;
};

function IconFrame({ children, x, y, width, height, rotation = 0 }: IconProps & { children: ReactNode }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={y + height + 6} rx={width * 0.38} ry={Math.max(4, height * 0.06)} fill="#0f172a1f" />
      {children}
    </g>
  );
}

export function TrenchCrossIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <defs>
        <linearGradient id={`trench-cross-${x}-${y}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>
      <polygon
        points={`${x + width * 0.16},${y + height * 0.04} ${x + width * 0.84},${y + height * 0.04} ${x + width * 0.63},${y + height * 0.95} ${x + width * 0.37},${y + height * 0.95}`}
        fill={`url(#trench-cross-${x}-${y})`}
        stroke="#0f172a"
        strokeWidth={2.5}
      />
    </IconFrame>
  );
}

export function TrenchPlanIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x} y={y} width={width} height={height} rx={12} fill="#bfdbfe" stroke="#0f172a" strokeWidth={2.5} />
      <line x1={x + 8} y1={y + height / 2} x2={x + width - 8} y2={y + height / 2} stroke="#60a5fa" strokeWidth={2} strokeDasharray="8 6" />
      <line x1={x + 8} y1={y + height * 0.26} x2={x + width - 8} y2={y + height * 0.26} stroke="#ffffff90" strokeWidth={2} />
    </IconFrame>
  );
}

export function ExcavatorSideIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x + width * 0.09} y={y + height * 0.18} width={width * 0.36} height={height * 0.38} fill="#f59e0b" stroke="#111827" strokeWidth={2} />
      <rect x={x + width * 0.16} y={y + height * 0.57} width={width * 0.54} height={height * 0.2} fill="#475569" stroke="#111827" strokeWidth={2} />
      <rect x={x + width * 0.32} y={y + height * 0.24} width={width * 0.12} height={height * 0.22} fill="#93c5fd" stroke="#1f2937" strokeWidth={1.5} />
      <line x1={x + width * 0.47} y1={y + height * 0.24} x2={x + width * 0.83} y2={y + height * 0.08} stroke="#374151" strokeWidth={5} />
      <line x1={x + width * 0.83} y1={y + height * 0.08} x2={x + width * 0.95} y2={y + height * 0.16} stroke="#374151" strokeWidth={5} />
      <line x1={x + width * 0.13} y1={y + height * 0.26} x2={x + width * 0.41} y2={y + height * 0.26} stroke="#ffffff95" strokeWidth={2} />
      <circle cx={x + width * 0.26} cy={y + height * 0.79} r={height * 0.08} fill="#0f172a" />
      <circle cx={x + width * 0.56} cy={y + height * 0.79} r={height * 0.08} fill="#0f172a" />
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
    <IconFrame {...props}>
      <ellipse cx={x + width / 2} cy={y + height * 0.72} rx={width * 0.48} ry={height * 0.3} fill="#b08968" stroke="#3f3f46" strokeWidth={2} />
      <ellipse cx={x + width / 2} cy={y + height * 0.62} rx={width * 0.35} ry={height * 0.16} fill="#ffffff33" />
    </IconFrame>
  );
}

export function SpoilPileLongIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x} y={y + height * 0.24} width={width} height={height * 0.56} rx={height * 0.25} fill="#b08968" stroke="#3f3f46" strokeWidth={2} />
      <line x1={x + width * 0.08} y1={y + height * 0.36} x2={x + width * 0.9} y2={y + height * 0.36} stroke="#ffffff40" strokeWidth={2} />
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
      <rect x={x} y={y + height * 0.28} width={width * 0.78} height={height * 0.44} rx={6} fill="#22c55e" stroke="#14532d" strokeWidth={2} />
      <polygon points={`${x + width * 0.78},${y + height * 0.5} ${x + width * 0.58},${y + height * 0.34} ${x + width * 0.58},${y + height * 0.66}`} fill="#14532d" />
      <line x1={x + width * 0.08} y1={y + height * 0.4} x2={x + width * 0.52} y2={y + height * 0.4} stroke="#bbf7d0" strokeWidth={2} />
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
    case "pipe":
      return <PipeIcon {...props} />;
    case "escapeRoute":
      return <EscapeRouteIcon {...props} />;
    default:
      return null;
  }
}

