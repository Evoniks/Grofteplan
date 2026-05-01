"use client";

export type MeasurementView = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
};

type Props = {
  measurement: MeasurementView;
  selected: boolean;
  onSelect: () => void;
  onEditLabel: () => void;
};

export function MeasurementLine({ measurement, selected, onSelect, onEditLabel }: Props) {
  const dx = measurement.to.x - measurement.from.x;
  const dy = measurement.to.y - measurement.from.y;
  const angle = Math.atan2(dy, dx);
  const head = 11;
  const color = selected ? "#2563eb" : "#0f172a";

  const centerX = (measurement.from.x + measurement.to.x) / 2;
  const centerY = (measurement.from.y + measurement.to.y) / 2;

  return (
    <g style={{ cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}>
      <line x1={measurement.from.x} y1={measurement.from.y} x2={measurement.to.x} y2={measurement.to.y} stroke={color} strokeWidth={selected ? 3 : 2.2} />

      <line x1={measurement.from.x} y1={measurement.from.y} x2={measurement.from.x + Math.cos(angle + Math.PI - Math.PI / 7) * head} y2={measurement.from.y + Math.sin(angle + Math.PI - Math.PI / 7) * head} stroke={color} strokeWidth={2.2} />
      <line x1={measurement.from.x} y1={measurement.from.y} x2={measurement.from.x + Math.cos(angle + Math.PI + Math.PI / 7) * head} y2={measurement.from.y + Math.sin(angle + Math.PI + Math.PI / 7) * head} stroke={color} strokeWidth={2.2} />
      <line x1={measurement.to.x} y1={measurement.to.y} x2={measurement.to.x + Math.cos(angle - Math.PI / 7) * head} y2={measurement.to.y + Math.sin(angle - Math.PI / 7) * head} stroke={color} strokeWidth={2.2} />
      <line x1={measurement.to.x} y1={measurement.to.y} x2={measurement.to.x + Math.cos(angle + Math.PI / 7) * head} y2={measurement.to.y + Math.sin(angle + Math.PI / 7) * head} stroke={color} strokeWidth={2.2} />

      <rect x={centerX - 70} y={centerY - 30} width={140} height={28} rx={6} fill="white" stroke={selected ? "#2563eb" : "#334155"} />
      <text
        x={centerX}
        y={centerY - 12}
        fill={selected ? "#2563eb" : "#0f172a"}
        fontSize={14}
        textAnchor="middle"
        fontWeight={600}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditLabel();
        }}
      >
        {measurement.label}
      </text>
    </g>
  );
}

