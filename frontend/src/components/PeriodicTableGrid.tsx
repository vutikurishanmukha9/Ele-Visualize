import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement } from '../data/elements';
import { cn } from '@/lib/utils';
import { X, ExternalLink, Atom, Grid3X3, GitCompare, Zap, Wrench } from 'lucide-react';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    categoryColors: Record<string, string>;
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
    element, color, onClose, onSelect,
}: { element: ChemicalElement; color: string; onClose: () => void; onSelect: () => void; }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg" style={{ backgroundColor: color }}>
                        <span className="text-xs opacity-70">{element.atomicNumber}</span>
                        <span className="text-3xl font-bold">{element.symbol}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{element.name}</h3>
                <p className="text-sm capitalize mb-4" style={{ color }}>{element.category.replace('-', ' ')}</p>
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-slate-400">Atomic Mass</span>
                        <span className="text-white font-medium">{element.atomicMass.toFixed(4)} u</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-400">Electron Shells</span>
                        <span className="text-white font-medium">{element.shells.join(' - ')}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onSelect} className="flex-1 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: color }}>View 3D Model</button>
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
    element, color, onTap,
}: { element: ChemicalElement; color: string; onTap: () => void; }) {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onTap}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
            style={{ backgroundColor: `${color}20`, borderLeft: `4px solid ${color}` }}
        >
            <div
                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: color }}
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
    element, isSelected, color, onQuickView,
}: { element: ChemicalElement; isSelected: boolean; color: string; onQuickView: () => void; }) {
    return (
        <motion.button
            whileHover={{ scale: 1.1, zIndex: 20 }}
            whileTap={{ scale: 0.95 }}
            onClick={onQuickView}
            className={cn(
                "w-full aspect-square rounded transition-all text-white relative overflow-hidden",
                isSelected && "ring-2 ring-white"
            )}
            style={{ backgroundColor: color, boxShadow: isSelected ? `0 0 15px ${color}` : undefined }}
        >
            <div className="h-full flex flex-col items-center justify-center">
                <span className="text-[8px] opacity-60">{element.atomicNumber}</span>
                <span className="text-xs font-bold">{element.symbol}</span>
            </div>
        </motion.button>
    );
});

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement, onSelectElement, categoryColors, onChangeViewMode,
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
                                        ? { backgroundColor: categoryColors[cat] || undefined }
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
                                color={categoryColors[element.category] || '#666'}
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
                    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))' }}>
                        {grid.slice(1, 8).map((row, rowIndex) =>
                            row.slice(1).map((element, colIndex) => (
                                <div key={`${rowIndex}-${colIndex}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            color={categoryColors[element.category] || '#666'}
                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div className="w-full h-full" />}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Gap */}
                    <div className="h-4" />

                    {/* Lanthanides */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 w-14">La-Lu</span>
                        <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))' }}>
                            {grid[9].slice(3, 18).map((element, i) => (
                                <div key={`la-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            color={categoryColors[element.category] || '#666'}
                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actinides */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">Ac-Lr</span>
                        <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))' }}>
                            {grid[10].slice(3, 18).map((element, i) => (
                                <div key={`ac-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            color={categoryColors[element.category] || '#666'}
                                            onQuickView={() => handleQuickView(element)}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        {Object.entries(categoryColors).slice(0, 10).map(([category, color]) => (
                            <div key={category} className="flex items-center gap-1.5 text-xs">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                                <span className="text-slate-400 capitalize">{category.replace('-', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick View Popup */}
            <AnimatePresence>
                {quickViewElement && (
                    <ElementPopup
                        element={quickViewElement}
                        color={categoryColors[quickViewElement.category] || '#666'}
                        onClose={() => setQuickViewElement(null)}
                        onSelect={handleSelect}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});
