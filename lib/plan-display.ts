/** Tekst til PDF og visning når felt er tomt. */
export function planFieldText(value: string | undefined | null, emptyLabel = "Ikke aktuelt"): string {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : emptyLabel;
}
