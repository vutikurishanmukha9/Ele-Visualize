import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reactions, Reaction, findReaction, getReactiveElements } from '@/data/reactions';
import { elements, getCategoryColor } from '@/data/elements';
import { cn } from '@/lib/utils';
import { Zap, Flame, Snowflake, Sparkles, Play, RotateCcw, X, Activity, Thermometer } from 'lucide-react';

interface ReactionSimulatorProps {
    onClose?: () => void;
}

export const ReactionSimulator = memo(function ReactionSimulator({ onClose }: ReactionSimulatorProps) {
    const [selectedElements, setSelectedElements] = useState<string[]>(['H', 'O']);
    const [isReacting, setIsReacting] = useState(false);
    const [reactionTempK, setReactionTempK] = useState(298);

    const reactiveElements = useMemo(() => getReactiveElements(), []);

    const toggleElement = useCallback((symbol: string) => {
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

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-950 font-mono text-white select-none overflow-y-auto matrix-grid-bg">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/80 border border-white/10">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase text-amber-300">
                        THERMOCHEMICAL REACTOR & KINETICS SIMULATOR
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Reactant Chamber Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left: Reactant Matrix Selection */}
                <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="uppercase font-bold text-white">Select Reactant Elements (1-3)</span>
                        <span>{selectedElements.length} / 3 Active</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-900/60 rounded border border-white/5">
                        {reactiveElements.map((symbol) => {
                            const isSelected = selectedElements.includes(symbol);
                            const el = elements.find((e) => e.symbol === symbol);
                            const color = el ? getCategoryColor(el.category) : '#38bdf8';

                            return (
                                <button
                                    key={symbol}
                                    onClick={() => toggleElement(symbol)}
                                    className={`p-2 rounded flex flex-col items-center justify-center border transition-all ${
                                        isSelected
                                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(255,183,0,0.3)] scale-105'
                                            : 'bg-white/5 border-white/10 hover:border-white/30 text-slate-300'
                                    }`}
                                >
                                    <span className="text-xs font-extrabold" style={{ color: isSelected ? '#ffb700' : color }}>
                                        {symbol}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-mono">
                                        {el?.atomicNumber ?? ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Temperature Scrubber */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1">
                                <Thermometer className="w-3 h-3 text-amber-400" /> Chamber Temp:
                            </span>
                            <span className="font-bold text-amber-300">{reactionTempK} K ({reactionTempK - 273}°C)</span>
                        </div>
                        <input
                            type="range"
                            min="200"
                            max="1500"
                            step="25"
                            value={reactionTempK}
                            onChange={(e) => setReactionTempK(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                            <span>200 K (Cryo)</span>
                            <span>Rate Multiplier: {rateMultiplier}x</span>
                            <span>1500 K (Plasma)</span>
                        </div>
                    </div>
                </div>

                {/* Center / Right: Reaction Chamber & Thermodynamic Profile */}
                <div className="lg:col-span-2 p-4 rounded-xl bg-black/85 border border-white/10 flex flex-col justify-between relative overflow-hidden chamfer-tl-br">
                    {/* Energy Shockwave Animation Overlay */}
                    {isReacting && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.3, 1.6] }}
                            transition={{ duration: 2.2, ease: 'easeOut' }}
                            className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/30 to-purple-500/20 pointer-events-none z-30 flex items-center justify-center"
                        >
                            <div className="text-center font-bold text-amber-300 tracking-widest text-lg drop-shadow-[0_0_20px_#ffaa00]">
                                ⚡ REACTION SYNTHESIS ACTIVE ⚡
                            </div>
                        </motion.div>
                    )}

                    {/* Stoichiometric Chemical Equation Display */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            STOICHIOMETRIC REACTION MATRIX
                        </div>

                        {currentReaction ? (
                            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                                <div className="text-xl font-extrabold text-white text-center tracking-wide">
                                    {currentReaction.equation}
                                </div>
                                <div className="flex items-center justify-center gap-3 text-xs">
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                        Type: {currentReaction.type}
                                    </span>
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 rounded font-bold',
                                            currentReaction.energyType === 'exothermic'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                        )}
                                    >
                                        {currentReaction.energyType === 'exothermic' ? '🔥 Exothermic (ΔH < 0)' : '❄️ Endothermic (ΔH > 0)'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 text-center italic">
                                    {currentReaction.description}
                                </p>
                            </div>
                        ) : (
                            <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-white/10 text-center text-xs text-slate-500">
                                No direct spontaneous reaction found for [{selectedElements.join(', ')}].
                                Try adding complementary reactants (e.g. H + O, Na + Cl, C + O, N + H).
                            </div>
                        )}
                    </div>

                    {/* Thermodynamic Energy Curve Profile SVG */}
                    {currentReaction && (
                        <div className="my-3 p-3 rounded-lg bg-black/60 border border-white/5">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span className="flex items-center gap-1 font-bold">
                                    <Activity className="w-3 h-3 text-amber-400" /> Reaction Coordinate Energy Profile
                                </span>
                                <span className="text-amber-300">E_activation ~ {45 * Number(rateMultiplier) > 200 ? '200+' : 45} kJ/mol</span>
                            </div>

                            <svg className="w-full h-24 stroke-current" viewBox="0 0 300 80">
                                <line x1="20" y1="70" x2="280" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                                <line x1="20" y1="10" x2="20" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                                {/* Potential Energy Curve Path */}
                                {currentReaction.energyType === 'exothermic' ? (
                                    <path
                                        d="M 30 45 Q 120 -15, 150 15 T 270 60"
                                        fill="none"
                                        stroke="#ffb700"
                                        strokeWidth="2.5"
                                        className="drop-shadow-[0_0_8px_#ffb700]"
                                    />
                                ) : (
                                    <path
                                        d="M 30 60 Q 120 5, 150 10 T 270 30"
                                        fill="none"
                                        stroke="#00f5ff"
                                        strokeWidth="2.5"
                                        className="drop-shadow-[0_0_8px_#00f5ff]"
                                    />
                                )}

                                <text x="35" y="40" fill="#9da5b4" fontSize="8" fontFamily="monospace">Reactants</text>
                                <text x="135" y="12" fill="#ff3355" fontSize="8" fontFamily="monospace" fontWeight="bold">Transition State</text>
                                <text x="235" y="55" fill="#00ff88" fontSize="8" fontFamily="monospace">Products</text>
                            </svg>
                        </div>
                    )}

                    {/* Action Trigger Button */}
                    <div className="flex gap-2">
                        <button
                            disabled={!currentReaction || isReacting}
                            onClick={handleTriggerReaction}
                            className={cn(
                                'flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2',
                                currentReaction && !isReacting
                                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(255,183,0,0.4)] cursor-pointer'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            )}
                        >
                            <Play className="w-4 h-4 fill-current" />
                            {isReacting ? 'REACTOR CYCLING...' : 'INITIATE REACTION'}
                        </button>

                        <button
                            onClick={() => setSelectedElements(['H', 'O'])}
                            className="px-3 py-2.5 rounded-xl font-mono text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Reset to default reactants"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
