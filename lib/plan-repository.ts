import type { PlanData } from "@/types/plan";
import { getSupabaseClient } from "@/lib/supabase";
import { loadPlanFromLocalStorage, savePlanToLocalStorage } from "@/lib/storage";

export async function loadPlanDraft(): Promise<PlanData | null> {
  // MVP uses local storage. This hook keeps the app ready for Supabase.
  const supabase = getSupabaseClient();
  if (!supabase) {
    return loadPlanFromLocalStorage();
  }

  // Placeholder for future authenticated storage:
  // const { data } = await supabase.from("plan_drafts").select("*").single();
  // return data?.payload as PlanData;
  return loadPlanFromLocalStorage();
}

export async function savePlanDraft(data: PlanData): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    savePlanToLocalStorage(data);
    return;
  }

  // Placeholder for future authenticated storage:
  // await supabase.from("plan_drafts").upsert({ id: userId, payload: data });
  savePlanToLocalStorage(data);
}
