"use client";

import { useId } from "react";
import type { SketchV3Params, ExcavSideConfig, ExcavEndConfig } from "@/lib/sketch-v3";
import {
  PX_PER_METER,
  TITLE_BLOCK_H,
  SECURING_METHOD_LABELS,
  WORK_TYPE_LABELS,
  wallAngleDeg,
  isVerticalMethod,
} from "@/lib/sketch-v3";

const EXCAVATOR_TOP_PNG = "/skisse/excavator-top.png";
const TRUCK_TOP_PNG     = "/skisse/truck-top.png";
const PNG_ASPECT        = 1329 / 750; // ≈ 1.772

// Knockout-filter: fjernar SVART bakgrunn frå plan-PNG (excavator-top, truck-top har svart bakgrunn).
// A' = 2*R + 2*G + 2*B → svart (0,0,0)→0 (gjennomsiktig), farga piksel→≥1 (ugjennomsiktig).
const KNOCKOUT_VALUES = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  2 2 2 0 0";
const ALPHA_BOOST = 1.5;

const EXCAV_BODY_FRAC_X = 0.22;
const EXCAV_BODY_FRAC_Y = 0.50;
const EXCAV_ARM_REACH_FRAC = 0.76;

/**
 * Teiknar eit køyretøy-PNG med rotasjon rundt eit valgt pivotpunkt (px, py).
 */
function VehiclePng({ href, bx, by, W, H, rotation, px, py, filterId }: {
  href: string; bx: number; by: number; W: number; H: number;
  rotation: number; px: number; py: number; filterId: string;
}) {
  return (
    <g transform={`rotate(${rotation} ${px} ${py})`}>
      <image href={href} x={bx} y={by} width={W} height={H}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${filterId})`} />
    </g>
  );
}


// ─── Teiknar éi side (gravemaskin + lastebil) ────────────────────────────────
interface SideDrawProps {
  cfg: ExcavSideConfig;
  side: "below" | "above";
  excavCx: number;
  excavCy: number;
  excavW: number;
  excavH: number;
  truckW: number;
  truckH: number;
  trenchX1: number;
  filterId: string;
}

function SideDraw({
  cfg, side, excavCx, excavCy, excavW, excavH,
  truckW, truckH, trenchX1, filterId,
}: SideDrawProps) {
  if (!cfg.enabled) return null;

  const rot = cfg.rotation;
  const excavBx = Math.round(excavCx - EXCAV_BODY_FRAC_X * excavW);
  const excavBy = Math.round(excavCy - EXCAV_BODY_FRAC_Y * excavH);

  // Lastebil VED SIDAN AV gravemaskinkroppen (ikkje ved arm-spissen)
  // Med arm alltid mot grøfta: rot=270 for nedanfor (arm nord), rot=90 for ovanfor (arm sør)
  const halfBodyEW = Math.round(EXCAV_BODY_FRAC_Y * excavH);  // E-V halvbreidde av kroppen
  const cabOffset  = Math.round(EXCAV_BODY_FRAC_X * excavW);  // hytta si avstand frå pivot
  const gap        = Math.max(8, Math.round(excavH * 0.14));   // klaring mellom bilar

  // Lastebil frå VENSTRE (rot=180 — dump peiker mot gravemaskin)
  const truckLeftCX = Math.round(excavCx - halfBodyEW - gap - truckH / 2);
  const truckLeftBx = Math.round(truckLeftCX - truckW / 2);
  const truckLeftBy = Math.round(excavCy - truckH / 2);

  // Lastebil frå HØGRE (rot=0 — dump peiker mot gravemaskin)
  const truckRightCX = Math.round(excavCx + halfBodyEW + gap + truckH / 2);
  const truckRightBx = Math.round(truckRightCX - truckW / 2);
  const truckRightBy = Math.round(excavCy - truckH / 2);

  // Lastebil RETT INN — rygg inn, lasteplan tett mot hytta (4 px klaring)
  //   nedanfor (arm=270°/nord): hytte er sør → dump mot hytta (nord), rot=270
  //   ovanfor  (arm=90°/sør):  hytte er nord → dump mot hytta (sør), rot=90
  // Kompensar for visuelt tyngdepunkt i PNG: gravemaskin 52.5 % frå top (↓ = høgre etter rot 270°), lastebil 50.8 % (↑ = venstre etter rot 90°)
  const truckStraightCX  = excavCx
    + Math.round((538 - 512) / 1024 * excavH)
    - Math.round((520 - 512) / 1024 * truckH);
  const truckStraightCY  = side === "below"
    ? Math.round(excavCy + 4 + truckW / 2)
    : Math.round(excavCy - 4 - truckW / 2);
  const truckStraightBx  = Math.round(truckStraightCX - truckW / 2);
  const truckStraightBy  = Math.round(truckStraightCY - truckH / 2);
  const truckStraightRot = side === "below" ? 90 : 270;

  // Lastebil FYRST (under), deretter gravemaskin (arm kjem over lastebilen)
  return (
    <>
      {cfg.truckFromLeft && (
        <VehiclePng href={TRUCK_TOP_PNG}
          bx={truckLeftBx} by={truckLeftBy} W={truckW} H={truckH}
          rotation={180} px={truckLeftCX} py={Math.round(excavCy)}
          filterId={filterId} />
      )}

      {cfg.truckFromRight && (
        <VehiclePng href={TRUCK_TOP_PNG}
          bx={truckRightBx} by={truckRightBy} W={truckW} H={truckH}
          rotation={0} px={truckRightCX} py={Math.round(excavCy)}
          filterId={filterId} />
      )}

      {cfg.truckStraight && (
        <VehiclePng href={TRUCK_TOP_PNG}
          bx={truckStraightBx} by={truckStraightBy} W={truckW} H={truckH}
          rotation={truckStraightRot} px={truckStraightCX} py={truckStraightCY}
          filterId={filterId} />
      )}

      {/* Gravemaskin SIST — arm kjem over lastebilen */}
      <VehiclePng
        href={EXCAVATOR_TOP_PNG}
        bx={excavBx} by={excavBy} W={excavW} H={excavH}
        rotation={rot}
        px={Math.round(excavCx)} py={Math.round(excavCy)}
        filterId={filterId}
      />
      <text x={trenchX1 - 6} y={Math.round(excavCy) + 4} fontSize={9} fill="#78350f" textAnchor="end">
        Gravemaskin
      </text>
    </>
  );
}

export function PlanSketchV3({ params }: { params: SketchV3Params }) {
  const uid = useId().replace(/:/g, "");
  const filterId = `veh-${uid}`;

  // ─── Grøft-geometri ─────────────────────────────────────────────────────────
  const angleRad   = (wallAngleDeg(params.securingMethod) * Math.PI) / 180;
  const wallInsetM = isVerticalMethod(params.securingMethod) ? 0 : params.depthM / Math.tan(angleRad);
  const topWidthM  = params.bottomWidthM + 2 * wallInsetM;

  const ppm = Math.min(PX_PER_METER, Math.max(4, Math.floor(720 / (params.trenchLengthM + 6))));

  const trenchLenPx  = Math.round(params.trenchLengthM * ppm);
  const trenchTopWPx = Math.round(topWidthM           * ppm);
  const trenchBotWPx = Math.round(params.bottomWidthM * ppm);

  const massehaugWM  = Math.min(Math.max(topWidthM * 0.4, 1.5), 5);
  const massehaugWPx = Math.round(massehaugWM           * ppm);
  const massehaugDPx = Math.round(params.massehaugDistM * ppm);
  const excavDPx     = Math.round(params.excavDistM     * ppm);

  // ─── Køyretøy-storleikar ────────────────────────────────────────────────────
  const excavW = Math.max(24, Math.round(8.0 * ppm));
  const excavH = Math.round(excavW / PNG_ASPECT);
  const truckW = Math.max(24, Math.round(8.5 * ppm));
  const truckH = Math.round(truckW / PNG_ASPECT);

  const hasBelow = params.excavBelow.enabled;
  const hasAbove = params.excavAbove.enabled;
  const hasLeft  = params.excavLeft?.enabled  ?? false;
  const hasRight = params.excavRight?.enabled ?? false;

  const fracOf = (pos: "left" | "center" | "right") =>
    pos === "left" ? 0.2 : pos === "right" ? 0.8 : 0.5;

  // Lastebil ved sidan av kroppen: E-V halvbreidde + klaring + halv kortsida + halv langsida av lastebil
  const halfBodyEWPlan = Math.round(EXCAV_BODY_FRAC_Y * excavH);
  const truckGapPlan   = Math.max(8, Math.round(excavH * 0.14));
  const truckHalfExt   = Math.round(halfBodyEWPlan + truckGapPlan + truckH / 2 + truckW / 2);

  // Faktiske fraksjonar — 30/70 ved begge sider, elles valgt pos
  const belowActualFrac = hasAbove ? 0.3 : fracOf(params.excavBelow.pos);
  const aboveActualFrac = hasBelow ? 0.7 : fracOf(params.excavAbove.pos);

  const hasTruckRight = (hasBelow && params.excavBelow.truckFromRight) || (hasAbove && params.excavAbove.truckFromRight);
  const hasTruckLeft  = (hasBelow && params.excavBelow.truckFromLeft)  || (hasAbove && params.excavAbove.truckFromLeft);

  // Kortaste avstand frå kvar kant til ein gravemaskin med sidestilt lastebil
  let minDistFromLeft  = trenchLenPx;
  let minDistFromRight = trenchLenPx;
  if (hasBelow && params.excavBelow.truckFromLeft)  minDistFromLeft  = Math.min(minDistFromLeft,  Math.round(trenchLenPx * belowActualFrac));
  if (hasAbove && params.excavAbove.truckFromLeft)  minDistFromLeft  = Math.min(minDistFromLeft,  Math.round(trenchLenPx * aboveActualFrac));
  if (hasBelow && params.excavBelow.truckFromRight) minDistFromRight = Math.min(minDistFromRight, Math.round(trenchLenPx * (1 - belowActualFrac)));
  if (hasAbove && params.excavAbove.truckFromRight) minDistFromRight = Math.min(minDistFromRight, Math.round(trenchLenPx * (1 - aboveActualFrac)));

  // Ekstra sidemargin berre for korte grøfter der lastebilen stikk utanfor
  const truckXMarginLeft  = hasTruckLeft  ? Math.max(0, truckHalfExt - minDistFromLeft)  : 0;
  const truckXMarginRight = hasTruckRight ? Math.max(0, truckHalfExt - minDistFromRight) : 0;

  const showMassehaugAbove = params.showMassehaug;
  const showMassehaugBelow = params.massehaugBelow ?? false;

  // Ekstra horisontalt rom for endemaskin + lastebil "rett inn frå enden"
  // Belt-framkant (arm-sida) er 45 % av breidda frå arm-sida → 5 % av W frå senter.
  const excavBeltNearH = Math.round(0.05 * excavW); // senter→belt-framkant (horisontal, rot=0/180)
  const endExcavHalfW  = Math.round(excavW / 2);
  const leftEndPad  = hasLeft
    ? excavDPx + excavBeltNearH + endExcavHalfW +
      ((params.excavLeft?.truckStraight  ?? false) ? (endExcavHalfW + 4 + truckW) : 0) + 8
    : 0;
  const rightEndPad = hasRight
    ? excavDPx + excavBeltNearH + endExcavHalfW +
      ((params.excavRight?.truckStraight ?? false) ? (endExcavHalfW + 4 + truckW) : 0) + 8
    : 0;

  // Ekstra vertikalt rom for endemasin-lastebil "ovenfra/nedenfra"
  const hasEndTruckAbove = (hasLeft  && (params.excavLeft?.truckFromAbove  ?? false)) ||
                           (hasRight && (params.excavRight?.truckFromAbove ?? false));
  const hasEndTruckBelow = (hasLeft  && (params.excavLeft?.truckFromBelow  ?? false)) ||
                           (hasRight && (params.excavRight?.truckFromBelow ?? false));

  const dimMarginLeft = (showMassehaugAbove || showMassehaugBelow) ? 52 : 36;
  const leftPad  = dimMarginLeft + truckXMarginLeft  + leftEndPad;
  const rightPad = 28            + truckXMarginRight + rightEndPad;
  const topMarginBase = 44;
  // Endemaskin-lastebil ovanfrå/nedanfrå: ankrast til gravemaskinkroppen (cy ± excavH/2).
  // Lastebilen er X-forskyvd til venstre/høgre for grøfta → ingen visuell konflikt med grøfta.
  // Nødvendig marg = lastebil-lengd + halvkropp-utstrekning frå trenchCY + klaring.
  const endTruckVertExtra = Math.round(excavH / 2 + trenchTopWPx / 2 + 8);
  const topMargin    = hasEndTruckAbove
    ? Math.max(topMarginBase, truckW + endTruckVertExtra)
    : topMarginBase;
  const bottomMarginBase = showMassehaugBelow ? 38 + massehaugWPx + massehaugDPx : 38;
  const bottomMargin = hasEndTruckBelow
    ? Math.max(bottomMarginBase, truckW + endTruckVertExtra)
    : bottomMarginBase;

  const trenchX1 = leftPad;
  const trenchX2 = trenchX1 + trenchLenPx;
  const svgW     = trenchX2 + rightPad;

  // ─── Y-layout ────────────────────────────────────────────────────────────────
  const beltNear = (rot: 0|90|180|270) =>
    (rot === 90 || rot === 270) ? Math.round(excavH * 0.3) : EXCAV_BODY_FRAC_Y * excavH;
  const beltFarBelow = (rot: 0|90|180|270) =>
    rot === 90  ? EXCAV_ARM_REACH_FRAC * excavW :
    rot === 270 ? EXCAV_BODY_FRAC_X * excavW :
    (1 - EXCAV_BODY_FRAC_Y) * excavH;
  const beltFarAbove = (rot: 0|90|180|270) =>
    rot === 270 ? EXCAV_ARM_REACH_FRAC * excavW :
    rot === 90  ? EXCAV_BODY_FRAC_X * excavW :
    EXCAV_BODY_FRAC_Y * excavH;

  let curY = topMargin;

  // Massehaug ovanfor
  const massehaugAboveY1 = curY;
  const massehaugAboveY2 = showMassehaugAbove ? massehaugAboveY1 + massehaugWPx : massehaugAboveY1;
  if (showMassehaugAbove) curY = massehaugAboveY2 + massehaugDPx;

  // Gravemaskin ovanfor — arm mot grøfta (rot=90), hytta peikar nord
  if (hasAbove) {
    const rot = params.excavAbove.rotation;
    if (params.excavAbove.truckStraight) {
      curY += excavDPx + Math.round(beltNear(rot)) + 4 + truckW;
    } else {
      curY += Math.round(beltFarAbove(rot)) + Math.round(beltNear(rot)) + excavDPx;
    }
  }

  const trenchY1 = curY;
  const trenchY2 = trenchY1 + trenchTopWPx;
  curY = trenchY2;

  // Gravemaskin nedanfor — arm mot grøfta (rot=270), hytta peikar sør
  if (hasBelow) {
    const rot = params.excavBelow.rotation;
    if (params.excavBelow.truckStraight) {
      curY += excavDPx + Math.round(beltNear(rot)) + 4 + truckW;
    } else {
      curY += excavDPx + Math.round(beltNear(rot)) + Math.round(beltFarBelow(rot));
    }
  }

  // Massehaug nedanfor
  const massehaugBelowY1 = curY + (showMassehaugBelow ? massehaugDPx : 0);
  const massehaugBelowY2 = showMassehaugBelow ? massehaugBelowY1 + massehaugWPx : massehaugBelowY1;
  if (showMassehaugBelow) curY = massehaugBelowY2;

  const svgContentH = curY + bottomMargin;

  // Faktiske Y-senter
  const excavAboveCY = hasAbove
    ? Math.round(trenchY1 - excavDPx - beltNear(params.excavAbove.rotation))
    : 0;
  const excavBelowCY = hasBelow
    ? Math.round(trenchY2 + excavDPx + beltNear(params.excavBelow.rotation))
    : 0;

  // Forskyv gravemaskinar horisontalt om begge sider er aktive — unngår arm-kollisjon
  const excavBelowCX = Math.round(trenchX1 + trenchLenPx * belowActualFrac);
  const excavAboveCX = Math.round(trenchX1 + trenchLenPx * aboveActualFrac);

  // ─── Rømningsvegar ───────────────────────────────────────────────────────────
  const escapeCount    = Math.max(2, Math.ceil(params.trenchLengthM / 25) + 1);
  const escapePosX     = Array.from({ length: escapeCount }, (_, i) =>
    Math.round(trenchX1 + (i / (escapeCount - 1)) * trenchLenPx)
  );
  const escapeSpacingM = params.trenchLengthM / (escapeCount - 1);

  const titleY = svgContentH;
  const svgH   = titleY + TITLE_BLOCK_H;
  const col2   = Math.round(svgW * 0.33);
  const col3   = Math.round(svgW * 0.62);
  const barM   = ppm >= 15 ? 5 : 10;
  const barPx  = Math.round(barM * ppm);
  const bx     = svgW - Math.min(rightPad - 4, barPx + 20);
  const by     = titleY - 22;

  const mkId = (s: string) => `${s}-${uid}`;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%"
      style={{ fontFamily: "Arial, sans-serif", background: "white", display: "block" }}>
      <defs>
        {/* Felles knockout-filter for alle køyretøy — ingen maske */}
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values={KNOCKOUT_VALUES} result="k" />
          <feComponentTransfer in="k" colorInterpolationFilters="sRGB">
            <feFuncA type="linear" slope={ALPHA_BOOST} intercept={0} />
          </feComponentTransfer>
        </filter>
        <marker id={mkId("arr")} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <polygon points="0,0 7,3.5 0,7" fill="#374151" />
        </marker>
        <marker id={mkId("arr-rev")} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <polygon points="0,0 7,3.5 0,7" fill="#374151" />
        </marker>
        <marker id={mkId("arr-red")} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <polygon points="0,0 7,3.5 0,7" fill="#dc2626" />
        </marker>
        <pattern id={mkId("soil")} width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#d4b896" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#b8976a" strokeWidth={1.5} />
        </pattern>
      </defs>

      <rect x={0} y={0} width={svgW} height={svgContentH} fill="#eef3e8" />

      {/* ─── Massehaug OVANFOR ───────────────────────────────────────────────── */}
      {showMassehaugAbove && (
        <>
          <rect x={trenchX1} y={massehaugAboveY1} width={trenchLenPx} height={massehaugWPx}
            fill={`url(#${mkId("soil")})`} stroke="#b8976a" strokeWidth={1.5} />
          <text x={trenchX1 - 6} y={Math.round((massehaugAboveY1 + massehaugAboveY2) / 2) + 4}
            fontSize={9} fill="#6b5a3e" textAnchor="end">Massehaug</text>
          {!hasAbove && massehaugDPx > 4 && (() => {
            const dx = trenchX1 - 20;
            const my = Math.round((massehaugAboveY2 + trenchY1) / 2);
            return (
              <g>
                <line x1={dx} y1={massehaugAboveY2} x2={dx} y2={trenchY1}
                  stroke="#374151" strokeWidth={1}
                  markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
                <text x={dx - 3} y={my + 4} fontSize={8} fill="#374151" textAnchor="middle"
                  transform={`rotate(-90 ${dx - 3} ${my + 4})`}>
                  {params.massehaugDistM.toFixed(1)} m
                </text>
              </g>
            );
          })()}
        </>
      )}

      {/* ─── Gravemaskin OVANFOR — teikna ETTER massehaug, FØR grøft for nå ─── */}
      {/* NB: vert teikna om att ETTER grøfta nedanfor, for å vise arm over grøft */}

      {/* ─── Grøft ──────────────────────────────────────────────────────────── */}
      <rect x={trenchX1} y={trenchY1} width={trenchLenPx} height={trenchTopWPx}
        fill="white" stroke="#1e293b" strokeWidth={2.5} />
      {trenchBotWPx < trenchTopWPx - 6 && (
        <rect x={trenchX1} y={trenchY1 + Math.round((trenchTopWPx - trenchBotWPx) / 2)}
          width={trenchLenPx} height={trenchBotWPx}
          fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />
      )}

      {/* Breidde-dim */}
      {(() => {
        const dx = trenchX1 - ((showMassehaugAbove || showMassehaugBelow) && massehaugDPx > 4 && !hasAbove ? 36 : 20);
        const my = Math.round((trenchY1 + trenchY2) / 2);
        return (
          <g>
            <line x1={dx} y1={trenchY1} x2={dx} y2={trenchY2} stroke="#374151" strokeWidth={1.5}
              markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
            <line x1={dx} y1={trenchY1} x2={trenchX1} y2={trenchY1} stroke="#374151" strokeWidth={1} />
            <line x1={dx} y1={trenchY2} x2={trenchX1} y2={trenchY2} stroke="#374151" strokeWidth={1} />
            <text x={dx - 4} y={my + 4} fontSize={10} fill="#1e293b" fontWeight="bold" textAnchor="middle"
              transform={`rotate(-90 ${dx - 4} ${my + 4})`}>
              {topWidthM.toFixed(1)} m
            </text>
          </g>
        );
      })()}

      {/* Belte-avstand dim */}
      {hasBelow && excavDPx > 4 && (() => {
        const dx = trenchX2 + 18;
        const beltEdgeY = Math.round(excavBelowCY - beltNear(params.excavBelow.rotation));
        const my = Math.round((trenchY2 + beltEdgeY) / 2);
        return (
          <g>
            <line x1={dx} y1={trenchY2} x2={dx} y2={beltEdgeY}
              stroke="#78350f" strokeWidth={1}
              markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
            <text x={dx - 3} y={my + 4} fontSize={8} fill="#78350f" textAnchor="end">
              {params.excavDistM.toFixed(1)} m
            </text>
          </g>
        );
      })()}

      {/* ─── Rømningsvegar ──────────────────────────────────────────────────── */}
      {escapePosX.map((ex, i) => (
        <g key={i}>
          <line x1={ex} y1={trenchY1 - 8} x2={ex} y2={trenchY2 + 8} stroke="#1e3a8a" strokeWidth={1.5} />
          <circle cx={ex} cy={trenchY1 - 20} r={10} fill="#dbeafe" stroke="#1e3a8a" strokeWidth={1.5} />
          <text x={ex} y={trenchY1 - 16} fontSize={8} fill="#1e3a8a" textAnchor="middle" fontWeight="bold">{i + 1}</text>
          <text x={ex} y={trenchY1 - 34} fontSize={7} fill="#1e3a8a" textAnchor="middle">Rømn.</text>
        </g>
      ))}
      <text x={trenchX2 - 8} y={trenchY1 + 14} fontSize={9} fill="#1e3a8a" fontWeight="bold" textAnchor="end">
        {escapeCount} rømningsvegar
      </text>
      <text x={trenchX2 - 8} y={trenchY1 + 26} fontSize={8} fill="#6b7280" textAnchor="end">
        maks {escapeSpacingM.toFixed(0)} m mellom
      </text>

      {/* ─── Gravemaskin OVANFOR — teikna ETTER grøfta → arm vises over grøftekanten ── */}
      <SideDraw
        cfg={params.excavAbove} side="above"
        excavCx={excavAboveCX} excavCy={excavAboveCY}
        excavW={excavW} excavH={excavH} truckW={truckW} truckH={truckH}
        trenchX1={trenchX1} filterId={filterId}
      />

      {/* ─── Gravemaskin NEDANFOR ────────────────────────────────────────────── */}
      <SideDraw
        cfg={params.excavBelow} side="below"
        excavCx={excavBelowCX} excavCy={excavBelowCY}
        excavW={excavW} excavH={excavH} truckW={truckW} truckH={truckH}
        trenchX1={trenchX1} filterId={filterId}
      />

      {/* ─── Gravemaskin VENSTRE ENDE (rot=0, arm mot høgre/grøfta) ───────────── */}
      {hasLeft && (() => {
        const cfg = params.excavLeft!;
        const trenchCY = Math.round((trenchY1 + trenchY2) / 2);
        const cx = trenchX1 - excavDPx - excavBeltNearH;
        const cy = trenchCY;
        const bx = Math.round(cx - excavW / 2);
        const by = Math.round(cy - excavH / 2);
        const gap = 8;

        // Lastebil rett inn (rot=180 → dump peiker mot gravemaskin til høgre)
        const truckStraightCX = Math.round(cx - endExcavHalfW - 4 - truckW / 2);
        const truckStraightBx = Math.round(truckStraightCX - truckW / 2);
        const truckStraightBy = Math.round(cy - truckH / 2);

        // Lastebil ovenfra/nedanfrå: X til venstre for gravemaskinkroppen, Y tett inntil kroppen
        const truckEndXShift = Math.round(excavW * 0.30);
        // Lastebil ovenfra (rot=270 → dump peiker sørover mot gravemaskinen)
        const truckAboveCY = Math.round(cy - excavH / 2 + 30 - truckW / 2);
        const truckAbovePX = cx - truckEndXShift;
        const truckAboveBx = Math.round(truckAbovePX - truckW / 2);
        const truckAboveBy = Math.round(truckAboveCY - truckH / 2);

        // Lastebil nedanfrå (rot=90 → dump peiker nordover mot gravemaskinen)
        const truckBelowCY = Math.round(cy + excavH / 2 - 30 + truckW / 2);
        const truckBelowPX = cx - truckEndXShift;
        const truckBelowBx = Math.round(truckBelowPX - truckW / 2);
        const truckBelowBy = Math.round(truckBelowCY - truckH / 2);

        return (
          <g>
            {cfg.truckStraight && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckStraightBx} by={truckStraightBy} W={truckW} H={truckH}
                rotation={180} px={truckStraightCX} py={cy} filterId={filterId} />
            )}
            {cfg.truckFromAbove && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckAboveBx} by={truckAboveBy} W={truckW} H={truckH}
                rotation={270} px={truckAbovePX} py={truckAboveCY} filterId={filterId} />
            )}
            {cfg.truckFromBelow && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckBelowBx} by={truckBelowBy} W={truckW} H={truckH}
                rotation={90} px={truckBelowPX} py={truckBelowCY} filterId={filterId} />
            )}
            <VehiclePng href={EXCAVATOR_TOP_PNG}
              bx={bx} by={by} W={excavW} H={excavH}
              rotation={0} px={cx} py={cy} filterId={filterId} />
            <text x={trenchX1 - leftEndPad + 6} y={cy + 4} fontSize={9} fill="#78350f" textAnchor="start">
              Gravemaskin
            </text>
          </g>
        );
      })()}

      {/* ─── Gravemaskin HØGRE ENDE (rot=180, arm mot venstre/grøfta) ──────────── */}
      {hasRight && (() => {
        const cfg = params.excavRight!;
        const trenchCY = Math.round((trenchY1 + trenchY2) / 2);
        const cx = trenchX2 + excavDPx + excavBeltNearH;
        const cy = trenchCY;
        const bx = Math.round(cx - excavW / 2);
        const by = Math.round(cy - excavH / 2);
        const gap = 8;

        // Lastebil rett inn (rot=0 → dump peiker mot gravemaskin til venstre)
        const truckStraightCX = Math.round(cx + endExcavHalfW + 4 + truckW / 2);
        const truckStraightBx = Math.round(truckStraightCX - truckW / 2);
        const truckStraightBy = Math.round(cy - truckH / 2);

        // Lastebil ovenfra/nedanfrå: X til høgre for gravemaskinkroppen, Y tett inntil kroppen
        const truckEndXShift = Math.round(excavW * 0.30);
        // Lastebil ovenfra (rot=270 → dump peikar sørover mot gravemaskinen)
        const truckAboveCY = Math.round(cy - excavH / 2 + 30 - truckW / 2);
        const truckAbovePX = cx + truckEndXShift;
        const truckAboveBx = Math.round(truckAbovePX - truckW / 2);
        const truckAboveBy = Math.round(truckAboveCY - truckH / 2);

        // Lastebil nedanfrå (rot=90 → dump peikar nordover mot gravemaskinen)
        const truckBelowCY = Math.round(cy + excavH / 2 - 30 + truckW / 2);
        const truckBelowPX = cx + truckEndXShift;
        const truckBelowBx = Math.round(truckBelowPX - truckW / 2);
        const truckBelowBy = Math.round(truckBelowCY - truckH / 2);

        return (
          <g>
            {cfg.truckStraight && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckStraightBx} by={truckStraightBy} W={truckW} H={truckH}
                rotation={0} px={truckStraightCX} py={cy} filterId={filterId} />
            )}
            {cfg.truckFromAbove && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckAboveBx} by={truckAboveBy} W={truckW} H={truckH}
                rotation={270} px={truckAbovePX} py={truckAboveCY} filterId={filterId} />
            )}
            {cfg.truckFromBelow && (
              <VehiclePng href={TRUCK_TOP_PNG}
                bx={truckBelowBx} by={truckBelowBy} W={truckW} H={truckH}
                rotation={90} px={truckBelowPX} py={truckBelowCY} filterId={filterId} />
            )}
            <VehiclePng href={EXCAVATOR_TOP_PNG}
              bx={bx} by={by} W={excavW} H={excavH}
              rotation={180} px={cx} py={cy} filterId={filterId} />
            <text x={trenchX2 + rightEndPad - 6} y={cy + 4} fontSize={9} fill="#78350f" textAnchor="end">
              Gravemaskin
            </text>
          </g>
        );
      })()}

      {/* ─── Massehaug NEDANFOR ─────────────────────────────────────────────── */}
      {showMassehaugBelow && (
        <>
          <rect x={trenchX1} y={massehaugBelowY1} width={trenchLenPx} height={massehaugWPx}
            fill={`url(#${mkId("soil")})`} stroke="#b8976a" strokeWidth={1.5} />
          <text x={trenchX1 - 6} y={Math.round((massehaugBelowY1 + massehaugBelowY2) / 2) + 4}
            fontSize={9} fill="#6b5a3e" textAnchor="end">Massehaug</text>
        </>
      )}

      {/* ─── Lengde-dim ─────────────────────────────────────────────────────── */}
      {(() => {
        const dy = svgContentH - 18;
        return (
          <g>
            <line x1={trenchX1} y1={dy} x2={trenchX2} y2={dy} stroke="#374151" strokeWidth={1.5}
              markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
            <line x1={trenchX1} y1={dy - 6} x2={trenchX1} y2={dy + 6} stroke="#374151" strokeWidth={1} />
            <line x1={trenchX2} y1={dy - 6} x2={trenchX2} y2={dy + 6} stroke="#374151" strokeWidth={1} />
            <text x={Math.round((trenchX1 + trenchX2) / 2)} y={dy - 5}
              fontSize={11} fill="#1e293b" fontWeight="bold" textAnchor="middle">
              {params.trenchLengthM.toFixed(0)} m
            </text>
          </g>
        );
      })()}

      {/* ─── Skalabar ───────────────────────────────────────────────────────── */}
      {bx + barPx < svgW - 4 && (
        <g>
          <rect x={bx} y={by} width={Math.round(barPx / 2)} height={6} fill="#374151" />
          <rect x={bx + Math.round(barPx / 2)} y={by} width={Math.round(barPx / 2)} height={6}
            fill="white" stroke="#374151" strokeWidth={1} />
          <text x={bx} y={by - 4} fontSize={8} fill="#374151">0</text>
          <text x={bx + Math.round(barPx / 2)} y={by - 4} fontSize={8} fill="#374151" textAnchor="middle">{barM / 2} m</text>
          <text x={bx + barPx} y={by - 4} fontSize={8} fill="#374151" textAnchor="end">{barM} m</text>
        </g>
      )}

      {/* ─── Tittelblokk ────────────────────────────────────────────────────── */}
      <rect x={0} y={titleY} width={svgW} height={TITLE_BLOCK_H} fill="#f8fafc" />
      <line x1={0} y1={titleY} x2={svgW} y2={titleY} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={col2} y1={titleY} x2={col2} y2={svgH} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={col3} y1={titleY} x2={col3} y2={svgH} stroke="#cbd5e1" strokeWidth={1} />

      <text x={8} y={titleY + 16} fontSize={9} fill="#6b7280">Prosjekt</text>
      <text x={8} y={titleY + 32} fontSize={12} fill="#1e293b" fontWeight="bold">{params.projectName || "—"}</text>
      <text x={8} y={titleY + 46} fontSize={10} fill="#374151">{params.location || ""}</text>
      {params.notes && <text x={8} y={titleY + 60} fontSize={9} fill="#6b7280" fontStyle="italic">{params.notes}</text>}

      <text x={col2 + 8} y={titleY + 16} fontSize={9} fill="#6b7280">Planskisse</text>
      <text x={col2 + 8} y={titleY + 32} fontSize={11} fill="#1e293b" fontWeight="bold">{WORK_TYPE_LABELS[params.workType]}</text>
      <text x={col2 + 8} y={titleY + 46} fontSize={10} fill="#374151">Lengd: {params.trenchLengthM.toFixed(0)} m</text>
      <text x={col2 + 8} y={titleY + 60} fontSize={10} fill="#374151">{escapeCount} rømningsvegar (1 per 25 m)</text>

      <text x={col3 + 8} y={titleY + 16} fontSize={9} fill="#6b7280">Dato</text>
      <text x={col3 + 8} y={titleY + 32} fontSize={11} fill="#1e293b">{params.date || "—"}</text>
      <text x={col3 + 8} y={titleY + 48} fontSize={9} fill="#6b7280">Sikring</text>
      <text x={col3 + 8} y={titleY + 62} fontSize={10} fill="#1e293b">{SECURING_METHOD_LABELS[params.securingMethod]}</text>
    </svg>
  );
}
