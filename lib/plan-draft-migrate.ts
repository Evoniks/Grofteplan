import type { PlanData } from "@/types/plan";

/** Utvider eldre utkast med nye felt (FKP-sammenslåing, personrader). */
export function migratePlanDraft(stored: Partial<PlanData>): Partial<PlanData> {
  const patch: Partial<PlanData> = {};

  if (stored.fkpSammePerson === undefined) {
    const groft = (stored.fkpAnsvarligGroft ?? "").trim();
    const gjennom = (stored.fkpAnsvarligGjennomforing ?? "").trim();
    patch.fkpSammePerson = Boolean(groft && groft === gjennom);
  }

  const rader = stored.personerIGroftRader;
  const hasRader = Array.isArray(rader) && rader.some((r) => r.navn?.trim());
  const legacy = (stored.personerIGroft ?? "").trim();

  if (!hasRader && legacy) {
    const names = legacy
      .split(/,|\s+og\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);
    patch.personerIGroftRader = names.length
      ? names.map((navn) => ({ navn, rolle: "" }))
      : [{ navn: "", rolle: "" }];
  } else if (!Array.isArray(rader) || rader.length === 0) {
    patch.personerIGroftRader = [{ navn: "", rolle: "" }];
  }

  return patch;
}

export function formatPersonerIGroft(rader: PlanData["personerIGroftRader"]): string {
  return (rader ?? [])
    .filter((r) => r.navn.trim())
    .map((r) => (r.rolle.trim() ? `${r.navn.trim()} (${r.rolle.trim()})` : r.navn.trim()))
    .join(", ");
}
