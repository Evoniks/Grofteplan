import type { PlanData } from "@/types/plan";

export type RuleWarning = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

export function evaluateRules(data: PlanData): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const hasInstallasjoner =
    data.installasjonVa ||
    data.installasjonOvervann ||
    data.installasjonSpillvann ||
    data.installasjonHoyspent ||
    data.installasjonLavspent ||
    data.installasjonFiberTele ||
    data.installasjonGassFjernvarme ||
    data.installasjonUkjent;

  if (data.maksDybdeMeter > 1.25 || data.dybdeOver125) {
    warnings.push({
      id: "depth125",
      severity: "warning",
      message: "Grøfteplan er påkrevd."
    });
  }

  if (data.maksDybdeMeter > 2 || data.dybdeOver200) {
    warnings.push({
      id: "depth200",
      severity: "critical",
      message: "Grøften må avstives eller graves med forsvarlig helling."
    });
  }

  if (data.avstandFraGroftekantMeter < 1) {
    warnings.push({
      id: "masserDistance",
      severity: "warning",
      message: "Gravemasser bør flyttes minst 1 meter fra grøftekant."
    });
  }

  if (data.jordart === "ukjent") {
    warnings.push({
      id: "unknownSoil",
      severity: "critical",
      message: "Grunnforhold må avklares før arbeid."
    });
  }

  if (data.byggINarheten) {
    warnings.push({
      id: "nearBuilding",
      severity: "warning",
      message: "Vurder behov for geoteknisk vurdering."
    });
  }

  if (data.skraningINarheten) {
    warnings.push({
      id: "nearSlope",
      severity: "warning",
      message: "Vurder særskilt stabilitetsrisiko."
    });
  }

  if (!data.kabelpavisningUtfort && hasInstallasjoner) {
    warnings.push({
      id: "cableDetection",
      severity: "critical",
      message: "Kabel-/ledningspåvisning må utføres før graving."
    });
  }

  if (data.installasjonGassFjernvarme) {
    warnings.push({
      id: "gasHeat",
      severity: "critical",
      message: "Eier av anlegg må varsles og påvisning dokumenteres."
    });
  }

  if (data.maksDybdeMeter > 1 && !data.romningsvei.trim()) {
    warnings.push({
      id: "egress",
      severity: "warning",
      message: "Rømningsvei/adkomst må beskrives."
    });
  }

  return warnings;
}
