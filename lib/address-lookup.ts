export type AddressHit = {
  adresse: string;
  kommune: string;
  postnummer: string;
  poststed: string;
};

type GeonorgeAdresse = {
  adressetekst?: string;
  adressenavn?: string;
  husnummer?: string | number;
  bokstav?: string;
  kommunenavn?: string;
  postnummer?: string;
  poststed?: string;
};

function formatAdresseTekst(a: GeonorgeAdresse): string {
  if (a.adressetekst?.trim()) return a.adressetekst.trim();
  const navn = (a.adressenavn ?? "").trim();
  const nr = a.husnummer != null ? String(a.husnummer) : "";
  const bokstav = (a.bokstav ?? "").trim();
  const gate = [navn, nr + bokstav].filter(Boolean).join(" ");
  const post = [a.postnummer, a.poststed].filter(Boolean).join(" ");
  return [gate, post].filter(Boolean).join(", ");
}

function titleKommune(name: string): string {
  const t = name.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function mapGeonorgeHits(payload: { adresser?: GeonorgeAdresse[] }): AddressHit[] {
  return (payload.adresser ?? [])
    .map((a) => ({
      adresse: formatAdresseTekst(a),
      kommune: titleKommune(a.kommunenavn ?? ""),
      postnummer: (a.postnummer ?? "").trim(),
      poststed: (a.poststed ?? "").trim()
    }))
    .filter((h) => h.adresse.length > 0);
}

export function mapNominatimReverse(payload: {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
}): AddressHit | null {
  const addr = payload.address;
  if (!addr) return null;

  const gate = [addr.road, addr.house_number].filter(Boolean).join(" ");
  const poststed = addr.city ?? addr.town ?? addr.village ?? "";
  const post = [addr.postcode, poststed].filter(Boolean).join(" ");
  const adresse = payload.display_name?.trim() || [gate, post].filter(Boolean).join(", ");
  const kommune = titleKommune(addr.municipality ?? addr.county ?? poststed);

  if (!adresse) return null;
  return {
    adresse,
    kommune,
    postnummer: (addr.postcode ?? "").trim(),
    poststed: poststed.trim()
  };
}
