import type { PlanData } from "@/types/plan";
import { planDefaultValues } from "@/lib/plan-defaults";
import { migratePlanDraft } from "@/lib/plan-draft-migrate";

export interface PlanSummary {
  id: string;
  prosjektnavn: string;
  adresse: string;
  dato: string;
  oppdatert: string; // ISO timestamp
}

const LIST_KEY = "grofteplan-plans-v1";
const planKey = (id: string) => `grofteplan-plan-${id}`;

export function generatePlanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function listPlans(): PlanSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as PlanSummary[]).sort(
      (a, b) => new Date(b.oppdatert).getTime() - new Date(a.oppdatert).getTime()
    );
  } catch {
    return [];
  }
}

export function savePlanToList(data: PlanData, id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(planKey(id), JSON.stringify(data));

  const summary: PlanSummary = {
    id,
    prosjektnavn: data.prosjektnavn?.trim() || "Uten navn",
    adresse: data.adresse?.trim() || "",
    dato: data.dato || "",
    oppdatert: new Date().toISOString(),
  };
  const plans = listPlans();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx >= 0) plans[idx] = summary;
  else plans.unshift(summary);
  localStorage.setItem(LIST_KEY, JSON.stringify(plans));
}

export function loadPlanFromList(id: string): PlanData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(planKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanData>;
    return { ...planDefaultValues, ...parsed, ...migratePlanDraft(parsed) } as PlanData;
  } catch {
    return null;
  }
}

export function deletePlanFromList(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(planKey(id));
  const plans = listPlans().filter((p) => p.id !== id);
  localStorage.setItem(LIST_KEY, JSON.stringify(plans));
}

export function duplicatePlan(id: string): string | null {
  const data = loadPlanFromList(id);
  if (!data) return null;
  const newId = generatePlanId();
  const copy: PlanData = {
    ...data,
    prosjektnavn: data.prosjektnavn ? `Kopi av ${data.prosjektnavn}` : "Kopi",
    dato: new Date().toISOString().slice(0, 10),
  };
  savePlanToList(copy, newId);
  return newId;
}
