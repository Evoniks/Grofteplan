# Grøfteplan.no MVP

MVP for norsk webtjeneste som hjelper entreprenører med å utarbeide grøfteplan/graveplan med:

- stegvis skjema
- forklaringshjelp i felter (spørsmålstegn med eksempler)
- regelmotor for sentrale varsler
- visuelle skisser (tverrprofil og lengdeprofil)
- skissejustering (tekst, tall, avstand og symbolvalg)
- PDF-generering med prosjektdata
- lokal lagring i nettleser

## Teknologistack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui-inspirerte UI-komponenter
- React Hook Form
- Zod
- @react-pdf/renderer

## Prosjektstruktur

- `app/` - routes, layout og sider
- `components/` - gjenbrukbare komponenter
- `components/forms/` - stegvis skjema
- `components/pdf/` - PDF-dokument og nedlasting
- `components/sketches/` - SVG-skisser
- `lib/` - schema, regelmotor, utils og lokal lagring
- `types/` - felles typer

## Kom i gang (steg for steg)

1. Installer Node.js 18+ (anbefalt LTS).
2. Åpne terminal i prosjektmappen:

```bash
cd Grøfteplan
```

3. Installer avhengigheter:

```bash
npm install
```

4. Start utviklingsserver:

```bash
npm run dev
```

5. Åpne [http://localhost:3000](http://localhost:3000)

## Ekstra steg for deg lokalt

- **shadcn CLI (valgfritt, men anbefalt):**
  - Prosjektet er konfigurert med `components.json`.
  - Kjør:
  - `npx shadcn@latest add select dialog badge`
  - Dette lar deg legge til flere standard shadcn-komponenter raskt.

- **Supabase-klargjøring (valgfritt nå):**
  - Kopier `.env.example` til `.env.local`.
  - Fyll inn:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
  - Lagring bruker fortsatt lokal storage som fallback, men kode for Supabase-klient og repository er på plass i `lib/supabase.ts` og `lib/plan-repository.ts`.

## Viktig juridisk forbehold

Dette verktøyet er et hjelpemiddel for utarbeidelse av grøfteplan. Bruker er selv ansvarlig for at planen kontrolleres, tilpasses lokale forhold og oppfyller gjeldende krav.

## Videreutvikling

- aktivere databasepersistens i Supabase-tabell (`plan_drafts`)
- evt. lagre SVG-skisser som bilder i PDF
- versjonshåndtering av revisjoner
