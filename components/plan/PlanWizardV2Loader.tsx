"use client";

import dynamic from "next/dynamic";

export const PlanWizardV2Loader = dynamic(
  () => import("@/components/forms/PlanWizardV2").then((mod) => mod.PlanWizardV2),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Laster skjema …
      </div>
    ),
  }
);
