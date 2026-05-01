"use client";

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

export function CrossSectionSketch({
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
  const d = Math.max(depth, 0.5);
  const bw = Math.max(bottomWidth, 0.3);
  const tw = Math.max(topWidth, bw);
  const safeMassDistance = Math.max(massDistance, 0);
  const slopeRule = method === "skrå gravesider" ? (d <= 2 ? "Dybde x 0,5 (ca. 63°)" : "Dybde x 0,75 (ca. 53°)") : "Avstivet grøft";
  const maxDepth = 3.5;
  const maxTopWidth = 4.5;
  const trenchCenterX = 450;
  const groundY = 108;
  const trenchDepthPx = 70 + (Math.min(d, maxDepth) / maxDepth) * 92;
  const topWidthPx = 200 + (Math.min(tw, maxTopWidth) / maxTopWidth) * 190;
  const bottomWidthPx = Math.max(90, topWidthPx * Math.min(0.82, bw / tw));
  const topLeftX = trenchCenterX - topWidthPx / 2;
  const topRightX = trenchCenterX + topWidthPx / 2;
  const bottomLeftX = trenchCenterX - bottomWidthPx / 2;
  const bottomRightX = trenchCenterX + bottomWidthPx / 2;
  const bottomY = groundY + trenchDepthPx;
  const massOffsetPx = Math.min(160, safeMassDistance * 70);
  const massesX = Math.min(790, topRightX + 28 + massOffsetPx);
  const ladderX = bottomRightX - 36;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <svg viewBox="0 0 900 380" className="w-full">
        <defs>
          <linearGradient id="soilGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="trenchGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
        </defs>

        <rect x="20" y="54" width="860" height="306" fill="url(#soilGradient)" rx="8" />
        <line x1="40" y1={groundY} x2="860" y2={groundY} stroke="#334155" strokeWidth="2.5" />
        <text x="48" y="76" fill="#334155" fontSize="14">
          {terrainLabel}
        </text>

        <rect x="58" y="62" width="146" height="32" rx="6" fill="#f59e0b" opacity="0.14" />
        <text x="70" y="82" fill="#7c2d12" fontSize="12">
          Arbeidsområde
        </text>

        <polygon
          points={`${topLeftX},${groundY} ${topRightX},${groundY} ${bottomRightX},${bottomY} ${bottomLeftX},${bottomY}`}
          fill="url(#trenchGradient)"
          stroke="#1e3a8a"
          strokeWidth="2.5"
        />

        <rect x={topLeftX - 24} y={groundY - 12} width="54" height="12" fill="#475569" rx="2" />
        <rect x={topLeftX - 34} y={groundY - 30} width="38" height="20" fill="#64748b" rx="3" />
        <circle cx={topLeftX - 14} cy={groundY + 4} r="8" fill="#0f172a" />
        <circle cx={topLeftX + 20} cy={groundY + 4} r="8" fill="#0f172a" />
        <line x1={topLeftX + 2} y1={groundY - 30} x2={topLeftX + 46} y2={groundY - 50} stroke="#475569" strokeWidth="4" />
        <line x1={topLeftX + 46} y1={groundY - 50} x2={topLeftX + 72} y2={groundY - 42} stroke="#475569" strokeWidth="4" />
        <polygon points={`${topLeftX + 72},${groundY - 42} ${topLeftX + 86},${groundY - 34} ${topLeftX + 66},${groundY - 28}`} fill="#475569" />
        <text x={topLeftX - 44} y={groundY - 58} fill="#334155" fontSize="11">
          Gravemaskin
        </text>

        <rect x={massesX - 54} y={groundY - 20} width="92" height="22" rx="3" fill="#f59e0b" />
        <rect x={massesX + 32} y={groundY - 16} width="26" height="18" rx="2" fill="#fb923c" />
        <circle cx={massesX - 32} cy={groundY + 2} r="7" fill="#1f2937" />
        <circle cx={massesX + 18} cy={groundY + 2} r="7" fill="#1f2937" />
        <circle cx={massesX + 44} cy={groundY + 2} r="7" fill="#1f2937" />
        <text x={massesX - 52} y={groundY - 28} fill="#7c2d12" fontSize="11">
          Lastebil/masser
        </text>

        <line x1={ladderX} y1={groundY} x2={ladderX} y2={bottomY - 4} stroke="#b45309" strokeWidth="4" />
        <line x1={ladderX - 14} y1={groundY + 22} x2={ladderX + 14} y2={groundY + 22} stroke="#b45309" strokeWidth="2" />
        <line x1={ladderX - 14} y1={groundY + 42} x2={ladderX + 14} y2={groundY + 42} stroke="#b45309" strokeWidth="2" />
        <line x1={ladderX - 14} y1={groundY + 62} x2={ladderX + 14} y2={groundY + 62} stroke="#b45309" strokeWidth="2" />
        <line x1={ladderX - 14} y1={groundY + 82} x2={ladderX + 14} y2={groundY + 82} stroke="#b45309" strokeWidth="2" />
        <line x1={ladderX - 14} y1={groundY + 102} x2={ladderX + 14} y2={groundY + 102} stroke="#b45309" strokeWidth="2" />
        <text x={ladderX + 16} y={bottomY - 8} fill="#92400e" fontSize="11">
          Stige
        </text>

        {pipeSymbol === "sirkel" && <circle cx={trenchCenterX} cy={bottomY - 46} r="10" fill="#475569" />}
        {pipeSymbol === "trekant" && <polygon points={`${trenchCenterX},${bottomY - 56} ${trenchCenterX - 10},${bottomY - 36} ${trenchCenterX + 10},${bottomY - 36}`} fill="#475569" />}
        {pipeSymbol === "firkant" && <rect x={trenchCenterX - 9} y={bottomY - 53} width="18" height="18" fill="#475569" />}
        <text x={trenchCenterX + 18} y={bottomY - 38} fill="#1e293b" fontSize="13">
          {pipeLabel}
        </text>

        {massesSymbol === "sirkel" && <circle cx={massesX - 6} cy={groundY - 10} r="9" fill="#f59e0b" />}
        {massesSymbol === "trekant" && <polygon points={`${massesX - 6},${groundY - 18} ${massesX - 16},${groundY - 2} ${massesX + 4},${groundY - 2}`} fill="#f59e0b" />}
        {massesSymbol === "firkant" && <rect x={massesX - 24} y={groundY - 20} width="36" height="18" fill="#f59e0b" />}
        <text x={massesX + 10} y={groundY + 10} fill="#111827" fontSize="12">
          {massesLabel}
        </text>

        <line x1={bottomLeftX} y1={bottomY + 22} x2={bottomRightX} y2={bottomY + 22} stroke="#64748b" strokeDasharray="4 4" />
        <text x={bottomLeftX + 6} y={bottomY + 40} fill="#334155" fontSize="12">
          Bredde bunn: {bw.toFixed(2)} m
        </text>

        <line x1={topLeftX} y1={groundY + 12} x2={topRightX} y2={groundY + 12} stroke="#64748b" strokeDasharray="4 4" />
        <text x={topLeftX + 6} y={groundY + 30} fill="#334155" fontSize="12">
          Bredde topp: {tw.toFixed(2)} m
        </text>

        <line x1={topLeftX - 36} y1={groundY} x2={topLeftX - 36} y2={bottomY} stroke="#ef4444" strokeWidth="2" />
        <line x1={topLeftX - 40} y1={groundY} x2={topLeftX - 32} y2={groundY} stroke="#ef4444" strokeWidth="2" />
        <line x1={topLeftX - 40} y1={bottomY} x2={topLeftX - 32} y2={bottomY} stroke="#ef4444" strokeWidth="2" />
        <text x={topLeftX - 126} y={groundY + trenchDepthPx / 2} fill="#991b1b" fontSize="12">
          Dybde: {d.toFixed(2)} m
        </text>

        <line x1={topRightX} y1={groundY + 6} x2={massesX - 54} y2={groundY + 6} stroke="#c2410c" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x={Math.min(670, topRightX + 12)} y={groundY + 24} fill="#c2410c" fontSize="12">
          Avstand til masser: {safeMassDistance.toFixed(2)} m
        </text>

        <text x="550" y="350" fill="#0f172a" fontSize="12">
          Masser fra kant: {safeMassDistance.toFixed(2)} m
        </text>
        <text x="40" y="350" fill="#7c2d12" fontSize="11">
          Veiledende profil: {slopeRule}
        </text>
        <text x="40" y="332" fill="#0f172a" fontSize="12">
          Sikringsmetode: {method}
        </text>
        {showSymbols && (
          <text x="540" y="368" fill="#334155" fontSize="11">
            Symboler: ledning={pipeSymbol}, masser={massesSymbol}
          </text>
        )}
      </svg>
    </div>
  );
}
