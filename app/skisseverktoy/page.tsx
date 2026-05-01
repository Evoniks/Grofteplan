import Link from "next/link";
import { TrenchPlanner } from "@/components/sketches/TrenchPlanner";

export default function SketchToolPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Grøfteplan-verktøy (dra/slipp + måling)</h1>
          <p className="text-sm text-slate-600">Interaktiv arbeidsflate med festepunkter, målepiler og redigerbare etiketter.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-brand-700 hover:underline">Startside</Link>
          <Link href="/plan" className="text-brand-700 hover:underline">Skjema</Link>
        </div>
      </div>
      <TrenchPlanner />
    </main>
  );
}

