"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";
import { PlanPdfDocument } from "@/components/pdf/PlanPdfDocument";
import { Button } from "@/components/ui/button";

export function PdfDownloadClient({
  data,
  warnings
}: {
  data: PlanData;
  warnings: RuleWarning[];
}) {
  return (
    <PDFDownloadLink
      document={<PlanPdfDocument data={data} warnings={warnings} />}
      fileName={`grofteplan-${data.prosjektnavn || "prosjekt"}.pdf`}
    >
      {({ loading }) => (
        <Button type="button" variant="default">
          {loading ? "Genererer PDF..." : "Generer PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
