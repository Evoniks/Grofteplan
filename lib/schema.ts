import { z } from "zod";

import { jordarter, sikringsmetoder, skisseMaler, skisseSymboler } from "@/types/plan";



const optionalText = z.string().optional().default("");



const hasAnyInstallasjon = (d: {

  installasjonVa: boolean;

  installasjonOvervann: boolean;

  installasjonSpillvann: boolean;

  installasjonHoyspent: boolean;

  installasjonLavspent: boolean;

  installasjonFiberTele: boolean;

  installasjonGassFjernvarme: boolean;

  installasjonUkjent: boolean;

}) =>

  d.installasjonVa ||

  d.installasjonOvervann ||

  d.installasjonSpillvann ||

  d.installasjonHoyspent ||

  d.installasjonLavspent ||

  d.installasjonFiberTele ||

  d.installasjonGassFjernvarme ||

  d.installasjonUkjent;



export const planSchema = z

  .object({

    prosjektnavn: z.string().min(2, "Prosjektnavn er påkrevd."),

    entreprenor: z.string().min(2, "Entreprenør er påkrevd."),

    byggherre: z.string().min(2, "Byggherre er påkrevd."),

    ansvarligPerson: z.string().min(2, "Ansvarlig person er påkrevd."),

    dokumentnummer: optionalText,

    underprosjekt: optionalText,

    fkpAnsvarligGroft: optionalText,

    fkpAnsvarligGjennomforing: optionalText,

    fkpSammePerson: z.boolean().optional().default(false),

    personerIGroft: optionalText,

    personerIGroftRader: z
      .array(
        z.object({
          navn: z.string(),
          rolle: z.string()
        })
      )
      .optional()
      .default([{ navn: "", rolle: "" }]),

    dato: z.string().min(1, "Dato er påkrevd."),

    revisjonsnummer: optionalText,

    adresse: z.string().min(2, "Adresse er påkrevd."),

    kommune: z.string().min(2, "Kommune er påkrevd."),

    arbeidsomrade: z.string().min(5, "Beskrivelse av arbeidsområdet er påkrevd."),

    groftelengdeMeter: z.number().min(1, "Oppgi grøftelengde."),

    maksDybdeMeter: z.number().min(0.1, "Oppgi maks dybde."),

    breddeBunnMeter: z.number().min(0.1, "Oppgi bredde i bunn."),

    breddeToppMeter: z.number().min(0.1, "Oppgi bredde i topp."),

    etappebeskrivelse: optionalText,

    dybdeOver125: z.boolean(),

    dybdeOver200: z.boolean(),

    jordart: z.enum(jordarter),

    grunnvann: z.boolean(),

    skraningINarheten: z.boolean(),

    byggINarheten: z.boolean(),

    trafikkbelastningNarGroft: z.boolean(),

    ingenKjenteInstallasjoner: z.boolean(),

    trafikkStegIkkeAktuelt: z.boolean(),

    geotekniskBehov: z.boolean(),

    grunnundersokelseProvegraving: z.boolean(),

    grunnundersokelseGrunnboring: z.boolean(),

    grunnundersokelseSondering: z.boolean(),

    grunnundersokelseIkkeForetatt: z.boolean(),

    grunnundersokelseAnnet: optionalText,

    avstivingBehov: z.enum(["", "ja", "nei_1_1"]).optional().default(""),

    avstivingKommentar: optionalText,

    lengdeprofilRader: z

      .array(

        z.object({

          pel: z.string(),

          masse: z.string(),

          dybde: z.string()

        })

      )

      .optional()

      .default([]),

    plan215Lengdeprofil: optionalText,

    plan215Jordarter: optionalText,

    plan215Tverrprofil: optionalText,

    plan215Gravemasser: optionalText,

    plan215Arbeidsinstruks: optionalText,

    installasjonVa: z.boolean(),

    installasjonOvervann: z.boolean(),

    installasjonSpillvann: z.boolean(),

    installasjonHoyspent: z.boolean(),

    installasjonLavspent: z.boolean(),

    installasjonFiberTele: z.boolean(),

    installasjonGassFjernvarme: z.boolean(),

    installasjonUkjent: z.boolean(),

    kabelpavisningUtfort: z.boolean(),

    sikringsmetode: z.enum(sikringsmetoder),

    sikringBeskrivelse: optionalText,

    romningsvei: optionalText,

    avsperring: optionalText,

    plasseringGravemasser: optionalText,

    avstandFraGroftekantMeter: z.number().min(0, "Oppgi avstand fra grøftekant."),

    mellomlagring: optionalText,

    massetransport: optionalText,

    arbeidsbeskrivelse: z.string().min(5, "Arbeidsbeskrivelse er påkrevd."),

    sikkerJobbAnalyseUtfort: z.boolean(),

    dagligKontroll: z.boolean(),

    kontrollEtterUvaer: z.boolean(),

    stoppkriterier: z.string().min(2, "Stoppkriterier er påkrevd."),

    kontrollpunkter: z.string().min(2, "Kontrollpunkter er påkrevd."),

    utarbeidetAv: z.string().min(2, "Utarbeidet av er påkrevd."),

    kontrollertAv: z.string().min(2, "Kontrollert av er påkrevd."),

    utarbeidetSignatur: optionalText,

    kontrollertSignatur: optionalText,

    godkjentSignatur: optionalText,

    godkjentAv: optionalText,

    godkjentDato: optionalText,

    signaturDato: z.string().min(1, "Signaturdato er påkrevd."),

    skisseTverrprofilTittel: optionalText,

    skisseLengdeprofilTittel: optionalText,

    skisseTerrengLabel: optionalText,

    skisseLedningLabel: optionalText,

    skisseMasserLabel: optionalText,

    skisseVisSymboler: z.boolean(),

    skisseMal: z.enum(skisseMaler),

    skisseLedningSymbol: z.enum(skisseSymboler),

    skisseMasserSymbol: z.enum(skisseSymboler),

    skisseDybdeMeter: z.number().min(0.1, "Skissedybde må være minst 0,1 m."),

    skisseBreddeBunnMeter: z.number().min(0.1, "Skissebredde bunn må være minst 0,1 m."),

    skisseBreddeToppMeter: z.number().min(0.1, "Skissebredde topp må være minst 0,1 m."),

    skisseMasseAvstandMeter: z.number().min(0, "Skisseavstand for masser må være 0 eller mer."),

    skisseLengdeMeter: z.number().min(1, "Skisselengde må være minst 1 m.")

  })

  .superRefine((data, ctx) => {

    if (data.sikringsmetode !== "ikke relevant" && data.sikringBeskrivelse.trim().length < 2) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        path: ["sikringBeskrivelse"],

        message: "Beskriv sikring når sikringsmetode er valgt."

      });

    }

    if (!data.ingenKjenteInstallasjoner && hasAnyInstallasjon(data) && !data.kabelpavisningUtfort) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        path: ["kabelpavisningUtfort"],

        message: "Kabel-/ledningspåvisning må bekreftes når installasjoner er krysset av."

      });

    }

  });



export type PlanSchema = z.infer<typeof planSchema>;


