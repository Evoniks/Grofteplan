import Link from "next/link";
import { TrenchPlanner } from "@/components/sketches/TrenchPlanner";
import { Button } from "@/components/ui/button";

export default function SketchToolPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Grøfteplan-verktøy (dra/slipp + måling)</h1>
          <p className="text-sm text-slate-600">Interaktiv arbeidsflate med festepunkter, målepiler og redigerbare etiketter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/plan?fra=skisse#generer-pdf">
            <Button size="sm">Gå til skjema og generer PDF</Button>
          </Link>
          <Link href="/" className="text-brand-700 hover:underline">
            Startside
          </Link>
          <Link href="/plan" className="text-brand-700 hover:underline">
            Skjema
          </Link>
        </div>
      </div>
      <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Skissene lagres automatisk. Når du er ferdig: fyll ut grøfteplan-skjemaet og trykk «Generer PDF» for hele dokumentet
        med skisser, risikovurdering og signering.
      </p>
      <TrenchPlanner />
    </main>
  );
}

