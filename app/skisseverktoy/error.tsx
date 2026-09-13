"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SketchToolError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Skisseverktøyet kunne ikke starte</h1>
      <p className="mt-2 text-sm text-slate-600">
        Ofte skyldes dette ødelagt build-cache (vanlig med OneDrive). Kjør{" "}
        <code className="rounded bg-slate-100 px-1">npm run dev:fresh</code> i terminalen.
      </p>
      <p className="mt-2 text-xs text-slate-500">{error.message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Prøv igjen
        </Button>
        <Link href="/plan" className="inline-flex h-10 items-center rounded-md border px-4 text-sm">
          Til skjema
        </Link>
      </div>
    </main>
  );
}
