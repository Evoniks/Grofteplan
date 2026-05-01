import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 md:px-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-8 text-white md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Grøfteplan.no</p>
        <h1 className="mt-3 text-3xl font-bold md:text-5xl">Lag grøfteplan raskt og strukturert</h1>
        <p className="mt-4 max-w-3xl text-blue-100">
          Tjenesten hjelper entreprenører, VA- og vegprosjekter med å dokumentere trygg og
          gjennomførbar graveplan i tråd med norske forventninger.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/plan" className="inline-block">
            <Button size="lg">Lag grøfteplan</Button>
          </Link>
          <Link href="/skisseverktoy" className="inline-block">
            <Button size="lg" variant="secondary">Åpne skisseverktøy</Button>
          </Link>
          <Link href="/regelverk" className="inline-block">
            <Button size="lg" variant="outline" className="border-blue-200 bg-transparent text-white hover:bg-white/10">
              Krav, lover og forskrifter
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Basert på norske krav</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600">
            Regelkontroll for dybde, stabilitet, kabelpåvisning og risikoforhold.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>PDF klar for prosjektet</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600">
            Generer en profesjonell PDF med prosjektdata, varsler, instruks og signaturfelter.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rask utfylling</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600">
            Stegvis skjema med lokal lagring, mobilvennlig design og visuelle skisser.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
