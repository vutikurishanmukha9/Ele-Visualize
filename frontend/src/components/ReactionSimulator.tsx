import { useState, useCallback, useMemo, memo } from 'react';
import { findReaction, getReactiveElements } from '@/data/reactions';
import { elements, getCategoryColor } from '@/data/elements';
import { Zap, X, Activity, Thermometer, Flame } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

interface ReactionSimulatorProps {
    onClose?: () => void;
}

export const ReactionSimulator = memo(function ReactionSimulator({ onClose }: ReactionSimulatorProps) {
    const [selectedElements, setSelectedElements] = useState<string[]>(['H', 'O']);
    const [isReacting, setIsReacting] = useState(false);
    const [reactionTempK, setReactionTempK] = useState(298);

    const reactiveElements = useMemo(() => getReactiveElements(), []);

    const toggleElement = useCallback((symbol: string) => {
        audioEngine.playClick(780);
        setSelectedElements((prev) => {
            if (prev.includes(symbol)) {
                return prev.filter((s) => s !== symbol);
            }
            if (prev.length >= 3) {
                return [...prev.slice(1), symbol];
            }
            return [...prev, symbol];
        });
    }, []);

    const currentReaction = useMemo(() => {
        return findReaction(selectedElements);
    }, [selectedElements]);

    const handleTriggerReaction = () => {
        if (!currentReaction) return;
        setIsReacting(true);
        audioEngine.playBondingChord();
        setTimeout(() => setIsReacting(false), 2400);
    };

    // Calculate Arrhenius relative reaction velocity multiplier
    const rateMultiplier = useMemo(() => {
        const Ea = 45; // kJ/mol approx
        const R = 8.314e-3; // kJ/mol*K
        const k = Math.exp(-Ea / (R * reactionTempK));
        const kRef = Math.exp(-Ea / (R * 298));
        return (k / kRef).toFixed(2);
    }, [reactionTempK]);

    const handleTempChange = (newTemp: number) => {
        setReactionTempK(newTemp);
        audioEngine.updateThermalHum(newTemp);
    };

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-50 font-mono text-slate-900 select-none overflow-y-auto matrix-grid-bg">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase text-amber-700">
                        THERMOCHEMICAL REACTOR & KINETICS SIMULATOR
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Reactant Chamber Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left: Reactant Matrix Selection */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="uppercase font-bold text-slate-900">Select Reactants (1-3)</span>
                        <span>{selectedElements.length} / 3 Active</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        {reactiveElements.map((symbol) => {
                            const isSelected = selectedElements.includes(symbol);
                            const el = elements.find((e) => e.symbol === symbol);
                            const color = el ? getCategoryColor(el.category) : '#0284c7';

                            return (
                                <button
                                    key={symbol}
                                    onClick={() => toggleElement(symbol)}
                                    className={`p-2 rounded-lg flex flex-col items-center justify-center border transition-all ${
                                        isSelected
                                            ? 'bg-amber-100 border-amber-500 shadow-sm scale-105'
                                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                    }`}
                                >
                                    <span className="text-xs font-extrabold" style={{ color: isSelected ? '#b45309' : color }}>
                                        {symbol}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-mono">
                                        {el?.atomicNumber ?? ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Temperature Controller */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1 text-slate-600">
                                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                                Thermal Energy (T):
                            </span>
                            <span className="font-bold text-amber-700">
                                {reactionTempK} K ({(reactionTempK - 273.15).toFixed(0)}°C)
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="3000"
                            step="25"
                            value={reactionTempK}
                            onChange={(e) => handleTempChange(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>100 K (Cryo)</span>
                            <span>298 K (STP)</span>
                            <span>3000 K (Plasma)</span>
                        </div>
                    </div>
                </div>

                {/* Center & Right: Reaction Kinetics Diagram & Synthesis Chamber */}
                <div className="lg:col-span-2 p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-sm">
                    {currentReaction ? (
                        <div className="space-y-3">
                            {/* Equation Banner */}
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-center space-y-1">
                                <span className="text-[10px] text-amber-700 uppercase font-bold tracking-widest">
                                    {currentReaction.type}
                                </span>
                                <div className="text-lg font-black text-slate-900 tracking-wide">
                                    {currentReaction.equation}
                                </div>
                            </div>

                            {/* Arrhenius Energy Profile Diagram */}
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase">
                                    <span>Arrhenius Activation Barrier (Ea)</span>
                                    <span className="text-amber-700 font-bold">
                                        Rate Mult: {rateMultiplier}x @ {reactionTempK}K
                                    </span>
                                </div>

                                {/* Animated Energy Curve */}
                                <svg viewBox="0 0 400 120" className="w-full h-28 overflow-visible">
                                    <line x1="20" y1="100" x2="380" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                                    <line x1="20" y1="20" x2="20" y2="100" stroke="#cbd5e1" strokeWidth="1" />

                                    {/* Energy curve path */}
                                    <path
                                        d="M 30 80 C 120 80, 160 25, 200 25 C 240 25, 280 95, 370 95"
                                        fill="none"
                                        stroke="#d97706"
                                        strokeWidth="3"
                                    />

                                    {/* Transition peak marker */}
                                    <circle cx="200" cy="25" r="4" fill="#f59e0b" className="animate-ping" />
                                    <text x="200" y="15" textAnchor="middle" fill="#b45309" fontSize="9" fontWeight="bold">
                                        Transition State (‡)
                                    </text>

                                    <text x="40" y="72" fill="#0284c7" fontSize="9" fontWeight="bold">Reactants</text>
                                    <text x="350" y="90" fill="#059669" fontSize="9" fontWeight="bold">Products</text>
                                </svg>
                            </div>

                            {/* Action Trigger Button */}
                            <button
                                onClick={handleTriggerReaction}
                                disabled={isReacting}
                                className={`w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md ${
                                    isReacting
                                        ? 'bg-amber-600 text-white animate-pulse'
                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                }`}
                            >
                                <Flame className={`w-4 h-4 ${isReacting ? 'animate-bounce' : ''}`} />
                                {isReacting ? 'Simulating High-Enthalpy Reaction...' : 'Initiate Thermochemical Reaction'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                            <Activity className="w-8 h-8 text-slate-300 animate-pulse" />
                            <p className="text-xs text-slate-600">No known thermochemical reaction between selected reactants.</p>
                            <p className="text-[10px] text-slate-400">Try combining Hydrogen (H) + Oxygen (O) or Sodium (Na) + Chlorine (Cl).</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
