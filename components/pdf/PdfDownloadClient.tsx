"use client";

import { useState } from "react";
import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";
import { loadTrenchPlannerExport } from "@/lib/trench-planner-storage";
import { prepareTrenchSketchesForPdf } from "@/lib/sketch-pdf-export";
import { Button } from "@/components/ui/button";

export function PdfDownloadClient({
  data,
  warnings
}: {
  data: PlanData;
  warnings: RuleWarning[];
}) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setHint(null);
    try {
      const trenchExport = loadTrenchPlannerExport();
      const sketchImages = await prepareTrenchSketchesForPdf(trenchExport);

      if (trenchExport && !sketchImages) {
        setHint(
          "Skisse ble funnet, men kunne ikke legges i PDF (prøv å oppdatere forhåndsvisning på skjemaet)."
        );
      } else if (!trenchExport) {
        setHint("Ingen lagra skisse — PDF uten skisseside. Lag skisse i skisseverktøyet først.");
      }

      const [{ pdf }, { PlanPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/PlanPdfDocument")
      ]);

      const blob = await pdf(
        <PlanPdfDocument data={data} warnings={warnings} sketchImages={sketchImages} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grofteplan-${data.prosjektnavn || "prosjekt"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setHint("Kunne ikke generere PDF. Prøv igjen etter at siden er lastet inn på nytt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button type="button" variant="default" onClick={() => void handleDownload()} disabled={loading}>
        {loading ? "Genererer PDF…" : "Generer PDF"}
      </Button>
      {hint ? <p className="text-xs text-amber-800">{hint}</p> : null}
    </div>
  );
}
