type Props = {
  x: number;
  y: number;
  text: string;
  tone?: "default" | "accent";
};

export function LabelBox({ x, y, text, tone = "default" }: Props) {
  return (
    <foreignObject x={x - 10} y={y - 2.8} width={22} height={5.6}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          fontSize: "10px",
          lineHeight: 1.1,
          fontWeight: 600,
          color: tone === "accent" ? "#92400e" : "#0f172a",
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(15,23,42,0.25)",
          borderRadius: "4px",
          padding: "3px 6px",
          textAlign: "center",
          boxShadow: "0 1px 2px rgba(15,23,42,0.08)"
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}

