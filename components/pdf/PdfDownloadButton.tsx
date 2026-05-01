"use client";

import dynamic from "next/dynamic";
import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";
import { Button } from "@/components/ui/button";

const PdfDownloadClient = dynamic(
  () => import("@/components/pdf/PdfDownloadClient").then((mod) => mod.PdfDownloadClient),
  { ssr: false }
);

export function PdfDownloadButton({
  data,
  warnings
}: {
  data: PlanData;
  warnings: RuleWarning[];
}) {
  return (
    <div>
      <PdfDownloadClient data={data} warnings={warnings} />
      <noscript>
        <Button type="button" variant="default" disabled>
          Aktiver JavaScript for PDF
        </Button>
      </noscript>
    </div>
  );
}
