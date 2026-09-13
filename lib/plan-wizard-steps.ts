import type { PlanData } from "@/types/plan";

export const WIZARD_STEP_TITLES = [
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
] as const;

export function getVisibleWizardSteps(data: Pick<PlanData, "ingenKjenteInstallasjoner" | "trafikkStegIkkeAktuelt">): number[] {
  return WIZARD_STEP_TITLES.map((_, i) => i).filter((i) => {
    if (i === 4 && data.ingenKjenteInstallasjoner) return false;
    if (i === 5 && data.trafikkStegIkkeAktuelt) return false;
    return true;
  });
}

export function depthPlanHint(maksDybdeMeter: number): string {
  if (maksDybdeMeter > 2) {
    return "Grøften er dypere enn 2,0 m — avstiving eller forsvarlig helling er påkrevd.";
  }
  if (maksDybdeMeter > 1.25) {
    return "Grøften er dypere enn 1,25 m — grøfteplan skal utarbeides.";
  }
  return "Under 1,25 m — enklere krav, men dokumenter trygg gjennomføring.";
}
