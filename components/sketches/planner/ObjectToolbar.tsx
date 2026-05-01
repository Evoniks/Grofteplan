"use client";

import { Button } from "@/components/ui/button";

type Props = {
  xPercent: number;
  yPercent: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onSendBackward: () => void;
  onBringForward: () => void;
};

export function ObjectToolbar({
  xPercent,
  yPercent,
  onDelete,
  onDuplicate,
  onRotate,
  onSendBackward,
  onBringForward
}: Props) {
  return (
    <div
      className="absolute z-20 flex gap-1 rounded-md border border-slate-300 bg-white/95 p-1 shadow"
      style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: "translate(-50%, -120%)" }}
    >
      <Button size="sm" variant="outline" onClick={onDelete}>Slett</Button>
      <Button size="sm" variant="outline" onClick={onDuplicate}>Dupliser</Button>
      <Button size="sm" variant="outline" onClick={onRotate}>Roter 90°</Button>
      <Button size="sm" variant="outline" onClick={onSendBackward}>Bakover</Button>
      <Button size="sm" variant="outline" onClick={onBringForward}>Fremover</Button>
    </div>
  );
}

