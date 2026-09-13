import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PlanData } from "@/types/plan";
import type { RuleWarning } from "@/lib/rule-engine";
import type { TrenchSketchPdfImages } from "@/lib/sketch-pdf-export";
import { planFieldText } from "@/lib/plan-display";

// ─── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:        "#0f2f57",
  blue:        "#1d4ed8",
  blueLight:   "#dbeafe",
  blueFaint:   "#f0f6ff",
  text:        "#0f172a",
  textMid:     "#334155",
  textLight:   "#64748b",
  border:      "#e2e8f0",
  surface:     "#f8fafc",
  red:         "#b91c1c",
  redBg:       "#fef2f2",
  redBorder:   "#fca5a5",
  amber:       "#92400e",
  amberBg:     "#fffbeb",
  amberBorder: "#fcd34d",
  green:       "#15803d",
  greenBg:     "#f0fdf4",
  greenBorder: "#86efac",
  white:       "#ffffff",
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingHorizontal: 32,
    paddingBottom: 36,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: C.text,
    fontFamily: "Helvetica",
  },

  // Cover header (page 1 only)
  coverHeader: {
    backgroundColor: C.navy,
    marginHorizontal: -32,
    marginTop: 0,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  coverBrand: { fontSize: 8, color: "#93c5fd", letterSpacing: 0.5, marginBottom: 6 },
  coverTitle: { fontSize: 20, color: C.white, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverProject: { fontSize: 12, color: "#bfdbfe" },
  coverMeta: { alignItems: "flex-end" },
  coverDate: { fontSize: 9, color: "#93c5fd", marginBottom: 3 },
  coverDocNr: { fontSize: 9, color: "#93c5fd" },

  // Running page header (pages 2+)
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: -32,
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: C.navy,
    marginBottom: 16,
  },
  pageHeaderLeft:  { fontSize: 9, color: "#bfdbfe" },
  pageHeaderRight: { fontSize: 9, color: "#93c5fd" },

  // Footer (fixed, appears on every page)
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1 solid ${C.border}`,
    paddingTop: 5,
  },
  footerLeft:  { fontSize: 7.5, color: C.textLight },
  footerRight: { fontSize: 7.5, color: C.textLight },

  // Section heading
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.blueFaint,
    borderLeft: `3 solid ${C.blue}`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 7,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    letterSpacing: 0.8,
  },

  // Key-value table
  kvTable: {
    border: `1 solid ${C.border}`,
    marginBottom: 2,
  },
  kvRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${C.border}`,
    minHeight: 16,
  },
  kvRowAlt: {
    backgroundColor: C.surface,
  },
  kvLabel: {
    width: "34%",
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 8.5,
    color: C.textLight,
    fontFamily: "Helvetica-Bold",
    borderRight: `1 solid ${C.border}`,
  },
  kvValue: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 9,
    color: C.text,
  },

  // Project info grid (2-column)
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    border: `1 solid ${C.border}`,
    marginBottom: 2,
  },
  infoCell: {
    width: "50%",
    borderBottom: `1 solid ${C.border}`,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  infoCellFull: {
    width: "100%",
    borderBottom: `1 solid ${C.border}`,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  infoLabel: { fontSize: 7.5, color: C.textLight, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  infoValue: { fontSize: 9.5, color: C.text },

  // Warning / info boxes
  warningCritical: {
    backgroundColor: C.redBg,
    borderLeft: `3 solid ${C.red}`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    flexDirection: "row",
    gap: 5,
  },
  warningInfo: {
    backgroundColor: C.amberBg,
    borderLeft: `3 solid #f59e0b`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    flexDirection: "row",
    gap: 5,
  },
  warningOk: {
    backgroundColor: C.greenBg,
    borderLeft: `3 solid #22c55e`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
  },
  warningDot: { fontSize: 8, marginTop: 1 },
  warningText: { fontSize: 9, flex: 1, color: C.text },

  // Installation tags
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 8 },
  tag: {
    backgroundColor: C.blueLight,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8.5,
    color: C.blue,
    fontFamily: "Helvetica-Bold",
  },
  tagNone: {
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8.5,
    color: C.textLight,
  },

  // Signature
  signatureRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  signatureCell: {
    flex: 1,
    border: `1 solid ${C.border}`,
    borderRadius: 3,
    padding: 10,
    minHeight: 110,
  },
  signatureRoleLabel: {
    fontSize: 7.5,
    color: C.textLight,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  signatureName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  signatureArea: { height: 56, marginBottom: 4 },
  signaturePlaceholder: {
    height: 56,
    border: `1 dashed ${C.border}`,
    borderRadius: 2,
  },
  signatureDate: { fontSize: 7.5, color: C.textLight, marginTop: 2 },

  // Misc
  disclaimer: {
    fontSize: 7.5,
    color: C.textLight,
    marginTop: 14,
    paddingTop: 8,
    borderTop: `1 solid ${C.border}`,
    lineHeight: 1.4,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginBottom: 3 },
  checkBox: {
    width: 10,
    height: 10,
    border: `1 solid ${C.border}`,
    borderRadius: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0.5,
  },
  checkBoxFilled: {
    width: 10,
    height: 10,
    backgroundColor: C.blue,
    borderRadius: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0.5,
  },
  checkText: { fontSize: 8, color: "#ffffff", lineHeight: 1 },
  checkLabel: { fontSize: 9, color: C.text, flex: 1 },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function noNum(n: number | undefined | null) {
  if (n == null) return "—";
  return String(n).replace(".", ",");
}

function boolVal(v: boolean | undefined, jaLabel = "Ja", neiLabel = "Nei") {
  return v ? jaLabel : neiLabel;
}

function KvRow({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={[S.kvRow, alt ? S.kvRowAlt : {}]}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={S.kvValue}>{value || "—"}</Text>
    </View>
  );
}

function KvRowBool({ label, value, riskOnTrue = false, alt }: {
  label: string; value: boolean | undefined; riskOnTrue?: boolean; alt?: boolean;
}) {
  const isRisk = riskOnTrue ? value : false;
  return (
    <View style={[S.kvRow, alt ? S.kvRowAlt : {}]}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={[S.kvValue, isRisk ? { color: "#b45309", fontFamily: "Helvetica-Bold" } : {}]}>
        {value ? "Ja" : "Nei"}
      </Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <View style={S.sectionHead}>
      <Text style={S.sectionTitle}>{title.toUpperCase()}</Text>
    </View>
  );
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={S.checkRow}>
      <View style={checked ? S.checkBoxFilled : S.checkBox}>
        {checked && <Text style={S.checkText}>v</Text>}
      </View>
      <Text style={S.checkLabel}>{label}</Text>
    </View>
  );
}

function PageFooter({ projectName, date }: { projectName: string; date: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerLeft}>
        Grøfteplan.no — {projectName}
      </Text>
      <Text
        style={S.footerRight}
        render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages} · ${formatDate(date)}`}
      />
    </View>
  );
}

function formatGrunnundersokelse(data: PlanData) {
  const parts: string[] = [];
  if (data.grunnundersokelseProvegraving) parts.push("Prøvegraving");
  if (data.grunnundersokelseGrunnboring) parts.push("Grunnboring");
  if (data.grunnundersokelseSondering) parts.push("Sondering");
  if (data.grunnundersokelseIkkeForetatt) parts.push("Ikke foretatt");
  if (data.grunnundersokelseAnnet?.trim()) parts.push(`Annet: ${data.grunnundersokelseAnnet}`);
  return parts.length ? parts.join(", ") : "Ikke oppgitt";
}

function formatAvstivingBehov(data: PlanData) {
  if (data.avstivingBehov === "ja") return "Ja – avstiving nødvendig";
  if (data.avstivingBehov === "nei_1_1") return "Nei – skråning ca. 1:1";
  return "Ikke valgt";
}

function activeInstallations(data: PlanData): string[] {
  const map: [keyof PlanData, string][] = [
    ["installasjonVa", "VA"],
    ["installasjonOvervann", "Overvann"],
    ["installasjonSpillvann", "Spillvann"],
    ["installasjonHoyspent", "Høyspent"],
    ["installasjonLavspent", "Lavspent"],
    ["installasjonFiberTele", "Fiber/tele"],
    ["installasjonGassFjernvarme", "Gass/fjernvarme"],
    ["installasjonUkjent", "Ukjent type"],
  ];
  return map.filter(([k]) => data[k]).map(([, label]) => label);
}

// ─── Signature section ─────────────────────────────────────────────────────────

function SignaturePdfSection({ data }: { data: PlanData }) {
  const cell = (role: string, name: string, sign: string | undefined, date?: string) => (
    <View style={S.signatureCell}>
      <Text style={S.signatureRoleLabel}>{role.toUpperCase()}</Text>
      <Text style={S.signatureName}>{name || "—"}</Text>
      <View style={S.signatureArea}>
        {sign ? (
          <Image src={sign} style={{ height: 56, width: "100%", objectFit: "contain" }} />
        ) : (
          <View style={S.signaturePlaceholder} />
        )}
      </View>
      {date ? <Text style={S.signatureDate}>Dato: {formatDate(date)}</Text> : null}
    </View>
  );

  return (
    <View>
      <View style={S.signatureRow}>
        {cell("Utarbeidet av", data.utarbeidetAv, data.utarbeidetSignatur, data.signaturDato)}
        {cell("Kontrollert av", data.kontrollertAv, data.kontrollertSignatur, data.signaturDato)}
      </View>
      {data.godkjentAv?.trim() ? (
        <View style={{ marginTop: 10, maxWidth: "49%" }}>
          {cell("Godkjent av", data.godkjentAv, data.godkjentSignatur, data.godkjentDato || undefined)}
        </View>
      ) : null}
    </View>
  );
}

// ─── Main document ─────────────────────────────────────────────────────────────

export function PlanPdfDocument({
  data,
  warnings,
  sketchImages = null,
}: {
  data: PlanData;
  warnings: RuleWarning[];
  sketchImages?: TrenchSketchPdfImages | null;
}) {
  const criticals = warnings.filter((w) => w.severity === "critical");
  const infoWarnings = warnings.filter((w) => w.severity !== "critical");
  const installs = activeInstallations(data);

  return (
    <Document>
      {/* ── PAGE 1: Oversikt ─────────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        {/* Cover header */}
        <View style={S.coverHeader}>
          <View>
            <Text style={S.coverBrand}>GRØFTEPLAN.NO</Text>
            <Text style={S.coverTitle}>Graveplan</Text>
            <Text style={S.coverProject}>{data.prosjektnavn || "Uten navn"}</Text>
          </View>
          <View style={S.coverMeta}>
            <Text style={S.coverDate}>{formatDate(data.dato)}</Text>
            {data.dokumentnummer ? <Text style={S.coverDocNr}>Dok: {data.dokumentnummer}</Text> : null}
            {data.revisjonsnummer ? <Text style={S.coverDocNr}>Rev: {data.revisjonsnummer}</Text> : null}
          </View>
        </View>

        {/* Key facts strip */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          {[
            { label: "Lengde", value: `${noNum(data.groftelengdeMeter)} m` },
            { label: "Maks dybde", value: `${noNum(data.maksDybdeMeter)} m` },
            { label: "Jordart", value: data.jordart || "—" },
            { label: "Sikring", value: data.sikringsmetode || "—" },
          ].map((f) => (
            <View key={f.label} style={{
              flex: 1, backgroundColor: C.blueFaint, borderRadius: 4,
              paddingVertical: 7, paddingHorizontal: 8, alignItems: "center",
            }}>
              <Text style={{ fontSize: 7, color: C.textLight, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{f.label.toUpperCase()}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy }}>{f.value}</Text>
            </View>
          ))}
        </View>

        {/* Project info grid */}
        <Section title="Prosjektinformasjon" />
        <View style={S.infoGrid}>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>PROSJEKT</Text>
            <Text style={S.infoValue}>{data.prosjektnavn || "—"}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>DATO</Text>
            <Text style={S.infoValue}>{formatDate(data.dato)}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>ENTREPRENØR</Text>
            <Text style={S.infoValue}>{data.entreprenor || "—"}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>BYGGHERRE</Text>
            <Text style={S.infoValue}>{data.byggherre || "—"}</Text>
          </View>
          <View style={[S.infoCell, { borderBottom: "0" }]}>
            <Text style={S.infoLabel}>ANSVARLIG PERSON</Text>
            <Text style={S.infoValue}>{data.ansvarligPerson || "—"}</Text>
          </View>
          <View style={[S.infoCell, { borderBottom: "0" }]}>
            <Text style={S.infoLabel}>UNDERPROSJEKT</Text>
            <Text style={S.infoValue}>{data.underprosjekt || "—"}</Text>
          </View>
        </View>

        {/* FKP */}
        {(data.fkpAnsvarligGroft || data.fkpAnsvarligGjennomforing || data.personerIGroft) ? (
          <>
            <Section title="Faglig kompetent personell (FKP)" />
            <View style={S.kvTable}>
              {data.fkpSammePerson ? (
                <KvRow label="FKP (grøft og gjennomføring)"
                  value={data.fkpAnsvarligGroft || data.fkpAnsvarligGjennomforing || "—"} />
              ) : (
                <>
                  <KvRow label="Ansvarlig grøft" value={data.fkpAnsvarligGroft || "Ikke oppgitt"} />
                  <KvRow label="Ansvarlig gjennomføring" value={data.fkpAnsvarligGjennomforing || "Ikke oppgitt"} alt />
                </>
              )}
              {data.personerIGroft ? (
                <KvRow label="Personer i grøft" value={data.personerIGroft} alt={!data.fkpSammePerson} />
              ) : null}
            </View>
          </>
        ) : null}

        {/* Location summary */}
        <Section title="Sted og omfang" />
        <View style={S.kvTable}>
          <KvRow label="Adresse"       value={data.adresse} />
          <KvRow label="Kommune"       value={data.kommune} alt />
          <KvRow label="Arbeidsområde" value={data.arbeidsomrade} />
          <KvRow label="Geometri"
            value={`${noNum(data.groftelengdeMeter)} m lengde · maks dybde ${noNum(data.maksDybdeMeter)} m · bunn ${noNum(data.breddeBunnMeter)} m · topp ${noNum(data.breddeToppMeter)} m`}
            alt
          />
          {data.etappebeskrivelse ? <KvRow label="Etapper" value={data.etappebeskrivelse} /> : null}
        </View>

        {/* Warnings */}
        <Section title="Regelkontroll og varsler" />
        {warnings.length === 0 ? (
          <View style={S.warningOk}>
            <Text style={[S.warningText, { color: C.green }]}>OK  Ingen regelvarsler registrert.</Text>
          </View>
        ) : (
          <>
            {criticals.map((w) => (
              <View key={w.id} style={S.warningCritical}>
                <Text style={[S.warningDot, { color: C.red }]}>!</Text>
                <Text style={[S.warningText, { color: C.red, fontFamily: "Helvetica-Bold" }]}>{w.message}</Text>
              </View>
            ))}
            {infoWarnings.map((w) => (
              <View key={w.id} style={S.warningInfo}>
                <Text style={[S.warningDot, { color: "#d97706" }]}>!</Text>
                <Text style={[S.warningText, { color: C.amber }]}>{w.message}</Text>
              </View>
            ))}
          </>
        )}

        {/* Ground conditions */}
        <Section title="Grunnforhold og avstiving" />
        <View style={S.kvTable}>
          <KvRow label="Jordart"               value={data.jordart} />
          <KvRowBool label="Grunnvann / innsig"    value={data.grunnvann} riskOnTrue alt />
          <KvRowBool label="Skråning i nærheten"   value={data.skraningINarheten} riskOnTrue />
          <KvRowBool label="Bygg/fundament nærby"  value={data.byggINarheten} riskOnTrue alt />
          <KvRow label="Grunnundersøkelser"    value={formatGrunnundersokelse(data)} />
          <KvRow label="Behov for avstiving"   value={formatAvstivingBehov(data)} alt />
          {data.avstivingKommentar ? <KvRow label="Kommentar" value={data.avstivingKommentar} /> : null}
        </View>

        {/* Safety */}
        <Section title="Sikringstiltak" />
        <View style={S.kvTable}>
          <KvRow label="Sikringsmetode"        value={data.sikringsmetode} />
          <KvRow label="Beskrivelse sikring"   value={planFieldText(data.sikringBeskrivelse)} alt />
          <KvRow label="Rømningsvei / adkomst" value={planFieldText(data.romningsvei)} />
          <KvRow label="Avsperring"            value={planFieldText(data.avsperring)} alt />
          <KvRow label="Avstand gravemasser"   value={`${noNum(data.avstandFraGroftekantMeter)} m fra grøftekant`} />
        </View>

        {/* Installations */}
        <Section title="Installasjoner i grunnen" />
        {data.ingenKjenteInstallasjoner ? (
          <View style={S.warningOk}>
            <Text style={[S.warningText, { color: C.green }]}>OK  Ingen kjente installasjoner i grunnen.</Text>
          </View>
        ) : (
          <View style={[S.kvTable, { marginBottom: 2 }]}>
            <View style={S.tagRow}>
              {installs.length > 0
                ? installs.map((label) => (
                    <View key={label} style={S.tag}><Text>{label}</Text></View>
                  ))
                : <View style={S.tagNone}><Text>Ingen kryssa av</Text></View>
              }
            </View>
            <KvRow
              label="Kabel-/ledningspåvisning"
              value={data.kabelpavisningUtfort ? "✓  Utført" : "✗  Ikke bekreftet"}
              alt
            />
          </View>
        )}

        {/* Spoil placement */}
        {(data.plasseringGravemasser || data.mellomlagring || data.massetransport) ? (
          <>
            <Section title="Masser og rigg" />
            <View style={S.kvTable}>
              {data.plasseringGravemasser
                ? <KvRow label="Plassering gravemasser" value={planFieldText(data.plasseringGravemasser)} /> : null}
              {data.mellomlagring
                ? <KvRow label="Mellomlagring" value={planFieldText(data.mellomlagring)} alt /> : null}
              {data.massetransport
                ? <KvRow label="Massetransport" value={planFieldText(data.massetransport)} /> : null}
            </View>
          </>
        ) : null}

        {/* § 21-5 */}
        {(data.plan215Lengdeprofil || data.plan215Jordarter || data.plan215Tverrprofil ||
          data.plan215Gravemasser || data.plan215Arbeidsinstruks) ? (
          <>
            <Section title="Plan for arbeidet — § 21-5" />
            <View style={S.kvTable}>
              {data.plan215Lengdeprofil  ? <KvRow label="a) Lengdeprofil"          value={data.plan215Lengdeprofil} /> : null}
              {data.plan215Jordarter     ? <KvRow label="a) Jordarter/installasjoner" value={data.plan215Jordarter} alt /> : null}
              {data.plan215Tverrprofil   ? <KvRow label="b) Tverrprofil"           value={data.plan215Tverrprofil} /> : null}
              {data.plan215Gravemasser   ? <KvRow label="c) Gravemasser"           value={data.plan215Gravemasser} alt /> : null}
              {data.plan215Arbeidsinstruks ? <KvRow label="d) Arbeidsinstruks"     value={data.plan215Arbeidsinstruks} /> : null}
            </View>
          </>
        ) : null}

        {/* Instructions — flows directly after overview, no forced page break */}
        <View style={{ marginTop: 10, borderTop: `2 solid ${C.navy}`, paddingTop: 2 }} />

        <Section title="Arbeidsbeskrivelse" />
        <View style={[S.kvTable, { marginBottom: 2 }]}>
          <View style={S.kvRow}>
            <Text style={[S.kvValue, { padding: 7, lineHeight: 1.5 }]}>{data.arbeidsbeskrivelse || "—"}</Text>
          </View>
        </View>

        <Section title="Stoppkriterier" />
        <View style={[S.kvTable, { marginBottom: 2 }]}>
          <View style={S.kvRow}>
            <Text style={[S.kvValue, { padding: 7, lineHeight: 1.5 }]}>{data.stoppkriterier || "—"}</Text>
          </View>
        </View>

        <Section title="Kontrollpunkter" />
        <View style={[S.kvTable, { marginBottom: 2 }]}>
          <View style={S.kvRow}>
            <Text style={[S.kvValue, { padding: 7, lineHeight: 1.5 }]}>{data.kontrollpunkter || "—"}</Text>
          </View>
        </View>

        <Section title="Rutinar under gjennomføring" />
        <View style={[S.kvTable, { padding: 7, gap: 4 }]}>
          <CheckItem checked={data.sikkerJobbAnalyseUtfort} label="Sikker jobb-analyse (SJA) skal utføres før oppstart" />
          <CheckItem checked={data.dagligKontroll}          label="Kontroll utføres daglig / fortløpende" />
          <CheckItem checked={data.kontrollEtterUvaer}      label="Ny kontroll etter utfordrende vær/uvær før oppstart" />
        </View>

        {(data.lengdeprofilRader ?? []).some((r) => r.pel || r.masse || r.dybde) ? (
          <>
            <Section title="Lengdeprofil — massebeskrivelser" />
            <View style={S.kvTable}>
              <View style={[S.kvRow, { backgroundColor: C.surface }]}>
                <Text style={[S.kvLabel, { width: "33%" }]}>PEL / STREKK</Text>
                <Text style={[S.kvLabel, { width: "33%", borderRight: `1 solid ${C.border}` }]}>MASSE</Text>
                <Text style={[S.kvLabel, { flex: 1, borderRight: "0" }]}>DYBDE</Text>
              </View>
              {(data.lengdeprofilRader ?? []).map((r, i) => (
                <View key={i} style={[S.kvRow, i % 2 === 1 ? S.kvRowAlt : {}]}>
                  <Text style={[S.kvValue, { width: "33%", borderRight: `1 solid ${C.border}` }]}>{r.pel || "—"}</Text>
                  <Text style={[S.kvValue, { width: "33%", borderRight: `1 solid ${C.border}` }]}>{r.masse || "—"}</Text>
                  <Text style={[S.kvValue, { flex: 1 }]}>{r.dybde || "—"}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Section title="Signatur" />
        <SignaturePdfSection data={data} />

        <Text style={S.disclaimer}>
          Dette verktøyet er et hjelpemiddel for utarbeidelse av grøfteplan. Bruker er selv ansvarlig
          for at planen kontrolleres, tilpasses lokale forhold og oppfyller gjeldende krav. Generert via Grøfteplan.no.
        </Text>

        <PageFooter projectName={data.prosjektnavn} date={data.dato} />
      </Page>

      {/* ── Skisser: alltid på eiga side ─────────────────────────────── */}
      {sketchImages ? (
        <Page size="A4" style={S.page}>
          <View style={S.pageHeader}>
            <Text style={S.pageHeaderLeft}>{data.prosjektnavn} — Skisser</Text>
            <Text style={S.pageHeaderRight}>Grøfteplan.no</Text>
          </View>

          <Section title="Tverrprofil" />
          <Image src={sketchImages.cross} style={{ width: "100%", height: 240, marginBottom: 8, marginTop: 4 }} />

          <Section title="Plan (ovenfra)" />
          <Image src={sketchImages.plan} style={{ width: "100%", height: 240, marginTop: 4 }} />

          <PageFooter projectName={data.prosjektnavn} date={data.dato} />
        </Page>
      ) : null}
    </Document>
  );
}
