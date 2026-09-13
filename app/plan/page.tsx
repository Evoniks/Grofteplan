import Link from "next/link";
import { PlanWizardV2Loader } from "@/components/plan/PlanWizardV2Loader";

export default function PlanPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Opprett grøfteplan</h1>
          <p className="text-sm text-slate-500">
            Fyll ut alle steg for å generere grøfteplan med risikovurdering og PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/skisseverktoy" className="text-brand-700 hover:underline">
            Skisseverktøy
          </Link>
          <Link href="/regelverk" className="text-brand-700 hover:underline">
            Regelverk
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
