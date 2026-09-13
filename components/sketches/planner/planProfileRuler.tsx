"use client";

import type { CanvasObjectData } from "@/components/sketches/planner/CanvasObject";

export type PlanProfileRulerLabeling = "profile" | "chainage";
export type PlanProfileRulerEndMode = "trenchLength" | "manualProfileEnd";

export type PlanProfileRulerState = {
  show: boolean;
  labeling: PlanProfileRulerLabeling;
  /** Profilnummer ved venstre ende (venst i grøftas lengderetning). Ignorert i kjettingsmodus. */
  startProfile: number;
  /** Heile meter mellom hovudmerke (t.d. 10 → 850, 860, …). */
  intervalMeters: number;
  endMode: PlanProfileRulerEndMode;
  /** Når slutt = eigen verdi (profilmodus). */
  endProfile: number;
  /** Piksel opp frå grøftas overkant (mindre Y i SVG). */
  offsetAboveTrenchPx: number;
};

export const defaultPlanProfileRulerState = (): PlanProfileRulerState => ({
  show: false,
  labeling: "profile",
  startProfile: 847.5,
  intervalMeters: 10,
  endMode: "trenchLength",
  endProfile: 902.4,
  offsetAboveTrenchPx: 40
});

function trenchLengthMeters(trench: CanvasObjectData, gridUnit: number): number {
  return Math.max(0.01, trench.width / gridUnit);
}

function rulerValueRange(
  trench: CanvasObjectData,
  gridUnit: number,
  cfg: PlanProfileRulerState
): { start: number; end: number } | null {
  const L = trenchLengthMeters(trench, gridUnit);
  if (cfg.labeling === "chainage") {
    return { start: 0, end: L };
  }
  const start = cfg.startProfile;
  let end: number;
  if (cfg.endMode === "trenchLength") {
    end = start + L;
  } else {
    end = cfg.endProfile;
  }
  if (!(end > start)) return null;
  return { start, end };
}

function formatLabel(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  return r.toFixed(1).replace(".", ",");
}

function collectTickValues(start: number, end: number, interval: number): number[] {
  const iv = Math.max(1, interval);
  const ticks: number[] = [];
  const seen = new Set<number>();
  const add = (v: number) => {
    const k = Math.round(v * 1e6);
    if (seen.has(k)) return;
    seen.add(k);
    ticks.push(v);
  };
  add(start);
  let v = Math.ceil((start + 1e-9) / iv) * iv;
  while (v < end - 1e-6) {
    add(v);
    v += iv;
  }
  add(end);
  return ticks.sort((a, b) => a - b);
}

function xForValue(v: number, start: number, end: number, trench: CanvasObjectData): number {
  const span = end - start;
  if (span <= 0) return trench.x;
  return trench.x + ((v - start) / span) * trench.width;
}

export function planProfileRulerSvgMarkup(
  trench: CanvasObjectData | undefined,
  cfg: PlanProfileRulerState | undefined,
  gridUnit: number
): string {
  if (!cfg?.show || !trench || trench.type !== "trenchPlan") return "";
  const range = rulerValueRange(trench, gridUnit, cfg);
  if (!range) return "";
  const { start, end } = range;
  const ticks = collectTickValues(start, end, cfg.intervalMeters);
  const cx = trench.x + trench.width / 2;
  const cy = trench.y + trench.height / 2;
  const rot = trench.rotation ?? 0;
  const yLine = trench.y - cfg.offsetAboveTrenchPx;
  const tickHMajor = 12;
  const tickHMinor = 7;
  const inner = ticks
    .map((val) => {
      const wx = xForValue(val, start, end, trench);
      const isEnd = Math.abs(val - end) < 1e-5;
      const isStart = Math.abs(val - start) < 1e-5;
      const isMajor = !isStart && !isEnd;
      const h = isMajor ? tickHMajor : tickHMinor;
      const label = formatLabel(val);
      return `
        <line x1="${wx}" y1="${yLine}" x2="${wx}" y2="${yLine - h}" stroke="#1e293b" stroke-width="${isMajor ? 1.35 : 1}" />
        <text x="${wx}" y="${yLine - h - 5}" text-anchor="middle" fill="#0f172a" font-size="11" font-family="system-ui,Segoe UI,Arial,sans-serif">${label}</text>
      `;
    })
    .join("");
  return `
    <g transform="rotate(${rot} ${cx} ${cy})">
      <line x1="${trench.x}" y1="${yLine}" x2="${trench.x + trench.width}" y2="${yLine}" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      <line x1="${trench.x}" y1="${yLine - 4}" x2="${trench.x}" y2="${yLine + 4}" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      <line x1="${trench.x + trench.width}" y1="${yLine - 4}" x2="${trench.x + trench.width}" y2="${yLine + 4}" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      ${inner}
    </g>
  `;
}

type SvgProps = {
  trench: CanvasObjectData | undefined;
  cfg: PlanProfileRulerState | undefined;
  gridUnit: number;
};

/** Profil-/kjettingslinje i plan, følgjer grøfta (rotasjon og lengde). */
export function PlanProfileRulerLayer({ trench, cfg, gridUnit }: SvgProps) {
  if (!cfg?.show || !trench || trench.type !== "trenchPlan") return null;
  const range = rulerValueRange(trench, gridUnit, cfg);
  if (!range) return null;
  const { start, end } = range;
  const ticks = collectTickValues(start, end, cfg.intervalMeters);
  const cx = trench.x + trench.width / 2;
  const cy = trench.y + trench.height / 2;
  const rot = trench.rotation ?? 0;
  const yLine = trench.y - cfg.offsetAboveTrenchPx;
  const tickHMajor = 12;
  const tickHMinor = 7;

  return (
    <g className="pointer-events-none" aria-hidden="true">
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <line
          x1={trench.x}
          y1={yLine}
          x2={trench.x + trench.width}
          y2={yLine}
          stroke="#334155"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={trench.x}
          y1={yLine - 4}
          x2={trench.x}
          y2={yLine + 4}
          stroke="#334155"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={trench.x + trench.width}
          y1={yLine - 4}
          x2={trench.x + trench.width}
          y2={yLine + 4}
          stroke="#334155"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {ticks.map((val) => {
          const wx = xForValue(val, start, end, trench);
          const isEnd = Math.abs(val - end) < 1e-5;
          const isStart = Math.abs(val - start) < 1e-5;
          const isMajor = !isStart && !isEnd;
          const h = isMajor ? tickHMajor : tickHMinor;
          return (
            <g key={`${val}`}>
              <line x1={wx} y1={yLine} x2={wx} y2={yLine - h} stroke="#1e293b" strokeWidth={isMajor ? 1.35 : 1} />
              <text
                x={wx}
                y={yLine - h - 5}
                textAnchor="middle"
                fill="#0f172a"
                fontSize={11}
                style={{ fontFamily: "system-ui, Segoe UI, Arial, sans-serif" }}
              >
                {formatLabel(val)}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}
