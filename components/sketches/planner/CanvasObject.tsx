"use client";

import { EscapeRouteIcon, renderAssetIcon, type ObjectType } from "@/components/sketches/planner/AssetIcons";

export type CanvasObjectData = {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  meta?: {
    slopeRatio?: number;
    slopeAngleLeftDeg?: number;
    slopeAngleRightDeg?: number;
    lengthMeters?: number;
    mirrored?: boolean;
    /** Tverrprofil massehaug: kva for PNG som brukast (`public/skisse/spoil-cross-*.png`). */
    spoilCrossMaterial?: "jord" | "stein";
    /** Tverrprofil grøft: bunnbreidda (px). */
    innerBottomWidthPx?: number;
    /** Tverrprofil grøft: toppbreidda (px) — kan smalast uavhengig av boksbreidda. */
    innerTopWidthPx?: number;
  };
};

type Props = {
  object: CanvasObjectData;
  selected: boolean;
  /** Val og dragging handterast av forelder-SVG for overlapp-val. */
  onMouseDown?: () => void;
  /** I plan: stige visast som `escape-route-plan.png` (same som rømningsvei), skalerbar. */
  ladderAsPlanRaster?: boolean;
  /** Dra blå hjørnehandtak for å skalere (t.d. stige i plan). */
  onResizeHandleMouseDown?: (event: React.MouseEvent) => void;
};

export function CanvasObject({ object, selected, onMouseDown, ladderAsPlanRaster, onResizeHandleMouseDown }: Props) {
  const iconProps = {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    meta: object.meta
  };
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
      {object.type === "ladder" && ladderAsPlanRaster ? (
        <EscapeRouteIcon {...iconProps} />
      ) : (
        renderAssetIcon(object.type, iconProps)
      )}
      {selected && (
        <>
          <rect
            x={object.x - 4}
            y={object.y - 4}
            width={object.width + 8}
            height={object.height + 8}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <circle
            cx={object.x + object.width + 5}
            cy={object.y - 5}
            r={onResizeHandleMouseDown ? 9 : 4}
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth={onResizeHandleMouseDown ? 2 : 0}
            style={{ cursor: onResizeHandleMouseDown ? "nwse-resize" : undefined }}
            onMouseDown={(e) => {
              if (!onResizeHandleMouseDown) return;
              e.stopPropagation();
              onResizeHandleMouseDown(e);
            }}
          />
        </>
      )}
    </g>
  );
}

