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

type ExcavPos    = "below" | "above" | "both" | "ingen";
type TruckDir    = "ingen" | "left" | "right" | "straight";
type MasseSide   = "above" | "below" | "both" | "ingen";
type CrossSecPos = "right" | "front";

function makeExcavConfig(
  enabled: boolean,
  isAbove: boolean,
  truckDir: TruckDir,
): ExcavSideConfig {
  const truckFromLeft  = truckDir === "left";
  const truckFromRight = truckDir === "right";
  const truckStraight  = truckDir === "straight";
  // Arm alltid vendt mot grøfta — gravemaskin snur seg for lasting, men i plansketsen
  // viser vi at gravemaskin alltid er orientert mot grøfta.
  const rotation: 0 | 90 | 180 | 270 = isAbove ? 90 : 270;
  return { enabled, pos: "center", rotation, truckFromLeft, truckFromRight, truckStraight };
}

export function SketchGeneratorV3() {
  const [step, setStep] = useState<Step>(1);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [depthM, setDepthM] = useState(1.5);
  const [bottomWidthM, setBottomWidthM] = useState(1.0);
  const [groundType, setGroundType] = useState<GroundType | null>(null);
  const [securingMethod, setSecuringMethod] = useState<SecuringMethod | null>(null);
  const [trenchLengthM, setTrenchLengthM] = useState(20);
  const [massehaugDistM, setMassehaugDistM] = useState(1.0);
  const [excavDistM, setExcavDistM] = useState(1.0);
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("nb-NO"));
  const [notes, setNotes] = useState("");

  // Enkle val for Ola og Kari
  const [excavPos,      setExcavPos]      = useState<ExcavPos>("below");
  const [truckDirBelow, setTruckDirBelow] = useState<TruckDir>("ingen");
  const [truckDirAbove, setTruckDirAbove] = useState<TruckDir>("ingen");
  const [masseSide,     setMasseSide]     = useState<MasseSide>("above");
  const [crossSecPos,   setCrossSecPos]   = useState<CrossSecPos>("right");

  const svgRef = useRef<HTMLDivElement>(null);

  const recommendation =
    groundType ? recommendSecuring(depthM, groundType) : null;

  const activeMethod = securingMethod ?? recommendation?.method ?? "skraa_45";

  const excavBelow = makeExcavConfig(
    excavPos === "below" || excavPos === "both", false, truckDirBelow
  );
  const excavAbove = makeExcavConfig(
    excavPos === "above" || excavPos === "both", true, truckDirAbove
  );

  const params: SketchV3Params = {
    workType: workType ?? "va",
    depthM,
    bottomWidthM,
    trenchLengthM,
    showMassehaug:   masseSide === "above" || masseSide === "both",
    massehaugBelow:  masseSide === "below" || masseSide === "both",
    excavBelow,
    excavAbove,
    groundType: groundType ?? "morene",
    securingMethod: activeMethod,
    massehaugDistM,
    excavDistM,
    excavFacingFront: crossSecPos === "front",
    excavSideLeft:    false,
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

    // Hjelpefunksjon for store valsknapper
    function ChoiceBtn<T extends string>({ val, current, onClick, children }: {
      val: T; current: T; onClick: (v: T) => void; children: React.ReactNode;
    }) {
      const active = val === current;
      return (
        <button
          type="button"
          onClick={() => onClick(val)}
          className={`flex-1 py-3 px-2 rounded-xl border-2 text-sm font-semibold text-center transition-all
            ${active
              ? "border-brand-600 bg-brand-600 text-white shadow"
              : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"}`}
        >
          {children}
        </button>
      );
    }

    const TruckButtons = ({ dir, setDir }: { dir: TruckDir; setDir: (v: TruckDir) => void }) => (
      <div className="flex gap-2">
        <ChoiceBtn val="ingen" current={dir} onClick={setDir}>
          —<br /><span className="text-xs font-normal">Ingen</span>
        </ChoiceBtn>
        <ChoiceBtn val="left" current={dir} onClick={setDir}>
          ←<br /><span className="text-xs font-normal">Frå venstre</span>
        </ChoiceBtn>
        <ChoiceBtn val="right" current={dir} onClick={setDir}>
          →<br /><span className="text-xs font-normal">Frå høgre</span>
        </ChoiceBtn>
        <ChoiceBtn val="straight" current={dir} onClick={setDir}>
          ↕<br /><span className="text-xs font-normal">Rett inn</span>
        </ChoiceBtn>
      </div>
    );

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <StepIndicator current={5} />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Skissa er klar</h2>
        <p className="text-sm text-slate-500">Tilpass og last ned PDF.</p>

        {/* Prosjektinfo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">Prosjektinfo</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Prosjektnamn</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="t.d. Møllevei VA"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Stad / Adresse</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="t.d. Møllevei 14"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Dato</label>
              <input type="text" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Notat</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="t.d. spesielle tilhøve, kontaktperson …"
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        {/* Tverrsnitt-innstillingar → tverrsnitt-skisse */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Tverrsnitt — gravemaskin</h3>
          <div className="flex gap-2">
            <ChoiceBtn val="right" current={crossSecPos} onClick={setCrossSecPos}>
              □→<br /><span className="text-xs font-normal">Til høgre</span>
            </ChoiceBtn>
            <ChoiceBtn val="front" current={crossSecPos} onClick={setCrossSecPos}>
              ↓□↓<br /><span className="text-xs font-normal">Foran (frontvisning)</span>
            </ChoiceBtn>
          </div>
        </div>

        <div ref={svgRef} id="sketch-print-area"
          className="bg-white border border-slate-200 rounded-2xl p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tverrsnitt</p>
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <TrenchSketchV3 params={params} />
          </div>
        </div>

        {/* Rigg og køyretøy → planskisse */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Rigg og køyretøy</h3>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gravemaskin</p>
            <div className="flex gap-2">
              <ChoiceBtn val="below" current={excavPos} onClick={setExcavPos}>
                ↓<br /><span className="text-xs font-normal">Nedanfor</span>
              </ChoiceBtn>
              <ChoiceBtn val="above" current={excavPos} onClick={setExcavPos}>
                ↑<br /><span className="text-xs font-normal">Ovanfor</span>
              </ChoiceBtn>
              <ChoiceBtn val="both" current={excavPos} onClick={setExcavPos}>
                ↕<br /><span className="text-xs font-normal">Begge sider</span>
              </ChoiceBtn>
              <ChoiceBtn val="ingen" current={excavPos} onClick={setExcavPos}>
                —<br /><span className="text-xs font-normal">Ingen</span>
              </ChoiceBtn>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Massehaug</p>
            <div className="flex gap-2">
              <ChoiceBtn val="above" current={masseSide} onClick={setMasseSide}>
                ↑<br /><span className="text-xs font-normal">Ovanfor</span>
              </ChoiceBtn>
              <ChoiceBtn val="below" current={masseSide} onClick={setMasseSide}>
                ↓<br /><span className="text-xs font-normal">Nedanfor</span>
              </ChoiceBtn>
              <ChoiceBtn val="both" current={masseSide} onClick={setMasseSide}>
                ↕<br /><span className="text-xs font-normal">Begge sider</span>
              </ChoiceBtn>
              <ChoiceBtn val="ingen" current={masseSide} onClick={setMasseSide}>
                —<br /><span className="text-xs font-normal">Ingen</span>
              </ChoiceBtn>
            </div>
          </div>

          {(excavPos === "below" || excavPos === "both") && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Lastebil{excavPos === "both" ? " — nedanfor grøft" : ""}
              </p>
              <TruckButtons dir={truckDirBelow} setDir={setTruckDirBelow} />
            </div>
          )}

          {(excavPos === "above" || excavPos === "both") && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Lastebil{excavPos === "both" ? " — ovanfor grøft" : ""}
              </p>
              <TruckButtons dir={truckDirAbove} setDir={setTruckDirAbove} />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Avstand frå grøftkant
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setExcavDistM(m => Math.max(0.5, Math.round((m - 0.5) * 10) / 10)); setMassehaugDistM(m => Math.max(0.5, Math.round((m - 0.5) * 10) / 10)); }}
                className="w-10 h-10 rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-xl font-bold flex items-center justify-center"
              >−</button>
              <span className="text-2xl font-bold text-brand-700 w-16 text-center">{excavDistM.toFixed(1)} m</span>
              <button
                onClick={() => { setExcavDistM(m => Math.min(5.0, Math.round((m + 0.5) * 10) / 10)); setMassehaugDistM(m => Math.min(5.0, Math.round((m + 0.5) * 10) / 10)); }}
                className="w-10 h-10 rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-xl font-bold flex items-center justify-center"
              >+</button>
              {excavDistM < 1.0 && (
                <span className="text-xs text-amber-600">⚠️ Under min. 1 m</span>
              )}
            </div>
          </div>
        </div>

        <div id="plan-print-area"
          className="bg-white border border-slate-200 rounded-2xl p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Plan (ovanfrå)</p>
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <PlanSketchV3 params={params} />
          </div>
        </div>

        {/* Åtvaringar */}
        {recommendation && recommendation.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-700 uppercase mb-2">
              Krav etter norsk regelverk (§21 Gravearbeid)
            </div>
            <ul className="space-y-1">
              {recommendation.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-800 flex gap-2">
                  <span>⚠️</span><span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Handlingar */}
        <div className="flex gap-3">
          <button onClick={() => setStep(4)}
            className="px-4 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm hover:border-slate-300 transition-colors">
            ← Endre
          </button>
          <button onClick={handlePrint}
            className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-xl text-base font-semibold hover:bg-brand-700 transition-colors">
            🖨️ Skriv ut / PDF
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center">
          I utskriftsdialogen: vel «Lagre som PDF» for å laste ned.
        </p>
      </div>
    );
  }

  return null;
}
