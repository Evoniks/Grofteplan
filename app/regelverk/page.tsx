import Link from "next/link";
import { regulationLinks } from "@/lib/regulations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegelverkPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Krav, lover og forskrifter</h1>
          <p className="text-sm text-slate-600">
            Direkte lenker til sentrale krav for grøftearbeid, HMS, SHA og planlegging.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-brand-700 hover:underline">
            Startside
          </Link>
          <Link href="/plan" className="text-brand-700 hover:underline">
            Opprett grøfteplan
          </Link>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Krav oppdateres over tid. Verifiser alltid gjeldende tekst i offisielle kilder (Lovdata,
        Arbeidstilsynet, kommune/statlig myndighet) før endelig bruk i prosjekt.
      </div>

      <section className="grid gap-4">
        {regulationLinks.map((item) => (
          <Card key={item.url}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>Kilde: {item.source}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>{item.summary}</p>
              {item.quote && (
                <blockquote className="rounded-md border-l-4 border-brand-600 bg-brand-50 px-3 py-2 italic text-slate-800">
                  &quot;{item.quote}&quot;
                </blockquote>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-brand-700 hover:underline"
              >
                Åpne kilde
              </a>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
