// Grøfteskisse v3 — parametrisk generator
// Ingen canvas-dragging; alt utleiast frå brukarinput.

export type WorkType = "va" | "kabel" | "masseutskifting" | "anna";
export type GroundType = "leire" | "morene" | "fjell" | "fyllmasse";
export type SecuringMethod = "ingen" | "skraa_45" | "skraa_60" | "vertikal" | "groftekas" | "spunt";

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  va: "VA-grøft",
  kabel: "Kabelgrøft / fiber",
  masseutskifting: "Masseutskifting",
  anna: "Anna grøft",
};

export const WORK_TYPE_DESC: Record<WorkType, string> = {
  va: "Vatn- og avløpsleidningar",
  kabel: "El-kabel, fiber, tele",
  masseutskifting: "Fjerning av gamal veg/grunn, ny infrastruktur",
  anna: "Anna type grøft",
};

export const GROUND_TYPE_LABELS: Record<GroundType, string> = {
  leire: "Leire / silt",
  morene: "Morene",
  fjell: "Fjell / berg",
  fyllmasse: "Fyllmasse / ukjend",
};

export const GROUND_TYPE_DESC: Record<GroundType, string> = {
  leire: "Bløt, ustabil masse — krev forsiktig sikring",
  morene: "Relativt stabilt, sand/grus/stein-blanding",
  fjell: "Fast berg — svært stabilt",
  fyllmasse: "Tidlegare påfyllt masse — uforutsigbart",
};

export const SECURING_METHOD_LABELS: Record<SecuringMethod, string> = {
  ingen: "Ingen spesiell sikring",
  skraa_45: "Skrå veggar 45°",
  skraa_60: "Skrå veggar 60°",
  vertikal: "Vertikale veggar",
  groftekas: "Grøftekasse",
  spunt: "Spunt",
};

export function defaultBottomWidthM(workType: WorkType): number {
  switch (workType) {
    case "va": return 1.0;
    case "kabel": return 0.5;
    case "masseutskifting": return 2.0;
    default: return 1.0;
  }
}

export interface SecuringRecommendation {
  method: SecuringMethod;
  reason: string;
  warnings: string[];
  alternatives: SecuringMethod[];
}

export function recommendSecuring(depthM: number, groundType: GroundType): SecuringRecommendation {
  const warnings: string[] = [];

  if (depthM >= 1.0)
    warnings.push("Djupare enn 1,0 m — rømningsveg påkravd (minst éin per 25 m)");
  if (depthM >= 1.25)
    warnings.push("Djupare enn 1,25 m — skriftleg grøfteplan og dokumentert opplæring påkravd");
  if (depthM > 3.0)
    warnings.push("Djupare enn 3,0 m — kvalifisert person (geotekniker) må prosjektere og dokumentere sikring");
  if (groundType === "fyllmasse")
    warnings.push("Fyllmasse: geoteknisk vurdering sterkt anbefalt");

  if (groundType === "fjell") {
    return {
      method: "vertikal",
      reason: "Fjell/berg er stabilt og tillèt vertikale veggar utan ekstra sikring i dei fleste tilfelle.",
      warnings,
      alternatives: ["groftekas"],
    };
  }

  if (depthM < 1.25) {
    return {
      method: "ingen",
      reason: "Grøft grunnare enn 1,25 m krev ikkje spesiell sikring, men risikovurdering skal likevel utførast.",
      warnings,
      alternatives: ["skraa_45"],
    };
  }

  if (depthM > 2.0) {
    if (groundType === "leire") {
      return {
        method: "groftekas",
        reason:
          "Leire/silt djupare enn 2 m krev grøftekasse eller spunt. Skrå veggar krev svært brei grøft og er sjeldan praktisk i leire.",
        warnings,
        alternatives: ["spunt"],
      };
    }
    return {
      method: "groftekas",
      reason:
        "Djupare enn 2 m krev grøftekasse, spunt eller dokumentert skråning med geoteknisk godkjenning.",
      warnings,
      alternatives: ["spunt", "skraa_45"],
    };
  }

  // 1.25–2.0 m
  if (groundType === "leire") {
    return {
      method: "skraa_45",
      reason:
        "Leire er ustabilt. Anbefalt 45° skråning eller flatare. Grøftekasse er eit tryggare alternativ.",
      warnings,
      alternatives: ["groftekas"],
    };
  }
  if (groundType === "morene") {
    return {
      method: "skraa_60",
      reason: "Morene er relativt stabilt. 60° skråning er normalt trygt for djup opp til 2 m.",
      warnings,
      alternatives: ["skraa_45", "groftekas"],
    };
  }
  return {
    method: "groftekas",
    reason: "Fyllmasse er uforutsigbart. Grøftekasse anbefalt for å vere på trygg side.",
    warnings,
    alternatives: ["skraa_45"],
  };
}

export function wallAngleDeg(method: SecuringMethod): number {
  switch (method) {
    case "skraa_45": return 45;
    case "skraa_60": return 60;
    default: return 90;
  }
}

export function isVerticalMethod(method: SecuringMethod): boolean {
  return method === "vertikal" || method === "groftekas" || method === "spunt" || method === "ingen";
}

/** Konfig for gravemaskin + lastebil på éi side av grøfta */
export interface ExcavSideConfig {
  enabled: boolean;
  pos: "left" | "center" | "right";           // posisjon langs grøfta
  rotation: 0 | 90 | 180 | 270;              // arm-retning (0=høgre, 90=ned, 180=venstre, 270=opp)
  truckFromLeft: boolean;                     // lastebil frå venstre (losse til sida av gravemaskinen)
  truckFromRight: boolean;                    // lastebil frå høgre
}

export const defaultExcavConfig = (enabled: boolean): ExcavSideConfig => ({
  enabled,
  pos: "center",
  rotation: 0,
  truckFromLeft: false,
  truckFromRight: false,
});

export interface SketchV3Params {
  workType: WorkType;
  depthM: number;
  bottomWidthM: number;
  groundType: GroundType;
  securingMethod: SecuringMethod;
  trenchLengthM: number;
  showMassehaug: boolean;
  excavBelow: ExcavSideConfig;   // gravemaskin nedanfor grøfta
  excavAbove: ExcavSideConfig;   // gravemaskin ovanfor grøfta
  massehaugDistM: number;
  excavDistM: number;
  excavFacingFront: boolean;     // tverrsnitt: frontvendt gravemaskin (standar: sidevendt)
  projectName: string;
  location: string;
  date: string;
  notes: string;
}

// Fast skala: 1 m = 50 px (same som v2)
export const PX_PER_METER = 50;

// Gravemaskin (15–25t beltegravar, t.d. CAT 323 / Volvo EC250):
//   Lengde: 8 m (totalt med arm)
//   Høgde grunn→topp tak: 3,48 m
//   Belte-botn = 52 % frå toppen av bilete (vertikal)
//   Belte-framkant = 28 % frå venstre (arm-side) i spegla bilete (horisontal)
//     → arm-spissen stikk 28 % av biletbreidda ut frå beltet, mot grøfta
export const EXCAV_W_M = 8.0;
export const EXCAV_H_M = 3.48;
export const EXCAV_W_PX = Math.round(EXCAV_W_M * PX_PER_METER); // 400
export const EXCAV_H_PX = Math.round(EXCAV_H_M * PX_PER_METER); // 174
export const EXCAV_BELT_FRAC = 0.70;       // vertikal: belte-botn (70% frå toppen av PNG)
export const EXCAV_BELT_FRONT_FRAC = 0.45; // horisontal: belte-framkant frå arm-sida

// Frontvendt gravemaskin (PNG 1536×1024, svart bakgrunn):
//   Belte-spenn i biletet ≈ 67 % → displaybreidde slik at 3,5 m = 175 px = 67 % av W
export const EXCAV_FRONT_W = 261;          // displaybreidde px (3.5 m / 0.67 * 50 px/m)
export const EXCAV_FRONT_H = 174;          // displayhøgde px  (261 × 1024/1536)
export const EXCAV_FRONT_BELT_FRAC = 0.87; // belte-botn 87 % frå toppen

// Himmel over bakken: 4 m gir plass til gravemaskin (3,48 m) + litt luft
const SKY_M = 4.0;
export const GROUND_Y_FIXED = Math.round(SKY_M * PX_PER_METER); // 200

// Tittelblokk nedst
export const TITLE_BLOCK_H = 72;

// Gap mellom objekt: 1 m
export const GAP_M = 1.0;

export interface SketchGeometry {
  pxPerMeter: number;
  svgW: number;
  svgH: number;
  groundY: number;
  bottomY: number;
  topLeftX: number;
  topRightX: number;
  botLeftX: number;
  botRightX: number;
  centerX: number;
  topWidthPx: number;
  bottomWidthPx: number;
  depthPx: number;
  excavImageX: number;    // venstre kant av bilete (arm-spiss)
  beltFrontX: number;     // framkant av beltet (excavDistM frå grøftkant)
  massehaugDistPx: number;
  excavDistPx: number;
  massehaugWPx: number;
  massehaugHPx: number;
}

export function computeGeometry(params: SketchV3Params): SketchGeometry {
  const pxPerMeter = PX_PER_METER;

  const angle = wallAngleDeg(params.securingMethod);
  const angleRad = (angle * Math.PI) / 180;
  const wallInsetPerSideM = isVerticalMethod(params.securingMethod)
    ? 0
    : params.depthM / Math.tan(angleRad);
  const topWidthM = params.bottomWidthM + 2 * wallInsetPerSideM;

  const depthPx       = Math.round(params.depthM       * pxPerMeter);
  const bottomWidthPx = Math.round(params.bottomWidthM * pxPerMeter);
  const topWidthPx    = Math.round(topWidthM            * pxPerMeter);

  // Massehaug: ca 40 % av grøft-topp-breidde, min 1,5 m, maks 5 m
  const massehaugWM   = Math.min(Math.max(topWidthM * 0.4, 1.5), 5);
  const massehaugWPx  = Math.round(massehaugWM * pxPerMeter);
  const massehaugHM   = Math.min(massehaugWM * 0.45, params.depthM * 0.6, 2.5);
  const massehaugHPx  = Math.round(massehaugHM * pxPerMeter);

  // Horisontal layout:
  // [20] [massehaug] [massehaugDist] [grøft] [excavDist] [gravemaskin] [20]
  const massehaugDistPx = Math.round(params.massehaugDistM * pxPerMeter);
  const excavDistPx     = Math.round(params.excavDistM     * pxPerMeter);
  const leftEdge        = 20 + massehaugWPx + massehaugDistPx;
  const centerX         = leftEdge + topWidthPx / 2;
  const rightEdge       = leftEdge + topWidthPx;
  // Belte-framkant skal vere excavDistPx frå høgre grøftkant
  const beltFrontX  = rightEdge + excavDistPx;
  // Bilete-venstre: arm-spissen er EXCAV_BELT_FRONT_FRAC inn frå venstre kant av bilete
  const excavImageX = beltFrontX - EXCAV_W_PX * EXCAV_BELT_FRONT_FRAC;
  // Frontvisning: maskinen sentrert over grøfta → smalare SVG
  const svgW = params.excavFacingFront
    ? Math.round(Math.max(rightEdge + 30, centerX + EXCAV_FRONT_W / 2 + 30))
    : Math.round(excavImageX + EXCAV_W_PX + 20);

  const groundY = GROUND_Y_FIXED;
  const bottomY = groundY + depthPx;
  const svgH    = Math.max(bottomY + 40, GROUND_Y_FIXED + EXCAV_H_PX + 10) + TITLE_BLOCK_H;

  return {
    pxPerMeter,
    svgW,
    svgH,
    groundY,
    bottomY,
    topLeftX:  Math.round(centerX - topWidthPx / 2),
    topRightX: Math.round(centerX + topWidthPx / 2),
    botLeftX:  Math.round(centerX - bottomWidthPx / 2),
    botRightX: Math.round(centerX + bottomWidthPx / 2),
    centerX:   Math.round(centerX),
    topWidthPx,
    bottomWidthPx,
    depthPx,
    excavImageX:    Math.round(excavImageX),
    beltFrontX:     Math.round(beltFrontX),
    massehaugDistPx,
    excavDistPx,
    massehaugWPx,
    massehaugHPx,
  };
}
