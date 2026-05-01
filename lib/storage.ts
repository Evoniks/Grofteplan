import type { PlanData } from "@/types/plan";

const STORAGE_KEY = "grofteplan-form-data-v1";

export function savePlanToLocalStorage(data: PlanData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPlanFromLocalStorage(): PlanData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PlanData;
  } catch {
    return null;
  }
}
