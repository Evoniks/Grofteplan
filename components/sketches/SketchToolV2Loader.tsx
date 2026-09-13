"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SketchTemplatePicker } from "@/components/sketches/SketchTemplatePicker";
import type { SketchTemplate, CanvasState } from "@/lib/sketch-templates";

const TrenchPlannerDynamic = dynamic(
  () => import("@/components/sketches/TrenchPlanner").then((m) => m.TrenchPlanner),
  { ssr: false, loading: () => <div className="flex h-96 items-center justify-center text-sm text-slate-400">Laster skisseverktøy …</div> }
);

export function SketchToolV2Loader() {
  const [template, setTemplate] = useState<SketchTemplate | null>(null);
  const [cross, setCross] = useState<CanvasState | null>(null);
  const [plan, setPlan]   = useState<CanvasState | null>(null);

  const handleSelect = (t: SketchTemplate) => {
    setCross(t.makeCross());
    setPlan(t.makePlan());
    setTemplate(t);
  };

  if (!template || !cross || !plan) {
    return <SketchTemplatePicker onSelect={handleSelect} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-500">
          Mal: <strong className="text-slate-900">{template.name}</strong>
        </span>
        <button
          type="button"
          onClick={() => setTemplate(null)}
          className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
        >
          ← Bytt mal
        </button>
      </div>
      <TrenchPlannerDynamic initialCross={cross} initialPlan={plan} />
    </div>
  );
}
