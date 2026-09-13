import { mapNominatimReverse } from "@/lib/address-lookup";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ hit: null, error: "Ugyldige koordinater." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "nb");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Grofteplan.no/1.0 (graveplan; contact: app@grofteplan.no)"
      },
      next: { revalidate: 0 }
    });
    if (!res.ok) {
      return Response.json({ hit: null, error: "Posisjon kunne ikke omsettes til adresse." }, { status: 502 });
    }
    const data = await res.json();
    return Response.json({ hit: mapNominatimReverse(data) });
  } catch {
    return Response.json({ hit: null, error: "Kunne ikke hente adresse fra posisjon." }, { status: 502 });
  }
}
