import Link from "next/link";
import { SketchToolV2Loader } from "@/components/sketches/SketchToolV2Loader";

export default function SketchToolV2Page() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Skisseverktøy</h1>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">v2</span>
          </div>
          <p className="text-sm text-slate-500">Vel ein mal og tilpass til ditt prosjekt.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/plan?fra=skisse#generer-pdf" className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700 transition-colors text-xs font-medium">
            Gå til grøfteplan-skjema
          </Link>
          <Link href="/skisseverktoy" className="text-slate-500 hover:text-brand-700">
            ← Gammal versjon
          </Link>
          <Link href="/" className="text-slate-500 hover:text-brand-700">
            Startside
          </Link>
        </div>
      </div>

      <SketchToolV2Loader />
    </main>
  );
}
