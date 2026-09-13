"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PlanV2Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Noe gikk galt</h1>
      <p className="mt-2 text-sm text-slate-600">
        Skjemaet kunne ikke vises. Prøv å laste på nytt, eller nullstill lagra data i nettleseren.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Prøv igjen
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            try {
              localStorage.removeItem("grofteplan-form-data-v1");
              localStorage.removeItem("grofteplan-trench-planner-v1");
            } catch {
              /* ignore */
            }
            reset();
          }}
        >
          Nullstill lagra utkast
        </Button>
      </div>
    </main>
  );
}
