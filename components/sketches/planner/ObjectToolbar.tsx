"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  xPercent: number;
  yPercent: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  rotateLabel?: string;
  /** Ekstra innhald vist under knapperekka når «Innstillingar» er open */
  menu?: ReactNode;
  menuTitle?: string;
};

export function ObjectToolbar({
  xPercent,
  yPercent,
  onDelete,
  onDuplicate,
  onRotate,
  rotateLabel = "Roter 90°",
  menu,
  menuTitle = "Innstillingar"
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="absolute z-20 flex max-w-[min(92vw,22rem)] flex-col gap-1 rounded-md border border-slate-300 bg-white/95 p-1 shadow-md"
      style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: "translate(-50%, -120%)" }}
    >
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={onDelete}>
          Slett
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          Dupliser
        </Button>
        <Button size="sm" variant="outline" onClick={onRotate}>
          {rotateLabel}
        </Button>
        {menu && (
          <Button size="sm" variant={open ? "default" : "secondary"} type="button" onClick={() => setOpen((v) => !v)}>
            {menuTitle}
          </Button>
        )}
      </div>
      {open && menu && (
        <ObjectToolbarMenuPanel onClose={() => setOpen(false)}>
          {menu}
        </ObjectToolbarMenuPanel>
      )}
    </div>
  );
}

/** Eiga komponent slik at `key` på menyinnhald ikkje nullstiller open-state ved små endringar */
function ObjectToolbarMenuPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="max-h-[min(60vh,360px)] overflow-y-auto border-t border-slate-200 px-1.5 py-2 text-xs">
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-[11px] text-slate-500 underline hover:text-slate-800" onClick={onClose}>
          Lukk
        </button>
      </div>
      {children}
    </div>
  );
}
