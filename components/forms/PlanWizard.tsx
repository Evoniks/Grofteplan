"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planSchema, type PlanSchema } from "@/lib/schema";
import type { PlanData } from "@/types/plan";
import { planDefaultValues as defaultValues } from "@/lib/plan-defaults";
import { evaluateRules } from "@/lib/rule-engine";
import { loadPlanDraft, savePlanDraft } from "@/lib/plan-repository";
import { loadTrenchPlannerExport } from "@/lib/trench-planner-storage";
import { depthPlanHint, getVisibleWizardSteps, WIZARD_STEP_TITLES } from "@/lib/plan-wizard-steps";
import { PdfDownloadButton } from "@/components/pdf/PdfDownloadButton";
import { TrenchPlannerBridge } from "@/components/plan/TrenchPlannerBridge";
import { AddressFields } from "@/components/forms/AddressFields";
import { SignaturePad } from "@/components/forms/SignaturePad";
import type { LengdeprofilRad, PersonIGroftRad } from "@/types/plan";
import { formatPersonerIGroft, migratePlanDraft } from "@/lib/plan-draft-migrate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const IKKE_AKTUELT = "Ikke aktuelt";

type BoolFieldProps = {
  label: string;
  name: keyof PlanSchema;
  control: ReturnType<typeof useForm<PlanSchema>>["control"];
  hint?: string;
  links?: HelpLink[];
  optional?: boolean;
};

type HelpLink = {
  label: string;
  url: string;
};

function BoolField({ label, name, control, hint, links, optional }: BoolFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(Boolean(v))} />
          <Label className="flex items-center gap-2">
            <span>{label}</span>
            {optional && <span className="text-xs font-normal text-slate-500">(valgfritt)</span>}
            {(hint || links?.length) && <HelpHint text={hint ?? ""} links={links} />}
          </Label>
        </div>
      )}
    />
  );
}

function OptionalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-800">{title}</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function PlanWizard() {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSavedSketch, setHasSavedSketch] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const fraSkisseHandled = useRef(false);
  const activeStepIdRef = useRef(0);
  const form = useForm<PlanSchema>({
    resolver: zodResolver(planSchema),
    mode: "onChange",
    defaultValues
  });

  const allValues = form.watch();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    let cancelled = false;
    void (async () => {
      const stored = await loadPlanDraft();
      if (cancelled) return;
      if (stored) {
        form.reset({ ...defaultValues, ...stored, ...migratePlanDraft(stored) });
      }
      setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [form, mounted]);

  useEffect(() => {
    if (!mounted || !draftReady) return;
    const t = window.setTimeout(() => {
      void savePlanDraft(allValues as PlanData);
    }, 400);
    return () => window.clearTimeout(t);
  }, [allValues, mounted, draftReady]);

  useEffect(() => {
    if (!mounted || !draftReady) return;
    return () => {
      void savePlanDraft(form.getValues() as PlanData);
    };
  }, [mounted, draftReady, form]);

  useEffect(() => {
    form.setValue("dybdeOver125", allValues.maksDybdeMeter > 1.25);
    form.setValue("dybdeOver200", allValues.maksDybdeMeter > 2);
  }, [allValues.maksDybdeMeter, form]);

  const visibleSteps = useMemo(
    () => getVisibleWizardSteps(allValues as PlanData),
    [allValues]
  );
  const step = visibleSteps[stepIndex] ?? 0;

  useEffect(() => {
    activeStepIdRef.current = step;
  }, [step]);

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
      const path = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, "", path);
    }, 400);
    return () => window.clearTimeout(t);
  }, [mounted, visibleSteps.length]);

  useEffect(() => {
    if (!allValues.fkpSammePerson) return;
    const groft = (allValues.fkpAnsvarligGroft ?? "").trim();
    if ((allValues.fkpAnsvarligGjennomforing ?? "").trim() !== groft) {
      form.setValue("fkpAnsvarligGjennomforing", groft);
    }
  }, [allValues.fkpSammePerson, allValues.fkpAnsvarligGroft, allValues.fkpAnsvarligGjennomforing, form]);

  useEffect(() => {
    const text = formatPersonerIGroft(allValues.personerIGroftRader);
    if (text !== (allValues.personerIGroft ?? "")) {
      form.setValue("personerIGroft", text);
    }
  }, [allValues.personerIGroftRader, allValues.personerIGroft, form]);

  const ingenInstallasjoner = allValues.ingenKjenteInstallasjoner;
  const onLastStep = stepIndex >= visibleSteps.length - 1;
  useEffect(() => {
    if (!ingenInstallasjoner) return;
    form.setValue("installasjonVa", false);
    form.setValue("installasjonOvervann", false);
    form.setValue("installasjonSpillvann", false);
    form.setValue("installasjonHoyspent", false);
    form.setValue("installasjonLavspent", false);
    form.setValue("installasjonFiberTele", false);
    form.setValue("installasjonGassFjernvarme", false);
    form.setValue("installasjonUkjent", false);
    form.setValue("kabelpavisningUtfort", false);
  }, [ingenInstallasjoner, form]);

  const warnings = useMemo(() => evaluateRules(allValues as PlanData), [allValues]);

  if (!mounted) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Laster skjema …
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSavedSketch ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <strong>Skisser er lagra.</strong> Fyll ut skjemaet under og trykk «Generer PDF» på siste steg for hele
          grøfteplanen med skisser, varsler og signering.
          {!onLastStep ? (
            <button
              type="button"
              className="ml-2 font-medium text-emerald-800 underline"
              onClick={() => setStepIndex(visibleSteps.length - 1)}
            >
              Gå til siste steg
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Tips: Lag skisser i{" "}
          <a href="/skisseverktoy" className="font-medium text-brand-700 underline">
            skisseverktøyet
          </a>{" "}
          først — de kan tas med i PDF når du er ferdig med skjemaet.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Steg {stepIndex + 1} av {visibleSteps.length}: {WIZARD_STEP_TITLES[step]}
          </CardTitle>
          <CardDescription>
            Fyll ut det som gjelder for prosjektet. Valgfrie felt kan stå tomme eller fylles med «Ikke aktuelt».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Prosjektnavn"><Input {...form.register("prosjektnavn")} /></Field>
              <Field label="Entreprenør">
                <Input {...form.register("entreprenor")} />
              </Field>
              <Field label="Byggherre"><Input {...form.register("byggherre")} /></Field>
              <Field
                label="Ansvarlig person"
                hint="Navn på den som følger opp planen i felt."
                example="Eksempel: Ola Nordmann"
              >
                <Input {...form.register("ansvarligPerson")} />
              </Field>
              <Field label="Dato"><Input type="date" {...form.register("dato")} /></Field>
              <OptionalSection title="Valgfritt – dokumentasjon og roller">
                <Field label="Revisjonsnummer" optional>
                  <Input {...form.register("revisjonsnummer")} placeholder="R0" />
                </Field>
                <Field label="Dokumentnummer" optional>
                  <Input {...form.register("dokumentnummer")} placeholder="T.d. 030603-010 B" />
                </Field>
                <Field label="Underprosjekt" optional>
                  <Input {...form.register("underprosjekt")} />
                </Field>
                <div className="md:col-span-2 space-y-2">
                  <BoolField
                    control={form.control}
                    name="fkpSammePerson"
                    label="Samme person er FKP for grøft og gjennomføring"
                    optional
                  />
                  {allValues.fkpSammePerson ? (
                    <Field
                      className="md:col-span-2"
                      label="FKP – ansvarlig grøft og gjennomføring"
                      optional
                      hint="Faglig kompetent person med ansvar for grøfta og gjennomføringen."
                    >
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
                    <>
                      <Field
                        label="FKP – ansvarlig grøft"
                        optional
                        hint="Faglig kompetent person med ansvar for grøfta."
                      >
                        <Input {...form.register("fkpAnsvarligGroft")} />
                      </Field>
                      <Field label="FKP – ansvarlig for gjennomføring" optional>
                        <Input {...form.register("fkpAnsvarligGjennomforing")} />
                      </Field>
                    </>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <p className="text-sm font-medium text-slate-800">Personer i grøft (valgfritt)</p>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = (allValues.personerIGroftRader ?? []).filter((_, j) => j !== i);
                          form.setValue(
                            "personerIGroftRader",
                            next.length ? next : [{ navn: "", rolle: "" }]
                          );
                        }}
                      >
                        Fjern
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      form.setValue("personerIGroftRader", [
                        ...(allValues.personerIGroftRader ?? []),
                        { navn: "", rolle: "" }
                      ])
                    }
                  >
                    Legg til person
                  </Button>
                </div>
              </OptionalSection>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <AddressFields form={form} />
              <Field
                className="md:col-span-2"
                label="Beskrivelse av arbeidsområdet"
                hint="Beskriv hvor grøften går, hva som ligger rundt og tilgang."
                example="Eksempel: Langs fylkesvei 123 mellom kryss og pumpestasjon."
              >
                <Textarea {...form.register("arbeidsomrade")} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Grøftelengde (m)"
                hint="Total planlagt lengde i denne etappen."
                example="Eksempel: 120"
              >
                <Input type="number" step="0.1" {...form.register("groftelengdeMeter", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Maks dybde (m)"
                hint="Største dybde i grøfta fra terreng til bunn."
                example="Eksempel: 1.8"
                links={[
                  { label: "Kapittel 21 (gravearbeid) - Lovdata", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" },
                  { label: "Arbeidstilsynet: Gravearbeid", url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/" }
                ]}
              >
                <Input type="number" step="0.1" {...form.register("maksDybdeMeter", { valueAsNumber: true })} />
              </Field>
              <Field label="Bredde i bunn (m)">
                <Input type="number" step="0.1" {...form.register("breddeBunnMeter", { valueAsNumber: true })} />
              </Field>
              <Field label="Bredde i topp (m)">
                <Input type="number" step="0.1" {...form.register("breddeToppMeter", { valueAsNumber: true })} />
              </Field>
              <Field
                className="md:col-span-2"
                label="Etappebeskrivelse"
                optional
                hint="Beskriv hvordan arbeidet deles opp i etapper."
              >
                <Textarea {...form.register("etappebeskrivelse")} placeholder="Valgfritt" />
              </Field>
              <p className="md:col-span-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                {depthPlanHint(allValues.maksDybdeMeter)}
              </p>
              <div className="md:col-span-2 space-y-2 rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">Hva gjelder for dette prosjektet?</p>
                <BoolField
                  control={form.control}
                  name="ingenKjenteInstallasjoner"
                  label="Ingen kjente installasjoner i grunnen (hopp over steget)"
                />
                <BoolField
                  control={form.control}
                  name="trafikkStegIkkeAktuelt"
                  label="Trafikk/vei nær grøft er ikke aktuelt (hopp over steget)"
                />
              </div>
              <OptionalSection title="Valgfritt – lengdeprofil med massebeskrivelser">
                {(allValues.lengdeprofilRader ?? []).map((rad, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-4">
                    <Input
                      placeholder="Pel / strekk"
                      value={rad.pel}
                      onChange={(e) => {
                        const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                        next[i] = { ...next[i], pel: e.target.value };
                        form.setValue("lengdeprofilRader", next);
                      }}
                    />
                    <Input
                      placeholder="Masse"
                      value={rad.masse}
                      onChange={(e) => {
                        const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                        next[i] = { ...next[i], masse: e.target.value };
                        form.setValue("lengdeprofilRader", next);
                      }}
                    />
                    <Input
                      placeholder="Dybde"
                      value={rad.dybde}
                      onChange={(e) => {
                        const next = [...(allValues.lengdeprofilRader ?? [])] as LengdeprofilRad[];
                        next[i] = { ...next[i], dybde: e.target.value };
                        form.setValue("lengdeprofilRader", next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = (allValues.lengdeprofilRader ?? []).filter((_, j) => j !== i);
                        form.setValue("lengdeprofilRader", next.length ? next : [{ pel: "", masse: "", dybde: "" }]);
                      }}
                    >
                      Fjern
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue("lengdeprofilRader", [
                      ...(allValues.lengdeprofilRader ?? []),
                      { pel: "", masse: "", dybde: "" }
                    ])
                  }
                >
                  Legg til rad
                </Button>
              </OptionalSection>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Jordart"
                hint="Velg mest representative massetype i grøftetraseen."
              >
                <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...form.register("jordart")}>
                  <option value="fjell">Fjell</option>
                  <option value="sand">Sand</option>
                  <option value="grus">Grus</option>
                  <option value="leire">Leire</option>
                  <option value="fyllmasser">Fyllmasser</option>
                  <option value="ukjent">Ukjent</option>
                </select>
              </Field>
              <div />
              <BoolField control={form.control} name="grunnvann" label="Grunnvann/vanninnsig" hint="Kryss av ved synlig innsig eller høy vannstand." />
              <BoolField control={form.control} name="skraningINarheten" label="Skråning i nærheten" hint="Kryss av hvis skråninger kan påvirke stabilitet." />
              <BoolField control={form.control} name="byggINarheten" label="Bygg/fundament i nærheten" hint="Kryss av ved nærliggende bygg, murer eller fundamenter." />
              <BoolField
                control={form.control}
                name="geotekniskBehov"
                label="Behov for geoteknisk vurdering"
                optional
                hint="Brukes når grunnforhold eller omgivelser er usikre."
              />
              <OptionalSection title="Valgfritt – grunnundersøkelser (rørstrekk)">
                <BoolField control={form.control} name="grunnundersokelseProvegraving" label="Prøvegraving" />
                <BoolField control={form.control} name="grunnundersokelseGrunnboring" label="Grunnboring" />
                <BoolField control={form.control} name="grunnundersokelseSondering" label="Sondering (total/trykk/dreie)" />
                <BoolField control={form.control} name="grunnundersokelseIkkeForetatt" label="Ikke foretatt" />
                <Field label="Annet (kommenter)" optional>
                  <Input {...form.register("grunnundersokelseAnnet")} />
                </Field>
              </OptionalSection>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 md:grid-cols-2">
              <p className="md:col-span-2 text-sm text-slate-600">
                Kryss av installasjonstyper som kan ligge i grøftetraseen. Fjern avkrysning på «Ingen kjente
                installasjoner» i geometri-steget for å hoppe over dette steget.
              </p>
              <BoolField control={form.control} name="installasjonVa" label="VA" />
              <BoolField control={form.control} name="installasjonOvervann" label="Overvann" />
              <BoolField control={form.control} name="installasjonSpillvann" label="Spillvann" />
              <BoolField control={form.control} name="installasjonHoyspent" label="Høyspent" />
              <BoolField control={form.control} name="installasjonLavspent" label="Lavspent" />
              <BoolField control={form.control} name="installasjonFiberTele" label="Fiber/tele" />
              <BoolField control={form.control} name="installasjonGassFjernvarme" label="Gass/fjernvarme" />
              <BoolField control={form.control} name="installasjonUkjent" label="Ukjente installasjoner" />
              <BoolField
                control={form.control}
                name="kabelpavisningUtfort"
                label="Er kabel-/ledningspåvisning utført?"
                hint="Kryss av når dokumentert påvisning er gjennomført før graving."
                links={[
                  { label: "Geomatikk: Gravemelding og kabelpåvisning", url: "https://geomatikk.no/jeg-skal-grave/gravemelding-og-kabelpavisning/" },
                  { label: "Nærøysund: ansvar for påvisning", url: "https://www.naroysund.kommune.no/tjenester/vei-vann-avlop-og-miljo/vann-og-avlop/gravemelding/" }
                ]}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <BoolField
                control={form.control}
                name="trafikkbelastningNarGroft"
                label="Trafikkbelastning nær grøft"
                hint="Gjelder både kjøretøytrafikk og tungtransport nær grøftekant."
              />
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Vurder og dokumenter trafikkavvikling, myke trafikanter og påvirkning på omgivelser i
                prosjektets SHA-dokumentasjon.
              </p>
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Behov for avstiving" className="md:col-span-2" optional>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  {...form.register("avstivingBehov")}
                >
                  <option value="">Velg …</option>
                  <option value="nei_1_1">Nei – klarer skråning ca. 1:1</option>
                  <option value="ja">Ja – avstiving nødvendig</option>
                </select>
              </Field>
              <Field className="md:col-span-2" label="Kommentar avstiving" optional>
                <Textarea {...form.register("avstivingKommentar")} placeholder="T.d. gode, stabile masser …" />
              </Field>
              <Field
                label="Valgt sikringsmetode"
                hint="Påkrevd ved dybde over ca. 2 m eller når avstiving er nødvendig (jf. § 21-9). Velg «Ikke relevant» ved grundere grøfter uten særskilt avstiving/sikring."
              >
                <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...form.register("sikringsmetode")}>
                  <option value="ikke relevant">Ikke relevant</option>
                  <option value="skrå gravesider">Skrå gravesider</option>
                  <option value="grøftekasse">Grøftekasse</option>
                  <option value="spunt">Spunt</option>
                  <option value="annen avstivning">Annen avstivning</option>
                </select>
              </Field>
              <Field
                label="Rømningsvei/adkomst"
                optional
                hint="Beskriv hvordan arbeidere kommer trygt ned og opp av grøften."
                example="Eksempel: Stige for hver 25. meter."
              >
                <Input {...form.register("romningsvei")} placeholder="Valgfritt under ca. 1 m dybde" />
              </Field>
              <Field
                className="md:col-span-2"
                label="Beskrivelse av sikring"
                optional={allValues.sikringsmetode === "ikke relevant"}
                hint="Beskriv valgt løsning i praksis: metode, etapper, kontroll av grøftevegger og hvem som følger opp."
                example="Eksempel: Grøftekasse flyttes etappevis hver 6. meter. Visuell kontroll av grøftevegger før oppstart og etter pauser."
                links={[{ label: "Lovdata § 21-9 (gravegroper som skal avstives)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              >
                <Textarea {...form.register("sikringBeskrivelse")} placeholder="Påkrevd når sikringsmetode er valgt" />
              </Field>
              <Field
                className="md:col-span-2"
                label="Avsperring/sikring mot tredjeperson"
                optional
                hint="Beskriv hvordan området sikres mot publikum, trafikk og uvedkommende."
                example="Eksempel: Byggegjerde og sperrebånd rundt åpen grøft. Tydelig skilt, gangpassasje og lysmarkering i mørke."
                links={[{ label: "Arbeidstilsynet: Gravearbeid (generelle forholdsregler)", url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/" }]}
              >
                <Textarea {...form.register("avsperring")} />
              </Field>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (allValues.sikringsmetode === "ikke relevant") {
                      form.setValue("sikringBeskrivelse", IKKE_AKTUELT);
                    }
                    form.setValue("romningsvei", IKKE_AKTUELT);
                    form.setValue("avsperring", IKKE_AKTUELT);
                  }}
                >
                  Sett «Ikke aktuelt» på valgfrie sikringsfelt
                </Button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plassering av gravemasser" optional hint="Hvor massene legges i forhold til grøfta.">
                <Input {...form.register("plasseringGravemasser")} />
              </Field>
              <Field
                label="Avstand fra grøftekant (m)"
                hint="Anbefalt minst 1,0 meter."
                links={[{ label: "Lovdata § 21-8 (plassering av gravemasser)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              >
                <Input type="number" step="0.1" {...form.register("avstandFraGroftekantMeter", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Mellomlagring"
                optional
                hint="Beskriv hvor masser midlertidig lagres, varighet og sikring av haugene."
                example="Eksempel: Mellomlagres på riggplass nord for trase i maks 48 timer."
              >
                <Textarea {...form.register("mellomlagring")} />
              </Field>
              <Field
                label="Massetransport"
                optional
                hint="Beskriv transportvei, type kjøretøy, frekvens og tiltak for trygg transport."
                example="Eksempel: Bortkjøring med 3-akslet bil via riggvei mellom kl. 07-19."
              >
                <Textarea {...form.register("massetransport")} />
              </Field>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue("plasseringGravemasser", IKKE_AKTUELT);
                    form.setValue("mellomlagring", IKKE_AKTUELT);
                    form.setValue("massetransport", IKKE_AKTUELT);
                  }}
                >
                  Sett «Ikke aktuelt» på valgfrie massefelt
                </Button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <Field
                label="Kort arbeidsbeskrivelse"
                hint="Oppsummer arbeidstrinn fra oppstart til gjenfylling."
              >
                <Textarea {...form.register("arbeidsbeskrivelse")} />
              </Field>
              <Field
                label="Stoppkriterier"
                hint="Definer tydelig når arbeidet skal stoppes umiddelbart av sikkerhetsgrunner."
                example="Eksempel: Rasfare, uavklart kabeltreff, vanninnsig over pumpekapasitet eller manglende avsperring."
                links={[{ label: "Lovdata § 21-6 (kontroll av gravegrop)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              >
                <Textarea {...form.register("stoppkriterier")} />
              </Field>
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Planen leveres før arbeid starter. Kryss av for tiltak og rutiner som skal gjelde under
                gjennomføringen — ikke som dokumentasjon på at kontroll allerede er utført.
              </p>
              <BoolField
                control={form.control}
                name="sikkerJobbAnalyseUtfort"
                label="Sikker jobb-analyse skal utføres før oppstart"
                optional
              />
              <BoolField
                control={form.control}
                name="dagligKontroll"
                label="Kontroll utføres daglig/forløpende"
                optional
              />
              <BoolField
                control={form.control}
                name="kontrollEtterUvaer"
                label="Etter utfordrende vær/uvær utføres ny kontroll før start av arbeid"
                optional
              />
            </div>
          )}

          {step === 9 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                className="md:col-span-2"
                label="Kontrollpunkter"
                hint="Skriv konkrete kontrollpunkter som kan sjekkes i felt."
                example="Eksempel: avsperring satt opp, påvisning verifisert, stige på plass."
              >
                <Textarea {...form.register("kontrollpunkter")} />
              </Field>
              <div className="md:col-span-2 space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Signatur</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Skriv navn og signer digitalt i feltet under (mus, penn eller finger). Signaturen lagres og
                    vises i PDF.
                  </p>
                </div>
                <Field label="Signaturdato">
                  <Input type="date" className="max-w-xs" {...form.register("signaturDato")} />
                </Field>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Field
                      label="Utarbeidet av"
                      hint="Personen som har laget planen."
                      example="Eksempel: Mariu M."
                      links={[
                        {
                          label: "Byggherreforskriften § 7-8 (SHA-plan)",
                          url: "https://lovdata.no/forskrift/2009-08-03-1028"
                        }
                      ]}
                    >
                      <Input className="h-11" {...form.register("utarbeidetAv")} />
                    </Field>
                    <Controller
                      control={form.control}
                      name="utarbeidetSignatur"
                      render={({ field }) => (
                        <SignaturePad
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          aria-label="Signatur utarbeidet av"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-3">
                    <Field
                      label="Kontrollert av"
                      hint="Bør helst være en annen person; kan være samme i små prosjekter dersom det begrunnes."
                      example="Eksempel: Kari K."
                      links={[
                        {
                          label: "Byggherreforskriften § 8 og § 14",
                          url: "https://lovdata.no/forskrift/2009-08-03-1028"
                        }
                      ]}
                    >
                      <Input className="h-11" {...form.register("kontrollertAv")} />
                    </Field>
                    <Controller
                      control={form.control}
                      name="kontrollertSignatur"
                      render={({ field }) => (
                        <SignaturePad
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          aria-label="Signatur kontrollert av"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <OptionalSection title="Valgfritt – godkjenning">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Godkjent av" optional>
                    <Input className="h-11" {...form.register("godkjentAv")} />
                  </Field>
                  <Field label="Godkjent dato" optional>
                    <Input type="date" className="h-11" {...form.register("godkjentDato")} />
                  </Field>
                </div>
                <div className="max-w-md">
                  <p className="mb-2 text-xs font-medium text-slate-800">Godkjenning – signatur (valgfritt)</p>
                  <Controller
                    control={form.control}
                    name="godkjentSignatur"
                    render={({ field }) => (
                      <SignaturePad
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        aria-label="Signatur godkjent av"
                      />
                    )}
                  />
                </div>
              </OptionalSection>
              <OptionalSection title="Valgfritt – § 21-5-tekst (import frå skisseverktøy eller manuelt)">
                <Field label="a) Lengdeprofil" optional>
                  <Textarea rows={2} {...form.register("plan215Lengdeprofil")} />
                </Field>
                <Field label="a) Jordarter / installasjoner" optional>
                  <Textarea rows={2} {...form.register("plan215Jordarter")} />
                </Field>
                <Field label="b) Typiske tverrprofiler" optional>
                  <Textarea rows={2} {...form.register("plan215Tverrprofil")} />
                </Field>
                <Field label="c) Plassering gravemasser" optional>
                  <Textarea rows={2} {...form.register("plan215Gravemasser")} />
                </Field>
                <Field label="d) Arbeidsinstruks" optional>
                  <Textarea rows={3} {...form.register("plan215Arbeidsinstruks")} />
                </Field>
              </OptionalSection>
              {(allValues.utarbeidetAv ?? "").trim() &&
                (allValues.kontrollertAv ?? "").trim() &&
                (allValues.utarbeidetAv ?? "").trim().toLowerCase() ===
                  (allValues.kontrollertAv ?? "").trim().toLowerCase() && (
                  <p className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Utarbeidet av og kontrollert av er satt til samme person. Dette kan aksepteres i
                    mindre prosjekter, men det bør dokumenteres hvorfor uavhengig kontroll ikke er brukt.
                  </p>
                )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              disabled={stepIndex === 0}
            >
              Forrige
            </Button>
            <Button
              type="button"
              onClick={() => setStepIndex((s) => Math.min(visibleSteps.length - 1, s + 1))}
              disabled={stepIndex >= visibleSteps.length - 1}
            >
              Neste
            </Button>
            <Button type="button" variant="secondary" onClick={() => form.reset(defaultValues)}>
              Nullstill
            </Button>
            <div className="w-full space-y-1 sm:w-auto">
              <PdfDownloadButton data={allValues as PlanData} warnings={warnings} />
              {onLastStep ? (
                <p className="max-w-xs text-xs text-slate-600">
                  Last ned komplett PDF med alle utfylte felt{hasSavedSketch ? " og lagra skisser" : ""}.
                </p>
              ) : (
                <p className="max-w-xs text-xs text-slate-500">
                  «Generer PDF» er tilgjengelig på alle steg; anbefalt når skjemaet er ferdig utfylt.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Skisser frå skisseverktøy</CardTitle>
          <CardDescription>
            Forhåndsvisning og import av § 21-5-tekst. Rediger skisser i{" "}
            <a href="/skisseverktoy" className="text-brand-700 underline">
              skisseverktøyet
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrenchPlannerBridge form={form} />
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle>Regelkontroll</CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-sm text-slate-700">Ingen varsler utløst.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {warnings.map((warning) => (
                <li
                  key={warning.id}
                  className={
                    warning.severity === "critical"
                      ? "rounded border border-red-200 bg-red-50 px-3 py-2 text-red-900"
                      : "rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-900"
                  }
                >
                  {warning.message}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Dette verktøyet er et hjelpemiddel for utarbeidelse av grøfteplan. Bruker er selv ansvarlig
        for at planen kontrolleres, tilpasses lokale forhold og oppfyller gjeldende krav.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  hint,
  example,
  links,
  optional
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  example?: string;
  links?: HelpLink[];
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 flex items-center gap-2">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-slate-500">(valgfritt)</span>}
        {(hint || example || links?.length) && (
          <HelpHint text={[hint, example].filter(Boolean).join(" ")} links={links} />
        )}
      </Label>
      {children}
    </div>
  );
}

function HelpHint({ text, links }: { text: string; links?: HelpLink[] }) {
  return (
    <details className="group relative inline-block">
      <summary
        className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-300"
        aria-label="Vis forklaring"
      >
        ?
      </summary>
      <div className="absolute left-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-2 text-xs font-normal leading-relaxed text-slate-700 shadow-lg">
        <p>{text}</p>
        {links && links.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
            {links.map((link) => (
              <a
                key={link.url + link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block text-brand-700 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
