import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reactions, Reaction, findReaction, getReactiveElements } from '@/data/reactions';
import { elements } from '@/data/elements';
import { cn } from '@/lib/utils';
import { Zap, Flame, Snowflake, Sparkles, Play, RotateCcw, X } from 'lucide-react';

interface ReactionSimulatorProps {
    onClose?: () => void;
}

// Element button for selection
const ElementButton = memo(function ElementButton({
    symbol,
    isSelected,
    onClick,
    color,
}: {
    symbol: string;
    isSelected: boolean;
    onClick: () => void;
    color: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-base sm:text-lg transition-all",
                isSelected
                    ? "ring-2 ring-white scale-110 shadow-lg"
                    : "hover:scale-105"
            )}
            style={{
                backgroundColor: isSelected ? color : `${color}66`,
                boxShadow: isSelected ? `0 0 20px ${color}` : 'none'
            }}
        >
            {symbol}
        </button>
    );
});

// Reaction animation overlay
const ReactionAnimation = memo(function ReactionAnimation({
    reaction,
    onComplete,
}: {
    reaction: Reaction;
    onComplete: () => void;
}) {
    const particles = useMemo(() =>
        Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 0.5,
            size: 4 + Math.random() * 8,
        })), []
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            onAnimationComplete={() => setTimeout(onComplete, 2000)}
        >
            {/* Background flash */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
                style={{ backgroundColor: reaction.color }}
            />

            {/* Particles */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0,
                        opacity: 1
                    }}
                    animate={{
                        x: `${p.x}%`,
                        y: `${p.y}%`,
                        scale: [0, 1.5, 0],
                        opacity: [1, 1, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        delay: p.delay,
                        ease: 'easeOut'
                    }}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: reaction.color,
                        boxShadow: `0 0 ${p.size * 2}px ${reaction.color}`
                    }}
                />
            ))}

            {/* Central icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 1 }}
                className="relative z-10"
            >
                {reaction.animation === 'explosion' && (
                    <Flame className="w-24 h-24" style={{ color: reaction.color }} />
                )}
                {reaction.animation === 'glow' && (
                    <Sparkles className="w-24 h-24" style={{ color: reaction.color }} />
                )}
                {reaction.animation === 'freeze' && (
                    <Snowflake className="w-24 h-24 text-cyan-400" />
                )}
                {reaction.animation === 'spark' && (
                    <Zap className="w-24 h-24" style={{ color: reaction.color }} />
                )}
                {reaction.animation === 'bubble' && (
                    <div className="w-24 h-24 rounded-full border-4 border-cyan-400 animate-pulse" />
                )}
            </motion.div>

            {/* Equation display */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-20 text-center"
            >
                <div className="text-3xl font-bold text-white mb-2" style={{ textShadow: `0 0 20px ${reaction.color}` }}>
                    {reaction.equation}
                </div>
                <div className="text-lg text-white/80">{reaction.name}</div>
                <div className={cn(
                    "text-sm mt-2 px-3 py-1 rounded-full inline-block",
                    reaction.type === 'exothermic' ? "bg-red-500/30 text-red-300" : "bg-blue-500/30 text-blue-300"
                )}>
                    {reaction.type === 'exothermic' ? '🔥 Exothermic' : '❄️ Endothermic'} ({reaction.energyChange} kJ/mol)
                </div>
            </motion.div>
        </motion.div>
    );
});

export const ReactionSimulator = memo(function ReactionSimulator({ onClose }: ReactionSimulatorProps) {
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [activeReaction, setActiveReaction] = useState<Reaction | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);

    // Get reactive elements with colors
    const reactiveElements = useMemo(() => {
        const symbols = getReactiveElements();
        return symbols.map(symbol => {
            const el = elements.find(e => e.symbol === symbol);
            return { symbol, color: el ? getCategoryColor(el.category) : '#666' };
        });
    }, []);

    const toggleElement = useCallback((symbol: string) => {
        setSelectedElements(prev => {
            const newSelection = prev.includes(symbol)
                ? prev.filter(s => s !== symbol)
                : [...prev, symbol];

            // Auto-check for reaction
            if (newSelection.length >= 2) {
                const reaction = findReaction(newSelection);
                setActiveReaction(reaction);
            } else {
                setActiveReaction(null);
            }
            return newSelection;
        });
        setShowAnimation(false);
    }, []);

    const checkReaction = useCallback(() => {
        const reaction = findReaction(selectedElements);
        setActiveReaction(reaction);
        if (reaction) {
            setShowAnimation(true);
        }
    }, [selectedElements]);

    const reset = useCallback(() => {
        setSelectedElements([]);
        setActiveReaction(null);
        setShowAnimation(false);
    }, []);

    return (
        <div className="h-full flex flex-col p-2 sm:p-4 pt-14 sm:pt-4 relative overflow-hidden overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    Reaction Simulator
                </h2>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Element Selection */}
            <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">Select elements to react:</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {reactiveElements.map(({ symbol, color }) => (
                        <ElementButton
                            key={symbol}
                            symbol={symbol}
                            isSelected={selectedElements.includes(symbol)}
                            onClick={() => toggleElement(symbol)}
                            color={color}
                        />
                    ))}
                </div>
            </div>

            {/* Selected Elements Display */}
            {selectedElements.length > 0 && (
                <div className="mb-4 p-3 bg-black/40 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Selected:</div>
                    <div className="flex items-center gap-2 text-xl font-bold">
                        {selectedElements.map((el, i) => (
                            <span key={el}>
                                {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
                                <span className="text-primary">{el}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={checkReaction}
                    disabled={selectedElements.length < 2}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                        selectedElements.length >= 2
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                    )}
                >
                    <Play className="w-5 h-5" />
                    React!
                </button>
                <button
                    onClick={reset}
                    className="px-4 py-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>

            {/* Reaction Result */}
            {activeReaction && !showAnimation && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                >
                    <div className="text-4xl mb-4" style={{ color: activeReaction.color }}>
                        {activeReaction.equation}
                    </div>
                    <div className="text-xl font-semibold mb-2">{activeReaction.name}</div>
                    <p className="text-muted-foreground max-w-md">{activeReaction.description}</p>
                    <div className={cn(
                        "mt-4 px-4 py-2 rounded-full",
                        activeReaction.type === 'exothermic' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                    )}>
                        {activeReaction.type === 'exothermic' ? 'Exothermic' : 'Endothermic'}: {activeReaction.energyChange} kJ/mol
                    </div>
                </motion.div>
            )}

            {/* No Reaction Found */}
            {selectedElements.length >= 2 && !activeReaction && !showAnimation && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <div className="text-4xl mb-4 opacity-30">❌</div>
                    <p>No known reaction between these elements</p>
                    <p className="text-sm mt-2">Try different combinations!</p>
                </div>
            )}

            {/* Animation Overlay */}
            <AnimatePresence>
                {showAnimation && activeReaction && (
                    <ReactionAnimation
                        reaction={activeReaction}
                        onComplete={() => setShowAnimation(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

// Helper to get category color
function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        'alkali-metal': '#FF3366',
        'alkaline-earth': '#FF9933',
        'transition-metal': '#FFCC33',
        'post-transition': '#33CC99',
        'metalloid': '#33CCCC',
        'nonmetal': '#3399FF',
        'halogen': '#9933FF',
        'noble-gas': '#CC33FF',
        'lanthanide': '#FF66CC',
        'actinide': '#FF3333',
    };
    return colors[category] || '#666666';
}
