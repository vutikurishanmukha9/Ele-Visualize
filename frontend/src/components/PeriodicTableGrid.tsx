import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement } from '../data/elements';
import { cn } from '@/lib/utils';
import { X, ExternalLink } from 'lucide-react';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    categoryColors: Record<string, string>;
}

// Periodic table layout positions
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

// Element popup for details
const ElementPopup = memo(function ElementPopup({
    element,
    color,
    onClose,
    onSelect,
}: {
    element: ChemicalElement;
    color: string;
    onClose: () => void;
    onSelect: () => void;
}) {
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
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: color }}
                    >
                        <span className="text-xs opacity-70">{element.atomicNumber}</span>
                        <span className="text-3xl font-bold">{element.symbol}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Name & Category */}
                <h3 className="text-2xl font-bold text-white mb-1">{element.name}</h3>
                <p className="text-sm capitalize mb-4" style={{ color }}>
                    {element.category.replace('-', ' ')}
                </p>

                {/* Info */}
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-slate-400">Atomic Mass</span>
                        <span className="text-white font-medium">{element.atomicMass.toFixed(4)} u</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-slate-400">Electron Shells</span>
                        <span className="text-white font-medium">{element.shells.join(' - ')}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-400">Total Electrons</span>
                        <span className="text-white font-medium">{element.shells.reduce((a, b) => a + b, 0)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onSelect}
                        className="flex-1 py-3 rounded-xl font-medium transition-all text-white"
                        style={{ backgroundColor: color }}
                    >
                        View 3D Model
                    </button>
                    <a
                        href={`https://en.wikipedia.org/wiki/${element.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <ExternalLink className="w-5 h-5" />
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
});

// Enhanced element cell
const ElementCell = memo(function ElementCell({
    element,
    isSelected,
    color,
    onQuickView,
}: {
    element: ChemicalElement;
    isSelected: boolean;
    color: string;
    onQuickView: () => void;
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.15, zIndex: 20 }}
            whileTap={{ scale: 0.95 }}
            onClick={onQuickView}
            className={cn(
                "w-full aspect-square rounded-lg transition-all duration-150 text-white relative overflow-hidden group",
                isSelected && "ring-2 ring-white ring-offset-2 ring-offset-black"
            )}
            style={{
                backgroundColor: color,
                boxShadow: isSelected
                    ? `0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.4)`
                    : `0 2px 8px rgba(0,0,0,0.3)`,
            }}
        >
            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Content */}
            <div className="h-full flex flex-col items-center justify-center relative z-10">
                <span className="text-[7px] sm:text-[8px] opacity-60 leading-none">{element.atomicNumber}</span>
                <span className="text-[10px] sm:text-sm font-bold leading-tight">{element.symbol}</span>
            </div>
        </motion.button>
    );
});

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement,
    onSelectElement,
    categoryColors,
}: PeriodicTableGridProps) {
    const [quickViewElement, setQuickViewElement] = useState<ChemicalElement | null>(null);

    const grid = useMemo(() => {
        const cells: (ChemicalElement | null)[][] = Array(11).fill(null).map(() => Array(19).fill(null));
        elements.forEach((element) => {
            const pos = LAYOUT[element.atomicNumber];
            if (pos) {
                cells[pos[0]][pos[1]] = element;
            }
        });
        return cells;
    }, []);

    const handleQuickView = (element: ChemicalElement) => {
        setQuickViewElement(element);
    };

    const handleSelect = () => {
        if (quickViewElement) {
            onSelectElement(quickViewElement);
            setQuickViewElement(null);
        }
    };

    return (
        <div className="w-full h-full overflow-x-auto overflow-y-auto p-2 sm:p-4 pt-14 sm:pt-16 bg-gradient-to-b from-slate-950 to-black">
            {/* Title */}
            <h2 className="text-center text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                Periodic Table of Elements
            </h2>

            {/* Scroll hint for mobile */}
            <div className="sm:hidden text-center text-xs text-slate-500 mb-2">
                ← Swipe to explore →
            </div>

            <div className="min-w-[550px] sm:min-w-[750px] mx-auto">
                {/* Main table */}
                <div className="grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(20px, 1fr))' }}>
                    {grid.slice(1, 8).map((row, rowIndex) =>
                        row.slice(1).map((element, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
                                        element={element}
                                        isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                        color={categoryColors[element.category] || '#666'}
                                        onQuickView={() => handleQuickView(element)}
                                    />
                                ) : (
                                    <div className="w-full h-full" />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Gap */}
                <div className="h-3 sm:h-4" />

                {/* Lanthanides */}
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 w-12 sm:w-16">La-Lu</span>
                    <div className="flex-1 grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(20px, 1fr))' }}>
                        {grid[9].slice(3, 18).map((element, i) => (
                            <div key={`la-${i}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
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
                <div className="flex items-center gap-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 w-12 sm:w-16">Ac-Lr</span>
                    <div className="flex-1 grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(20px, 1fr))' }}>
                        {grid[10].slice(3, 18).map((element, i) => (
                            <div key={`ac-${i}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
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
                <div className="mt-4 sm:mt-6 flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                    {Object.entries(categoryColors).slice(0, 10).map(([category, color]) => (
                        <div key={category} className="flex items-center gap-1 text-[10px] sm:text-xs">
                            <div
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-slate-400 capitalize">{category.replace('-', ' ')}</span>
                        </div>
                    ))}
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
