"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { PlanSchema } from "@/lib/schema";
import { loadTrenchPlannerExport, type TrenchPlannerExport } from "@/lib/trench-planner-storage";
import { Button } from "@/components/ui/button";

function isSafeSketchSvg(svg: string): boolean {
  const t = svg.trim();
  return t.startsWith("<svg") && !/<script/i.test(t);
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  form: UseFormReturn<PlanSchema>;
};

export function TrenchPlannerBridge({ form }: Props) {
  const [trench, setTrench] = useState<TrenchPlannerExport | null>(null);

  const refresh = () => setTrench(loadTrenchPlannerExport());

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "grofteplan-trench-planner-v1") refresh();
    };
    window.addEventListener("storage", onStorage);
    const onSaved = () => refresh();
    window.addEventListener("grofteplan-trench-export-saved", onSaved);
    const t = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("grofteplan-trench-export-saved", onSaved);
      window.clearInterval(t);
    };
  }, []);

  const importWorkPlan = () => {
    if (!trench) return;
    const w = trench.workPlan;
    form.setValue("plan215Lengdeprofil", w.lengthProfile);
    form.setValue("plan215Jordarter", w.soilAndInstallations);
    form.setValue("plan215Tverrprofil", w.typicalCrossSection);
    form.setValue("plan215Gravemasser", w.spoilPlacement);
    form.setValue("plan215Arbeidsinstruks", w.workInstruction);
    if (!form.getValues("arbeidsbeskrivelse")?.trim() && w.workInstruction.trim()) {
      form.setValue("arbeidsbeskrivelse", w.workInstruction);
    }
  };

  const updatedLabel = trench
    ? new Date(trench.updatedAt).toLocaleString("nb-NO", {
        dateStyle: "short",
        timeStyle: "short"
      })
    : null;

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle className="text-base">Skisser frå skisseverktøy</CardTitle>
        <CardDescription>
          Lag tverrprofil og plan i{" "}
          <Link href="/skisseverktoy" className="font-medium text-blue-800 underline">
            skisseverktøyet
          </Link>
          . Skissene lagrast automatisk. På skjemaet: «Generer PDF» tar med skissene.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/skisseverktoy"
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Åpne skisseverktøy
          </Link>
          <Link
            href="/plan?fra=skisse#generer-pdf"
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Gå til PDF-generering
          </Link>
          <Button type="button" variant="outline" onClick={refresh}>
            Oppdater forhåndsvisning
          </Button>
          <Button type="button" variant="secondary" onClick={importWorkPlan} disabled={!trench}>
            Importer § 21-5-tekst
          </Button>
        </div>

        {trench ? (
          <>
            <p className="text-xs text-slate-600">Sist lagra: {updatedLabel}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-800">Tverrprofil</p>
                <div
                  className="[&_svg]:h-auto [&_svg]:max-w-full rounded-md border border-slate-300 bg-white"
                  role="img"
                  aria-label="Tverrprofil frå skisseverktøy"
                  {...(isSafeSketchSvg(trench.crossSvg)
                    ? { dangerouslySetInnerHTML: { __html: trench.crossSvg } }
                    : {})}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-800">Plan (ovenfra)</p>
                <div
                  className="[&_svg]:h-auto [&_svg]:max-w-full rounded-md border border-slate-300 bg-white"
                  role="img"
                  aria-label="Planvisning frå skisseverktøy"
                  {...(isSafeSketchSvg(trench.planSvg)
                    ? { dangerouslySetInnerHTML: { __html: trench.planSvg } }
                    : {})}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Ingen lagra skisse enno. Opne skisseverktøyet og lagre ved å tegne — data synkroniserast
            automatisk.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
