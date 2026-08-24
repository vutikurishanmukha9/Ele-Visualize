import { memo, useMemo, useState } from 'react';
import { ChemicalElement, elements, categoryColors } from '../data/elements';
import { elementProperties } from '../data/elementProperties';
import { X, ArrowRight, Sparkles, Scale, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

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
        <div className="p-2 rounded bg-black/60 border border-white/5 font-mono text-xs">
            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>{label}</span>
                {diff !== null && (
                    <span className={diff > 0 ? 'text-cyan-400 font-bold' : diff < 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        Δ {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {unit}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
                {/* Left Element Bar */}
                <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[11px] font-bold text-cyan-300">{val1 ?? 'N/A'}{unit}</span>
                    <div className="w-24 h-2 bg-slate-900 rounded overflow-hidden flex justify-end">
                        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${p1}%` }} />
                    </div>
                </div>

                {/* Right Element Bar */}
                <div className="flex items-center gap-1.5">
                    <div className="w-24 h-2 bg-slate-900 rounded overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${p2}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-amber-300">{val2 ?? 'N/A'}{unit}</span>
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
    const [searchQuery, setSearchQuery] = useState('');

    const props1 = element1 ? elementProperties[element1.atomicNumber] : null;
    const props2 = element2 ? elementProperties[element2.atomicNumber] : null;

    // Calculate Electronegativity Difference & Ionic Character Percentage
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
        const el = elements.find((e) => e.symbol === sym);
        if (el) setComparisonSlot(slot, el);
    };

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-950 font-mono text-white select-none overflow-y-auto matrix-grid-bg">
            {/* Header Title */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/80 border border-white/10">
                <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs tracking-wider uppercase text-cyan-300">
                        DUAL-ELEMENT DIFFERENTIAL TELEMETRY CONSOLE
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>Quick Select:</span>
                    {QUICK_PICKS.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                if (!element1) handleSelectQuick(s, 1);
                                else if (!element2) handleSelectQuick(s, 2);
                                else handleSelectQuick(s, 1);
                            }}
                            className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:border-cyan-400 hover:text-cyan-300 transition-all font-bold"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Dual Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Slot 1: Alpha Target */}
                <div className="p-4 rounded-xl bg-black/80 border border-cyan-500/30 relative chamfer-tl-br">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-[10px] font-bold text-cyan-400 uppercase">ALPHA TARGET (SLOT A)</span>
                        </div>
                        {element1 && (
                            <button
                                onClick={() => onRemoveElement(1)}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {element1 ? (
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold border-2"
                                style={{
                                    borderColor: categoryColors[element1.category] || '#00f0ff',
                                    backgroundColor: `${categoryColors[element1.category]}20`,
                                }}
                            >
                                <span className="text-[10px] text-slate-400 font-mono">{element1.atomicNumber}</span>
                                <span className="text-2xl text-white font-extrabold">{element1.symbol}</span>
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-white">{element1.name}</h3>
                                <p className="text-xs text-cyan-400">{element1.category}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{element1.atomicMass.toFixed(2)} u</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded-lg">
                            Click any element in Discovery Rail or Quick Select to load Slot A
                        </div>
                    )}
                </div>

                {/* Slot 2: Beta Target */}
                <div className="p-4 rounded-xl bg-black/80 border border-amber-500/30 relative chamfer-tr-bl">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase">BETA TARGET (SLOT B)</span>
                        </div>
                        {element2 && (
                            <button
                                onClick={() => onRemoveElement(2)}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {element2 ? (
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold border-2"
                                style={{
                                    borderColor: categoryColors[element2.category] || '#ffaa00',
                                    backgroundColor: `${categoryColors[element2.category]}20`,
                                }}
                            >
                                <span className="text-[10px] text-slate-400 font-mono">{element2.atomicNumber}</span>
                                <span className="text-2xl text-white font-extrabold">{element2.symbol}</span>
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-white">{element2.name}</h3>
                                <p className="text-xs text-amber-400">{element2.category}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{element2.atomicMass.toFixed(2)} u</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded-lg">
                            Click any element in Discovery Rail or Quick Select to load Slot B
                        </div>
                    )}
                </div>
            </div>

            {/* Bond Compatibility & Interaction Telemetry */}
            {bondAnalysis && element1 && element2 && (
                <div className="p-3.5 rounded-xl bg-black/90 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> {element1.symbol} — {element2.symbol} Chemical Interaction Analysis
                        </span>
                        <span className="font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40 text-[10px]">
                            {bondAnalysis.bondType}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded bg-white/5 border border-white/10">
                            <span className="text-[9px] text-slate-400">Δ Electronegativity</span>
                            <div className="font-bold text-cyan-300 text-sm">Δχ = {bondAnalysis.deltaEN.toFixed(2)}</div>
                        </div>
                        <div className="p-2 rounded bg-white/5 border border-white/10">
                            <span className="text-[9px] text-slate-400">% Ionic Character</span>
                            <div className="font-bold text-amber-300 text-sm">{bondAnalysis.percentIonic}%</div>
                        </div>
                        <div className="p-2 rounded bg-white/5 border border-white/10">
                            <span className="text-[9px] text-slate-400">% Covalent Character</span>
                            <div className="font-bold text-emerald-300 text-sm">{bondAnalysis.percentCovalent}%</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparative Telemetry Metric Rows */}
            {element1 && element2 && (
                <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
                        PRECISION COMPARATIVE TELEMETRY
                    </div>

                    <TelemetryDeltaRow
                        label="Atomic Mass (u)"
                        val1={element1.atomicMass}
                        val2={element2.atomicMass}
                        max={300}
                        unit=" u"
                    />
                    <TelemetryDeltaRow
                        label="Electronegativity (Pauling)"
                        val1={props1?.electronegativity ?? null}
                        val2={props2?.electronegativity ?? null}
                        max={4.0}
                    />
                    <TelemetryDeltaRow
                        label="First Ionization Energy (kJ/mol)"
                        val1={props1?.ionizationEnergy ?? null}
                        val2={props2?.ionizationEnergy ?? null}
                        max={2400}
                        unit=" kJ/mol"
                    />
                    <TelemetryDeltaRow
                        label="Atomic Radius (pm)"
                        val1={props1?.atomicRadius ?? null}
                        val2={props2?.atomicRadius ?? null}
                        max={300}
                        unit=" pm"
                    />
                    <TelemetryDeltaRow
                        label="Density (g/cm³)"
                        val1={props1?.density ?? null}
                        val2={props2?.density ?? null}
                        max={23}
                        unit=" g/cm³"
                    />
                    <TelemetryDeltaRow
                        label="Melting Point (K)"
                        val1={props1?.meltingPoint ?? null}
                        val2={props2?.meltingPoint ?? null}
                        max={4000}
                        unit=" K"
                    />
                </div>
            )}
        </div>
    );
});
