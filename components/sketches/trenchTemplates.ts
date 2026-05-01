export type PercentPoint = {
  x: number;
  y: number;
};

export type HorizontalMeasure = {
  y: number;
  startX: number;
  endX: number;
  labelX: number;
  labelY: number;
};

export type VerticalMeasure = {
  x: number;
  topY: number;
  bottomY: number;
  labelX: number;
  labelY: number;
};

export type TrenchTemplateConfig = {
  key: "sloped";
  title: string;
  backgrounds: {
    crossSection: string;
    plan: string;
  };
  crossSection: {
    trenchEdgeLeft: PercentPoint;
    trenchEdgeRight: PercentPoint;
    spoilNearestEdge: PercentPoint;
    excavatorNearestTrackEdge: PercentPoint;
    depthLine: VerticalMeasure;
    bottomWidthLine: HorizontalMeasure;
    topWidthLine: HorizontalMeasure;
  };
  plan: {
    trenchEdgeLeft: PercentPoint;
    trenchEdgeRight: PercentPoint;
    spoilNearestEdge: PercentPoint;
    excavatorNearestTrackEdge: PercentPoint;
    routeLengthLine: HorizontalMeasure;
  };
};

export const trenchTemplates: Record<"sloped", TrenchTemplateConfig> = {
  sloped: {
    key: "sloped",
    title: "Skrå grøft",
    backgrounds: {
      crossSection: "/templates/sloped-cross-section.png",
      plan: "/templates/sloped-plan.png"
    },
    crossSection: {
      // Grøftekant: øverste kant av selve grøfta.
      trenchEdgeLeft: { x: 31.5, y: 36.5 },
      trenchEdgeRight: { x: 68.8, y: 36.5 },
      // Nærmeste belastningspunkt mot grøft.
      spoilNearestEdge: { x: 22.3, y: 31.7 },
      excavatorNearestTrackEdge: { x: 77.4, y: 32.1 },
      depthLine: { x: 50, topY: 36.7, bottomY: 77.4, labelX: 52.3, labelY: 57.6 },
      bottomWidthLine: { y: 79.5, startX: 43.6, endX: 56.1, labelX: 49.8, labelY: 84.3 },
      topWidthLine: { y: 34.4, startX: 31.5, endX: 68.8, labelX: 50, labelY: 30.3 }
    },
    plan: {
      trenchEdgeLeft: { x: 17.3, y: 50.5 },
      trenchEdgeRight: { x: 84.6, y: 50.5 },
      spoilNearestEdge: { x: 12.9, y: 30.2 },
      excavatorNearestTrackEdge: { x: 72.8, y: 36.5 },
      routeLengthLine: { y: 79.8, startX: 17.3, endX: 84.6, labelX: 51.1, labelY: 85.5 }
    }
  }
};

