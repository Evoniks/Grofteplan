"use client";

import dynamic from "next/dynamic";

export const PlanWizardLoader = dynamic(
  () => import("@/components/forms/PlanWizard").then((mod) => mod.PlanWizard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Laster skjema …
      </div>
    )
  }
);
