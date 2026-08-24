import { memo, useMemo } from 'react';
import { ChemicalElement, elements, categoryColors } from '../data/elements';
import { elementProperties } from '../data/elementProperties';
import { X, Scale, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { audioEngine } from '@/lib/audioEngine';

interface ComparisonModeProps {
    element1: ChemicalElement | null;
    element2: ChemicalElement | null;
    onRemoveElement: (slot: 1 | 2) => void;
}

const QUICK_PICKS = ['H', 'C', 'N', 'O', 'Na', 'Cl', 'Fe', 'Cu', 'Au', 'U'];

const TelemetryDeltaRow = memo(function TelemetryDeltaRow({
    label,
    val1,
    val2,
    max,
    unit = '',
}: {
    label: string;
    val1: number | null;
    val2: number | null;
    max: number;
    unit?: string;
}) {
    const p1 = val1 ? Math.min((val1 / max) * 100, 100) : 0;
    const p2 = val2 ? Math.min((val2 / max) * 100, 100) : 0;
    const diff = val1 !== null && val2 !== null ? val1 - val2 : null;

    return (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span className="uppercase font-semibold">{label}</span>
                {diff !== null && (
                    <span className={diff > 0 ? 'text-sky-700 font-bold' : diff < 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                        Δ {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {unit}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
                {/* Left Element Bar */}
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] font-bold text-sky-700">{val1 ?? 'N/A'}{unit}</span>
                    <div className="w-28 h-2 bg-slate-200 rounded overflow-hidden flex justify-end">
                        <div className="h-full bg-sky-600 transition-all duration-300" style={{ width: `${p1}%` }} />
                    </div>
                </div>

                {/* Right Element Bar */}
                <div className="flex items-center gap-2">
                    <div className="w-28 h-2 bg-slate-200 rounded overflow-hidden">
                        <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${p2}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-amber-700">{val2 ?? 'N/A'}{unit}</span>
                </div>
            </div>
        </div>
    );
});

export const ComparisonMode = memo(function ComparisonMode({
    element1,
    element2,
    onRemoveElement,
}: ComparisonModeProps) {
    const { setComparisonSlot } = useAppStore();

    const props1 = element1 ? elementProperties[element1.atomicNumber] : null;
    const props2 = element2 ? elementProperties[element2.atomicNumber] : null;

    // Calculate Electronegativity Difference & Pauling Ionic Character
    const bondAnalysis = useMemo(() => {
        if (!props1?.electronegativity || !props2?.electronegativity) return null;
        const deltaEN = Math.abs(props1.electronegativity - props2.electronegativity);
        // Pauling Equation: % Ionic Character = 100 * (1 - exp(-0.25 * (deltaEN)^2))
        const percentIonic = Math.round(100 * (1 - Math.exp(-0.25 * Math.pow(deltaEN, 2))));
        const percentCovalent = 100 - percentIonic;

        let bondType = 'Non-polar Covalent';
        if (deltaEN > 2.0) bondType = 'Predominantly Ionic Bond';
        else if (deltaEN > 0.5) bondType = 'Polar Covalent Bond';

        return { deltaEN, percentIonic, percentCovalent, bondType };
    }, [props1, props2]);

    const handleSelectQuick = (sym: string, slot: 1 | 2) => {
        audioEngine.playClick(820);
        const el = elements.find((e) => e.symbol === sym);
        if (el) setComparisonSlot(slot, el);
    };

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-50 font-mono text-slate-900 select-none overflow-y-auto matrix-grid-bg">
            {/* Header Title */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-sky-600 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase text-sky-700">
                        DUAL-ELEMENT DIFFERENTIAL COMPARISON CONSOLE
                    </span>
                </div>
            </div>

            {/* Element Selection Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Slot 1 */}
                <div className="p-3 rounded-xl bg-white border border-sky-300 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-sky-700 font-bold uppercase">Element Slot A</span>
                        {element1 && (
                            <button onClick={() => onRemoveElement(1)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {element1 ? (
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black text-lg border"
                                style={{ backgroundColor: `${categoryColors[element1.category]}18`, borderColor: categoryColors[element1.category], color: categoryColors[element1.category] }}
                            >
                                {element1.symbol}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{element1.name}</div>
                                <div className="text-[10px] text-slate-500">Atomic #{element1.atomicNumber} • {element1.atomicMass.toFixed(2)} u</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 py-2">Select from Quick Picks or Discovery Rail</div>
                    )}
                    {/* Quick picks */}
                    <div className="flex gap-1 flex-wrap pt-1">
                        {QUICK_PICKS.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSelectQuick(s, 1)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-sky-100 border border-slate-200 text-[9px] text-slate-700 font-medium"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Slot 2 */}
                <div className="p-3 rounded-xl bg-white border border-amber-300 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-amber-700 font-bold uppercase">Element Slot B</span>
                        {element2 && (
                            <button onClick={() => onRemoveElement(2)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {element2 ? (
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black text-lg border"
                                style={{ backgroundColor: `${categoryColors[element2.category]}18`, borderColor: categoryColors[element2.category], color: categoryColors[element2.category] }}
                            >
                                {element2.symbol}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{element2.name}</div>
                                <div className="text-[10px] text-slate-500">Atomic #{element2.atomicNumber} • {element2.atomicMass.toFixed(2)} u</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 py-2">Select from Quick Picks or Discovery Rail</div>
                    )}
                    {/* Quick picks */}
                    <div className="flex gap-1 flex-wrap pt-1">
                        {QUICK_PICKS.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSelectQuick(s, 2)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 border border-slate-200 text-[9px] text-slate-700 font-medium"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pauling Bond Analysis Card */}
            {bondAnalysis && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 text-slate-900 font-bold uppercase">
                            <Zap className="w-3.5 h-3.5 text-sky-600" />
                            Pauling Chemical Bonding Analysis
                        </span>
                        <span className="font-bold text-sky-700">{bondAnalysis.bondType} (Δχ = {bondAnalysis.deltaEN.toFixed(2)})</span>
                    </div>

                    <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                        <div
                            className="bg-sky-600 flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ width: `${bondAnalysis.percentCovalent}%` }}
                        >
                            {bondAnalysis.percentCovalent > 15 ? `${bondAnalysis.percentCovalent}% Covalent` : ''}
                        </div>
                        <div
                            className="bg-amber-500 flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ width: `${bondAnalysis.percentIonic}%` }}
                        >
                            {bondAnalysis.percentIonic > 15 ? `${bondAnalysis.percentIonic}% Ionic` : ''}
                        </div>
                    </div>
                </div>
            )}

            {/* Differential Telemetry Metrics */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Physical & Chemical Delta Comparison</span>
                <div className="space-y-1.5">
                    <TelemetryDeltaRow
                        label="Electronegativity (Pauling)"
                        val1={props1?.electronegativity ?? null}
                        val2={props2?.electronegativity ?? null}
                        max={4.0}
                    />
                    <TelemetryDeltaRow
                        label="1st Ionization Energy"
                        val1={props1?.ionizationEnergy ?? null}
                        val2={props2?.ionizationEnergy ?? null}
                        max={2400}
                        unit=" kJ/mol"
                    />
                    <TelemetryDeltaRow
                        label="Atomic Radius (Calculated)"
                        val1={props1?.atomicRadius ?? null}
                        val2={props2?.atomicRadius ?? null}
                        max={300}
                        unit=" pm"
                    />
                    <TelemetryDeltaRow
                        label="Melting Point"
                        val1={props1?.meltingPoint ?? null}
                        val2={props2?.meltingPoint ?? null}
                        max={4000}
                        unit=" K"
                    />
                    <TelemetryDeltaRow
                        label="Boiling Point"
                        val1={props1?.boilingPoint ?? null}
                        val2={props2?.boilingPoint ?? null}
                        max={6000}
                        unit=" K"
                    />
                    <TelemetryDeltaRow
                        label="Density @ STP"
                        val1={props1?.density ?? null}
                        val2={props2?.density ?? null}
                        max={25}
                        unit=" g/cm³"
                    />
                </div>
            </div>
        </div>
    );
});
