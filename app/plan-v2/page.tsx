import Link from "next/link";
import { PlanWizardV2Loader } from "@/components/plan/PlanWizardV2Loader";

export default function PlanV2Page() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Opprett grøfteplan</h1>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              v2
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Fyll ut alle steg for å generere grøfteplan med risikovurdering og PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/plan" className="text-slate-500 hover:text-brand-700 hover:underline">
            ← Gammel versjon
          </Link>
          <Link href="/skisseverktoy" className="text-brand-700 hover:underline">
            Skisseverktøy
          </Link>
          <Link href="/" className="text-brand-700 hover:underline">
            Startside
          </Link>
        </div>
      </div>
      <PlanWizardV2Loader />
    </main>
  );
}
