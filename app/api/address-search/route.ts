import { mapGeonorgeHits } from "@/lib/address-lookup";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ hits: [] });
  }

  const url = new URL("https://ws.geonorge.no/adresser/v1/sok");
  url.searchParams.set("sok", q);
  url.searchParams.set("treffPerSide", "8");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      return Response.json({ hits: [], error: "Søket feilet." }, { status: 502 });
    }
    const data = await res.json();
    return Response.json({ hits: mapGeonorgeHits(data) });
  } catch {
    return Response.json({ hits: [], error: "Kunne ikke kontakte adressetjenesten." }, { status: 502 });
  }
}
