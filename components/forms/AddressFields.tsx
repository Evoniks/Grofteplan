"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { PlanSchema } from "@/lib/schema";
import type { AddressHit } from "@/lib/address-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  form: UseFormReturn<PlanSchema>;
};

export function AddressFields({ form }: Props) {
  const listId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posLoading, setPosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyHit = useCallback(
    (hit: AddressHit) => {
      form.setValue("adresse", hit.adresse, { shouldDirty: true, shouldValidate: true });
      form.setValue("kommune", hit.kommune, { shouldDirty: true, shouldValidate: true });
      setSearchQuery("");
      setOpen(false);
      setHits([]);
      setError(null);
    },
    [form]
  );

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/address-search?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { hits?: AddressHit[]; error?: string };
      setHits(data.hits ?? []);
      setOpen((data.hits?.length ?? 0) > 0);
      if (data.error) setError(data.error);
    } catch {
      setError("Kunne ikke søke adresser.");
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(value), 350);
  };

  const hentMinPosisjon = () => {
    if (!navigator.geolocation) {
      setError("Nettleseren støtter ikke posisjon.");
      return;
    }
    setPosLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/address-reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = (await res.json()) as { hit?: AddressHit | null; error?: string };
          if (data.hit) {
            applyHit(data.hit);
          } else {
            setError(data.error ?? "Fant ingen adresse for posisjonen.");
          }
        } catch {
          setError("Kunne ikke hente adresse fra posisjon.");
        } finally {
          setPosLoading(false);
        }
      },
      () => {
        setPosLoading(false);
        setError("Posisjon ble ikke delt. Tillat plassering i nettleseren og prøv igjen.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  return (
    <div className="md:col-span-2 space-y-3">
      <Field label="Adresse" hint="Skriv adressen der grøftarbeidet skal utføres — uavhengig av hvor du sitter.">
        <Input
          {...form.register("adresse")}
          placeholder="T.d. Storgata 1, 9008 Tromsø"
          autoComplete="street-address"
        />
      </Field>

      <Field label="Kommune">
        <Input {...form.register("kommune")} placeholder="T.d. Tromsø" autoComplete="address-level2" />
      </Field>

      <details className="rounded-md border border-slate-200 bg-slate-50/80 p-3" ref={wrapRef}>
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          Valgfritt hjelpemiddel – finn adresse i Norge
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Brukes når du vil slå opp riktig gateadresse og kommune (f.eks. planlegger i Oslo for arbeid i
          Tromsø). Fyller ikke ut feltene over før du velger et treff.
        </p>

        <div className="relative mt-3">
          <Label htmlFor={`${listId}-sok`} className="mb-2 block text-xs text-slate-700">
            Søk i adresseregister
          </Label>
          <Input
            id={`${listId}-sok`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => hits.length > 0 && setOpen(true)}
            placeholder="Søk på gate, sted eller poststed …"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
          />
          {open && hits.length > 0 && (
            <ul
              id={`${listId}-list`}
              role="listbox"
              className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
            >
              {hits.map((hit) => (
                <li key={`${hit.adresse}-${hit.kommune}-${hit.postnummer}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHit(hit)}
                  >
                    <span className="font-medium text-slate-900">{hit.adresse}</span>
                    {hit.kommune ? (
                      <span className="block text-xs text-slate-600">{hit.kommune}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loading ? <p className="mt-1 text-xs text-slate-500">Søker …</p> : null}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs text-slate-600">
            <strong>På anlegget?</strong> Da kan du bruke GPS — ellers ignorer denne knappen.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={hentMinPosisjon} disabled={posLoading}>
            {posLoading ? "Henter …" : "Hent adresse fra min posisjon"}
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </details>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {hint ? <p className="mb-2 text-xs text-slate-600">{hint}</p> : null}
      {children}
    </div>
  );
}
