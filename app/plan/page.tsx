import Link from "next/link";
import { PlanWizard } from "@/components/forms/PlanWizard";

export default function PlanPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Opprett grøfteplan</h1>
          <p className="text-sm text-slate-600">
            Fyll ut alle steg for å generere grøfteplan med risikovurdering og PDF.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-brand-700 hover:underline">
            Tilbake til startside
          </Link>
          <Link href="/regelverk" className="text-brand-700 hover:underline">
            Åpne regelverk
          </Link>
        </div>
      </div>
      <PlanWizard />
    </main>
  );
}
