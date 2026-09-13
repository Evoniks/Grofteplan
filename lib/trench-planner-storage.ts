/** § 21-5 tekstfelt i skisseverktøy (same som TrenchPlanner workPlan). */
export type TrenchWorkPlanData = {
  lengthProfile: string;
  soilAndInstallations: string;
  typicalCrossSection: string;
  spoilPlacement: string;
  workInstruction: string;
};

export type TrenchPlannerExport = {
  crossSvg: string;
  planSvg: string;
  workPlan: TrenchWorkPlanData;
  updatedAt: string;
};

const STORAGE_KEY = "grofteplan-trench-planner-v1";

export function saveTrenchPlannerExport(data: Omit<TrenchPlannerExport, "updatedAt">) {
  if (typeof window === "undefined") return;
  const payload: TrenchPlannerExport = { ...data, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("grofteplan-trench-export-saved"));
  } catch {
    /* quota */
  }
}

export function loadTrenchPlannerExport(): TrenchPlannerExport | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TrenchPlannerExport>;
    if (!parsed.crossSvg || !parsed.planSvg || !parsed.workPlan) return null;
    return {
      crossSvg: parsed.crossSvg,
      planSvg: parsed.planSvg,
      workPlan: {
        lengthProfile: parsed.workPlan.lengthProfile ?? "",
        soilAndInstallations: parsed.workPlan.soilAndInstallations ?? "",
        typicalCrossSection: parsed.workPlan.typicalCrossSection ?? "",
        spoilPlacement: parsed.workPlan.spoilPlacement ?? "",
        workInstruction: parsed.workPlan.workInstruction ?? ""
      },
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}

/** data:image/svg+xml for forhåndsvisning / PDF-forsøk */
export function svgMarkupToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getTrenchSketchDataUris(exportData: TrenchPlannerExport | null) {
  if (!exportData) return null;
  return {
    cross: svgMarkupToDataUri(exportData.crossSvg),
    plan: svgMarkupToDataUri(exportData.planSvg)
  };
}
