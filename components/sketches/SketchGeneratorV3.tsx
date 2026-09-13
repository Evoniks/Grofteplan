"use client";

import { useState, useRef } from "react";
import {
  WORK_TYPE_LABELS,
  WORK_TYPE_DESC,
  GROUND_TYPE_LABELS,
  GROUND_TYPE_DESC,
  SECURING_METHOD_LABELS,
  recommendSecuring,
  defaultBottomWidthM,
  defaultExcavConfig,
  type WorkType,
  type GroundType,
  type SecuringMethod,
  type SketchV3Params,
  type ExcavSideConfig,
} from "@/lib/sketch-v3";
import { TrenchSketchV3 } from "@/components/sketches/TrenchSketchV3";
import { PlanSketchV3 } from "@/components/sketches/PlanSketchV3";

const WORK_TYPES: WorkType[] = ["va", "kabel", "masseutskifting", "anna"];
const GROUND_TYPES: GroundType[] = ["leire", "morene", "fjell", "fyllmasse"];

const WORK_ICONS: Record<WorkType, string> = {
  va: "🪣",
  kabel: "⚡",
  masseutskifting: "🚛",
  anna: "🔧",
};

const GROUND_ICONS: Record<GroundType, string> = {
  leire: "🟤",
  morene: "🪨",
  fjell: "⛰️",
  fyllmasse: "❓",
};

type Step = 1 | 2 | 3 | 4 | 5;

function StepIndicator({ current }: { current: Step }) {
  const steps = ["Type", "Mål", "Grunn", "Sikring", "Skisse"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${done ? "bg-brand-600 text-white" : active ? "bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1" : "bg-slate-100 text-slate-400"}`}
              >
                {done ? "✓" : n}
              </div>
              <span className={`text-xs mt-1 ${active ? "text-brand-700 font-medium" : "text-slate-400"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 ${done ? "bg-brand-600" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = "Neste →",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8">
      {onBack ? (
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          ← Tilbake
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function SketchGeneratorV3() {
  const [step, setStep] = useState<Step>(1);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [depthM, setDepthM] = useState(1.5);
  const [bottomWidthM, setBottomWidthM] = useState(1.0);
  const [groundType, setGroundType] = useState<GroundType | null>(null);
  const [securingMethod, setSecuringMethod] = useState<SecuringMethod | null>(null);
  const [trenchLengthM, setTrenchLengthM] = useState(20);
  const [showMassehaug, setShowMassehaug] = useState(true);
  const [excavBelow, setExcavBelow] = useState<ExcavSideConfig>({ ...defaultExcavConfig(true),  rotation: 0, truckFromRight: true });
  const [excavAbove, setExcavAbove] = useState<ExcavSideConfig>({ ...defaultExcavConfig(false), rotation: 180 });
  const [massehaugDistM, setMassehaugDistM] = useState(1.0);
  const [excavDistM, setExcavDistM] = useState(1.0);
  const [excavFacingFront, setExcavFacingFront] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("nb-NO"));
  const [notes, setNotes] = useState("");
  const svgRef = useRef<HTMLDivElement>(null);

  const recommendation =
    groundType ? recommendSecuring(depthM, groundType) : null;

  const activeMethod = securingMethod ?? recommendation?.method ?? "skraa_45";

  const params: SketchV3Params = {
    workType: workType ?? "va",
    depthM,
    bottomWidthM,
    trenchLengthM,
    showMassehaug,
    excavBelow,
    excavAbove,
    groundType: groundType ?? "morene",
    securingMethod: activeMethod,
    massehaugDistM,
    excavDistM,
    excavFacingFront,
    projectName,
    location,
    date,
    notes,
  };

  function handlePrint() {
    window.print();
  }

  // ─── Step 1: Work type ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={1} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Kva type arbeid?</h2>
        <p className="text-sm text-slate-500 mb-6">Vel det som passar best til ditt prosjekt.</p>
        <div className="grid grid-cols-2 gap-3">
          {WORK_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setWorkType(t);
                setBottomWidthM(defaultBottomWidthM(t));
              }}
              className={`p-5 rounded-xl border-2 text-left transition-all hover:border-brand-400
                ${workType === t ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}
            >
              <div className="text-3xl mb-2">{WORK_ICONS[t]}</div>
              <div className="font-semibold text-slate-900">{WORK_TYPE_LABELS[t]}</div>
              <div className="text-xs text-slate-500 mt-0.5">{WORK_TYPE_DESC[t]}</div>
            </button>
          ))}
        </div>
        <NavButtons onNext={() => setStep(2)} nextDisabled={!workType} />
      </div>
    );
  }

  // ─── Step 2: Dimensions ───────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={2} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Mål på grøfta</h2>
        <p className="text-sm text-slate-500 mb-6">
          Djupn er den viktigaste faktoren for kva sikring som krevst.
        </p>

        {/* Depth */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-baseline mb-3">
            <label className="font-semibold text-slate-800">Djupn</label>
            <span className="text-2xl font-bold text-brand-700">{depthM.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.1}
            value={depthM}
            onChange={(e) => setDepthM(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0,5 m</span>
            <span>5,0 m</span>
          </div>
          {/* Depth indicator */}
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg font-medium
            ${depthM < 1.0 ? "bg-green-50 text-green-700" :
              depthM < 1.25 ? "bg-yellow-50 text-yellow-700" :
              depthM < 2.0 ? "bg-orange-50 text-orange-700" :
              "bg-red-50 text-red-700"}`}>
            {depthM < 1.0 && "Grøft < 1 m — lågaste kravnivå"}
            {depthM >= 1.0 && depthM < 1.25 && "Grøft ≥ 1 m — rømningsveg påkravd"}
            {depthM >= 1.25 && depthM < 2.0 && "Grøft ≥ 1,25 m — grøfteplan og opplæring påkravd"}
            {depthM >= 2.0 && depthM <= 3.0 && "Grøft ≥ 2 m — grøftekasse, spunt eller godkjend skråning påkravd"}
            {depthM > 3.0 && "Grøft > 3 m — geotekniker må prosjektere og dokumentere sikring"}
          </div>
        </div>

        {/* Bottom width */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-baseline mb-3">
            <label className="font-semibold text-slate-800">Bottnbreidde (innvendig)</label>
            <span className="text-2xl font-bold text-brand-700">{bottomWidthM.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={4.0}
            step={0.05}
            value={bottomWidthM}
            onChange={(e) => setBottomWidthM(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0,3 m</span>
            <span>4,0 m</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {workType === "va" && "VA-grøft: typisk 0,8–1,2 m"}
            {workType === "kabel" && "Kabelgrøft: typisk 0,4–0,6 m"}
            {workType === "masseutskifting" && "Masseutskifting: varierer mykje"}
            {workType === "anna" && "Juster etter eige behov"}
          </p>
        </div>

        {/* Trench length */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
          <div className="flex justify-between items-baseline mb-3">
            <label className="font-semibold text-slate-800">Lengd på grøfta</label>
            <span className="text-2xl font-bold text-brand-700">{trenchLengthM} m</span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={trenchLengthM}
            onChange={(e) => setTrenchLengthM(parseInt(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>5 m</span>
            <span>200 m</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Rømningsvegar: <strong>{Math.ceil(trenchLengthM / 25) + 1} stk</strong> (éin per 25 m — §21 Gravearbeid)
          </p>
        </div>

        <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
      </div>
    );
  }

  // ─── Step 3: Ground type ──────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={3} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Grunnforhold</h2>
        <p className="text-sm text-slate-500 mb-6">
          Jordtype og grunnforhold avgjer kva sikring som er nødvendig.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {GROUND_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setGroundType(t);
                setSecuringMethod(null); // reset so recommendation re-applies
              }}
              className={`p-5 rounded-xl border-2 text-left transition-all hover:border-brand-400
                ${groundType === t ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}
            >
              <div className="text-3xl mb-2">{GROUND_ICONS[t]}</div>
              <div className="font-semibold text-slate-900">{GROUND_TYPE_LABELS[t]}</div>
              <div className="text-xs text-slate-500 mt-0.5">{GROUND_TYPE_DESC[t]}</div>
            </button>
          ))}
        </div>
        <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!groundType} />
      </div>
    );
  }

  // ─── Step 4: Securing ─────────────────────────────────────────────────────
  if (step === 4 && recommendation) {
    const allMethods: SecuringMethod[] = [
      "ingen",
      "skraa_45",
      "skraa_60",
      "vertikal",
      "groftekas",
      "spunt",
    ];
    const highlighted = new Set<SecuringMethod>([
      recommendation.method,
      ...recommendation.alternatives,
    ]);

    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={4} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Sikringsmetode</h2>

        {/* Recommendation box */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5">
          <div className="text-xs font-semibold text-brand-700 uppercase mb-1">Tilråding</div>
          <div className="font-semibold text-slate-900 text-sm mb-1">
            {SECURING_METHOD_LABELS[recommendation.method]}
          </div>
          <p className="text-xs text-slate-600">{recommendation.reason}</p>
        </div>

        {/* Warnings */}
        {recommendation.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="text-xs font-semibold text-amber-700 uppercase mb-2">Regelverket krev</div>
            <ul className="space-y-1">
              {recommendation.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-800 flex gap-2">
                  <span>⚠️</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Method selector */}
        <div className="space-y-2">
          {allMethods.map((m) => {
            const isRec = m === recommendation.method;
            const isAlt = recommendation.alternatives.includes(m);
            const isActive = activeMethod === m;
            return (
              <button
                key={m}
                onClick={() => setSecuringMethod(m)}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left flex items-center gap-3 transition-all
                  ${isActive ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}
                  ${!highlighted.has(m) ? "opacity-50" : ""}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0
                  ${isActive ? "border-brand-600 bg-brand-600" : "border-slate-300"}`} />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-800">{SECURING_METHOD_LABELS[m]}</span>
                  {isRec && <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">Anbefalt</span>}
                  {isAlt && !isRec && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Alternativ</span>}
                </div>
              </button>
            );
          })}
        </div>

        <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
      </div>
    );
  }

  // ─── Step 5: Preview ──────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="max-w-3xl mx-auto">
        <StepIndicator current={5} />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Skissa er klar</h2>
        <p className="text-sm text-slate-500 mb-4">Fyll inn prosjektinformasjon og last ned PDF.</p>

        {/* Project info */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Prosjektnamn</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="t.d. Nedre Møllevei VA"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Stad / Adresse</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="t.d. Nedre Møllevei 14"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Dato</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Notat / tilleggsinformasjon */}
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-600 block mb-1">Notat / tilleggsinformasjon</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="t.d. spesielle tilhøve, tiltak, kontaktperson …"
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Avstandar frå grøftkant */}
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Avstand frå grøftkant</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Massehaug (venstre)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMassehaugDistM(m => Math.max(0.5, Math.round((m - 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  min={0.5} max={5.0} step={0.5}
                  value={massehaugDistM}
                  onChange={(e) => setMassehaugDistM(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-brand-700"
                />
                <button
                  onClick={() => setMassehaugDistM(m => Math.min(5.0, Math.round((m + 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold flex items-center justify-center"
                >+</button>
                <span className="text-sm text-slate-500">m</span>
              </div>
              {massehaugDistM < 1.0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Under tilrådd min. 1 m</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Gravemaskin (høgre)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExcavDistM(m => Math.max(0.5, Math.round((m - 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  min={0.5} max={5.0} step={0.5}
                  value={excavDistM}
                  onChange={(e) => setExcavDistM(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-brand-700"
                />
                <button
                  onClick={() => setExcavDistM(m => Math.min(5.0, Math.round((m + 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold flex items-center justify-center"
                >+</button>
                <span className="text-sm text-slate-500">m</span>
              </div>
              {excavDistM < 1.0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Under tilrådd min. 1 m</p>
              )}
            </div>
          </div>
        </div>

        {/* Tverrsnittsskisse */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase">Tverrsnitt</p>
          <div className="flex gap-1">
            <button
              onClick={() => setExcavFacingFront(false)}
              className={`px-3 py-1 rounded-l-lg border text-xs font-medium transition-colors
                ${!excavFacingFront ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >
              Sidevisning
            </button>
            <button
              onClick={() => setExcavFacingFront(true)}
              className={`px-3 py-1 rounded-r-lg border text-xs font-medium transition-colors
                ${excavFacingFront ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >
              Frontvisning
            </button>
          </div>
        </div>
        <div
          ref={svgRef}
          id="sketch-print-area"
          className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4"
        >
          <TrenchSketchV3 params={params} />
        </div>

        {/* Planskisse — oppsett */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Planskisse — oppsett</p>
          {/* Massehaug */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showMassehaug} onChange={e => setShowMassehaug(e.target.checked)}
                className="accent-brand-600 w-4 h-4" />
              <span className="text-sm text-slate-700">Vis massehaug</span>
            </label>
          </div>
          {/* To kolonnar: Nedanfor og Ovanfor */}
          <div className="grid grid-cols-2 gap-3">
            {(["below", "above"] as const).map(side => {
              const cfg  = side === "below" ? excavBelow : excavAbove;
              const set  = (patch: Partial<ExcavSideConfig>) =>
                side === "below" ? setExcavBelow(c => ({ ...c, ...patch }))
                                 : setExcavAbove(c => ({ ...c, ...patch }));
              const label = side === "below" ? "▼ Nedanfor grøft" : "▲ Ovanfor grøft";
              return (
                <div key={side} className={`border rounded-xl p-3 ${cfg.enabled ? "border-brand-300 bg-brand-50/30" : "border-slate-200 bg-slate-50/50"}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={cfg.enabled}
                      onChange={e => set({ enabled: e.target.checked })}
                      className="accent-brand-600 w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                  </label>
                  {cfg.enabled && (
                    <div className="space-y-2">
                      {/* Posisjon langs grøfta */}
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Posisjon</p>
                        <div className="flex gap-1">
                          {(["left","center","right"] as const).map(v => (
                            <button key={v} onClick={() => set({ pos: v })}
                              className={`flex-1 py-0.5 rounded border text-xs transition-colors
                                ${cfg.pos === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                              {v === "left" ? "←" : v === "center" ? "Midt" : "→"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Arm-retning */}
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Arm-retning</p>
                        <div className="flex gap-1">
                          {([
                            { val: 270 as const, label: "↑" },
                            { val:   0 as const, label: "→" },
                            { val:  90 as const, label: "↓" },
                            { val: 180 as const, label: "←" },
                          ]).map(({ val, label: lbl }) => (
                            <button key={val} onClick={() => set({ rotation: val })}
                              className={`flex-1 py-0.5 rounded border text-xs transition-colors
                                ${cfg.rotation === val ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Lastebil */}
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Lastebil</p>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.truckFromLeft}
                              onChange={e => set({ truckFromLeft: e.target.checked })}
                              className="accent-brand-600 w-3.5 h-3.5" />
                            <span className="text-xs text-slate-700">← Venstre</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.truckFromRight}
                              onChange={e => set({ truckFromRight: e.target.checked })}
                              className="accent-brand-600 w-3.5 h-3.5" />
                            <span className="text-xs text-slate-700">Høgre →</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Planskisse */}
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Plan (ovanfrå)</p>
        <div
          id="plan-print-area"
          className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
        >
          <PlanSketchV3 params={params} />
        </div>

        {/* Warnings summary */}
        {recommendation && recommendation.warnings.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-700 uppercase mb-2">
              Krav etter norsk regelverk (§21 Gravearbeid)
            </div>
            <ul className="space-y-1">
              {recommendation.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-800 flex gap-2">
                  <span>⚠️</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => setStep(4)}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors"
          >
            ← Endre
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            🖨️ Skriv ut / Lagre som PDF
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2 text-center">
          I utskriftsdialogen: vel «Lagre som PDF» for å laste ned.
        </p>
      </div>
    );
  }

  return null;
}
