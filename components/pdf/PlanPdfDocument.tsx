import {
  Circle,
  Document,
  Line,
  Page,
  Path,
  Polygon,
  Rect,
  Svg,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, lineHeight: 1.4, color: "#0f172a" },
  hero: {
    backgroundColor: "#0f2f57",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10
  },
  heroTitle: { fontSize: 21, color: "#ffffff", marginBottom: 4 },
  heroSubtitle: { fontSize: 11, color: "#bfdbfe" },
  title: { fontSize: 20, marginBottom: 8, color: "#0f172a" },
  subtitle: { fontSize: 12, marginBottom: 12, color: "#334155" },
  heading: { fontSize: 14, marginTop: 10, marginBottom: 6, color: "#1d4ed8" },
  row: { marginBottom: 3 },
  box: {
    border: "1 solid #cbd5e1",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8
  },
  warning: { color: "#b91c1c", marginBottom: 2 },
  info: {
    border: "1 solid #bfdbfe",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#eff6ff"
  },
  twoCol: {
    flexDirection: "row",
    gap: 8
  },
  col: {
    flex: 1
  }
});

export function PlanPdfDocument({
  data,
  warnings
}: {
  data: PlanData;
  warnings: RuleWarning[];
}) {
  const risiko = [
    data.grunnvann && "Grunnvann/vanninnsig registrert.",
    data.skraningINarheten && "Skråning nær grøft.",
    data.byggINarheten && "Bygg/fundament nær grøft.",
    data.trafikkbelastningNarGroft && "Trafikkbelastning nær grøft."
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Grøfteplan.no - Graveplan</Text>
          <Text style={styles.heroSubtitle}>
            Strukturert plan for gravearbeid med risikovurdering, skisser og kontrollpunkter
          </Text>
        </View>

        <Text style={styles.row}>Prosjekt: {data.prosjektnavn}</Text>
        <Text style={styles.row}>Entreprenør: {data.entreprenor}</Text>
        <Text style={styles.row}>Byggherre: {data.byggherre}</Text>
        <Text style={styles.row}>Ansvarlig: {data.ansvarligPerson}</Text>
        <Text style={styles.row}>Dato: {data.dato}</Text>

        <Text style={styles.heading}>Sammendrag</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Adresse: {data.adresse}</Text>
          <Text style={styles.row}>Kommune: {data.kommune}</Text>
          <Text style={styles.row}>Arbeidsområde: {data.arbeidsomrade}</Text>
          <Text style={styles.row}>
            Geometri: {data.groftelengdeMeter} m lengde, maks dybde {data.maksDybdeMeter} m
          </Text>
        </View>

        <Text style={styles.heading}>Regelvarsler</Text>
        <View style={styles.box}>
          {warnings.length === 0 ? (
            <Text>Ingen regelvarsler registrert.</Text>
          ) : (
            warnings.map((warning) => (
              <Text key={warning.id} style={styles.warning}>
                - {warning.message}
              </Text>
            ))
          )}
        </View>

        <Text style={styles.heading}>Grøftedata og sikring</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Jordart: {data.jordart}</Text>
          <Text style={styles.row}>Sikringsmetode: {data.sikringsmetode}</Text>
          <Text style={styles.row}>Sikring: {data.sikringBeskrivelse}</Text>
          <Text style={styles.row}>Rømningsvei: {data.romningsvei || "Ikke oppgitt"}</Text>
          <Text style={styles.row}>
            Avstand gravemasser fra grøftekant: {data.avstandFraGroftekantMeter} m
          </Text>
        </View>

        <Text style={styles.heading}>Installasjoner i grunnen</Text>
        <View style={styles.box}>
          <Text style={styles.row}>
            VA: {data.installasjonVa ? "Ja" : "Nei"} | Overvann:{" "}
            {data.installasjonOvervann ? "Ja" : "Nei"} | Spillvann:{" "}
            {data.installasjonSpillvann ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Høyspent: {data.installasjonHoyspent ? "Ja" : "Nei"} | Lavspent:{" "}
            {data.installasjonLavspent ? "Ja" : "Nei"} | Fiber/tele:{" "}
            {data.installasjonFiberTele ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Gass/fjernvarme: {data.installasjonGassFjernvarme ? "Ja" : "Nei"} | Ukjent:{" "}
            {data.installasjonUkjent ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Kabel-/ledningspåvisning utført: {data.kabelpavisningUtfort ? "Ja" : "Nei"}
          </Text>
        </View>

        <Text style={styles.heading}>Arbeidsinstruks og kontroll</Text>
        <View style={styles.box}>
          <Text style={styles.row}>{data.arbeidsbeskrivelse}</Text>
          <Text style={styles.row}>Stoppkriterier: {data.stoppkriterier}</Text>
          <Text style={styles.row}>Kontrollpunkter: {data.kontrollpunkter}</Text>
          <Text style={styles.row}>SJA utført: {data.sikkerJobbAnalyseUtfort ? "Ja" : "Nei"}</Text>
          <Text style={styles.row}>Daglig kontroll: {data.dagligKontroll ? "Ja" : "Nei"}</Text>
          <Text style={styles.row}>
            Kontroll etter uvær/opphold: {data.kontrollEtterUvaer ? "Ja" : "Nei"}
          </Text>
        </View>

        <Text style={styles.heading}>Signatur</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Utarbeidet av: {data.utarbeidetAv}</Text>
          <Text style={styles.row}>Kontrollert av: {data.kontrollertAv}</Text>
          <Text style={styles.row}>Dato: {data.signaturDato}</Text>
        </View>

        <Text style={{ marginTop: 8, fontSize: 9, color: "#475569" }}>
          Dette verktøyet er et hjelpemiddel for utarbeidelse av grøfteplan. Bruker er selv
          ansvarlig for at planen kontrolleres, tilpasses lokale forhold og oppfyller gjeldende
          krav.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Skisser og teknisk visualisering</Text>
        <Text style={styles.subtitle}>
          Tverrsnitt og planvisning laget fra skjema, med grafiske elementer
        </Text>

        <Text style={styles.heading}>Tverrsnittsskisse</Text>
        <View style={styles.info}>
          <Svg width="520" height="190">
            <Rect x="6" y="20" width="500" height="150" rx="6" fill="#f1f5f9" />
            <Line x1="20" y1="48" x2="490" y2="48" stroke="#334155" strokeWidth="2" />
            <Polygon points="170,48 330,48 300,150 200,150" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="2" />
            <Circle cx="250" cy="144" r="7" fill="#334155" />
            <Rect x="356" y="30" width="68" height="16" fill="#f59e0b" />
            <Line x1="184" y1="162" x2="316" y2="162" stroke="#64748b" strokeWidth="1" />
            <Line x1="160" y1="58" x2="340" y2="58" stroke="#64748b" strokeWidth="1" />
            <Line x1="150" y1="48" x2="150" y2="150" stroke="#ef4444" strokeWidth="1.5" />
            <Line x1="282" y1="48" x2="282" y2="150" stroke="#b45309" strokeWidth="2" />
            <Line x1="274" y1="62" x2="290" y2="62" stroke="#b45309" strokeWidth="1" />
            <Line x1="274" y1="76" x2="290" y2="76" stroke="#b45309" strokeWidth="1" />
            <Line x1="274" y1="90" x2="290" y2="90" stroke="#b45309" strokeWidth="1" />
            <Line x1="274" y1="104" x2="290" y2="104" stroke="#b45309" strokeWidth="1" />
            <Rect x="108" y="24" width="46" height="10" fill="#475569" />
            <Circle cx="118" cy="35" r="5" fill="#111827" />
            <Circle cx="143" cy="35" r="5" fill="#111827" />
            <Path d="M140 24 L170 14 L184 18" stroke="#475569" strokeWidth="3" />
            <Rect x="424" y="26" width="42" height="11" fill="#f59e0b" />
            <Rect x="464" y="30" width="12" height="7" fill="#fb923c" />
            <Circle cx="432" cy="40" r="4" fill="#1f2937" />
            <Circle cx="454" cy="40" r="4" fill="#1f2937" />
            <Circle cx="468" cy="40" r="4" fill="#1f2937" />
          </Svg>
          <Text style={styles.row}>
            {data.skisseLedningLabel} i grøftebunn, {data.skisseMasserLabel} ved kant, stige for rømningsvei
            samt symbolsk gravemaskin/lastebil.
          </Text>
          <Text style={styles.row}>
            Dybde {data.skisseDybdeMeter.toFixed(2)} m, bredde bunn {data.skisseBreddeBunnMeter.toFixed(2)} m,
            bredde topp {data.skisseBreddeToppMeter.toFixed(2)} m.
          </Text>
        </View>

        <Text style={styles.heading}>Planvisning (fugleperspektiv)</Text>
        <View style={styles.info}>
          <Svg width="520" height="170">
            <Rect x="8" y="18" width="500" height="130" rx="6" fill="#f1f5f9" stroke="#334155" />
            <Rect x="78" y="56" width="360" height="48" rx="4" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="2" />
            <Line x1="78" y1="80" x2="438" y2="80" stroke="#60a5fa" strokeWidth="1.5" />
            <Circle cx="106" cy="80" r="6" fill="#334155" />
            <Rect x="388" y="34" width="54" height="13" fill="#f59e0b" />
            <Rect x="22" y="32" width="38" height="10" fill="#f59e0b" />
            <Circle cx="29" cy="44" r="4" fill="#111827" />
            <Circle cx="45" cy="44" r="4" fill="#111827" />
            <Rect x="448" y="98" width="34" height="8" fill="#475569" />
            <Circle cx="456" cy="108" r="4" fill="#0f172a" />
            <Circle cx="474" cy="108" r="4" fill="#0f172a" />
            <Path d="M478 98 L500 88 L507 90" stroke="#475569" strokeWidth="3" />
          </Svg>
          <Text style={styles.row}>
            Planvisningen viser grøftetrase i fugleperspektiv med symboler for installasjon, masser,
            lastebil og gravemaskin.
          </Text>
          <Text style={styles.row}>
            Lengde {data.skisseLengdeMeter.toFixed(0)} m, toppbredde {data.skisseBreddeToppMeter.toFixed(2)} m,
            jordart {data.jordart}, avstand masser {data.skisseMasseAvstandMeter.toFixed(2)} m.
          </Text>
        </View>

        <Text style={styles.heading}>Grøftedata</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Lengde: {data.groftelengdeMeter} m</Text>
          <Text style={styles.row}>Maks dybde: {data.maksDybdeMeter} m</Text>
          <Text style={styles.row}>Bredde bunn: {data.breddeBunnMeter} m</Text>
          <Text style={styles.row}>Bredde topp: {data.breddeToppMeter} m</Text>
          <Text style={styles.row}>Etappe: {data.etappebeskrivelse}</Text>
          <Text style={styles.row}>Jordart: {data.jordart}</Text>
        </View>

        <Text style={styles.heading}>Risikoforhold</Text>
        <View style={styles.box}>
          {risiko.length === 0 ? (
            <Text style={styles.row}>Ingen særskilte risikoforhold registrert.</Text>
          ) : (
            risiko.map((item, i) => (
              <Text key={i} style={styles.row}>
                - {item}
              </Text>
            ))
          )}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Grøfteplan.no - Utførelse og kontroll</Text>
        <Text style={styles.subtitle}>Arbeidsinstruks, kontrollpunkter og signatur</Text>

        <Text style={styles.heading}>Installasjoner i grunnen</Text>
        <View style={styles.box}>
          <Text style={styles.row}>
            VA: {data.installasjonVa ? "Ja" : "Nei"} | Overvann:{" "}
            {data.installasjonOvervann ? "Ja" : "Nei"} | Spillvann:{" "}
            {data.installasjonSpillvann ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Høyspent: {data.installasjonHoyspent ? "Ja" : "Nei"} | Lavspent:{" "}
            {data.installasjonLavspent ? "Ja" : "Nei"} | Fiber/tele:{" "}
            {data.installasjonFiberTele ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Gass/fjernvarme: {data.installasjonGassFjernvarme ? "Ja" : "Nei"} | Ukjent:{" "}
            {data.installasjonUkjent ? "Ja" : "Nei"}
          </Text>
          <Text style={styles.row}>
            Kabel-/ledningspåvisning utført: {data.kabelpavisningUtfort ? "Ja" : "Nei"}
          </Text>
        </View>

        <Text style={styles.heading}>Masser og rigg</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Plassering gravemasser: {data.plasseringGravemasser}</Text>
          <Text style={styles.row}>Mellomlagring: {data.mellomlagring}</Text>
          <Text style={styles.row}>Massetransport: {data.massetransport}</Text>
          <Text style={styles.row}>Avsperring: {data.avsperring}</Text>
        </View>

        <Text style={styles.heading}>Arbeidsinstruks</Text>
        <View style={styles.box}>
          <Text style={styles.row}>{data.arbeidsbeskrivelse}</Text>
          <Text style={styles.row}>Rømningsvei/adkomst: {data.romningsvei || "Ikke oppgitt"}</Text>
          <Text style={styles.row}>Stoppkriterier: {data.stoppkriterier}</Text>
          <Text style={styles.row}>Kontrollpunkter: {data.kontrollpunkter}</Text>
          <Text style={styles.row}>SJA utført: {data.sikkerJobbAnalyseUtfort ? "Ja" : "Nei"}</Text>
          <Text style={styles.row}>Daglig kontroll: {data.dagligKontroll ? "Ja" : "Nei"}</Text>
          <Text style={styles.row}>
            Kontroll etter regn/uvær/opphold: {data.kontrollEtterUvaer ? "Ja" : "Nei"}
          </Text>
        </View>

        <Text style={styles.heading}>Signaturfelt</Text>
        <View style={styles.box}>
          <Text style={styles.row}>Utarbeidet av: {data.utarbeidetAv}</Text>
          <Text style={styles.row}>Kontrollert av: {data.kontrollertAv}</Text>
          <Text style={styles.row}>Dato: {data.signaturDato}</Text>
        </View>
      </Page>
    </Document>
  );
}
