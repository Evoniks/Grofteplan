export const jordarter = [
  "fjell",
  "sand",
  "grus",
  "leire",
  "fyllmasser",
  "ukjent"
] as const;

export const sikringsmetoder = [
  "ikke relevant",
  "skrå gravesider",
  "grøftekasse",
  "spunt",
  "annen avstivning"
] as const;
export const skisseSymboler = ["sirkel", "trekant", "firkant"] as const;
export const skisseMaler = [
  "template-01-skraasider",
  "template-02-groftekasse",
  "template-03-spunt",
  "template-04-avstiving-horisontal",
  "template-05-dyp-spunt-avstiving",
  "template-06-trafikkert-omraade"
] as const;

export type Jordart = (typeof jordarter)[number];
export type Sikringsmetode = (typeof sikringsmetoder)[number];
export type SkisseSymbol = (typeof skisseSymboler)[number];
export type SkisseMal = (typeof skisseMaler)[number];

export type LengdeprofilRad = {
  pel: string;
  masse: string;
  dybde: string;
};

export type PersonIGroftRad = {
  navn: string;
  rolle: string;
};

export type AvstivingBehovValg = "" | "ja" | "nei_1_1";

export type PlanData = {
  prosjektnavn: string;
  entreprenor: string;
  byggherre: string;
  ansvarligPerson: string;
  dokumentnummer: string;
  underprosjekt: string;
  fkpAnsvarligGroft: string;
  fkpAnsvarligGjennomforing: string;
  /** Når true: én FKP dekker både grøft og gjennomføring. */
  fkpSammePerson: boolean;
  personerIGroft: string;
  personerIGroftRader: PersonIGroftRad[];
  dato: string;
  revisjonsnummer: string;
  adresse: string;
  kommune: string;
  arbeidsomrade: string;
  groftelengdeMeter: number;
  maksDybdeMeter: number;
  breddeBunnMeter: number;
  breddeToppMeter: number;
  etappebeskrivelse: string;
  dybdeOver125: boolean;
  dybdeOver200: boolean;
  jordart: Jordart;
  grunnvann: boolean;
  skraningINarheten: boolean;
  byggINarheten: boolean;
  trafikkbelastningNarGroft: boolean;
  /** Når true, hoppes installasjons-steget over i veiviseren. */
  ingenKjenteInstallasjoner: boolean;
  /** Når true, hoppes trafikk-steget over i veiviseren. */
  trafikkStegIkkeAktuelt: boolean;
  geotekniskBehov: boolean;
  grunnundersokelseProvegraving: boolean;
  grunnundersokelseGrunnboring: boolean;
  grunnundersokelseSondering: boolean;
  grunnundersokelseIkkeForetatt: boolean;
  grunnundersokelseAnnet: string;
  avstivingBehov: AvstivingBehovValg;
  avstivingKommentar: string;
  lengdeprofilRader: LengdeprofilRad[];
  plan215Lengdeprofil: string;
  plan215Jordarter: string;
  plan215Tverrprofil: string;
  plan215Gravemasser: string;
  plan215Arbeidsinstruks: string;
  installasjonVa: boolean;
  installasjonOvervann: boolean;
  installasjonSpillvann: boolean;
  installasjonHoyspent: boolean;
  installasjonLavspent: boolean;
  installasjonFiberTele: boolean;
  installasjonGassFjernvarme: boolean;
  installasjonUkjent: boolean;
  kabelpavisningUtfort: boolean;
  sikringsmetode: Sikringsmetode;
  sikringBeskrivelse: string;
  romningsvei: string;
  avsperring: string;
  plasseringGravemasser: string;
  avstandFraGroftekantMeter: number;
  mellomlagring: string;
  massetransport: string;
  arbeidsbeskrivelse: string;
  sikkerJobbAnalyseUtfort: boolean;
  dagligKontroll: boolean;
  kontrollEtterUvaer: boolean;
  stoppkriterier: string;
  kontrollpunkter: string;
  utarbeidetAv: string;
  kontrollertAv: string;
  /** PNG data-URL frå digital signatur. */
  utarbeidetSignatur: string;
  kontrollertSignatur: string;
  godkjentSignatur: string;
  godkjentAv: string;
  godkjentDato: string;
  signaturDato: string;
  skisseTverrprofilTittel: string;
  skisseLengdeprofilTittel: string;
  skisseTerrengLabel: string;
  skisseLedningLabel: string;
  skisseMasserLabel: string;
  skisseVisSymboler: boolean;
  skisseMal: SkisseMal;
  skisseLedningSymbol: SkisseSymbol;
  skisseMasserSymbol: SkisseSymbol;
  skisseDybdeMeter: number;
  skisseBreddeBunnMeter: number;
  skisseBreddeToppMeter: number;
  skisseMasseAvstandMeter: number;
  skisseLengdeMeter: number;
};
