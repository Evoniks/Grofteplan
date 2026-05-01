"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planSchema, type PlanSchema } from "@/lib/schema";
import type { PlanData } from "@/types/plan";
import { evaluateRules } from "@/lib/rule-engine";
import { loadPlanDraft, savePlanDraft } from "@/lib/plan-repository";
import { CrossSectionCanvasSketch } from "@/components/sketches/CrossSectionCanvasSketch";
import { PlanViewSketch } from "@/components/sketches/PlanViewSketch";
import { PosterTemplateSketch } from "@/components/sketches/PosterTemplateSketch";
import { PdfDownloadButton } from "@/components/pdf/PdfDownloadButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const steps = [
  "Prosjektinformasjon",
  "Sted og omfang",
  "Grøftegeometri",
  "Grunnforhold",
  "Installasjoner i grunnen",
  "Trafikk og omgivelser",
  "Sikringstiltak",
  "Masser og rigg",
  "Arbeidsinstruks",
  "Kontroll og signering"
];

const defaultValues: PlanData = {
  prosjektnavn: "",
  entreprenor: "",
  byggherre: "",
  ansvarligPerson: "",
  dato: new Date().toISOString().slice(0, 10),
  revisjonsnummer: "R0",
  adresse: "",
  kommune: "",
  arbeidsomrade: "",
  groftelengdeMeter: 20,
  maksDybdeMeter: 1.2,
  breddeBunnMeter: 0.8,
  breddeToppMeter: 1.8,
  etappebeskrivelse: "",
  dybdeOver125: false,
  dybdeOver200: false,
  jordart: "sand",
  grunnvann: false,
  skraningINarheten: false,
  byggINarheten: false,
  trafikkbelastningNarGroft: false,
  geotekniskBehov: false,
  installasjonVa: false,
  installasjonOvervann: false,
  installasjonSpillvann: false,
  installasjonHoyspent: false,
  installasjonLavspent: false,
  installasjonFiberTele: false,
  installasjonGassFjernvarme: false,
  installasjonUkjent: false,
  kabelpavisningUtfort: false,
  sikringsmetode: "grøftekasse",
  sikringBeskrivelse: "",
  romningsvei: "",
  avsperring: "",
  plasseringGravemasser: "",
  avstandFraGroftekantMeter: 1,
  mellomlagring: "",
  massetransport: "",
  arbeidsbeskrivelse: "",
  sikkerJobbAnalyseUtfort: false,
  dagligKontroll: false,
  kontrollEtterUvaer: false,
  stoppkriterier: "",
  kontrollpunkter: "",
  utarbeidetAv: "",
  kontrollertAv: "",
  signaturDato: new Date().toISOString().slice(0, 10),
  skisseTverrprofilTittel: "Typisk tverrprofil",
  skisseLengdeprofilTittel: "Planvisning (fugleperspektiv)",
  skisseTerrengLabel: "Terrenglinje",
  skisseLedningLabel: "Rør/ledning i bunn",
  skisseMasserLabel: "Gravemasser",
  skisseVisSymboler: true,
  skisseMal: "standard",
  skisseLedningSymbol: "sirkel",
  skisseMasserSymbol: "firkant",
  skisseDybdeMeter: 1.2,
  skisseBreddeBunnMeter: 0.8,
  skisseBreddeToppMeter: 1.8,
  skisseMasseAvstandMeter: 1,
  skisseLengdeMeter: 20
};

type BoolFieldProps = {
  label: string;
  name: keyof PlanSchema;
  control: ReturnType<typeof useForm<PlanSchema>>["control"];
  hint?: string;
  links?: HelpLink[];
};

type HelpLink = {
  label: string;
  url: string;
};

function BoolField({ label, name, control, hint, links }: BoolFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(Boolean(v))} />
          <Label className="flex items-center gap-2">
            <span>{label}</span>
            {(hint || links?.length) && <HelpHint text={hint ?? ""} links={links} />}
          </Label>
        </div>
      )}
    />
  );
}

export function PlanWizard() {
  const [step, setStep] = useState(0);
  const form = useForm<PlanSchema>({
    resolver: zodResolver(planSchema),
    mode: "onChange",
    defaultValues
  });

  const allValues = form.watch();

  useEffect(() => {
    void (async () => {
      const stored = await loadPlanDraft();
      if (stored) form.reset({ ...defaultValues, ...stored });
    })();
  }, [form]);

  useEffect(() => {
    void savePlanDraft(allValues as PlanData);
  }, [allValues]);

  useEffect(() => {
    form.setValue("dybdeOver125", allValues.maksDybdeMeter > 1.25);
    form.setValue("dybdeOver200", allValues.maksDybdeMeter > 2);
  }, [allValues.maksDybdeMeter, form]);

  const warnings = useMemo(() => evaluateRules(allValues as PlanData), [allValues]);
  const hasInstallations =
    allValues.installasjonVa ||
    allValues.installasjonOvervann ||
    allValues.installasjonSpillvann ||
    allValues.installasjonHoyspent ||
    allValues.installasjonLavspent ||
    allValues.installasjonFiberTele ||
    allValues.installasjonGassFjernvarme ||
    allValues.installasjonUkjent;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Steg {step + 1}: {steps[step]}</CardTitle>
          <CardDescription>
            Fyll ut informasjonen for å generere en komplett grøfteplan med regelkontroll og PDF.
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
              <Field label="Revisjonsnummer"><Input {...form.register("revisjonsnummer")} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Adresse" hint="Adresse eller nærmeste stedsangivelse."><Input {...form.register("adresse")} /></Field>
              <Field label="Kommune"><Input {...form.register("kommune")} /></Field>
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
                hint="Beskriv hvordan arbeidet deles opp i etapper."
              >
                <Textarea {...form.register("etappebeskrivelse")} />
              </Field>
              <BoolField
                control={form.control}
                name="dybdeOver125"
                label="Er grøften dypere enn 1,25 m?"
                hint="Brukes for å utløse krav om grøfteplan."
                links={[{ label: "Lovdata § 21-5 (plan for arbeidet)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              />
              <BoolField
                control={form.control}
                name="dybdeOver200"
                label="Er grøften dypere enn 2,0 m?"
                hint="Dybder over 2,0 m krever strengere sikring."
                links={[{ label: "Lovdata § 21-9 (avstiving/helling)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              />
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
              <BoolField control={form.control} name="geotekniskBehov" label="Behov for geoteknisk vurdering" hint="Brukes når grunnforhold eller omgivelser er usikre." />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 md:grid-cols-2">
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
              <Field
                label="Valgt sikringsmetode"
                hint="Velg hovedmetode for å sikre grøften mot ras."
              >
                <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...form.register("sikringsmetode")}>
                  <option value="skrå gravesider">Skrå gravesider</option>
                  <option value="grøftekasse">Grøftekasse</option>
                  <option value="spunt">Spunt</option>
                  <option value="annen avstivning">Annen avstivning</option>
                </select>
              </Field>
              <Field
                label="Rømningsvei/adkomst"
                hint="Beskriv hvordan arbeidere kommer trygt ned og opp av grøften."
                example="Eksempel: Stige for hver 25. meter."
              >
                <Input {...form.register("romningsvei")} />
              </Field>
              <Field
                className="md:col-span-2"
                label="Beskrivelse av sikring"
                hint="Beskriv valgt løsning i praksis: metode, etapper, kontroll av grøftevegger og hvem som følger opp."
                example="Eksempel: Grøftekasse flyttes etappevis hver 6. meter. Visuell kontroll av grøftevegger før oppstart og etter pauser."
                links={[{ label: "Lovdata § 21-9 (gravegroper som skal avstives)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              >
                <Textarea {...form.register("sikringBeskrivelse")} />
              </Field>
              <Field
                className="md:col-span-2"
                label="Avsperring/sikring mot tredjeperson"
                hint="Beskriv hvordan området sikres mot publikum, trafikk og uvedkommende."
                example="Eksempel: Byggegjerde og sperrebånd rundt åpen grøft. Tydelig skilt, gangpassasje og lysmarkering i mørke."
                links={[{ label: "Arbeidstilsynet: Gravearbeid (generelle forholdsregler)", url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/" }]}
              >
                <Textarea {...form.register("avsperring")} />
              </Field>
            </div>
          )}

          {step === 7 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plassering av gravemasser" hint="Hvor massene legges i forhold til grøfta."><Input {...form.register("plasseringGravemasser")} /></Field>
              <Field
                label="Avstand fra grøftekant (m)"
                hint="Anbefalt minst 1,0 meter."
                links={[{ label: "Lovdata § 21-8 (plassering av gravemasser)", url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21" }]}
              >
                <Input type="number" step="0.1" {...form.register("avstandFraGroftekantMeter", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Mellomlagring"
                hint="Beskriv hvor masser midlertidig lagres, varighet og sikring av haugene."
                example="Eksempel: Mellomlagres på riggplass nord for trase i maks 48 timer."
              >
                <Textarea {...form.register("mellomlagring")} />
              </Field>
              <Field
                label="Massetransport"
                hint="Beskriv transportvei, type kjøretøy, frekvens og tiltak for trygg transport."
                example="Eksempel: Bortkjøring med 3-akslet bil via riggvei mellom kl. 07-19."
              >
                <Textarea {...form.register("massetransport")} />
              </Field>
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
              <BoolField control={form.control} name="sikkerJobbAnalyseUtfort" label="Sikker jobb-analyse utført?" />
              <BoolField control={form.control} name="dagligKontroll" label="Daglig kontroll" />
              <BoolField control={form.control} name="kontrollEtterUvaer" label="Kontroll etter regn/uvær/opphold" />
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
              <Field
                label="Utarbeidet av"
                hint="Personen som har laget planen."
                example="Eksempel: Mariu M."
                links={[{ label: "Byggherreforskriften § 7-8 (SHA-plan)", url: "https://lovdata.no/forskrift/2009-08-03-1028" }]}
              >
                <Input {...form.register("utarbeidetAv")} />
              </Field>
              <Field
                label="Kontrollert av"
                hint="Personen som har kontrollert planen. Bør helst være en annen person, men kan være samme i små prosjekter dersom dette begrunnes."
                example="Eksempel: Kari K. (uavhengig kontroll)"
                links={[{ label: "Byggherreforskriften § 8 og § 14", url: "https://lovdata.no/forskrift/2009-08-03-1028" }]}
              >
                <Input {...form.register("kontrollertAv")} />
              </Field>
              <Field label="Signaturdato"><Input type="date" {...form.register("signaturDato")} /></Field>
              {allValues.utarbeidetAv.trim() &&
                allValues.kontrollertAv.trim() &&
                allValues.utarbeidetAv.trim().toLowerCase() ===
                  allValues.kontrollertAv.trim().toLowerCase() && (
                  <p className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Utarbeidet av og kontrollert av er satt til samme person. Dette kan aksepteres i
                    mindre prosjekter, men det bør dokumenteres hvorfor uavhengig kontroll ikke er brukt.
                  </p>
                )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Forrige
            </Button>
            <Button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>
              Neste
            </Button>
            <Button type="button" variant="secondary" onClick={() => form.reset(defaultValues)}>
              Nullstill
            </Button>
            <PdfDownloadButton data={allValues as PlanData} warnings={warnings} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skissejustering</CardTitle>
          <CardDescription>
            Her kan du justere tekst, tall, avstander og symboler etter at skissen er generert.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Tittel tverrprofil"><Input {...form.register("skisseTverrprofilTittel")} /></Field>
          <Field label="Tittel planvisning"><Input {...form.register("skisseLengdeprofilTittel")} /></Field>
          <Field label="Etikett terrenglinje"><Input {...form.register("skisseTerrengLabel")} /></Field>
          <Field label="Etikett ledning"><Input {...form.register("skisseLedningLabel")} /></Field>
          <Field label="Etikett gravemasser"><Input {...form.register("skisseMasserLabel")} /></Field>
          <BoolField
            control={form.control}
            name="skisseVisSymboler"
            label="Vis symbolsignatur i skisse"
          />

          <Field className="md:col-span-2" label="Velg skissetype (mal)">
            <Controller
              control={form.control}
              name="skisseMal"
              render={({ field }) => (
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { id: "standard", title: "Standard", desc: "Balansert oppsett for vanlig dokumentasjon." },
                    { id: "kompakt", title: "Kompakt", desc: "Tettere layout med fokus på nøkkeltall." },
                    { id: "kontroll", title: "Kontroll", desc: "Ekstra tydelig på sikkerhet og kontrollpunkter." }
                  ].map((option) => {
                    const active = field.value === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => field.onChange(option.id)}
                        className={`rounded-md border p-3 text-left transition ${
                          active
                            ? "border-brand-600 bg-brand-50 text-brand-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        aria-pressed={active}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                              active ? "border-brand-700 bg-brand-700 text-white" : "border-slate-400 text-transparent"
                            }`}
                          >
                            ●
                          </span>
                          <span className="text-sm font-semibold">{option.title}</span>
                        </div>
                        <p className="text-xs">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </Field>

          <Field label="Symbol for ledning">
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...form.register("skisseLedningSymbol")}>
              <option value="sirkel">Sirkel</option>
              <option value="trekant">Trekant</option>
              <option value="firkant">Firkant</option>
            </select>
          </Field>
          <Field label="Symbol for masser">
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...form.register("skisseMasserSymbol")}>
              <option value="sirkel">Sirkel</option>
              <option value="trekant">Trekant</option>
              <option value="firkant">Firkant</option>
            </select>
          </Field>

          <Field label="Skisseverdi dybde (m)">
            <Input type="number" step="0.1" {...form.register("skisseDybdeMeter", { valueAsNumber: true })} />
          </Field>
          <Field label="Skisseverdi bredde bunn (m)">
            <Input type="number" step="0.1" {...form.register("skisseBreddeBunnMeter", { valueAsNumber: true })} />
          </Field>
          <Field label="Skisseverdi bredde topp (m)">
            <Input type="number" step="0.1" {...form.register("skisseBreddeToppMeter", { valueAsNumber: true })} />
          </Field>
          <Field label="Skisseverdi avstand masser (m)">
            <Input type="number" step="0.1" {...form.register("skisseMasseAvstandMeter", { valueAsNumber: true })} />
          </Field>
          <Field label="Skisseverdi plantrase lengde (m)">
            <Input type="number" step="1" {...form.register("skisseLengdeMeter", { valueAsNumber: true })} />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.setValue("skisseDybdeMeter", allValues.maksDybdeMeter);
                form.setValue("skisseBreddeBunnMeter", allValues.breddeBunnMeter);
                form.setValue("skisseBreddeToppMeter", allValues.breddeToppMeter);
                form.setValue("skisseMasseAvstandMeter", allValues.avstandFraGroftekantMeter);
                form.setValue("skisseLengdeMeter", allValues.groftelengdeMeter);
              }}
            >
              Hent tall fra skjema
            </Button>
          </div>
        </CardContent>
      </Card>

      <PosterTemplateSketch
        depth={allValues.skisseDybdeMeter}
        bottomWidth={allValues.skisseBreddeBunnMeter}
        topWidth={allValues.skisseBreddeToppMeter}
        length={allValues.skisseLengdeMeter}
        massDistance={allValues.skisseMasseAvstandMeter}
        method={allValues.sikringsmetode}
        template={allValues.skisseMal}
      />

      <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Avansert redigeringsmodus (interaktive skisser)
        </summary>
        <p className="mt-2 text-xs text-slate-600">
          Brukes for manuell finjustering. Offisiell visning for eksport er plakatmodusen over.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CrossSectionCanvasSketch
            title={allValues.skisseTverrprofilTittel}
            depth={allValues.skisseDybdeMeter}
            bottomWidth={allValues.skisseBreddeBunnMeter}
            topWidth={allValues.skisseBreddeToppMeter}
            massDistance={allValues.skisseMasseAvstandMeter}
            method={allValues.sikringsmetode}
            terrainLabel={allValues.skisseTerrengLabel}
            pipeLabel={allValues.skisseLedningLabel}
            massesLabel={allValues.skisseMasserLabel}
            showSymbols={allValues.skisseVisSymboler}
            pipeSymbol={allValues.skisseLedningSymbol}
            massesSymbol={allValues.skisseMasserSymbol}
          />
          <PlanViewSketch
            title={allValues.skisseLengdeprofilTittel}
            length={allValues.skisseLengdeMeter}
            topWidth={allValues.skisseBreddeToppMeter}
            massDistance={allValues.skisseMasseAvstandMeter}
            hasInstallations={hasInstallations}
            terrainLabel={allValues.skisseTerrengLabel}
            pipeLabel={allValues.skisseLedningLabel}
            massesLabel={allValues.skisseMasserLabel}
            showSymbols={allValues.skisseVisSymboler}
            pipeSymbol={allValues.skisseLedningSymbol}
            massesSymbol={allValues.skisseMasserSymbol}
            soil={allValues.jordart}
          />
        </div>
      </details>

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
  links
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  example?: string;
  links?: HelpLink[];
}) {
  return (
    <div className={className}>
      <Label className="mb-2 flex items-center gap-2">
        <span>{label}</span>
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
