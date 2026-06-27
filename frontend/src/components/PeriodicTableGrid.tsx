import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { elements, ChemicalElement } from '../data/elements';
import { cn } from '@/lib/utils';
import { X, ExternalLink, Atom, Grid3X3, GitCompare, Zap, Wrench } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    onChangeViewMode?: (mode: '3d' | 'grid' | 'compare' | 'reaction' | 'builder') => void;
}

// Periodic table layout positions for desktop
const LAYOUT: Record<number, [number, number]> = {
    1: [1, 1], 2: [1, 18],
    3: [2, 1], 4: [2, 2], 5: [2, 13], 6: [2, 14], 7: [2, 15], 8: [2, 16], 9: [2, 17], 10: [2, 18],
    11: [3, 1], 12: [3, 2], 13: [3, 13], 14: [3, 14], 15: [3, 15], 16: [3, 16], 17: [3, 17], 18: [3, 18],
    19: [4, 1], 20: [4, 2], 21: [4, 3], 22: [4, 4], 23: [4, 5], 24: [4, 6], 25: [4, 7], 26: [4, 8],
    27: [4, 9], 28: [4, 10], 29: [4, 11], 30: [4, 12], 31: [4, 13], 32: [4, 14], 33: [4, 15], 34: [4, 16],
    35: [4, 17], 36: [4, 18],
    37: [5, 1], 38: [5, 2], 39: [5, 3], 40: [5, 4], 41: [5, 5], 42: [5, 6], 43: [5, 7], 44: [5, 8],
    45: [5, 9], 46: [5, 10], 47: [5, 11], 48: [5, 12], 49: [5, 13], 50: [5, 14], 51: [5, 15], 52: [5, 16],
    53: [5, 17], 54: [5, 18],
    55: [6, 1], 56: [6, 2], 57: [9, 3],
    72: [6, 4], 73: [6, 5], 74: [6, 6], 75: [6, 7], 76: [6, 8], 77: [6, 9], 78: [6, 10],
    79: [6, 11], 80: [6, 12], 81: [6, 13], 82: [6, 14], 83: [6, 15], 84: [6, 16], 85: [6, 17], 86: [6, 18],
    87: [7, 1], 88: [7, 2], 89: [10, 3],
    104: [7, 4], 105: [7, 5], 106: [7, 6], 107: [7, 7], 108: [7, 8], 109: [7, 9], 110: [7, 10],
    111: [7, 11], 112: [7, 12], 113: [7, 13], 114: [7, 14], 115: [7, 15], 116: [7, 16], 117: [7, 17], 118: [7, 18],
    58: [9, 4], 59: [9, 5], 60: [9, 6], 61: [9, 7], 62: [9, 8], 63: [9, 9], 64: [9, 10],
    65: [9, 11], 66: [9, 12], 67: [9, 13], 68: [9, 14], 69: [9, 15], 70: [9, 16], 71: [9, 17],
    90: [10, 4], 91: [10, 5], 92: [10, 6], 93: [10, 7], 94: [10, 8], 95: [10, 9], 96: [10, 10],
    97: [10, 11], 98: [10, 12], 99: [10, 13], 100: [10, 14], 101: [10, 15], 102: [10, 16], 103: [10, 17],
};

// Category list for mobile filters
const CATEGORIES = [
    'all',
    'alkali-metal',
    'alkaline-earth',
    'transition-metal',
    'post-transition',
    'metalloid',
    'nonmetal',
    'halogen',
    'noble-gas',
    'lanthanide',
    'actinide',
];

const CATEGORY_LABELS: Record<string, string> = {
    'all': 'All',
    'alkali-metal': 'Alkali',
    'alkaline-earth': 'Alkaline',
    'transition-metal': 'Transition',
    'post-transition': 'Post-Trans',
    'metalloid': 'Metalloid',
    'nonmetal': 'Nonmetal',
    'halogen': 'Halogen',
    'noble-gas': 'Noble',
    'lanthanide': 'Lanthanide',
    'actinide': 'Actinide',
};

// Element popup
const ElementPopup = memo(function ElementPopup({
    element, onClose, onSelect,
}: { element: ChemicalElement; onClose: () => void; onSelect: () => void; }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-ink)', boxShadow: 'var(--shadow-border)' }}>
                        <span className="text-xs opacity-70 font-normal">{element.atomicNumber}</span>
                        <span className="text-3xl">{element.symbol}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{element.name}</h3>
                <p className="text-sm capitalize mb-4 text-slate-400">{element.category.replace('-', ' ')}</p>
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-slate-400">Atomic Mass</span>
                        <span className="text-white font-medium">
                            <AnimatedNumber value={element.atomicMass} format={(v) => v.toFixed(4)} suffix=" u" />
                        </span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-400">Electron Shells</span>
                        <span className="text-white font-medium">{element.shells.join(' - ')}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onSelect} className="flex-1 py-3 rounded-xl font-bold text-black" style={{ backgroundColor: 'var(--color-accent)' }}>View 3D Model</button>
                    <a href={`https://en.wikipedia.org/wiki/${element.name}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl">
                        <ExternalLink className="w-5 h-5" />
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
});

// Mobile element card
const MobileElementCard = memo(function MobileElementCard({
    element, onTap,
}: { element: ChemicalElement; onTap: () => void; }) {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onTap}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
            style={{ backgroundColor: 'var(--color-surface-1)', boxShadow: 'var(--shadow-border)' }}
        >
            <div
                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink)' }}
            >
                <span className="text-[10px] opacity-70">{element.atomicNumber}</span>
                <span className="text-lg">{element.symbol}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{element.name}</div>
                <div className="text-xs text-slate-400 capitalize">{element.category.replace('-', ' ')}</div>
            </div>
            <div className="text-right text-xs text-slate-500">
                {element.atomicMass.toFixed(2)} u
            </div>
        </motion.button>
    );
});

// Desktop element cell
const DesktopElementCell = memo(function DesktopElementCell({
    element, isSelected, onQuickView,
}: { element: ChemicalElement; isSelected: boolean; onQuickView: () => void; }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-20, 20], [15, -15]);
    const rotateY = useTransform(x, [-20, 20], [-15, 15]);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            variants={{
                hidden: { opacity: 0, scale: 0.5 },
                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.1, zIndex: 20 }}
            whileTap={{ scale: 0.95 }}
            onClick={onQuickView}
            className={cn(
                "w-full aspect-square rounded transition-colors relative overflow-hidden",
                isSelected ? "ring-2 ring-primary z-10" : ""
            )}
            style={{ 
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                backgroundColor: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface-1)', 
                color: 'var(--color-ink)',
                boxShadow: 'var(--shadow-border)'
            }}
        >
            <div className="h-full flex flex-col items-center justify-center pointer-events-none" style={{ transform: "translateZ(10px)" }}>
                <span className="text-[8px] opacity-60">{element.atomicNumber}</span>
                <span className="text-xs font-bold">{element.symbol}</span>
            </div>
        </motion.button>
    );
});

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement, onSelectElement, onChangeViewMode,
}: PeriodicTableGridProps) {
    const [quickViewElement, setQuickViewElement] = useState<ChemicalElement | null>(null);
    const [mobileCategory, setMobileCategory] = useState('all');

    const grid = useMemo(() => {
        const cells: (ChemicalElement | null)[][] = Array(11).fill(null).map(() => Array(19).fill(null));
        elements.forEach((element) => {
            const pos = LAYOUT[element.atomicNumber];
            if (pos) cells[pos[0]][pos[1]] = element;
        });
        return cells;
    }, []);

    const filteredElements = useMemo(() => {
        if (mobileCategory === 'all') return elements;
        return elements.filter(el => el.category === mobileCategory);
    }, [mobileCategory]);

    const handleQuickView = (element: ChemicalElement) => setQuickViewElement(element);
    const handleSelect = () => {
        if (quickViewElement) {
            onSelectElement(quickViewElement);
            setQuickViewElement(null);
        }
    };

    return (
        <div className="w-full h-full bg-gradient-to-b from-slate-950 to-black">
            {/* ===== MOBILE VIEW ===== */}
            <div className="sm:hidden h-full flex flex-col pt-14 pb-20">
                {/* Mobile Header with View Mode Tabs */}
                <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Elements</h2>
                    {onChangeViewMode && (
                        <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
                            <button onClick={() => onChangeViewMode('3d')} className="p-1.5 rounded hover:bg-white/10" title="3D View">
                                <Atom className="w-4 h-4 text-slate-400" />
                            </button>
                            <button className="p-1.5 rounded bg-primary text-primary-foreground" title="Grid">
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onChangeViewMode('compare')} className="p-1.5 rounded hover:bg-white/10" title="Compare">
                                <GitCompare className="w-4 h-4 text-slate-400" />
                            </button>
                            <button onClick={() => onChangeViewMode('reaction')} className="p-1.5 rounded hover:bg-white/10" title="Reaction">
                                <Zap className="w-4 h-4 text-slate-400" />
                            </button>
                            <button onClick={() => onChangeViewMode('builder')} className="p-1.5 rounded hover:bg-white/10" title="Builder">
                                <Wrench className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Category Filter Tabs - wrapping to stay within viewport */}
                <div className="flex-shrink-0 px-2 pb-2">
                    <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setMobileCategory(cat)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                    mobileCategory === cat
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                )}
                                style={
                                    mobileCategory === cat && cat !== 'all'
                                        ? { backgroundColor: 'var(--color-surface-2)' }
                                        : undefined
                                }
                            >
                                {CATEGORY_LABELS[cat]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Element count */}
                <div className="px-4 py-2 text-xs text-slate-500 flex-shrink-0">
                    {filteredElements.length} elements
                </div>

                {/* Scrollable Element List */}
                <div className="flex-1 overflow-y-auto px-3">
                    <div className="grid grid-cols-1 gap-2 pb-4">
                        {filteredElements.map(element => (
                            <MobileElementCard
                                key={element.atomicNumber}
                                element={element}
                                onTap={() => handleQuickView(element)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden sm:block h-full overflow-auto p-4">
                <h2 className="text-center text-xl font-bold text-white mb-4">
                    Periodic Table of Elements
                </h2>

                <div className="max-w-5xl mx-auto">
                    {/* Main table */}
                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.015 } } }}
                        className="grid gap-1" 
                        style={{ gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))', perspective: 1000 }}
                    >
                        {grid.slice(1, 8).map((row, rowIndex) =>
                            row.slice(1).map((element, colIndex) => (
                                <div key={`${rowIndex}-${colIndex}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}

                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div className="w-full h-full" />}
                                </div>
                            ))
                        )}
                    </motion.div>

                    {/* Gap */}
                    <div className="h-4" />

                    {/* Lanthanides */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 w-14">La-Lu</span>
                        <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.015, delayChildren: 0.5 } } }}
                            className="flex-1 grid gap-1" 
                            style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))', perspective: 1000 }}
                        >
                            {grid[9].slice(3, 18).map((element, i) => (
                                <div key={`la-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}

                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Actinides */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">Ac-Lr</span>
                        <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.015, delayChildren: 0.8 } } }}
                            className="flex-1 grid gap-1" 
                            style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))', perspective: 1000 }}
                        >
                            {grid[10].slice(3, 18).map((element, i) => (
                                <div key={`ac-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}

                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </motion.div>
                    </div>


                </div>
            </div>

            {/* Quick View Popup */}
            <AnimatePresence>
                {quickViewElement && (
                    <ElementPopup
                        element={quickViewElement}
                        onClose={() => setQuickViewElement(null)}
                        onSelect={handleSelect}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});
