export type RegulationLink = {
  title: string;
  url: string;
  source: string;
  summary: string;
  quote?: string;
};

export const regulationLinks: RegulationLink[] = [
  {
    title: "Forskrift om utførelse av arbeid - kapittel 21 (gravearbeid)",
    url: "https://lovdata.no/forskrift/2011-12-06-1357/kap21",
    source: "Lovdata",
    summary:
      "Hovedkrav for gravearbeid: risikovurdering, opplæring, plan, kontroll av gravegrop, avstivning/helling, plassering av masser og rømningsveier.",
    quote:
      "Før det graves dypere enn 1,25 meter skal arbeidsgiver sørge for å utarbeide en plan for gravingen."
  },
  {
    title: "Gravearbeid",
    url: "https://www.arbeidstilsynet.no/risikofylt-arbeid/gravearbeid/",
    source: "Arbeidstilsynet",
    summary:
      "Praktisk veiledning om hvordan gravearbeid planlegges og gjennomføres sikkert, inkl. krav til skisser, kontroller og adkomst.",
    quote: "Graves det dypere enn 1,25 meter skal det utarbeides en plan for arbeidet."
  },
  {
    title: "Byggherreforskriften",
    url: "https://www.arbeidstilsynet.no/regelverk/forskrifter/byggherreforskriften/",
    source: "Arbeidstilsynet",
    summary:
      "Regulerer byggherrens SHA-ansvar i bygg- og anleggsprosjekter, inkludert plikt til SHA-plan før oppstart."
  },
  {
    title: "Forskrift om sikkerhet, helse og arbeidsmiljø på bygge- eller anleggsplasser",
    url: "https://lovdata.no/forskrift/2009-08-03-1028",
    source: "Lovdata",
    summary:
      "Juridisk grunnlag for SHA-plan og samordning av risikoforhold mellom aktører på bygge- og anleggsplass."
  },
  {
    title: "Forskjellen på HMS og SHA",
    url: "https://www.arbeidstilsynet.no/hms/hms-i-bygg-og-anlegg/forskjellen-pa-hms-og-sha/",
    source: "Arbeidstilsynet",
    summary:
      "Forklarer hvordan virksomhetens HMS-system skal utfylles med prosjektets SHA-plan i bygge- og anleggsarbeid."
  },
  {
    title: "Gravemelding og kabelpåvisning",
    url: "https://geomatikk.no/jeg-skal-grave/gravemelding-og-kabelpavisning/",
    source: "Geomatikk Norway",
    summary:
      "Praktisk veiledning for klarering av arbeidsområde mot ledningsnett og bestilling av kabelpåvisning før graving."
  }
];
