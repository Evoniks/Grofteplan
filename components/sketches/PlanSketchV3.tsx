"use client";

import { useId } from "react";
import type { SketchV3Params, ExcavSideConfig } from "@/lib/sketch-v3";
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

// SVG-filter: gjer kvit/lys bakgrunn gjennomsiktig (same som AssetIcons.tsx)
const KNOCKOUT_VALUES = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 2.88";
const ALPHA_BOOST     = 2.35;

// Pivotpunkt for gravemaskin: belte/understell-senter inni PNG-en.
// PNG default: arm peikar HØGRE. Understell er i venstre del av biletet.
// bodyFracX=0.22 → understellsenter er 22% inn frå venstre kant av PNG.
// bodyFracY=0.50 → understellsenter er vertikalt midt i PNG.
const EXCAV_BODY_FRAC_X = 0.22;
const EXCAV_BODY_FRAC_Y = 0.50;

// Arm-rekkevidde frå understell-senter til armspiss (76% av PNG-breidde)
const EXCAV_ARM_REACH_FRAC = 0.76;

// Lastebil: dump-senter (lasteplan) er 15% av truckW inn frå VENSTRE av truck-PNG (rotation=0)
// Ved rotation=180: dump-senter er 15% frå høgre = 85% frå venstre
const TRUCK_DUMP_FRAC = 0.15;

function VehicleDefs({ fid, mid, href, bx, by, W, H }: {
  fid: string; mid: string; href: string;
  bx: number; by: number; W: number; H: number;
}) {
  return (
    <>
      <filter id={fid} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values={KNOCKOUT_VALUES} result="k" />
        <feComponentTransfer in="k" colorInterpolationFilters="sRGB">
          <feFuncA type="linear" slope={ALPHA_BOOST} intercept={0} />
        </feComponentTransfer>
      </filter>
      <mask id={mid} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
        <image href={href} x={bx} y={by} width={W} height={H} preserveAspectRatio="xMidYMid meet" />
      </mask>
    </>
  );
}

/**
 * Teiknar eit køyretøy-PNG med rotasjon rundt eit valgt pivotpunkt (px, py).
 * bx, by = øvre venstre hjørne av biletet i LOCAL (urotert) koordinatsystem.
 * px, py = pivot-punkt (rotert rundt dette punktet).
 */
function VehiclePng({ href, bx, by, W, H, rotation, px, py, fid, mid }: {
  href: string; bx: number; by: number; W: number; H: number;
  rotation: number; px: number; py: number; fid: string; mid: string;
}) {
  return (
    <g transform={`rotate(${rotation} ${px} ${py})`}>
      <image href={href} x={bx} y={by} width={W} height={H}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${fid})`} mask={`url(#${mid})`} />
    </g>
  );
}

function ReversePath({ from, to, uid }: {
  from: { x: number; y: number }; to: { x: number; y: number }; uid: string;
}) {
  const d = `M${Math.round(from.x)},${Math.round(from.y)} L${Math.round(to.x)},${Math.round(from.y)} L${Math.round(to.x)},${Math.round(to.y)}`;
  return <path d={d} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6 4" markerEnd={`url(#arr-red-${uid})`} />;
}

// ─── Hjelpefunksjon: teiknar éi side (excav + lastebil) ─────────────────────
interface SideDrawProps {
  cfg: ExcavSideConfig;
  side: "below" | "above";
  excavCx: number;         // X-senter gravemaskin (frå pos)
  excavCy: number;         // Y-senter gravemaskin
  excavW: number;
  excavH: number;
  truckW: number;
  truckH: number;
  trenchX1: number;
  trenchX2: number;
  uid: string;
  efid: string; emid: string;      // excav filter/mask id
  trfLid: string; trmLid: string;  // truck-left filter/mask
  trfRid: string; trmRid: string;  // truck-right filter/mask
}

function SideDraw({
  cfg, side, excavCx, excavCy, excavW, excavH,
  truckW, truckH, trenchX1, trenchX2, uid,
  efid, emid, trfLid, trmLid, trfRid, trmRid,
}: SideDrawProps) {
  if (!cfg.enabled) return null;

  const rot = cfg.rotation;

  // Gravemaskin-bilete: pivot er understell-senter (excavCx, excavCy)
  const excavBx = Math.round(excavCx - EXCAV_BODY_FRAC_X * excavW);
  const excavBy = Math.round(excavCy - EXCAV_BODY_FRAC_Y * excavH);

  // Armspiss = EXCAV_ARM_REACH_FRAC * W frå understell-senter
  const armReach = excavW * EXCAV_ARM_REACH_FRAC;

  // Dump-senter på lastebil (rotation=0) er TRUCK_DUMP_FRAC frå VENSTRE kant
  // = (TRUCK_DUMP_FRAC - 0.5)*truckW frå senter = 0.35*truckW til VENSTRE for senter
  // Vi vil ha dump-senter VED armspiss:
  //   truckRight senter = armspiss + (0.5 − TRUCK_DUMP_FRAC)*truckW = armspiss + 0.35*truckW
  //   truckLeft  senter = armspiss − (0.5 − TRUCK_DUMP_FRAC)*truckW = armspiss − 0.35*truckW
  const dumpToCenter = (0.5 - TRUCK_DUMP_FRAC) * truckW; // 0.35 * truckW

  // Truck frå VENSTRE (arm rot=180; dump på HØGRE side av rot=180-truck = +0.35 frå senter)
  const truckLeftCX  = Math.round(excavCx - armReach - dumpToCenter);
  const truckLeftROT = 180;
  const truckLeftBx  = Math.round(truckLeftCX - truckW / 2);
  const truckLeftBy  = Math.round(excavCy     - truckH / 2);

  // Truck frå HØGRE (arm rot=0; dump på VENSTRE side = −0.35 frå senter)
  const truckRightCX  = Math.round(excavCx + armReach + dumpToCenter);
  const truckRightROT = 0;
  const truckRightBx  = Math.round(truckRightCX - truckW / 2);
  const truckRightBy  = Math.round(excavCy       - truckH / 2);

  return (
    <>
      {/* Gravemaskin — roterer rundt understell-senter (excavCx, excavCy) */}
      <VehiclePng
        href={EXCAVATOR_TOP_PNG}
        bx={excavBx} by={excavBy}
        W={excavW} H={excavH}
        rotation={rot}
        px={Math.round(excavCx)} py={Math.round(excavCy)}
        fid={efid} mid={emid}
      />
      <text x={trenchX1 - 6} y={Math.round(excavCy) + 4} fontSize={9} fill="#78350f" textAnchor="end">
        Gravemaskin
      </text>

      {/* Lastebil frå VENSTRE */}
      {cfg.truckFromLeft && (
        <>
          <VehiclePng href={TRUCK_TOP_PNG}
            bx={truckLeftBx} by={truckLeftBy} W={truckW} H={truckH}
            rotation={truckLeftROT}
            px={truckLeftCX} py={Math.round(excavCy)}
            fid={trfLid} mid={trmLid} />
          <ReversePath
            from={{ x: Math.round(truckLeftCX + truckW * 0.50), y: Math.round(excavCy) }}
            to={{ x: trenchX1, y: Math.round(excavCy) }}
            uid={`L${uid}`}
          />
        </>
      )}

      {/* Lastebil frå HØGRE */}
      {cfg.truckFromRight && (
        <>
          <VehiclePng href={TRUCK_TOP_PNG}
            bx={truckRightBx} by={truckRightBy} W={truckW} H={truckH}
            rotation={truckRightROT}
            px={truckRightCX} py={Math.round(excavCy)}
            fid={trfRid} mid={trmRid} />
          <ReversePath
            from={{ x: Math.round(truckRightCX - truckW * 0.50), y: Math.round(excavCy) }}
            to={{ x: trenchX2, y: Math.round(excavCy) }}
            uid={`R${uid}`}
          />
        </>
      )}
    </>
  );
}

export function PlanSketchV3({ params }: { params: SketchV3Params }) {
  const uid = useId().replace(/:/g, "");

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

  // ─── Gravemaskin X-posisjon per side ────────────────────────────────────────
  const fracOf = (pos: "left" | "center" | "right") =>
    pos === "left" ? 0.2 : pos === "right" ? 0.8 : 0.5;

  // ─── X-marginar ──────────────────────────────────────────────────────────────
  // Truck-ytterkant = armspiss ± (0.5 + (0.5−TRUCK_DUMP_FRAC))*truckW = ± (1−0.15)*truckW = ±0.85*truckW
  // frå excavCx ± 0.76*excavW ± 0.35*truckW (dump-senter ved armspiss) ± 0.5*truckW (half-width)
  // = excavCx ± (0.76*excavW + 0.85*truckW)
  const truckXMargin = Math.round(excavW * EXCAV_ARM_REACH_FRAC + truckW * 0.85);
  const hasTruckRight = hasBelow && params.excavBelow.truckFromRight ||
                        hasAbove && params.excavAbove.truckFromRight;
  const hasTruckLeft  = hasBelow && params.excavBelow.truckFromLeft  ||
                        hasAbove && params.excavAbove.truckFromLeft;

  const dimMarginLeft = params.showMassehaug ? 52 : 36;
  const leftPad  = dimMarginLeft + (hasTruckLeft  ? truckXMargin : 0);
  const rightPad = 16            + (hasTruckRight ? truckXMargin : 0);
  const topMargin    = 44;
  const bottomMargin = 38;

  const trenchX1 = leftPad;
  const trenchX2 = trenchX1 + trenchLenPx;
  const svgW     = trenchX2 + rightPad;

  // ─── Y-layout: BELTE-KANT = excavDPx frå grøftkant (avheng av rotasjon) ────
  // Halvdistansen frå pivot til nærmaste belte-kant (mot grøfta):
  //   rot 0°/180°: EXCAV_BODY_FRAC_Y * H  (belte topp/botn i orig. orientering)
  //   rot 90°/270°: EXCAV_BODY_FRAC_X * W  (belte framkant/-bakre etter rotasjon)
  // Halvdistansen frå pivot til fjernaste kant (bort frå grøfta):
  //   rot 0°/180°: (1−EXCAV_BODY_FRAC_Y) * H  ≈ 0.5*H
  //   rot 90° (arm bort frå grøft): EXCAV_ARM_REACH_FRAC * W  (arm strekk seg langt)
  //   rot 270° (arm mot grøft): EXCAV_BODY_FRAC_X * W

  const beltNear = (rot: 0|90|180|270) =>
    (rot === 90 || rot === 270) ? EXCAV_BODY_FRAC_X * excavW : EXCAV_BODY_FRAC_Y * excavH;
  const beltFarBelow = (rot: 0|90|180|270) =>
    rot === 90  ? EXCAV_ARM_REACH_FRAC * excavW :
    rot === 270 ? EXCAV_BODY_FRAC_X * excavW :
    (1 - EXCAV_BODY_FRAC_Y) * excavH;
  const beltFarAbove = (rot: 0|90|180|270) =>
    rot === 270 ? EXCAV_ARM_REACH_FRAC * excavW :
    rot === 90  ? EXCAV_BODY_FRAC_X * excavW :
    EXCAV_BODY_FRAC_Y * excavH;

  let curY = topMargin;

  // Massehaug
  const massehaugY1 = curY;
  const massehaugY2 = params.showMassehaug ? massehaugY1 + massehaugWPx : massehaugY1;
  if (params.showMassehaug) curY = massehaugY2 + massehaugDPx;

  // Gravemaskin ovanfor: legg til [fjernaste kant → pivot → næraste kant → excavDPx]
  if (hasAbove) {
    const rot = params.excavAbove.rotation;
    curY += Math.round(beltFarAbove(rot)) + Math.round(beltNear(rot)) + excavDPx;
  }

  const trenchY1 = curY;
  const trenchY2 = trenchY1 + trenchTopWPx;
  curY = trenchY2;

  // Gravemaskin nedanfor: [excavDPx → næraste kant → pivot → fjernaste kant]
  if (hasBelow) {
    const rot = params.excavBelow.rotation;
    curY += excavDPx + Math.round(beltNear(rot)) + Math.round(beltFarBelow(rot));
  }

  const svgContentH = curY + bottomMargin;

  // Faktiske Y-senter: pivot slik at belte-kant er nøyaktig excavDPx frå grøft
  const excavAboveCY = hasAbove
    ? Math.round(trenchY1 - excavDPx - beltNear(params.excavAbove.rotation))
    : 0;
  const excavBelowCY = hasBelow
    ? Math.round(trenchY2 + excavDPx + beltNear(params.excavBelow.rotation))
    : 0;

  // X-senter
  const excavBelowCX = Math.round(trenchX1 + trenchLenPx * fracOf(params.excavBelow.pos));
  const excavAboveCX = Math.round(trenchX1 + trenchLenPx * fracOf(params.excavAbove.pos));

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

  // ─── Unike ID-ar for filter/mask ─────────────────────────────────────────────
  const mkId = (s: string) => `${s}-${uid}`;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%"
      style={{ fontFamily: "Arial, sans-serif", background: "white", display: "block" }}>
      <defs>
        {/* Gravemaskin ovanfor — bilete-øvre-venstre = body-pivot − frac*W/H */}
        {hasAbove && <VehicleDefs fid={mkId("eaf")} mid={mkId("eam")} href={EXCAVATOR_TOP_PNG}
          bx={Math.round(excavAboveCX - EXCAV_BODY_FRAC_X * excavW)}
          by={Math.round(excavAboveCY - EXCAV_BODY_FRAC_Y * excavH)} W={excavW} H={excavH} />}
        {/* Gravemaskin nedanfor */}
        {hasBelow && <VehicleDefs fid={mkId("ebf")} mid={mkId("ebm")} href={EXCAVATOR_TOP_PNG}
          bx={Math.round(excavBelowCX - EXCAV_BODY_FRAC_X * excavW)}
          by={Math.round(excavBelowCY - EXCAV_BODY_FRAC_Y * excavH)} W={excavW} H={excavH} />}
        {hasAbove && params.excavAbove.truckFromLeft && <VehicleDefs fid={mkId("talfl")} mid={mkId("talml")} href={TRUCK_TOP_PNG}
          bx={Math.round(excavAboveCX - excavW*EXCAV_ARM_REACH_FRAC - (0.5-TRUCK_DUMP_FRAC)*truckW - truckW/2)}
          by={Math.round(excavAboveCY - truckH/2)} W={truckW} H={truckH} />}
        {hasAbove && params.excavAbove.truckFromRight && <VehicleDefs fid={mkId("tafrl")} mid={mkId("tamrl")} href={TRUCK_TOP_PNG}
          bx={Math.round(excavAboveCX + excavW*EXCAV_ARM_REACH_FRAC + (0.5-TRUCK_DUMP_FRAC)*truckW - truckW/2)}
          by={Math.round(excavAboveCY - truckH/2)} W={truckW} H={truckH} />}
        {hasBelow && params.excavBelow.truckFromLeft && <VehicleDefs fid={mkId("tblfl")} mid={mkId("tblml")} href={TRUCK_TOP_PNG}
          bx={Math.round(excavBelowCX - excavW*EXCAV_ARM_REACH_FRAC - (0.5-TRUCK_DUMP_FRAC)*truckW - truckW/2)}
          by={Math.round(excavBelowCY - truckH/2)} W={truckW} H={truckH} />}
        {hasBelow && params.excavBelow.truckFromRight && <VehicleDefs fid={mkId("tbfrl")} mid={mkId("tbmrl")} href={TRUCK_TOP_PNG}
          bx={Math.round(excavBelowCX + excavW*EXCAV_ARM_REACH_FRAC + (0.5-TRUCK_DUMP_FRAC)*truckW - truckW/2)}
          by={Math.round(excavBelowCY - truckH/2)} W={truckW} H={truckH} />}

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

      {/* ─── Massehaug ──────────────────────────────────────────────────────── */}
      {params.showMassehaug && (
        <>
          <rect x={trenchX1} y={massehaugY1} width={trenchLenPx} height={massehaugWPx}
            fill={`url(#${mkId("soil")})`} stroke="#b8976a" strokeWidth={1.5} />
          <text x={trenchX1 - 6} y={Math.round((massehaugY1 + massehaugY2) / 2) + 4}
            fontSize={9} fill="#6b5a3e" textAnchor="end">Massehaug</text>
          {/* Massehaug-avstandsdim: BERRE vis når ingen gravemaskin på ovanfor-sida */}
          {!hasAbove && massehaugDPx > 4 && (() => {
            const dx = trenchX1 - 20;
            const my = Math.round((massehaugY2 + trenchY1) / 2);
            return (
              <g>
                <line x1={dx} y1={massehaugY2} x2={dx} y2={trenchY1}
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

      {/* ─── Gravemaskin + lastebil OVANFOR ─────────────────────────────────── */}
      <SideDraw
        cfg={params.excavAbove} side="above"
        excavCx={excavAboveCX} excavCy={excavAboveCY}
        excavW={excavW} excavH={excavH} truckW={truckW} truckH={truckH}
        trenchX1={trenchX1} trenchX2={trenchX2} uid={uid}
        efid={mkId("eaf")} emid={mkId("eam")}
        trfLid={mkId("talfl")} trmLid={mkId("talml")}
        trfRid={mkId("tafrl")} trmRid={mkId("tamrl")}
      />

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
        const dx = trenchX1 - (params.showMassehaug && massehaugDPx > 4 && !hasAbove ? 36 : 20);
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

      {/* Belte-avstand dim: frå grøftkant til næraste belte-kant (rotasjonsavhengig) */}
      {hasBelow && excavDPx > 4 && (() => {
        const dx = trenchX2 + 18;
        const beltEdgeY = Math.round(excavBelowCY - beltNear(params.excavBelow.rotation));
        const my = Math.round((trenchY2 + beltEdgeY) / 2);
        return (
          <g>
            <line x1={dx} y1={trenchY2} x2={dx} y2={beltEdgeY}
              stroke="#78350f" strokeWidth={1}
              markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
            <text x={dx + 3} y={my + 4} fontSize={8} fill="#78350f" textAnchor="start">
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
      {escapeCount >= 2 && escapePosX[1] - escapePosX[0] > 24 && (() => {
        const ex1 = escapePosX[0], ex2 = escapePosX[1];
        const dy  = trenchY2 + Math.max(8, Math.round(excavDPx / 2));
        return (
          <g>
            <line x1={ex1} y1={dy} x2={ex2} y2={dy} stroke="#1e3a8a" strokeWidth={1}
              markerStart={`url(#${mkId("arr-rev")})`} markerEnd={`url(#${mkId("arr")})`} />
            <text x={Math.round((ex1 + ex2) / 2)} y={dy - 4} fontSize={8} fill="#1e3a8a" textAnchor="middle">
              {escapeSpacingM.toFixed(1)} m
            </text>
          </g>
        );
      })()}
      <text x={trenchX2 + 8} y={trenchY1 + 14} fontSize={9} fill="#1e3a8a" fontWeight="bold">
        {escapeCount} rømningsvegar
      </text>
      <text x={trenchX2 + 8} y={trenchY1 + 26} fontSize={8} fill="#6b7280">
        maks {escapeSpacingM.toFixed(0)} m mellom
      </text>

      {/* ─── Gravemaskin + lastebil NEDANFOR ────────────────────────────────── */}
      <SideDraw
        cfg={params.excavBelow} side="below"
        excavCx={excavBelowCX} excavCy={excavBelowCY}
        excavW={excavW} excavH={excavH} truckW={truckW} truckH={truckH}
        trenchX1={trenchX1} trenchX2={trenchX2} uid={uid}
        efid={mkId("ebf")} emid={mkId("ebm")}
        trfLid={mkId("tblfl")} trmLid={mkId("tblml")}
        trfRid={mkId("tbfrl")} trmRid={mkId("tbmrl")}
      />

      {/* ─── Lengde-dim ─────────────────────────────────────────────────────── */}
      {(() => {
        const dy = svgContentH - Math.round(bottomMargin / 2);
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
