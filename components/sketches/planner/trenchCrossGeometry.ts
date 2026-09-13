/** Tverrprofil-grøft: veggvinkel er målt mot horisontalen (0° = flat mark, 90° = loddrett ned mot bunn). */

export const TRENCH_Y_TOP_FRAC = 0.04;
export const TRENCH_Y_BOT_FRAC = 0.95;

export const MIN_WALL_ANGLE_DEG = 45;
/** 90° = vertikal grøftevegg mot bunnlinje */
export const MAX_WALL_ANGLE_DEG = 90;

export type TrenchWallAngles = { leftDeg: number; rightDeg: number };

export type TrenchCrossMetaInput = {
  slopeRatio?: number;
  slopeAngleLeftDeg?: number;
  slopeAngleRightDeg?: number;
  /** Horisontal avstand mellom nedre veggpunkt (bunn grøft), px. */
  innerBottomWidthPx?: number;
  /** Horisontal avstand mellom øvre veggpunkt (topp grøft), px. Ikkje sett = fyller heile boksbreidda. */
  innerTopWidthPx?: number;
};

export function clampWallAngleDeg(v: number): number {
  return Math.max(MIN_WALL_ANGLE_DEG, Math.min(MAX_WALL_ANGLE_DEG, v));
}

function fallbackAnglesFromLegacyRatio(meta?: TrenchCrossMetaInput): TrenchWallAngles {
  const ratio = meta?.slopeRatio ?? 1;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { leftDeg: 45, rightDeg: 45 };
  }
  const deg = (Math.atan(1 / ratio) * 180) / Math.PI;
  const c = clampWallAngleDeg(deg);
  return { leftDeg: c, rightDeg: c };
}

/** Bakoverkompat: gamle skissar med berre `slopeRatio`, eller blanding av nye felt. */
export function resolveTrenchWallAngles(meta?: TrenchCrossMetaInput): TrenchWallAngles {
  const fb = fallbackAnglesFromLegacyRatio(meta);
  const leftOk = meta?.slopeAngleLeftDeg != null && Number.isFinite(meta.slopeAngleLeftDeg);
  const rightOk = meta?.slopeAngleRightDeg != null && Number.isFinite(meta.slopeAngleRightDeg);
  return {
    leftDeg: leftOk ? clampWallAngleDeg(meta!.slopeAngleLeftDeg!) : fb.leftDeg,
    rightDeg: rightOk ? clampWallAngleDeg(meta!.slopeAngleRightDeg!) : fb.rightDeg
  };
}

export function wallAngleToHorizontalInset(wallHeightPx: number, angleFromHorizontalDeg: number): number {
  const a = clampWallAngleDeg(angleFromHorizontalDeg);
  if (a >= MAX_WALL_ANGLE_DEG - 0.01) {
    return 0;
  }
  const rad = (a * Math.PI) / 180;
  return wallHeightPx / Math.tan(rad);
}

export type TrenchCrossCorners = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
};

function nominalWallInsets(width: number, height: number, meta?: TrenchCrossMetaInput) {
  const { leftDeg, rightDeg } = resolveTrenchWallAngles(meta);
  const wallH = height * (TRENCH_Y_BOT_FRAC - TRENCH_Y_TOP_FRAC);
  const margin = width * 0.02;
  const maxInset = width * 0.42;
  const L0 = Math.min(wallAngleToHorizontalInset(wallH, leftDeg), maxInset);
  const R0 = Math.min(wallAngleToHorizontalInset(wallH, rightDeg), maxInset);
  return { margin, innerTopW: width - 2 * margin, L0, R0 };
}

/** Startverdi for `innerBottomWidthPx` (same som legacy før feltet fanst). */
export function initialTrenchInnerBottomWidthPx(width: number, height: number, meta?: TrenchCrossMetaInput): number {
  const { innerTopW, L0, R0 } = nominalWallInsets(width, height, meta);
  return Math.max(20, innerTopW - L0 - R0);
}

/**
 * Beregner fire hjørner. `width` på objektet er ytre boks for toppen (toppåpning + margin).
 * Med `innerBottomWidthPx` vert bunnbreidda fast og veggane skalert når du endrar toppbreidda.
 */
export function getTrenchCrossCorners(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  meta?: TrenchCrossMetaInput;
}): TrenchCrossCorners {
  const { x, y, width, height, meta } = input;
  const yTop = y + height * TRENCH_Y_TOP_FRAC;
  const yBot = y + height * TRENCH_Y_BOT_FRAC;
  const { margin, innerTopW, L0, R0 } = nominalWallInsets(width, height, meta);

  // Topp = alltid full bbox inner-breidde
  const effectiveTopW = innerTopW;

  const topLeft  = { x: x + margin,                y: yTop };
  const topRight = { x: x + margin + effectiveTopW, y: yTop };

  let bottomLeft: { x: number; y: number };
  let bottomRight: { x: number; y: number };

  if (meta?.innerBottomWidthPx != null && Number.isFinite(meta.innerBottomWidthPx)) {
    // Eksplisitt bunnbreidde: rekn insets direkte — garanterer at teikna bottn = lagra verdi
    const innerBottomW = Math.max(20, meta.innerBottomWidthPx);
    const delta = effectiveTopW - innerBottomW;
    const sum = L0 + R0;
    let leftInset: number;
    let rightInset: number;
    if (delta <= 0) {
      // Bunn breiare enn topp — teikn som rektangel
      leftInset = 0;
      rightInset = 0;
    } else if (sum > 1e-6) {
      // Fordel inntrykket proporsjonalt med veggvinklane (L:R-ratio)
      leftInset  = delta * L0 / sum;
      rightInset = delta * R0 / sum;
    } else {
      leftInset  = delta / 2;
      rightInset = delta / 2;
    }
    bottomLeft  = { x: topLeft.x  + leftInset,  y: yBot };
    bottomRight = { x: topRight.x - rightInset, y: yBot };
  } else {
    // Ingen eksplisitt bunnbreidde — bruk veggvinklane direkte
    bottomLeft  = { x: topLeft.x  + L0, y: yBot };
    bottomRight = { x: topRight.x - R0, y: yBot };
  }

  return { topLeft, topRight, bottomLeft, bottomRight };
}
