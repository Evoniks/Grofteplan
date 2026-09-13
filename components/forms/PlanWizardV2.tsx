"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planSchema, type PlanSchema } from "@/lib/schema";
import type { PlanData } from "@/types/plan";
import { planDefaultValues } from "@/lib/plan-defaults";
import { evaluateRules } from "@/lib/rule-engine";
import { generatePlanId, loadPlanFromList, savePlanToList } from "@/lib/plan-list-storage";
import { loadTrenchPlannerExport } from "@/lib/trench-planner-storage";
import { depthPlanHint, getVisibleWizardSteps, WIZARD_STEP_TITLES } from "@/lib/plan-wizard-steps";
import { PdfDownloadButton } from "@/components/pdf/PdfDownloadButton";
import { TrenchPlannerBridge } from "@/components/plan/TrenchPlannerBridge";
import { AddressFields } from "@/components/forms/AddressFields";
import { SignaturePad } from "@/components/forms/SignaturePad";
import type { LengdeprofilRad, PersonIGroftRad } from "@/types/plan";
import { formatPersonerIGroft, migratePlanDraft } from "@/lib/plan-draft-migrate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const IKKE_AKTUELT = "Ikke aktuelt";

// ─── Help tooltip (closes on outside click) ───────────────────────────────────

type HelpLink = { label: string; url: string };

function Hint({ text, links }: { text: string; links?: HelpLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
        aria-label="Vis forklaring"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-xl">
          <p>{text}</p>
          {links?.length ? (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="block text-brand-700 hover:underline">
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, children, className, hint, example, links, optional,
}: {
  label: string; children: ReactNode; className?: string;
  hint?: string; example?: string; links?: HelpLink[]; optional?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {optional
          ? <span className="text-xs font-normal text-slate-400">(valgfritt)</span>
          : <span className="text-xs text-red-400" aria-hidden>*</span>}
        {(hint || example || links?.length) && (
          <Hint text={[hint, example].filter(Boolean).join(" ")} links={links} />
        )}
      </Label>
      {children}
    </div>
  );
}

// ─── Bool card (styled checkbox) ─────────────────────────────────────────────

function BoolCard({
  label, name, control, hint, links, description,
}: {
  label: string; name: keyof PlanSchema;
  control: ReturnType<typeof useForm<PlanSchema>>["control"];
  hint?: string; links?: HelpLink[]; description?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const checked = Boolean(field.value);
        return (
          <label className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all select-none",
            checked ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300",
          )}>
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => field.onChange(Boolean(v))}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800">{label}</span>
              {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
            </div>
            {(hint || links?.length) && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Hint text={hint ?? ""} links={links} />
              </div>
            )}
          </label>
        );
      }}
    />
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Collapsible({ title, children, defaultOpen = false }: {
  title: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>{title}</span>
        <svg className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">{children}</h3>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Soil type visual picker ──────────────────────────────────────────────────

const SOIL_TYPES = [
  { value: "fjell",      label: "Fjell",       icon: "🪨", note: "Kan kreve sprengning" },
  { value: "sand",       label: "Sand",         icon: "🏜️", note: "God drenering" },
  { value: "grus",       label: "Grus",         icon: "⬛", note: "God bæreevne" },
  { value: "leire",      label: "Leire",        icon: "🟫", note: "Utglidningsfare" },
  { value: "fyllmasser", label: "Fyllmasser",   icon: "🗑️", note: "Ukjent sammensetning" },
  { value: "ukjent",     label: "Ukjent",       icon: "❓", note: "Undersøkelse påkrevd" },
] as const;

function SoilPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SOIL_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
            value === t.value
              ? t.value === "ukjent"
                ? "border-red-400 bg-red-50 shadow-sm"
                : "border-brand-500 bg-brand-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <span className="text-2xl">{t.icon}</span>
          <span className={cn("text-sm font-semibold", value === t.value ? "text-brand-800" : "text-slate-700")}>
            {t.label}
          </span>
          <span className="text-[10px] text-slate-500">{t.note}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Installation type chips ──────────────────────────────────────────────────

const INSTALLATIONS = [
  { name: "installasjonVa"           as const, label: "VA",           icon: "💧" },
  { name: "installasjonOvervann"     as const, label: "Overvann",     icon: "🌧️" },
  { name: "installasjonSpillvann"    as const, label: "Spillvann",    icon: "🚰" },
  { name: "installasjonHoyspent"     as const, label: "Høyspent",     icon: "⚡" },
  { name: "installasjonLavspent"     as const, label: "Lavspent",     icon: "🔌" },
  { name: "installasjonFiberTele"    as const, label: "Fiber/tele",   icon: "📡" },
  { name: "installasjonGassFjernvarme" as const, label: "Gass/fjernvarme", icon: "🔥" },
  { name: "installasjonUkjent"       as const, label: "Ukjent type",  icon: "❓" },
];

function InstallChips({ allValues, setValue }: {
  allValues: PlanSchema;
  setValue: ReturnType<typeof useForm<PlanSchema>>["setValue"];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {INSTALLATIONS.map(({ name, label, icon }) => {
        const checked = Boolean(allValues[name]);
        return (
          <button
            key={name}
            type="button"
            onClick={() => setValue(name, !checked)}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all",
              checked
                ? "border-brand-400 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Depth visual bar ─────────────────────────────────────────────────────────

function DepthBar({ depth }: { depth: number }) {
  const MAX = 4;
  const pct = Math.min(Math.max(depth, 0) / MAX, 1) * 100;
  const isCritical = depth > 2;
  const isWarning = depth > 1.25;

  return (
    <div className="space-y-2">
      <div className="relative h-9 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-300",
            isCritical ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-blue-400",
          )}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0" style={{ left: `${(1.25 / MAX) * 100}%` }}>
          <div className="h-full w-px bg-amber-600/60" />
          <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-amber-700">1,25 m</span>
        </div>
        <div className="absolute inset-y-0" style={{ left: `${(2 / MAX) * 100}%` }}>
          <div className="h-full w-px bg-red-600/60" />
          <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-red-700">2,0 m</span>
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 drop-shadow-sm">
          {depth > 0 ? `${depth.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} m` : "—"}
        </span>
      </div>
      <p className={cn(
        "rounded-lg border px-3 py-2 text-xs",
        isCritical  ? "border-red-200 bg-red-50 text-red-800" :
        isWarning   ? "border-amber-200 bg-amber-50 text-amber-800" :
                      "border-blue-100 bg-blue-50 text-blue-800",
      )}>
        {depthPlanHint(depth)}
      </p>
    </div>
  );
}

// ─── Step progress navigator ──────────────────────────────────────────────────

type StepStatus = "complete" | "partial" | "empty";

function getStepStatus(stepId: number, data: PlanData): StepStatus {
  const s = (v: string | undefined) => (v ?? "").trim().length >= 2;
  const n = (v: number | undefined) => (v ?? 0) > 0;

  const score = (items: boolean[]) => {
    const filled = items.filter(Boolean).length;
    return filled === 0 ? "empty" : filled === items.length ? "complete" : "partial";
  };

  switch (stepId) {
    case 0: return score([s(data.prosjektnavn), s(data.entreprenor), s(data.byggherre), s(data.ansvarligPerson)]);
    case 1: return score([s(data.adresse), s(data.kommune), s(data.arbeidsomrade)]);
    case 2: return score([n(data.groftelengdeMeter), n(data.maksDybdeMeter), n(data.breddeBunnMeter), n(data.breddeToppMeter)]);
    case 3: return data.jordart !== "ukjent" ? "complete" : "partial";
    case 4: {
      if (data.ingenKjenteInstallasjoner) return "complete";
      const hasAny = data.installasjonVa || data.installasjonOvervann || data.installasjonSpillvann ||
        data.installasjonHoyspent || data.installasjonLavspent || data.installasjonFiberTele ||
        data.installasjonGassFjernvarme || data.installasjonUkjent;
      if (!hasAny) return "empty";
      return data.kabelpavisningUtfort ? "complete" : "partial";
    }
    case 5: return "complete";
    case 6: return data.sikringsmetode ? "complete" : "empty";
    case 7: return data.avstandFraGroftekantMeter >= 1 ? "complete" : "partial";
    case 8: return score([s(data.arbeidsbeskrivelse), s(data.stoppkriterier)]);
    case 9: return score([s(data.utarbeidetAv), s(data.kontrollertAv), s(data.kontrollpunkter)]);
    default: return "empty";
  }
}

function StepNav({
  steps, currentIndex, onNavigate, data,
}: {
  steps: number[]; currentIndex: number;
  onNavigate: (idx: number) => void; data: PlanData;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.children[currentIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIndex]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />
      <div ref={scrollRef} className="flex gap-0.5 overflow-x-auto px-4 py-2 scrollbar-none">
        {steps.map((stepId, idx) => {
          const status = getStepStatus(stepId, data);
          const isActive = idx === currentIndex;

          return (
            <button
              key={stepId}
              type="button"
              onClick={() => onNavigate(idx)}
              title={WIZARD_STEP_TITLES[stepId]}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors",
                isActive ? "bg-brand-50" : "hover:bg-slate-50",
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                isActive
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-200"
                  : status === "complete"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : status === "partial"
                  ? "border-amber-400 bg-white text-amber-700"
                  : "border-slate-300 bg-white text-slate-400",
              )}>
                {!isActive && status === "complete" ? (
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={cn(
                "hidden whitespace-nowrap text-[11px] sm:block",
                isActive ? "font-semibold text-brand-700" : "text-slate-500",
              )}>
                {WIZARD_STEP_TITLES[stepId]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step content ─────────────────────────────────────────────────────────────

function StepContent({
  step, form, allValues,
}: {
  step: number;
  form: ReturnType<typeof useForm<PlanSchema>>;
  allValues: PlanSchema;
}) {
  if (step === 0) return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Prosjektnavn">
          <Input {...form.register("prosjektnavn")} placeholder="T.d. VA-sanering Storgata" />
        </Field>
        <Field label="Dato">
          <Input type="date" {...form.register("dato")} />
        </Field>
        <Field label="Entreprenør">
          <Input {...form.register("entreprenor")} placeholder="Firma AS" />
        </Field>
        <Field label="Byggherre">
          <Input {...form.register("byggherre")} placeholder="Kommunen/tiltakshaver" />
        </Field>
        <Field label="Ansvarlig person" className="md:col-span-2"
          hint="Namn på den som følgjer opp planen i felt."
          example="Eksempel: Ola Nordmann"
        >
          <Input {...form.register("ansvarligPerson")} />
        </Field>
      </div>

      <Collapsible title="Valgfritt – dokumentasjon og roller">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Revisjonsnummer" optional>
            <Input {...form.register("revisjonsnummer")} placeholder="R0" />
          </Field>
          <Field label="Dokumentnummer" optional>
            <Input {...form.register("dokumentnummer")} placeholder="T.d. 030603-010 B" />
          </Field>
          <Field label="Underprosjekt" optional>
            <Input {...form.register("underprosjekt")} />
          </Field>
        </div>
        <SectionHeading>Fagleg kompetent person (FKP)</SectionHeading>
        <BoolCard
          control={form.control}
          name="fkpSammePerson"
          label="Same person er FKP for grøft og gjennomføring"
        />
        {allValues.fkpSammePerson ? (
          <Field label="FKP – ansvarleg grøft og gjennomføring" optional hint="Fagleg kompetent person.">
            <Input
              {...form.register("fkpAnsvarligGroft")}
              onChange={(e) => {
                const v = e.target.value;
                form.setValue("fkpAnsvarligGroft", v);
                form.setValue("fkpAnsvarligGjennomforing", v);
              }}
            />
          </Field>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="FKP – ansvarleg grøft" optional>
              <Input {...form.register("fkpAnsvarligGroft")} />
            </Field>
            <Field label="FKP – ansvarleg gjennomføring" optional>
              <Input {...form.register("fkpAnsvarligGjennomforing")} />
            </Field>
          </div>
        )}

        <SectionHeading>Personer i grøft</SectionHeading>
        {(allValues.personerIGroftRader ?? []).map((rad, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Navn"
              value={rad.navn}
              onChange={(e) => {
                const next = [...(allValues.personerIGroftRader ?? [])] as PersonIGroftRad[];
                next[i] = { ...next[i], navn: e.target.value };
                form.setValue("personerIGroftRader", next);
              }}
            />
            <Input
              placeholder="Rolle (valgfritt)"
              value={rad.rolle}
              onChange={(e) => {
                const next = [...(allValues.personerIGroftRader ?? [])] as PersonIGroftRad[];
                next[i] = { ...next[i], rolle: e.target.value };
                form.setValue("personerIGroftRader", next);
              }}
            />
            <Button type="button" variant="outline" size="sm"
              onClick={() => {
                const next = (allValues.personerIGroftRader ?? []).filter((_, j) => j !== i);
                form.setValue("personerIGroftRader", next.length ? next : [{ navn: "", rolle: "" }]);
              }}
            >
              Fjern
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => form.setValue("personerIGroftRader", [
            ...(allValues.personerIGroftRader ?? []), { navn: "", rolle: "" },
          ])}
        >
          + Legg til person
        </Button>
      </Collapsible>
    </div>
  );

  if (step === 1) return (
    <div className="space-y-4">
      <AddressFields form={form} />
      <Field label="Beskrivelse av arbeidsområdet"
        hint="Beskriv kor grøfta går, kva som ligg rundt og tilgang."
        example="Eksempel: Langs fylkesvei 123 mellom kryss og pumpestasjon."
      >
        <Textarea {...form.register("arbeidsomrade")} rows={3} />
      </Field>
    </div>
  );

  if (step === 2) return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Grøftelengde (m)"
          hint="Total planlagd lengde i denne etappen."
          example="Eksempel: 120"
        >
          <Input type="number" step="0.1" {...form.register("groftelengdeMeter", { valueAsNumber: true })} />
        </Field>
        <Field label="Maks dybde (m)"
          hint="Største dybde i grøfta frå terreng til botn."
          example="Eksempel: 1.8"
          links={[
            { label: "Kapittel 21 (gravearbeid) – Lovdata", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" },
            { label: "Arbeidstilsynet: Gravearbeid", url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/" },
          ]}
        >
          <Input type="number" step="0.1" {...form.register("maksDybdeMeter", { valueAsNumber: true })} />
        </Field>
        <Field label="Bredde i botn (m)">
          <Input type="number" step="0.1" {...form.register("breddeBunnMeter", { valueAsNumber: true })} />
        </Field>
        <Field label="Bredde i topp (m)">
          <Input type="number" step="0.1" {...form.register("breddeToppMeter", { valueAsNumber: true })} />
        </Field>
      </div>

      <DepthBar depth={allValues.maksDybdeMeter ?? 0} />

      <SectionHeading>Hopp over steg</SectionHeading>
      <div className="grid gap-2 sm:grid-cols-2">
        <BoolCard
          control={form.control}
          name="ingenKjenteInstallasjoner"
          label="Ingen kjente installasjoner"
          description="Hopper over steget om installasjoner i grunnen"
        />
        <BoolCard
          control={form.control}
          name="trafikkStegIkkeAktuelt"
          label="Trafikk ikke aktuelt"
          description="Hopper over steget om trafikk og omgivelser"
        />
      </div>

      <Collapsible title="Valgfritt – etapper og lengdeprofil">
        <Field label="Etappebeskrivelse" optional hint="Beskriv korleis arbeidet vert delt opp.">
          <Textarea {...form.register("etappebeskrivelse")} placeholder="Valgfritt" />
        </Field>
        <SectionHeading>Lengdeprofil med massebeskrivingar</SectionHeading>
        {(allValues.lengdeprofilRader ?? []).map((rad, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Pel / strekk" value={rad.pel}
              onChange={(e) => {
                const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                next[i] = { ...next[i], pel: e.target.value };
                form.setValue("lengdeprofilRader", next);
              }}
            />
            <Input placeholder="Masse" value={rad.masse}
              onChange={(e) => {
                const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                next[i] = { ...next[i], masse: e.target.value };
                form.setValue("lengdeprofilRader", next);
              }}
            />
            <Input placeholder="Dybde" value={rad.dybde}
              onChange={(e) => {
                const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                next[i] = { ...next[i], dybde: e.target.value };
                form.setValue("lengdeprofilRader", next);
              }}
            />
            <Button type="button" variant="outline" size="sm"
              onClick={() => {
                const next = (allValues.lengdeprofilRader ?? []).filter((_, j) => j !== i);
                form.setValue("lengdeprofilRader", next.length ? next : [{ pel: "", masse: "", dybde: "" }]);
              }}
            >
              Fjern
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => form.setValue("lengdeprofilRader", [
            ...(allValues.lengdeprofilRader ?? []), { pel: "", masse: "", dybde: "" },
          ])}
        >
          + Legg til rad
        </Button>
      </Collapsible>
    </div>
  );

  if (step === 3) return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">
          Jordart <span className="text-xs text-red-400">*</span>
          <span className="ml-2 text-xs font-normal text-slate-400">Velg mest representative massetype</span>
        </p>
        <Controller
          control={form.control}
          name="jordart"
          render={({ field }) => (
            <SoilPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <SectionHeading>Grunnforhold</SectionHeading>
      <div className="grid gap-2 sm:grid-cols-2">
        <BoolCard control={form.control} name="grunnvann" label="Grunnvann / vanninnsig"
          description="Synleg innsig eller høg vasstand" />
        <BoolCard control={form.control} name="skraningINarheten" label="Skråning i nærleiken"
          description="Kan påverke stabilitet" />
        <BoolCard control={form.control} name="byggINarheten" label="Bygg / fundament i nærleiken"
          description="Nærliggjande murer, bygg eller fundamenter" />
        <BoolCard control={form.control} name="geotekniskBehov" label="Behov for geoteknisk vurdering"
          description="(Valgfritt) – ved usikre grunnforhold" />
      </div>

      <Collapsible title="Valgfritt – grunnundersøkelser">
        <BoolCard control={form.control} name="grunnundersokelseProvegraving" label="Prøvegraving" />
        <BoolCard control={form.control} name="grunnundersokelseGrunnboring" label="Grunnboring" />
        <BoolCard control={form.control} name="grunnundersokelseSondering" label="Sondering (total/trykk/dreie)" />
        <BoolCard control={form.control} name="grunnundersokelseIkkeForetatt" label="Ikke foretatt" />
        <Field label="Annet" optional>
          <Input {...form.register("grunnundersokelseAnnet")} />
        </Field>
      </Collapsible>
    </div>
  );

  if (step === 4) return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Installasjonstyper i grøftetraseen <span className="text-xs text-slate-400">(kryss av alt som kan gjelde)</span>
        </p>
        <InstallChips allValues={allValues} setValue={form.setValue} />
      </div>

      <SectionHeading>Kabelpåvisning</SectionHeading>
      <BoolCard
        control={form.control}
        name="kabelpavisningUtfort"
        label="Kabel- / ledningspåvisning er utført"
        description="Kryss av når dokumentert påvisning er gjennomført"
        hint="Kryss av når dokumentert påvisning er gjennomført før graving."
        links={[
          { label: "Geomatikk: Gravemelding og kabelpåvisning", url: "https://geomatikk.no/jeg-skal-grave/gravemelding-og-kabelpavisning/" },
        ]}
      />
    </div>
  );

  if (step === 5) return (
    <div className="space-y-4">
      <BoolCard
        control={form.control}
        name="trafikkbelastningNarGroft"
        label="Trafikkbelastning nær grøft"
        description="Gjeld både kjøretøytrafikk og tungtransport nær grøftekant"
        hint="Gjeld både kjøretøytrafikk og tungtransport nær grøftekant."
      />
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Vurder og dokumenter trafikkavvikling, mjuke trafikantar og påverknad på omgivnadane
        i prosjektets SHA-dokumentasjon.
      </div>
    </div>
  );

  if (step === 6) return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Behov for avstiving" optional>
          <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...form.register("avstivingBehov")}
          >
            <option value="">Velg …</option>
            <option value="nei_1_1">Nei – klarar skråning ca. 1:1</option>
            <option value="ja">Ja – avstiving nødvendig</option>
          </select>
        </Field>
        <Field label="Kommentar avstiving" optional>
          <Input {...form.register("avstivingKommentar")} placeholder="T.d. gode, stabile masser …" />
        </Field>
        <Field label="Valgt sikringsmetode"
          hint="Påkrevd ved dybde over ca. 2 m eller når avstiving er nødvendig (jf. § 21-9)."
          links={[{ label: "Lovdata § 21-9", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
        >
          <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...form.register("sikringsmetode")}
          >
            <option value="ikke relevant">Ikke relevant</option>
            <option value="skrå gravesider">Skrå gravesider</option>
            <option value="grøftekasse">Grøftekasse</option>
            <option value="spunt">Spunt</option>
            <option value="annen avstivning">Annen avstivning</option>
          </select>
        </Field>
        <Field label="Rømningsvei / adkomst" optional
          hint="Beskriv korleis arbeidarar kjem trygt ned og opp av grøfta."
          example="Eksempel: Stige for kvar 25. meter."
        >
          <Input {...form.register("romningsvei")} placeholder="Valgfritt under ca. 1 m dybde" />
        </Field>
      </div>

      <Field label="Beskrivelse av sikring"
        optional={allValues.sikringsmetode === "ikke relevant"}
        hint="Beskriv valgt løysing i praksis: metode, etappar, kontroll av grøfteveggar og kven som følgjer opp."
        example="Eksempel: Grøftekasse flyttes etappevis kvar 6. meter. Visuell kontroll av grøfteveggar før oppstart."
        links={[{ label: "Lovdata § 21-9 (gravegroper som skal avstivas)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
      >
        <Textarea {...form.register("sikringBeskrivelse")} placeholder="Påkrevd når sikringsmetode er valgt" />
      </Field>

      <Field label="Avsperring / sikring mot tredjeperson" optional
        hint="Beskriv korleis området vert sikra mot publikum, trafikk og uvedkommande."
        example="Eksempel: Byggegjerde og sperrebånd. Tydelig skilt, gangpassasje og lysmarkering i mørke."
        links={[{ label: "Arbeidstilsynet: Gravearbeid", url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/" }]}
      >
        <Textarea {...form.register("avsperring")} />
      </Field>

      <Button type="button" variant="outline" size="sm"
        onClick={() => {
          if (allValues.sikringsmetode === "ikke relevant") form.setValue("sikringBeskrivelse", IKKE_AKTUELT);
          form.setValue("romningsvei", IKKE_AKTUELT);
          form.setValue("avsperring", IKKE_AKTUELT);
        }}
      >
        Sett «Ikke aktuelt» på valgfrie sikringsfelt
      </Button>
    </div>
  );

  if (step === 7) return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Avstand frå grøftekant (m)"
          hint="Tilrådd minst 1,0 meter."
          links={[{ label: "Lovdata § 21-8 (plassering av gravemasser)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
        >
          <Input type="number" step="0.1" {...form.register("avstandFraGroftekantMeter", { valueAsNumber: true })} />
        </Field>
        <Field label="Plassering av gravemasser" optional hint="Kor massane vert lagde i høve til grøfta.">
          <Input {...form.register("plasseringGravemasser")} />
        </Field>
        <Field label="Mellomlagring" optional
          hint="Beskriv kor masser midlertidig lagrast, varigheit og sikring av haugane."
          example="Eksempel: Mellomlagres på riggplass nord for trase i maks 48 timar."
        >
          <Textarea {...form.register("mellomlagring")} />
        </Field>
        <Field label="Massetransport" optional
          hint="Beskriv transportveg, type køyrety, frekvens og tiltak for trygg transport."
          example="Eksempel: Bortkøyring med 3-aksla bil via riggveg mellom kl. 07–19."
        >
          <Textarea {...form.register("massetransport")} />
        </Field>
      </div>
      <Button type="button" variant="outline" size="sm"
        onClick={() => {
          form.setValue("plasseringGravemasser", IKKE_AKTUELT);
          form.setValue("mellomlagring", IKKE_AKTUELT);
          form.setValue("massetransport", IKKE_AKTUELT);
        }}
      >
        Sett «Ikke aktuelt» på valgfrie massefelt
      </Button>
    </div>
  );

  if (step === 8) return (
    <div className="space-y-5">
      <Field label="Kort arbeidsbeskrivelse"
        hint="Oppsummer arbeidstrinn frå oppstart til gjenfylling."
      >
        <Textarea {...form.register("arbeidsbeskrivelse")} rows={4} />
      </Field>

      <Field label="Stoppkriterier"
        hint="Definer tydeleg når arbeidet skal stoppast umiddelbart av tryggingsgrunnar."
        example="Eksempel: Rasfare, uavklart kabeltreff, vanninnsig over pumpekapasitet eller manglande avsperring."
        links={[{ label: "Lovdata § 21-6 (kontroll av gravegrop)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
      >
        <Textarea {...form.register("stoppkriterier")} rows={3} />
      </Field>

      <SectionHeading>Rutinar under gjennomføring</SectionHeading>
      <p className="text-xs text-slate-500">
        Planen leverast før arbeid startar. Kryss av for tiltak som skal gjelde — ikkje som dokumentasjon på utført kontroll.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <BoolCard control={form.control} name="sikkerJobbAnalyseUtfort"
          label="Sikker jobb-analyse" description="Skal utførast før oppstart" />
        <BoolCard control={form.control} name="dagligKontroll"
          label="Dagleg kontroll" description="Kontroll utførast dagleg/fortløpande" />
        <BoolCard control={form.control} name="kontrollEtterUvaer"
          label="Kontroll etter uvær" description="Ny kontroll etter krevjande vêr" />
      </div>
    </div>
  );

  if (step === 9) return (
    <div className="space-y-5">
      <Field label="Kontrollpunkter"
        hint="Skriv konkrete kontrollpunkt som kan sjekkast i felt."
        example="Eksempel: avsperring sett opp, påvisning verifisert, stige på plass."
      >
        <Textarea {...form.register("kontrollpunkter")} rows={3} />
      </Field>

      <SectionHeading>Signaturar</SectionHeading>
      <Field label="Signaturdato">
        <Input type="date" className="max-w-xs" {...form.register("signaturDato")} />
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Field label="Utarbeidet av"
            hint="Personen som har laga planen."
            links={[{ label: "Byggherreforskriften § 7-8 (SHA-plan)", url: "https://lovdata.no/forskrift/2009-08-03-1028" }]}
          >
            <Input {...form.register("utarbeidetAv")} />
          </Field>
          <Controller
            control={form.control}
            name="utarbeidetSignatur"
            render={({ field }) => (
              <SignaturePad value={field.value ?? ""} onChange={field.onChange} aria-label="Signatur utarbeidet av" />
            )}
          />
        </div>
        <div className="space-y-2">
          <Field label="Kontrollert av"
            hint="Bør helst vere ein annan person; kan vere same i små prosjekt dersom det vert grunngjeve."
            links={[{ label: "Byggherreforskriften § 8 og § 14", url: "https://lovdata.no/forskrift/2009-08-03-1028" }]}
          >
            <Input {...form.register("kontrollertAv")} />
          </Field>
          <Controller
            control={form.control}
            name="kontrollertSignatur"
            render={({ field }) => (
              <SignaturePad value={field.value ?? ""} onChange={field.onChange} aria-label="Signatur kontrollert av" />
            )}
          />
        </div>
      </div>

      {(allValues.utarbeidetAv ?? "").trim() &&
       (allValues.kontrollertAv ?? "").trim() &&
       (allValues.utarbeidetAv ?? "").trim().toLowerCase() === (allValues.kontrollertAv ?? "").trim().toLowerCase() && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Utarbeidet av og kontrollert av er sett til same person. Dette kan aksepterast i
          mindre prosjekt, men bør dokumenterast.
        </div>
      )}

      <Collapsible title="Valgfritt – godkjenning">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Godkjent av" optional>
            <Input {...form.register("godkjentAv")} />
          </Field>
          <Field label="Godkjent dato" optional>
            <Input type="date" {...form.register("godkjentDato")} />
          </Field>
        </div>
        <p className="text-xs font-medium text-slate-700">Godkjenning – signatur (valgfritt)</p>
        <div className="max-w-md">
          <Controller
            control={form.control}
            name="godkjentSignatur"
            render={({ field }) => (
              <SignaturePad value={field.value ?? ""} onChange={field.onChange} aria-label="Signatur godkjent av" />
            )}
          />
        </div>
      </Collapsible>

      <Collapsible title="Valgfritt – § 21-5-tekst (import frå skisseverktøy)">
        <Field label="a) Lengdeprofil" optional><Textarea rows={2} {...form.register("plan215Lengdeprofil")} /></Field>
        <Field label="a) Jordarter / installasjonar" optional><Textarea rows={2} {...form.register("plan215Jordarter")} /></Field>
        <Field label="b) Typiske tverrprofil" optional><Textarea rows={2} {...form.register("plan215Tverrprofil")} /></Field>
        <Field label="c) Plassering gravemasser" optional><Textarea rows={2} {...form.register("plan215Gravemasser")} /></Field>
        <Field label="d) Arbeidsinstruks" optional><Textarea rows={3} {...form.register("plan215Arbeidsinstruks")} /></Field>
      </Collapsible>
    </div>
  );

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanWizardV2() {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSavedSketch, setHasSavedSketch] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const fraSkisseHandled = useRef(false);
  const activeStepIdRef = useRef(0);
  const formTopRef = useRef<HTMLDivElement>(null);

  const form = useForm<PlanSchema>({
    resolver: zodResolver(planSchema),
    mode: "onChange",
    defaultValues: planDefaultValues,
  });
  const allValues = form.watch();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const refreshSketch = () => setHasSavedSketch(Boolean(loadTrenchPlannerExport()));
    refreshSketch();
    window.addEventListener("grofteplan-trench-export-saved", refreshSketch);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "grofteplan-trench-planner-v1") refreshSketch();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("grofteplan-trench-export-saved", refreshSketch);
      window.removeEventListener("storage", onStorage);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("id");
    const id = idFromUrl ?? generatePlanId();
    setPlanId(id);
    if (!idFromUrl) {
      window.history.replaceState(null, "", `?id=${id}`);
    } else {
      const stored = loadPlanFromList(id);
      if (stored) form.reset({ ...planDefaultValues, ...stored, ...migratePlanDraft(stored) });
    }
    setDraftReady(true);
  }, [form, mounted]);

  useEffect(() => {
    if (!mounted || !draftReady || !planId) return;
    setSaveStatus("saving");
    const t = window.setTimeout(() => {
      savePlanToList(allValues as PlanData, planId);
      setSaveStatus("saved");
      const t2 = window.setTimeout(() => setSaveStatus("idle"), 2000);
      return () => window.clearTimeout(t2);
    }, 400);
    return () => window.clearTimeout(t);
  }, [allValues, mounted, draftReady, planId]);

  useEffect(() => {
    form.setValue("dybdeOver125", allValues.maksDybdeMeter > 1.25);
    form.setValue("dybdeOver200", allValues.maksDybdeMeter > 2);
  }, [allValues.maksDybdeMeter, form]);

  const visibleSteps = useMemo(() => getVisibleWizardSteps(allValues as PlanData), [allValues]);
  const step = visibleSteps[stepIndex] ?? 0;

  useEffect(() => { activeStepIdRef.current = step; }, [step]);

  useEffect(() => {
    const targetId = activeStepIdRef.current;
    const newIndex = visibleSteps.indexOf(targetId);
    if (newIndex >= 0) {
      setStepIndex((prev) => (prev === newIndex ? prev : newIndex));
      return;
    }
    if (stepIndex >= visibleSteps.length) {
      const fallback = visibleSteps.filter((s) => s < targetId).pop() ?? visibleSteps[0] ?? 0;
      setStepIndex(Math.max(0, visibleSteps.indexOf(fallback)));
    }
  }, [visibleSteps, stepIndex]);

  useEffect(() => {
    if (!mounted || visibleSteps.length === 0 || fraSkisseHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("fra") !== "skisse") return;
    fraSkisseHandled.current = true;
    setStepIndex(visibleSteps.length - 1);
    const t = window.setTimeout(() => {
      document.getElementById("generer-pdf")?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.history.replaceState(null, "", window.location.pathname);
    }, 400);
    return () => window.clearTimeout(t);
  }, [mounted, visibleSteps.length]);

  useEffect(() => {
    if (!allValues.fkpSammePerson) return;
    const groft = (allValues.fkpAnsvarligGroft ?? "").trim();
    if ((allValues.fkpAnsvarligGjennomforing ?? "").trim() !== groft)
      form.setValue("fkpAnsvarligGjennomforing", groft);
  }, [allValues.fkpSammePerson, allValues.fkpAnsvarligGroft, allValues.fkpAnsvarligGjennomforing, form]);

  useEffect(() => {
    const text = formatPersonerIGroft(allValues.personerIGroftRader);
    if (text !== (allValues.personerIGroft ?? "")) form.setValue("personerIGroft", text);
  }, [allValues.personerIGroftRader, allValues.personerIGroft, form]);

  useEffect(() => {
    if (!allValues.ingenKjenteInstallasjoner) return;
    (["installasjonVa", "installasjonOvervann", "installasjonSpillvann", "installasjonHoyspent",
      "installasjonLavspent", "installasjonFiberTele", "installasjonGassFjernvarme",
      "installasjonUkjent", "kabelpavisningUtfort"] as const).forEach((k) => form.setValue(k, false));
  }, [allValues.ingenKjenteInstallasjoner, form]);

  const warnings = useMemo(() => evaluateRules(allValues as PlanData), [allValues]);
  const criticalCount = warnings.filter((w) => w.severity === "critical").length;
  const onLastStep = stepIndex >= visibleSteps.length - 1;
  const completedSteps = visibleSteps.filter(
    (s) => getStepStatus(s, allValues as PlanData) === "complete"
  ).length;

  const navigateToStep = (idx: number) => {
    setStepIndex(idx);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleReset = () => {
    if (!window.confirm("Er du sikker på at du vil nullstille heile skjemaet? All utfylt data vert sletta.")) return;
    form.reset(planDefaultValues);
    setStepIndex(0);
  };

  const handleNewPlan = () => {
    const id = generatePlanId();
    window.location.href = `/plan?id=${id}`;
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Laster skjema …
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sketch banner */}
      {hasSavedSketch ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="flex-1 text-sm text-emerald-900">
            <strong>Skisser er lagra</strong> og kjem automatisk med i PDF.
          </p>
          {!onLastStep && (
            <button type="button"
              className="shrink-0 text-xs font-semibold text-emerald-700 underline"
              onClick={() => navigateToStep(visibleSteps.length - 1)}
            >
              Gå til PDF →
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <span className="text-lg">✏️</span>
          <p className="text-sm text-blue-800">
            Tips: Lag visuelle skisser i{" "}
            <a href="/skisseverktoy" className="font-semibold underline">skisseverktøyet</a>
            {" "}— dei kjem automatisk med i PDF.
          </p>
        </div>
      )}

      {/* Main form card */}
      <div ref={formTopRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Step navigator */}
        <div className="border-b border-slate-100">
          <StepNav
            steps={visibleSteps}
            currentIndex={stepIndex}
            onNavigate={navigateToStep}
            data={allValues as PlanData}
          />
        </div>

        {/* Overall progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${Math.round((completedSteps / visibleSteps.length) * 100)}%` }}
          />
        </div>

        {/* Step header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Steg {stepIndex + 1} av {visibleSteps.length}
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900">
              {WIZARD_STEP_TITLES[step]}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-1">
            {saveStatus === "saving" && (
              <span className="text-xs text-slate-400">Lagrar…</span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.5 2.5L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Lagra
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {completedSteps}/{visibleSteps.length} steg
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          <StepContent step={step} form={form} allValues={allValues} />
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigateToStep(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0}
            className="gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Forrige
          </Button>
          {!onLastStep && (
            <Button
              type="button"
              onClick={() => navigateToStep(Math.min(visibleSteps.length - 1, stepIndex + 1))}
              className="gap-2"
            >
              Neste
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4">
            <a href="/planer" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
              ← Mine planer
            </a>
            <button
              type="button"
              onClick={handleNewPlan}
              className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
            >
              + Ny plan
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Nullstill
            </button>
          </div>
        </div>
      </div>

      {/* PDF section */}
      <div id="generer-pdf" className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-brand-900">Generer PDF</h3>
            <p className="mt-1 text-sm text-brand-700">
              {completedSteps === visibleSteps.length
                ? "Alle steg er fulliert — planen er klar for nedlasting."
                : `${visibleSteps.length - completedSteps} steg gjenstår, men du kan laste ned uansett.`}
              {hasSavedSketch ? " Skisser er inkludert." : ""}
            </p>
            {criticalCount > 0 && (
              <p className="mt-2 text-sm font-medium text-red-700">
                ⚠️ {criticalCount} kritisk{criticalCount > 1 ? "e" : ""} varsel — sjå regelkontroll under.
              </p>
            )}
          </div>
          <div className="shrink-0">
            <PdfDownloadButton data={allValues as PlanData} warnings={warnings} />
          </div>
        </div>
      </div>

      {/* Sketch bridge */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <TrenchPlannerBridge form={form} />
      </div>

      {/* Warnings panel */}
      {warnings.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Ingen aktive regelvarsel.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setWarningsExpanded((v) => !v)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-amber-100/50"
          >
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
              criticalCount > 0 ? "bg-red-500" : "bg-amber-500",
            )}>
              {warnings.length}
            </span>
            <span className="font-semibold text-slate-800">
              Regelkontroll
              {criticalCount > 0
                ? ` — ${criticalCount} kritisk${criticalCount > 1 ? "e" : ""} og ${warnings.length - criticalCount} advars${warnings.length - criticalCount !== 1 ? "lar" : "el"}`
                : ` — ${warnings.length} advarsel${warnings.length !== 1 ? "er" : ""}`}
            </span>
            <svg
              className={cn("ml-auto h-4 w-4 text-slate-400 transition-transform", warningsExpanded && "rotate-180")}
              viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {warningsExpanded && (
            <div className="space-y-2 border-t border-amber-200 px-5 py-4">
              {warnings.map((w) => (
                <div key={w.id} className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  w.severity === "critical"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-white text-amber-800",
                )}>
                  <span className="shrink-0">{w.severity === "critical" ? "🔴" : "⚠️"}</span>
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Dette verktøyet er eit hjelpemiddel for utarbeiding av grøfteplan. Brukaren er sjølv ansvarleg
        for at planen kontrollerast, tilpassast lokale forhold og oppfyller gjeldande krav.
      </p>
    </div>
  );
}
