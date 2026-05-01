"use client";

type Props = {
  title: string;
  length: number;
  soil: string;
  hasInstallations: boolean;
  terrainLabel: string;
  showSymbols: boolean;
  pipeSymbol: "sirkel" | "trekant" | "firkant";
};

export function LongitudinalProfileSketch({
  title,
  length,
  soil,
  hasInstallations,
  terrainLabel,
  showSymbols,
  pipeSymbol
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <svg viewBox="0 0 800 280" className="w-full">
        <text x="40" y="30" fill="#334155" fontSize="13">
          Start
        </text>
        <text x="730" y="30" fill="#334155" fontSize="13">
          Slutt
        </text>
        <line x1="60" y1="40" x2="740" y2="40" stroke="#475569" strokeWidth="2" />

        <polyline
          points="60,100 180,95 300,110 430,105 560,120 740,115"
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="3"
        />
        <text x="60" y="90" fill="#1e3a8a" fontSize="12">
          {terrainLabel}
        </text>

        <polyline
          points="60,170 180,170 300,178 430,178 560,188 740,188"
          fill="none"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <text x="60" y="162" fill="#0f172a" fontSize="12">
          Grøftebunn
        </text>

        <text x="60" y="220" fill="#334155" fontSize="13">
          Grøftelengde: {Math.max(length, 1).toFixed(0)} m
        </text>
        <text x="280" y="220" fill="#334155" fontSize="13">
          Jordart: {soil}
        </text>
        <text x="500" y="220" fill="#334155" fontSize="13">
          Installasjoner: {hasInstallations ? "Ja" : "Nei"}
        </text>
        {showSymbols && (
          <>
            {pipeSymbol === "sirkel" && <circle cx="726" cy="176" r="7" fill="#475569" />}
            {pipeSymbol === "trekant" && <polygon points="726,168 718,184 734,184" fill="#475569" />}
            {pipeSymbol === "firkant" && <rect x="719" y="169" width="14" height="14" fill="#475569" />}
          </>
        )}
      </svg>
    </div>
  );
}
