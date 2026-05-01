type Props = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
};

export function MeasurementArrow({ x1, y1, x2, y2, color = "#0f172a", dashed = false }: Props) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 1.2;
  const leftA = angle + Math.PI - Math.PI / 6;
  const rightA = angle + Math.PI + Math.PI / 6;
  const leftB = angle - Math.PI + Math.PI / 6;
  const rightB = angle - Math.PI - Math.PI / 6;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={0.35}
        strokeDasharray={dashed ? "1.2 0.8" : undefined}
      />

      <line x1={x1} y1={y1} x2={x1 + Math.cos(leftA) * head} y2={y1 + Math.sin(leftA) * head} stroke={color} strokeWidth={0.35} />
      <line x1={x1} y1={y1} x2={x1 + Math.cos(rightA) * head} y2={y1 + Math.sin(rightA) * head} stroke={color} strokeWidth={0.35} />
      <line x1={x2} y1={y2} x2={x2 + Math.cos(leftB) * head} y2={y2 + Math.sin(leftB) * head} stroke={color} strokeWidth={0.35} />
      <line x1={x2} y1={y2} x2={x2 + Math.cos(rightB) * head} y2={y2 + Math.sin(rightB) * head} stroke={color} strokeWidth={0.35} />
    </g>
  );
}

