"use client";

import Image from "next/image";
import { LabelBox } from "@/components/sketches/LabelBox";
import { MeasurementArrow } from "@/components/sketches/MeasurementArrow";
import { trenchTemplates } from "@/components/sketches/trenchTemplates";

type Props = {
  depth: number;
  bottomWidth: number;
  topWidth: number;
  routeLength: number;
  massDistance: number;
  method: string;
};

function MeasurementSection({
  title,
  backgroundSrc,
  children
}: {
  title: string;
  backgroundSrc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">{title}</p>
      <div className="relative overflow-hidden rounded-md border border-slate-300 bg-slate-50">
        <Image src={backgroundSrc} alt={title} width={1600} height={900} className="h-auto w-full" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {children}
        </svg>
      </div>
    </div>
  );
}

export function TrenchSketch({ depth, bottomWidth, topWidth, routeLength, massDistance, method }: Props) {
  const cfg = trenchTemplates.sloped;
  const cross = cfg.crossSection;
  const plan = cfg.plan;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Generert skisse ({cfg.title})</h3>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">PNG + teknisk overlay</span>
      </div>

      <MeasurementSection title="Tverrprofil" backgroundSrc={cfg.backgrounds.crossSection}>
        <MeasurementArrow x1={cross.trenchEdgeLeft.x} y1={cross.trenchEdgeLeft.y} x2={cross.spoilNearestEdge.x} y2={cross.spoilNearestEdge.y} color="#92400e" />
        <MeasurementArrow
          x1={cross.trenchEdgeRight.x}
          y1={cross.trenchEdgeRight.y}
          x2={cross.excavatorNearestTrackEdge.x}
          y2={cross.excavatorNearestTrackEdge.y}
          color="#92400e"
        />
        <MeasurementArrow
          x1={cross.depthLine.x}
          y1={cross.depthLine.topY}
          x2={cross.depthLine.x}
          y2={cross.depthLine.bottomY}
          color="#0f172a"
        />
        <MeasurementArrow
          x1={cross.bottomWidthLine.startX}
          y1={cross.bottomWidthLine.y}
          x2={cross.bottomWidthLine.endX}
          y2={cross.bottomWidthLine.y}
          color="#0f172a"
        />
        <MeasurementArrow
          x1={cross.topWidthLine.startX}
          y1={cross.topWidthLine.y}
          x2={cross.topWidthLine.endX}
          y2={cross.topWidthLine.y}
          color="#0f172a"
        />

        <LabelBox x={cross.depthLine.labelX} y={cross.depthLine.labelY} text={`Dybde: ${depth.toFixed(2)} m`} />
        <LabelBox x={cross.bottomWidthLine.labelX} y={cross.bottomWidthLine.labelY} text={`Bunnbredde: ${bottomWidth.toFixed(2)} m`} />
        <LabelBox x={cross.topWidthLine.labelX} y={cross.topWidthLine.labelY} text={`Toppbredde: ${topWidth.toFixed(2)} m`} />
        <LabelBox
          x={(cross.trenchEdgeLeft.x + cross.spoilNearestEdge.x) / 2}
          y={(cross.trenchEdgeLeft.y + cross.spoilNearestEdge.y) / 2 - 2.5}
          text={`Masser fra kant: ${massDistance.toFixed(2)} m`}
          tone="accent"
        />
        <LabelBox
          x={(cross.trenchEdgeRight.x + cross.excavatorNearestTrackEdge.x) / 2}
          y={(cross.trenchEdgeRight.y + cross.excavatorNearestTrackEdge.y) / 2 - 2.5}
          text={`Maskin fra kant: ${massDistance.toFixed(2)} m`}
          tone="accent"
        />
        <LabelBox x={79} y={12} text={`Sikring: ${method}`} tone="accent" />
      </MeasurementSection>

      <MeasurementSection title="Plan (ovenfra)" backgroundSrc={cfg.backgrounds.plan}>
        <MeasurementArrow x1={plan.trenchEdgeLeft.x} y1={plan.trenchEdgeLeft.y} x2={plan.spoilNearestEdge.x} y2={plan.spoilNearestEdge.y} color="#92400e" />
        <MeasurementArrow
          x1={plan.trenchEdgeRight.x}
          y1={plan.trenchEdgeRight.y}
          x2={plan.excavatorNearestTrackEdge.x}
          y2={plan.excavatorNearestTrackEdge.y}
          color="#92400e"
        />
        <MeasurementArrow
          x1={plan.routeLengthLine.startX}
          y1={plan.routeLengthLine.y}
          x2={plan.routeLengthLine.endX}
          y2={plan.routeLengthLine.y}
          color="#0f172a"
        />

        <LabelBox x={plan.routeLengthLine.labelX} y={plan.routeLengthLine.labelY} text={`Trase lengde: ${routeLength.toFixed(0)} m`} />
        <LabelBox
          x={(plan.trenchEdgeLeft.x + plan.spoilNearestEdge.x) / 2}
          y={(plan.trenchEdgeLeft.y + plan.spoilNearestEdge.y) / 2 - 2.5}
          text={`Masser fra kant: ${massDistance.toFixed(2)} m`}
          tone="accent"
        />
        <LabelBox
          x={(plan.trenchEdgeRight.x + plan.excavatorNearestTrackEdge.x) / 2}
          y={(plan.trenchEdgeRight.y + plan.excavatorNearestTrackEdge.y) / 2 - 2.5}
          text={`Maskin fra kant: ${massDistance.toFixed(2)} m`}
          tone="accent"
        />
      </MeasurementSection>

      <p className="text-xs text-slate-600">
        Målingene går fra grøftekant til nærmeste belastningspunkt (masser, beltekant maskin, hjul/ytterkant lastebil).
      </p>
    </div>
  );
}

