"use client";

import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";
import { Button } from "@/components/ui/button";
import { PdfDownloadClient } from "@/components/pdf/PdfDownloadClient";

export function PdfDownloadButton({
  data,
  warnings
}: {
  data: PlanData;
  warnings: RuleWarning[];
}) {
  return (
    <div id="generer-pdf">
      <PdfDownloadClient data={data} warnings={warnings} />
      <noscript>
        <Button type="button" variant="default" disabled>
          Aktiver JavaScript for PDF
        </Button>
      </noscript>
    </div>
  );
}
