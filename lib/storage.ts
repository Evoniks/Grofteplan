import type { PlanData } from "@/types/plan";
import { planDefaultValues } from "@/lib/plan-defaults";
import { migratePlanDraft } from "@/lib/plan-draft-migrate";
import { planSchema } from "@/lib/schema";

const STORAGE_KEY = "grofteplan-form-data-v1";

function stripNullishEntries(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export function savePlanToLocalStorage(data: PlanData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPlanFromLocalStorage(): PlanData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PlanData>;
    const merged = {
      ...planDefaultValues,
      ...stripNullishEntries(parsed as Record<string, unknown>),
      ...migratePlanDraft(parsed)
    };
    const result = planSchema.safeParse(merged);
    if (result.success) return result.data;
    // Behold utkast selv om det ikke validerer (t.d. halvutfylt skjema).
    return merged as PlanData;
  } catch {
    return null;
  }
}
