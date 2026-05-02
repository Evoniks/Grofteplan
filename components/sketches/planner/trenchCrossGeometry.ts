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

/**
 * Beregner fire hjørner. Venstre vegg skrår inn (økande x nedover), høyre vegg inn (synkande x nedover).
 * Horisontale inset er proporsjonale med vegghøgd og cot(vinkel mot horisontal).
 */
export function getTrenchCrossCorners(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  meta?: TrenchCrossMetaInput;
}): TrenchCrossCorners {
  const { x, y, width, height } = input;
  const { leftDeg, rightDeg } = resolveTrenchWallAngles(input.meta);
  const yTop = y + height * TRENCH_Y_TOP_FRAC;
  const yBot = y + height * TRENCH_Y_BOT_FRAC;
  const wallH = yBot - yTop;
  const margin = width * 0.02;
  const maxInset = width * 0.42;
  const leftInset = Math.min(wallAngleToHorizontalInset(wallH, leftDeg), maxInset);
  const rightInset = Math.min(wallAngleToHorizontalInset(wallH, rightDeg), maxInset);
  const topLeft = { x: x + margin, y: yTop };
  const topRight = { x: x + width - margin, y: yTop };
  const bottomLeft = { x: topLeft.x + leftInset, y: yBot };
  const bottomRight = { x: topRight.x - rightInset, y: yBot };
  return { topLeft, topRight, bottomLeft, bottomRight };
}
