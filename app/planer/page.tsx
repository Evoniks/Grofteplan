"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  duplicatePlan,
  deletePlanFromList,
  generatePlanId,
  listPlans,
  type PlanSummary,
} from "@/lib/plan-list-storage";

function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 2) return "Akkurat nå";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d === 1) return "I går";
  if (d < 7) return `${d} dager siden`;
  return formatDate(iso.slice(0, 10));
}

export default function PlanerPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setPlans(listPlans());
  }, []);

  const handleNew = () => {
    const id = generatePlanId();
    router.push(`/plan?id=${id}`);
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicatePlan(id);
    if (newId) router.push(`/plan?id=${newId}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Slett «${name}»? Dette kan ikke angres.`)) return;
    setDeleting(id);
    deletePlanFromList(id);
    setPlans(listPlans());
    setDeleting(null);
  };

  if (!mounted) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Laster planar …
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Mine grøfteplaner</h1>
          <p className="mt-1 text-sm text-slate-500">
            {plans.length === 0 ? "Ingen planar lagra enno." : `${plans.length} plan${plans.length !== 1 ? "ar" : ""} lagra lokalt i nettlesaren.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-brand-700">
            Startside
          </Link>
          <Button onClick={handleNew} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Ny plan
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
            <svg className="h-7 w-7 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6M9 16h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 4a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-700">Ingen planar enno</p>
          <p className="mt-1 text-sm text-slate-500">Trykk «Ny plan» for å kome i gang.</p>
          <Button onClick={handleNew} className="mt-5 gap-2">
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Lag første plan
          </Button>
        </div>
      )}

      {/* Plan list */}
      <div className="space-y-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6M9 16h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 4a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" strokeLinecap="round" />
              </svg>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{plan.prosjektnavn}</p>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {plan.adresse || "Ingen adresse"}
                {plan.dato ? ` · ${formatDate(plan.dato)}` : ""}
              </p>
            </div>

            {/* Last updated */}
            <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
              {timeAgo(plan.oppdatert)}
            </span>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/plan?id=${plan.id}`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  Opne
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-slate-500 hover:text-brand-700"
                onClick={() => handleDuplicate(plan.id)}
                title="Lag ein kopi av denne planen"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 5V3.5A1.5 1.5 0 009.5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Dupliser
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(plan.id, plan.prosjektnavn)}
                disabled={deleting === plan.id}
                className="rounded p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Slett plan"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length > 0 && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Planane er lagra lokalt i nettlesaren. Dei forsvinn om du tømer nettlesardata.
        </p>
      )}
    </main>
  );
}
