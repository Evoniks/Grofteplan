export const jordarter = [
  "fjell",
  "sand",
  "grus",
  "leire",
  "fyllmasser",
  "ukjent"
] as const;

export const sikringsmetoder = [
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

export type PlanData = {
  prosjektnavn: string;
  entreprenor: string;
  byggherre: string;
  ansvarligPerson: string;
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
  geotekniskBehov: boolean;
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
