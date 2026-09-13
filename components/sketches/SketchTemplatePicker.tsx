"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SKETCH_TEMPLATES, type SketchTemplate } from "@/lib/sketch-templates";
import { cn } from "@/lib/utils";

function TemplatePreview({ type }: { type: SketchTemplate["previewType"] }) {
  const W = 160;
  const H = 80;
  const ground = 18;
  const groundY = H - ground;

  const shape: Record<SketchTemplate["previewType"], JSX.Element> = {
    blank: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#f8fafc" rx="4" />
        <text x={W / 2} y={H / 2 + 5} textAnchor="middle" fontSize="11" fill="#94a3b8">Tom</text>
      </svg>
    ),
    standard: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#f0f6ff" rx="4" />
        {/* Ground */}
        <rect x={0} y={groundY} width={W} height={ground} fill="#d4a574" opacity={0.4} />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#92400e" strokeWidth={1.5} />
        {/* Trench trapezoid */}
        <polygon points={`${W*0.3},${groundY} ${W*0.42},${H*0.98} ${W*0.58},${H*0.98} ${W*0.7},${groundY}`}
          fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={1.5} />
        {/* Spoil pile */}
        <polygon points={`${W*0.08},${groundY} ${W*0.18},${groundY-18} ${W*0.28},${groundY}`}
          fill="#92400e" opacity={0.6} />
        {/* Excavator (simple) */}
        <rect x={W*0.75} y={groundY-22} width={28} height={16} rx={2} fill="#f59e0b" opacity={0.9} />
        <rect x={W*0.82} y={groundY-28} width={14} height={10} rx={1} fill="#d97706" opacity={0.9} />
      </svg>
    ),
    deep: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#fef9f0" rx="4" />
        <rect x={0} y={groundY} width={W} height={ground} fill="#d4a574" opacity={0.4} />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#92400e" strokeWidth={1.5} />
        {/* Deep trench */}
        <polygon points={`${W*0.28},${groundY} ${W*0.38},${H*0.98} ${W*0.62},${H*0.98} ${W*0.72},${groundY}`}
          fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={1.5} />
        {/* Trench box lines */}
        <rect x={W*0.37} y={groundY+2} width={W*0.26} height={H*0.98-groundY-4} fill="none" stroke="#475569" strokeWidth={1.5} strokeDasharray="3,2" />
        <polygon points={`${W*0.08},${groundY} ${W*0.18},${groundY-18} ${W*0.26},${groundY}`}
          fill="#92400e" opacity={0.6} />
        <rect x={W*0.75} y={groundY-22} width={28} height={16} rx={2} fill="#f59e0b" opacity={0.9} />
        <text x={W*0.5} y={20} textAnchor="middle" fontSize="9" fill="#b45309" fontWeight="bold">&gt;2 m</text>
      </svg>
    ),
    vertical: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#f0fdf4" rx="4" />
        <rect x={0} y={groundY} width={W} height={ground} fill="#d4a574" opacity={0.4} />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#92400e" strokeWidth={1.5} />
        {/* Vertical trench */}
        <rect x={W*0.42} y={groundY} width={W*0.16} height={H-groundY+2} fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={1.5} />
        {/* Sheet piles */}
        <rect x={W*0.36} y={groundY-10} width={6} height={H-groundY+8} fill="#64748b" rx={1} />
        <rect x={W*0.58} y={groundY-10} width={6} height={H-groundY+8} fill="#64748b" rx={1} />
        <polygon points={`${W*0.08},${groundY} ${W*0.18},${groundY-18} ${W*0.28},${groundY}`}
          fill="#92400e" opacity={0.6} />
        <rect x={W*0.75} y={groundY-22} width={28} height={16} rx={2} fill="#f59e0b" opacity={0.9} />
      </svg>
    ),
    shallow: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#f0f6ff" rx="4" />
        <rect x={0} y={groundY} width={W} height={ground} fill="#d4a574" opacity={0.4} />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#92400e" strokeWidth={1.5} />
        {/* Shallow wide trench */}
        <polygon points={`${W*0.18},${groundY} ${W*0.35},${H*0.98} ${W*0.65},${H*0.98} ${W*0.82},${groundY}`}
          fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={1.5} />
        <polygon points={`${W*0.04},${groundY} ${W*0.1},${groundY-12} ${W*0.16},${groundY}`}
          fill="#92400e" opacity={0.6} />
        <rect x={W*0.86} y={groundY-18} width={22} height={12} rx={2} fill="#f59e0b" opacity={0.9} />
      </svg>
    ),
    narrow: (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <rect width={W} height={H} fill="#fdf4ff" rx="4" />
        <rect x={0} y={groundY} width={W} height={ground} fill="#d4a574" opacity={0.4} />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#92400e" strokeWidth={1.5} />
        {/* Narrow vertical trench */}
        <rect x={W*0.47} y={groundY} width={W*0.06} height={H-groundY+2} fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={1.5} />
        {/* Cable/pipe */}
        <circle cx={W*0.5} cy={groundY+10} r={5} fill="#7c3aed" opacity={0.7} />
        <polygon points={`${W*0.1},${groundY} ${W*0.2},${groundY-14} ${W*0.3},${groundY}`}
          fill="#92400e" opacity={0.6} />
        <rect x={W*0.75} y={groundY-18} width={22} height={12} rx={2} fill="#f59e0b" opacity={0.9} />
      </svg>
    ),
  };

  return (
    <div className="h-20 w-full overflow-hidden rounded-lg border border-slate-100">
      {shape[type]}
    </div>
  );
}

interface Props {
  onSelect: (template: SketchTemplate) => void;
}

export function SketchTemplatePicker({ onSelect }: Props) {
  const [selected, setSelected] = useState<string>("standard-va");

  const active = SKETCH_TEMPLATES.find((t) => t.id === selected) ?? SKETCH_TEMPLATES[0];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4 py-10">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-300">Grøfteplan Skisseverktøy</p>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Vel ein mal</h1>
          <p className="mt-2 text-blue-200">
            Start med ein ferdig situasjon og tilpass til ditt prosjekt, eller lag alt frå grunnen.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SKETCH_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border-2 bg-white p-3 text-left transition-all",
                selected === t.id
                  ? "border-brand-400 shadow-lg shadow-brand-900/30 ring-2 ring-brand-300"
                  : "border-transparent hover:border-brand-300 hover:shadow-md"
              )}
            >
              <TemplatePreview type={t.previewType} />
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.description}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Action */}
        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            onClick={() => onSelect(active)}
            className="gap-2 px-8"
          >
            Start med «{active.name}»
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
