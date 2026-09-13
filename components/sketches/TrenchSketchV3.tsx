"use client";

import { useId } from "react";
import type { SketchV3Params, SketchGeometry } from "@/lib/sketch-v3";
import {
  computeGeometry,
  EXCAV_W_PX,
  EXCAV_H_PX,
  EXCAV_BELT_FRAC,
  EXCAV_FRONT_W,
  EXCAV_FRONT_H,
  EXCAV_FRONT_BELT_FRAC,
  TITLE_BLOCK_H,
  PX_PER_METER,
  SECURING_METHOD_LABELS,
  WORK_TYPE_LABELS,
  GROUND_TYPE_LABELS,
} from "@/lib/sketch-v3";

// Returner fragment — defs-innhald skal leggjast inn i den ytre <defs>
function DimArrowDefs({ id }: { id: string }) {
  return (
    <>
      <marker id={`arr-${id}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
        <polygon points="0,0 7,3.5 0,7" fill="#374151" />
      </marker>
      <marker id={`arr-rev-${id}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
        <polygon points="0,0 7,3.5 0,7" fill="#374151" />
      </marker>
    </>
  );
}

function GroftekasseWalls({ g }: { g: SketchGeometry }) {
  const kasseW = Math.max(6, g.pxPerMeter * 0.08);
  const kasseH = g.depthPx * 1.05;
  const kasseTop = g.groundY - kasseH * 0.05;
  return (
    <g>
      <rect x={g.botLeftX - kasseW} y={kasseTop} width={kasseW} height={kasseH} fill="#9ca3af" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={g.botRightX} y={kasseTop} width={kasseW} height={kasseH} fill="#9ca3af" stroke="#4b5563" strokeWidth={1.5} />
      {[0.25, 0.5, 0.75].map((frac) => {
        const y = kasseTop + kasseH * frac;
        return <line key={frac} x1={g.botLeftX} y1={y} x2={g.botRightX} y2={y} stroke="#6b7280" strokeWidth={3} />;
      })}
      <text x={g.botLeftX - kasseW - 2} y={g.groundY + g.depthPx * 0.5} fontSize={9} fill="#4b5563" textAnchor="end" fontFamily="sans-serif">
        Grøftekasse
      </text>
    </g>
  );
}

function SpuntWalls({ g }: { g: SketchGeometry }) {
  const spuntW = Math.max(7, g.pxPerMeter * 0.1);
  const spuntH = g.depthPx * 1.2;
  const spuntTop = g.groundY - spuntH * 0.1;
  const ridgeCount = Math.max(2, Math.round(g.depthPx / 20));
  return (
    <g>
      {[{ x: g.botLeftX - spuntW }, { x: g.botRightX }].map(({ x }, i) => (
        <g key={i}>
          <rect x={x} y={spuntTop} width={spuntW} height={spuntH} fill="#6b7280" stroke="#374151" strokeWidth={1.5} />
          {Array.from({ length: ridgeCount }).map((_, j) => {
            const ry = spuntTop + (j + 1) * (spuntH / (ridgeCount + 1));
            return <line key={j} x1={x} y1={ry} x2={x + spuntW} y2={ry} stroke="#9ca3af" strokeWidth={1} />;
          })}
        </g>
      ))}
      <text x={g.botLeftX - spuntW - 2} y={g.groundY + g.depthPx * 0.5} fontSize={9} fill="#4b5563" textAnchor="end" fontFamily="sans-serif">
        Spunt
      </text>
    </g>
  );
}


/** Massehaug til venstre for grøfta — reell storleik frå geometri */
function SpoilPile({ g }: { g: SketchGeometry }) {
  const pw = g.massehaugWPx;
  const ph = g.massehaugHPx;
  // Plassert 20 px frå venstre kant, sentrert i rommet mellom kant og grøft
  const px = 20;
  const py = g.groundY;
  const cx = px + pw / 2;

  return (
    <g>
      <ellipse cx={cx} cy={py} rx={pw / 2} ry={ph * 0.2} fill="#c4a870" />
      <path
        d={`M${px},${py} Q${cx - pw * 0.15},${py - ph} ${cx},${py - ph} Q${cx + pw * 0.15},${py - ph} ${px + pw},${py} Z`}
        fill="#d4b896"
        stroke="#b8976a"
        strokeWidth={1.5}
      />
      <text x={cx} y={py + 14} fontSize={10} fill="#6b5a3e" textAnchor="middle" fontFamily="sans-serif" fontStyle="italic">
        Massehaug
      </text>
    </g>
  );
}

/** Gravemaskin i reell storleik til høgre for grøfta (sidevisning) */
function ExcavatorImage({ g }: { g: SketchGeometry }) {
  const ew = EXCAV_W_PX;
  const eh = EXCAV_H_PX;
  const ex = g.excavImageX;
  const ey = g.groundY - eh * EXCAV_BELT_FRAC;
  const cx = ex + ew / 2;

  return (
    <g style={{ mixBlendMode: "multiply" }} transform={`scale(-1 1) translate(${-(2 * cx)} 0)`}>
      <image
        href="/skisse/excavator-side.png"
        x={ex} y={ey} width={ew} height={eh}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

/** Frontvendt gravemaskin sentrert midt over grøfta */
function ExcavatorFrontImage({ g, uid }: { g: SketchGeometry; uid: string }) {
  const W = EXCAV_FRONT_W;
  const H = EXCAV_FRONT_H;
  const filterId = `excav-front-${uid}`;
  // Sentrert over grøfta — venstre og høgre spor utanfor grøftkantane
  const x = g.centerX - W / 2;
  const y = g.groundY - H * EXCAV_FRONT_BELT_FRAC;

  return (
    <g>
      <defs>
        {/* feColorMatrix: A = 5R+5G+5B-1.5 → svart→transparent, farga/grå→ugjennomsiktig */}
        <filter id={filterId} colorInterpolationFilters="sRGB" x="-5%" y="-5%" width="110%" height="110%">
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            5 5 5 0 -1.5
          " />
        </filter>
      </defs>
      <image
        href="/skisse/excavator-front.png"
        x={x} y={y} width={W} height={H}
        filter={`url(#${filterId})`}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

export function TrenchSketchV3({ params }: { params: SketchV3Params }) {
  const uid = useId().replace(/:/g, "");
  const g = computeGeometry(params);

  const soilPatternId = `soil-${uid}`;
  const rockPatternId = `rock-${uid}`;
  const useSoilPattern = params.groundType === "fjell" ? rockPatternId : soilPatternId;
  const dimDepthX = g.topLeftX - 8;
  const titleY = g.svgH - TITLE_BLOCK_H;
  // Skalabar
  const barM = 2;
  const barPx = barM * PX_PER_METER; // 100px = 2m
  const bx = g.svgW - barPx - 20;
  const by = titleY - 22;

  // Tittelblokk-kolonnar
  const col2 = Math.round(g.svgW * 0.33);
  const col3 = Math.round(g.svgW * 0.62);

  return (
    <svg
      viewBox={`0 0 ${g.svgW} ${g.svgH}`}
      width="100%"
      style={{ fontFamily: "Arial, sans-serif", background: "white", display: "block" }}
    >
      <defs>
        <pattern id={soilPatternId} width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#d4b896" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#b8976a" strokeWidth={1.5} />
        </pattern>
        <pattern id={rockPatternId} width="14" height="14" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#9ca3af" />
          <line x1="0" y1="0" x2="14" y2="0" stroke="#6b7280" strokeWidth={2} />
          <line x1="0" y1="7" x2="14" y2="7" stroke="#6b7280" strokeWidth={1} />
        </pattern>
        <DimArrowDefs id={uid} />
      </defs>

      {/* Sky */}
      <rect x={0} y={0} width={g.svgW} height={g.groundY} fill="#d0e8f8" />

      {/* Jord — venstre for grøfta */}
      <polygon
        points={`0,${g.groundY} ${g.topLeftX},${g.groundY} ${g.botLeftX},${g.bottomY} 0,${g.bottomY}`}
        fill={`url(#${useSoilPattern})`}
      />
      {/* Jord — høgre for grøfta */}
      <polygon
        points={`${g.topRightX},${g.groundY} ${g.svgW},${g.groundY} ${g.svgW},${g.bottomY} ${g.botRightX},${g.bottomY}`}
        fill={`url(#${useSoilPattern})`}
      />

      {/* Open grøft */}
      <polygon
        points={`${g.topLeftX},${g.groundY} ${g.topRightX},${g.groundY} ${g.botRightX},${g.bottomY} ${g.botLeftX},${g.bottomY}`}
        fill="white"
      />

      {/* Sikring */}
      {params.securingMethod === "groftekas" && <GroftekasseWalls g={g} />}
      {params.securingMethod === "spunt" && <SpuntWalls g={g} />}


      {/* Massehaug */}
      <SpoilPile g={g} />

      {/* Gravemaskin */}
      {params.excavFacingFront
        ? <ExcavatorFrontImage g={g} uid={uid} />
        : <ExcavatorImage g={g} />}

      {/* Grøft-kontur */}
      <polygon
        points={`${g.topLeftX},${g.groundY} ${g.topRightX},${g.groundY} ${g.botRightX},${g.bottomY} ${g.botLeftX},${g.bottomY}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth={2.5}
      />
      <line x1={g.botLeftX} y1={g.bottomY} x2={g.botRightX} y2={g.bottomY} stroke="#1e293b" strokeWidth={2.5} />

      {/* Bakkenivå-linje — tekst bak gravemaskinen (høgre side) */}
      <line x1={0} y1={g.groundY} x2={g.svgW} y2={g.groundY} stroke="#374151" strokeWidth={1.5} strokeDasharray="10 5" />
      <text x={g.svgW - 8} y={g.groundY - 6} fontSize={11} fill="#374151" textAnchor="end">Bakkenivå</text>

      {/* Avstandsmål: grøftkant → belte-framkant på gravemaskin (berre sidevisning) */}
      {!params.excavFacingFront && (() => {
        const dimY = g.groundY - 30;
        const x1   = g.topRightX;
        const x2   = g.beltFrontX;
        const mx   = (x1 + x2) / 2;
        if (x2 - x1 < 15) return null;
        return (
          <g>
            <line x1={x1} y1={dimY - 5} x2={x1} y2={g.groundY + 4} stroke="#1e293b" strokeWidth={1} />
            <line x1={x2} y1={dimY - 5} x2={x2} y2={g.groundY + 4} stroke="#1e293b" strokeWidth={1} />
            <line x1={x1} y1={dimY} x2={x2} y2={dimY}
              stroke="#1e293b" strokeWidth={1.5}
              markerStart={`url(#arr-rev-${uid})`} markerEnd={`url(#arr-${uid})`} />
            <text x={mx} y={dimY - 5} fontSize={10} fill="#1e293b" textAnchor="middle" fontWeight="bold">
              {params.excavDistM.toFixed(1)} m
            </text>
          </g>
        );
      })()}

      {/* Avstandsmål: massehaug → grøftkant */}
      {(() => {
        const x1   = 20 + g.massehaugWPx;
        const x2   = g.topLeftX;
        const dimY = g.groundY - 30;
        const mx   = (x1 + x2) / 2;
        if (x2 - x1 < 15) return null;
        return (
          <g>
            <line x1={x1} y1={dimY - 5} x2={x1} y2={g.groundY + 4} stroke="#1e293b" strokeWidth={1} />
            <line x1={x2} y1={dimY - 5} x2={x2} y2={g.groundY + 4} stroke="#1e293b" strokeWidth={1} />
            <line x1={x1} y1={dimY} x2={x2} y2={dimY}
              stroke="#1e293b" strokeWidth={1.5}
              markerStart={`url(#arr-rev-${uid})`} markerEnd={`url(#arr-${uid})`} />
            <text x={mx} y={dimY - 5} fontSize={10} fill="#1e293b" textAnchor="middle" fontWeight="bold">
              {params.massehaugDistM.toFixed(1)} m
            </text>
          </g>
        );
      })()}

      {/* Mål: djupn — topp-pil ligg på grøftkant (topLeftX, groundY) */}
      {g.topLeftX > 20 && (
        <>
          <line
            x1={dimDepthX} y1={g.groundY}
            x2={dimDepthX} y2={g.bottomY}
            stroke="#374151" strokeWidth={1.5}
            markerStart={`url(#arr-rev-${uid})`}
            markerEnd={`url(#arr-${uid})`}
          />
          {/* Kort tick på topp — grøftkant */}
          <line x1={dimDepthX} y1={g.groundY} x2={dimDepthX + 8} y2={g.groundY} stroke="#374151" strokeWidth={1} />
          {/* Kort tick på botn */}
          <line x1={dimDepthX} y1={g.bottomY} x2={dimDepthX + 8} y2={g.bottomY} stroke="#374151" strokeWidth={1} />
          <text
            x={dimDepthX - 6}
            y={(g.groundY + g.bottomY) / 2}
            fontSize={12} fill="#1e293b" fontWeight="bold" textAnchor="middle"
            transform={`rotate(-90 ${dimDepthX - 6} ${(g.groundY + g.bottomY) / 2})`}
          >
            {params.depthM.toFixed(1)} m
          </text>
        </>
      )}

      {/* Mål: botn-breidde */}
      {g.bottomWidthPx > 30 && (
        <>
          <line
            x1={g.botLeftX} y1={g.bottomY + 22}
            x2={g.botRightX} y2={g.bottomY + 22}
            stroke="#374151" strokeWidth={1.5}
            markerStart={`url(#arr-rev-${uid})`}
            markerEnd={`url(#arr-${uid})`}
          />
          <line x1={g.botLeftX} y1={g.bottomY} x2={g.botLeftX} y2={g.bottomY + 28} stroke="#374151" strokeWidth={1} />
          <line x1={g.botRightX} y1={g.bottomY} x2={g.botRightX} y2={g.bottomY + 28} stroke="#374151" strokeWidth={1} />
          <text x={g.centerX} y={g.bottomY + 38} fontSize={11} fill="#1e293b" fontWeight="bold" textAnchor="middle">
            {params.bottomWidthM.toFixed(2)} m
          </text>
        </>
      )}

      {/* Mål: topp-breidde (skrå veggar) */}
      {g.topWidthPx > g.bottomWidthPx + 10 && (
        <>
          <line
            x1={g.topLeftX} y1={g.groundY - 22}
            x2={g.topRightX} y2={g.groundY - 22}
            stroke="#374151" strokeWidth={1.5}
            markerStart={`url(#arr-rev-${uid})`}
            markerEnd={`url(#arr-${uid})`}
          />
          <line x1={g.topLeftX} y1={g.groundY - 28} x2={g.topLeftX} y2={g.groundY} stroke="#374151" strokeWidth={1} />
          <line x1={g.topRightX} y1={g.groundY - 28} x2={g.topRightX} y2={g.groundY} stroke="#374151" strokeWidth={1} />
          <text x={g.centerX} y={g.groundY - 30} fontSize={11} fill="#1e293b" fontWeight="bold" textAnchor="middle">
            {(g.topWidthPx / g.pxPerMeter).toFixed(2)} m
          </text>
        </>
      )}

      {/* Vegg-vinkel-etikett — horisontal, innsida av venstre veggskråning */}
      {!["groftekas", "spunt", "vertikal", "ingen"].includes(params.securingMethod) && (() => {
        // Midtpunkt langs venstre vegg, litt til høgre (inn i grøfta)
        const wx = Math.round((g.topLeftX + g.botLeftX) / 2) + 14;
        const wy = Math.round((g.groundY + g.bottomY) / 2);
        return (
          <text x={wx} y={wy} fontSize={10} fill="#4b5563" textAnchor="start">
            {params.securingMethod === "skraa_45" ? "45°" : "60°"}
          </text>
        );
      })()}

      {/* Skalabar: 2 m fast (= 100px ved 50px/m) */}
      <g>
        <rect x={bx} y={by} width={barPx / 2} height={6} fill="#374151" />
        <rect x={bx + barPx / 2} y={by} width={barPx / 2} height={6} fill="white" stroke="#374151" strokeWidth={1} />
        <text x={bx} y={by - 4} fontSize={9} fill="#374151">0</text>
        <text x={bx + barPx / 2} y={by - 4} fontSize={9} fill="#374151" textAnchor="middle">1 m</text>
        <text x={bx + barPx} y={by - 4} fontSize={9} fill="#374151" textAnchor="end">2 m</text>
      </g>

      {/* Tittelblokk */}
      <rect x={0} y={titleY} width={g.svgW} height={TITLE_BLOCK_H} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
      <line x1={0} y1={titleY} x2={g.svgW} y2={titleY} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={col2} y1={titleY} x2={col2} y2={g.svgH} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={col3} y1={titleY} x2={col3} y2={g.svgH} stroke="#cbd5e1" strokeWidth={1} />

      <text x={8} y={titleY + 16} fontSize={9} fill="#6b7280">Prosjekt</text>
      <text x={8} y={titleY + 32} fontSize={12} fill="#1e293b" fontWeight="bold">{params.projectName || "—"}</text>
      <text x={8} y={titleY + 46} fontSize={10} fill="#374151">{params.location || ""}</text>
      {params.notes && (
        <text x={8} y={titleY + 60} fontSize={9} fill="#6b7280" fontStyle="italic">{params.notes}</text>
      )}

      <text x={col2 + 8} y={titleY + 16} fontSize={9} fill="#6b7280">Type / Sikring</text>
      <text x={col2 + 8} y={titleY + 32} fontSize={11} fill="#1e293b" fontWeight="bold">{WORK_TYPE_LABELS[params.workType]}</text>
      <text x={col2 + 8} y={titleY + 46} fontSize={10} fill="#374151">{SECURING_METHOD_LABELS[params.securingMethod]}</text>
      <text x={col2 + 8} y={titleY + 60} fontSize={10} fill="#374151">Grunn: {GROUND_TYPE_LABELS[params.groundType]}</text>

      <text x={col3 + 8} y={titleY + 16} fontSize={9} fill="#6b7280">Dato</text>
      <text x={col3 + 8} y={titleY + 32} fontSize={11} fill="#1e293b">{params.date || "—"}</text>
      <text x={col3 + 8} y={titleY + 48} fontSize={9} fill="#6b7280">Djupn</text>
      <text x={col3 + 8} y={titleY + 62} fontSize={12} fill="#1e293b" fontWeight="bold">{params.depthM.toFixed(1)} m</text>
    </svg>
  );
}
