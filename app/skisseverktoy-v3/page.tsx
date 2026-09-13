import Link from "next/link";
import { SketchGeneratorV3 } from "@/components/sketches/SketchGeneratorV3";

export default function SketchToolV3Page() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-8">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #sketch-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Skissegenerator</h1>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">v3</span>
          </div>
          <p className="text-sm text-slate-500">
            Svar på fire spørsmål — få ein profesjonell grøfteskisse klar for utskrift.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/skisseverktoy-v2" className="text-slate-500 hover:text-brand-700 text-xs">
            ← Gammal skisseverktøy
          </Link>
          <Link href="/" className="text-slate-500 hover:text-brand-700 text-xs">
            Startside
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <SketchGeneratorV3 />
      </div>
    </main>
  );
}
