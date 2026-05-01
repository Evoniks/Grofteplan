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
  const slope = Math.max(0.4, Math.min(2, meta?.slopeRatio ?? 1));
  const topInset = Math.max(width * 0.02, Math.min(width * 0.32, width * (0.34 - slope * 0.1)));
  return (
    <IconFrame {...props}>
      <defs>
        <linearGradient id={`trench-cross-${x}-${y}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>
      <polygon
        points={`${x + topInset},${y + height * 0.04} ${x + width - topInset},${y + height * 0.04} ${x + width * 0.63},${y + height * 0.95} ${x + width * 0.37},${y + height * 0.95}`}
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
  return (
    <IconFrame {...props}>
      <rect x={x + width * 0.08} y={y + height * 0.56} width={width * 0.66} height={height * 0.24} rx={height * 0.08} fill="#1f2937" stroke="#0f172a" strokeWidth={2} />
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1={x + width * 0.11 + i * (width * 0.075)}
          y1={y + height * 0.585}
          x2={x + width * 0.11 + i * (width * 0.075)}
          y2={y + height * 0.78}
          stroke="#64748b"
          strokeWidth={1.5}
        />
      ))}
      <rect x={x + width * 0.14} y={y + height * 0.19} width={width * 0.4} height={height * 0.34} rx={6} fill="#f59e0b" stroke="#111827" strokeWidth={2} />
      <rect x={x + width * 0.31} y={y + height * 0.25} width={width * 0.16} height={height * 0.21} fill="#93c5fd" stroke="#1f2937" strokeWidth={1.5} />
      <rect x={x + width * 0.25} y={y + height * 0.13} width={width * 0.12} height={height * 0.06} rx={4} fill="#f59e0b" stroke="#111827" strokeWidth={2} />
      <line x1={x + width * 0.54} y1={y + height * 0.27} x2={x + width * 0.84} y2={y + height * 0.1} stroke="#374151" strokeWidth={6} />
      <line x1={x + width * 0.84} y1={y + height * 0.1} x2={x + width * 0.96} y2={y + height * 0.2} stroke="#374151" strokeWidth={5} />
      <path d={`M ${x + width * 0.97} ${y + height * 0.2} Q ${x + width * 0.995} ${y + height * 0.26} ${x + width * 0.95} ${y + height * 0.29}`} fill="none" stroke="#374151" strokeWidth={4} />
      <path d={`M ${x + width * 0.95} ${y + height * 0.29} L ${x + width * 0.985} ${y + height * 0.33} L ${x + width * 0.93} ${y + height * 0.36} Z`} fill="#334155" stroke="#0f172a" strokeWidth={1.5} />
      <line x1={x + width * 0.13} y1={y + height * 0.26} x2={x + width * 0.41} y2={y + height * 0.26} stroke="#ffffff95" strokeWidth={2} />
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
      <rect x={x + width * 0.18} y={y + height * 0.06} width={width * 0.14} height={height * 0.88} fill="#334155" stroke="#0f172a" strokeWidth={2} />
      <rect x={x + width * 0.68} y={y + height * 0.06} width={width * 0.14} height={height * 0.88} fill="#334155" stroke="#0f172a" strokeWidth={2} />
      <line x1={x + width * 0.32} y1={y + height * 0.2} x2={x + width * 0.68} y2={y + height * 0.2} stroke="#64748b" strokeWidth={4} />
      <line x1={x + width * 0.32} y1={y + height * 0.48} x2={x + width * 0.68} y2={y + height * 0.48} stroke="#64748b" strokeWidth={4} />
      <line x1={x + width * 0.32} y1={y + height * 0.76} x2={x + width * 0.68} y2={y + height * 0.76} stroke="#64748b" strokeWidth={4} />
    </IconFrame>
  );
}

export function TrenchBoxIcon(props: IconProps) {
  const { x, y, width, height } = props;
  return (
    <IconFrame {...props}>
      <rect x={x + width * 0.12} y={y + height * 0.12} width={width * 0.76} height={height * 0.76} fill="none" stroke="#7c3aed" strokeWidth={6} />
      <line x1={x + width * 0.12} y1={y + height * 0.34} x2={x + width * 0.88} y2={y + height * 0.34} stroke="#a78bfa" strokeWidth={4} />
      <line x1={x + width * 0.12} y1={y + height * 0.66} x2={x + width * 0.88} y2={y + height * 0.66} stroke="#a78bfa" strokeWidth={4} />
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

