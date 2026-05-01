"use client";

import { renderAssetIcon, type ObjectType } from "@/components/sketches/planner/AssetIcons";

export type CanvasObjectData = {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type Props = {
  object: CanvasObjectData;
  selected: boolean;
  onMouseDown: () => void;
};

export function CanvasObject({ object, selected, onMouseDown }: Props) {
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
      {renderAssetIcon(object.type, {
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation
      })}
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
          <circle cx={object.x + object.width + 5} cy={object.y - 5} r={4} fill="#2563eb" />
        </>
      )}
    </g>
  );
}

