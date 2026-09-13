import { initialTrenchInnerBottomWidthPx } from "@/components/sketches/planner/trenchCrossGeometry";
import { defaultPlanProfileRulerState } from "@/components/sketches/planner/planProfileRuler";
import type { CanvasObjectData } from "@/components/sketches/planner/CanvasObject";

export type CanvasState = {
  objects: CanvasObjectData[];
  measurements: never[];
  textLabels: { id: string; text: string; x: number; y: number; fontSize: number; boxed?: boolean }[];
  planTerrainTiles?: Record<string, "jord" | "stein" | "asfalt">;
  planProfileRuler?: ReturnType<typeof defaultPlanProfileRulerState>;
};

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Koordinat-system ──────────────────────────────────────────────────────────
//
// Canvas er ~1600 px brei. 50 px = 1 m.
// Grunnlinje ligg fast på y = 250.
// Grøft-objektet: x = venstre kant av bounding-box (IKKJE senter).
//   Grunnlinja = y + h * 0.04 ⟹ y = 250 − h * 0.04
//
// Standardverdiar frå TrenchPlanner-presets:
//   spoilPile    : w=260 h=120  →  y + h = 250  →  y = 130
//   excavatorSide: w=200 h=190  →  y = 120 (botn ≈ 310, lett under bakken)
//   ladder       : w=60  h=220  →  y = 220 (frå 30 px over bakken og ned)
//   barrier      : w=30  h=96   →  y = 150
//   trenchBox    : w=300 h=220
//   sheetPile    : w=260 h=240

function makeT(
  x: number, y: number, w: number, h: number,
  leftDeg = 45, rightDeg = 45
): CanvasObjectData {
  return {
    id: uid("trench"),
    type: "trenchCross",
    x, y, width: w, height: h,
    rotation: 0,
    meta: {
      slopeAngleLeftDeg: leftDeg,
      slopeAngleRightDeg: rightDeg,
      innerBottomWidthPx: initialTrenchInnerBottomWidthPx(w, h, {
        slopeAngleLeftDeg: leftDeg,
        slopeAngleRightDeg: rightDeg,
      }),
    },
  };
}

function o(
  type: CanvasObjectData["type"],
  x: number, y: number, w: number, h: number,
  rotation = 0,
  meta?: CanvasObjectData["meta"]
): CanvasObjectData {
  return { id: uid(type), type, x, y, width: w, height: h, rotation, meta };
}

function trenchY(h: number) { return 250 - h * 0.04; }

function defaultPlan(): CanvasState {
  return {
    objects: [
      o("trenchPlan",   360, 460, 750, 130, 0, { lengthMeters: 15 }),
      o("excavatorTop",1030, 340, 160, 340, 0),
      o("truckTop",     940, 620, 520, 130, 180),
      o("barrier",     1310, 360,  30,  96, 0),
      o("escapeRoute",  740, 640, 220,  72, 0),
    ],
    measurements: [],
    textLabels: [],
    planTerrainTiles: {},
    planProfileRuler: defaultPlanProfileRulerState(),
  };
}

// ─── Template-definisjonar ────────────────────────────────────────────────────

export interface SketchTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  previewType: "blank" | "shallow" | "standard" | "deep" | "vertical" | "narrow";
  makeCross: () => CanvasState;
  makePlan:  () => CanvasState;
}

export const SKETCH_TEMPLATES: SketchTemplate[] = [
  // 1. Tom ──────────────────────────────────────────────────────────────────
  {
    id: "blank",
    name: "Tom skisse",
    description: "Start med blankt lerret og bygg opp situasjonen frå grunnen av.",
    tags: ["Tilpassa", "Blank"],
    previewType: "blank",
    makeCross: () => ({ objects: [], measurements: [], textLabels: [] }),
    makePlan: () => ({
      objects: [],
      measurements: [],
      textLabels: [],
      planTerrainTiles: {},
      planProfileRuler: defaultPlanProfileRulerState(),
    }),
  },

  // ─── Reelle mål ────────────────────────────────────────────────────────────
  // 50 px = 1 m.  Bakke: y = 250.
  //
  // Gravemaskin (15–25 t beltegravar): 8 m lang, 3,5 m høg → 400 × 174 px
  //   Belt-botn frak = 0,52 → y + 174*0,52 = 250 → y = 160
  //
  // Massehaug (typisk): 4 m × 2,4 m → 200 × 120 px  (botn y = 250 → y = 130)
  //
  // Spunt-plater: 2,5 m brei × 4 m høg → 125 × 200 px
  //   Stikk 1 m over bakken: y = 200, botn: y = 400 (2 m under bakken)

  // 2. Standard VA-grøft ────────────────────────────────────────────────────
  {
    id: "standard-va",
    name: "Standard VA-grøft",
    description: "Typisk vatn/avløp-grøft, 1,2–1,5 m djup med skrå vegger (1:1), gravemaskin og massehaug.",
    tags: ["VA", "Avløp", "Vatn"],
    previewType: "standard",
    makeCross: () => {
      // 2 m djup (100 px), 45° veggar → topp ~5,5 m (275 px), bonn ~1,6 m (82 px)
      // cx=500. tx=500-137=363, right=363+275=638
      const tw = 275; const th = 100; const cx = 500;
      const tx = cx - tw / 2;
      return {
        objects: [
          makeT(tx, trenchY(th), tw, th, 45, 45),
          // Massehaug 4 m × 2,4 m. Senter ~2 m frå venstre, botn på bakken
          o("spoilPile",  80, 130, 200, 120, 0, { spoilCrossMaterial: "jord" }),
          // Gravemaskin 8 m × 3,5 m, til høgre, grab mot grøfta
          // belt y = 160 + 174*0,52 = 250
          o("excavatorSide", 700, 160, 400, 174, 0, { mirrored: true }),
          // Stige i grøfta. 1,4 m djup → stige ca 2 m (100 px) med litt over bakken
          o("ladder", cx - 20, 228, 40, 110, -10),
          o("barrier", 1170, 150, 30, 96, 0),
        ],
        measurements: [],
        textLabels: [],
      };
    },
    makePlan: () => defaultPlan(),
  },

  // 3. Djup grøft med grøftekasse (>2 m) ───────────────────────────────────
  {
    id: "deep-trenchbox",
    name: "Djup grøft med grøftekasse",
    description: "Grøft djupare enn 2 m. Grøftekasse montert for å sikre veggar mot ras.",
    tags: ["Djup", "Grøftekasse", "Sikring", ">2m"],
    previewType: "deep",
    makeCross: () => {
      // 3 m djup (150 px), 80° veggar → topp 2,5 m (125 px), botn ~1,5 m (77 px)
      // Grøftekasse 1,8 m × 2,5 m = 90 × 125 px, sentrert i grøfta
      // cx=500. tx=437, right=563
      const tw = 126; const th = 150; const cx = 500;
      const tx = cx - tw / 2;
      return {
        objects: [
          makeT(tx, trenchY(th), tw, th, 80, 80),
          // Grøftekasse 1,8 m × 2,5 m — topp på bakken, går ned i grøfta
          o("trenchBox", cx - 45, 250, 90, 125, 0),
          // Massehaug til venstre, 1 m avstand frå grøft
          o("spoilPile", 180, 130, 200, 120, 0, { spoilCrossMaterial: "jord" }),
          // Gravemaskin 8 m × 3,5 m til høgre
          o("excavatorSide", 630, 160, 400, 174, 0, { mirrored: true }),
          // Stige i grøfta / grøftekassa
          o("ladder", cx - 20, 218, 40, 150, -8),
          o("barrier", 1100, 150, 30, 96, 0),
        ],
        measurements: [],
        textLabels: [
          { id: uid("lbl"), text: "≥ 2 m djup — bratte veggar — grøftekasse påkrevd", x: cx - 130, y: 420, fontSize: 13, boxed: true },
        ],
      };
    },
    makePlan: () => defaultPlan(),
  },

  // 4. Grøft med spunt ──────────────────────────────────────────────────────
  {
    id: "sheet-pile",
    name: "Grøft med spunt",
    description: "Vertikal grøft med spuntvegg på begge sider. Typisk i tett terreng eller nær bygg.",
    tags: ["Spunt", "Vertikal", "Bygg"],
    previewType: "vertical",
    makeCross: () => {
      // Grøft 2 m brei (100 px), 3 m djup (150 px), 90° veggar
      // Spuntplater 2,5 m breie × 4 m høge = 125 × 200 px
      //   Stikk 1 m over bakken (y=200), botn 3 m under (y=400)
      // cx=500. tx=450, right=550
      const tw = 100; const th = 150; const cx = 500;
      const tx = cx - tw / 2;
      const ty = trenchY(th);
      return {
        objects: [
          makeT(tx, ty, tw, th, 90, 90),
          // Venstre spunt — høgre kant = tx
          o("sheetPile", tx - 125, 200, 125, 200, 0),
          // Høgre spunt (spegla) — venstre kant = tx+tw
          o("sheetPile", tx + tw, 200, 125, 200, 0, { mirrored: true }),
          // Massehaug til venstre, utanfor spunt
          o("spoilPile", 130, 130, 200, 120, 0, { spoilCrossMaterial: "jord" }),
          // Gravemaskin til høgre, 8 m × 3,5 m
          o("excavatorSide", 700, 160, 400, 174, 0, { mirrored: true }),
          o("ladder", cx - 20, 218, 40, 150, -10),
          o("barrier", 1170, 150, 30, 96, 0),
        ],
        measurements: [],
        textLabels: [
          { id: uid("lbl"), text: "Spunt begge sider", x: cx - 70, y: 430, fontSize: 14, boxed: true },
        ],
      };
    },
    makePlan: () => defaultPlan(),
  },

  // 5. Grøft med skrå vegger (grunn) ────────────────────────────────────────
  {
    id: "sloped-walls",
    name: "Grøft med skrå vegger",
    description: "Grunn grøft (0,8–1,2 m) med vide skrå vegger (1:1). Krev god plass på begge sider.",
    tags: ["Skrå vegger", "Grunt", "Lav risiko"],
    previewType: "shallow",
    makeCross: () => {
      // 1 m djup (50 px), 45° veggar → topp ~3,8 m (191 px), bunn ~1,8 m (91 px)
      // Bounding-box 200 px (4 m), cx=500. tx=400, right=600
      const tw = 200; const th = 50; const cx = 500;
      const tx = cx - tw / 2;
      return {
        objects: [
          makeT(tx, trenchY(th), tw, th, 45, 45),
          // Massehaug, litt mindre (grunt arbeid)
          o("spoilPile", 100, 145, 180, 105, 0, { spoilCrossMaterial: "jord" }),
          // Gravemaskin
          o("excavatorSide", 680, 160, 400, 174, 0, { mirrored: true }),
          o("ladder", cx - 15, 236, 30, 75, -10),
          o("barrier", 1150, 150, 30, 96, 0),
        ],
        measurements: [],
        textLabels: [
          { id: uid("lbl"), text: "ca. 1,0 m djup — skrå vegger 1:1", x: cx - 120, y: 330, fontSize: 14, boxed: true },
        ],
      };
    },
    makePlan: () => defaultPlan(),
  },

  // 6. Kabeltrasé (smal, grunn, vertikal) ──────────────────────────────────
  {
    id: "cable-trench",
    name: "Kabeltrasé",
    description: "Smal grøft for fiber, el-kabel eller leidning. Typisk 0,4–0,6 m brei og 0,8–1,0 m djup.",
    tags: ["Kabel", "Fiber", "Smal", "Leidning"],
    previewType: "narrow",
    makeCross: () => {
      // 0,8 m brei (40 px), 1 m djup (50 px), 90° veggar
      // cx=500. tx=480, right=520
      const tw = 40; const th = 50; const cx = 500;
      const tx = cx - tw / 2;
      return {
        objects: [
          makeT(tx, trenchY(th), tw, th, 90, 90),
          // Røyr/leidning botn av grøfta. Diameter 0,1 m = 5 px → symbolsk 20 px
          o("pipe", cx - 10, 282, 20, 20, 0),
          // Massehaug 3 m × 2 m
          o("spoilPile", 250, 145, 150, 105, 0, { spoilCrossMaterial: "jord" }),
          // Liten minigravar for kabeltrasé: 6 m × 2,6 m = 300 × 131 px
          // belt y = 182 + 130*0,52 = 250
          o("excavatorSide", 600, 182, 300, 130, 0, { mirrored: true }),
          o("barrier", 970, 150, 30, 96, 0),
        ],
        measurements: [],
        textLabels: [
          { id: uid("lbl"), text: "Kabeltrasé — ca. 0,8 m brei", x: cx - 90, y: 340, fontSize: 13, boxed: true },
        ],
      };
    },
    makePlan: () => ({
      objects: [
        o("trenchPlan",   420, 460, 850,  50, 0, { lengthMeters: 20 }),
        o("excavatorTop",1180, 340, 140, 300, 0),
        o("barrier",     1400, 390,  30,  96, 0),
      ],
      measurements: [],
      textLabels: [],
      planTerrainTiles: {},
      planProfileRuler: defaultPlanProfileRulerState(),
    }),
  },
];
