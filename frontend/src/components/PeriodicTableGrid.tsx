import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, categoryColors, getElementBlock, ElementBlock } from '../data/elements';
import { elementProperties, getElementStateAtTemp } from '../data/elementProperties';
import { cn } from '@/lib/utils';
import { X, ExternalLink, Atom, Grid3X3, GitCompare, Zap, Wrench, Thermometer, Sparkles, Sliders } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    onChangeViewMode?: (mode: '3d' | 'grid' | 'compare' | 'reaction' | 'builder') => void;
}

// Periodic table layout positions for desktop (Row, Column)
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

const STATE_ICONS: Record<string, string> = {
    solid: '🧊 Solid',
    liquid: '💧 Liquid',
    gas: '💨 Gas',
    unknown: '❓ Unknown',
};

// Rich Element Popup Modal
const ElementPopup = memo(function ElementPopup({
    element, onClose, onSelect, currentTemp
}: { element: ChemicalElement; onClose: () => void; onSelect: () => void; currentTemp: number; }) {
    const color = categoryColors[element.category] || '#38bdf8';
    const props = elementProperties[element.atomicNumber];
    const stateAtTemp = getElementStateAtTemp(element.atomicNumber, currentTemp);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-950 border rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
                style={{ borderColor: `${color}55`, boxShadow: `0 0 35px ${color}22` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold relative overflow-hidden"
                        style={{
                            backgroundColor: `${color}20`,
                            border: `2px solid ${color}`,
                            color: '#ffffff',
                            boxShadow: `0 0 20px ${color}33`
                        }}
                    >
                        <span className="text-[10px] opacity-75 font-mono absolute top-1.5 left-2">{element.atomicNumber}</span>
                        <span className="text-3xl font-extrabold tracking-tight" style={{ color: color }}>{element.symbol}</span>
                        <span className="text-[9px] opacity-75 font-mono absolute bottom-1.5">{element.atomicMass.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                            style={{ backgroundColor: `${color}25`, color: color, border: `1px solid ${color}44` }}
                        >
                            {categoryLabels[element.category]}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    {element.name}
                    <span className="text-xs font-mono text-muted-foreground">Block-{getElementBlock(element.atomicNumber).toUpperCase()}</span>
                </h3>

                <div className="flex items-center gap-2 mb-4 text-xs">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {STATE_ICONS[stateAtTemp] || 'Solid'} at {currentTemp} K
                    </span>
                    {props?.discoveryYear && (
                        <span className="text-muted-foreground">Discovered: {props.discoveryYear}</span>
                    )}
                </div>

                <div className="space-y-2 text-sm mb-6 bg-slate-900/80 p-3.5 rounded-xl border border-white/5 font-mono">
                    <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Atomic Mass</span>
                        <span className="text-white font-semibold">
                            <AnimatedNumber value={element.atomicMass} format={(v) => v.toFixed(4)} suffix=" u" />
                        </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Electron Shells</span>
                        <span className="text-primary font-semibold">{element.shells.join(' • ')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Melting Point</span>
                        <span className="text-white">{props?.meltingPoint ? `${props.meltingPoint} K (${props.meltingPoint - 273} °C)` : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                        <span className="text-slate-400">Boiling Point</span>
                        <span className="text-white">{props?.boilingPoint ? `${props.boilingPoint} K (${props.boilingPoint - 273} °C)` : 'Unknown'}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onSelect}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg"
                        style={{ backgroundColor: color }}
                    >
                        <Atom className="w-4 h-4" />
                        Explore 3D Atomic Model
                    </button>
                    <a
                        href={`https://en.wikipedia.org/wiki/${element.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 hover:text-white transition-colors"
                        title="Wikipedia Page"
                    >
                        <ExternalLink className="w-5 h-5" />
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
});

// Mobile Element Card
const MobileElementCard = memo(function MobileElementCard({
    element, onTap, currentTemp
}: { element: ChemicalElement; onTap: () => void; currentTemp: number; }) {
    const color = categoryColors[element.category] || '#38bdf8';
    const stateAtTemp = getElementStateAtTemp(element.atomicNumber, currentTemp);

    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onTap}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all border border-white/5 hover:border-white/20"
            style={{ backgroundColor: `${color}10` }}
        >
            <div
                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold flex-shrink-0"
                style={{
                    backgroundColor: `${color}25`,
                    color: color,
                    border: `1.5px solid ${color}66`
                }}
            >
                <span className="text-[10px] opacity-75 font-mono">{element.atomicNumber}</span>
                <span className="text-lg font-bold leading-tight">{element.symbol}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate flex items-center gap-2">
                    {element.name}
                    <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                        {stateAtTemp}
                    </span>
                </div>
                <div className="text-xs capitalize truncate" style={{ color: color }}>
                    {categoryLabels[element.category]}
                </div>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
                {element.atomicMass.toFixed(2)} u
            </div>
        </motion.button>
    );
});

// Desktop Element Cell with 3D Hover & Scientific Category Hue
const DesktopElementCell = memo(function DesktopElementCell({
    element, isSelected, isDimmed, onQuickView, currentTemp
}: {
    element: ChemicalElement;
    isSelected: boolean;
    isDimmed: boolean;
    onQuickView: () => void;
    currentTemp: number;
}) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-15, 15], [12, -12]);
    const rotateY = useTransform(x, [-15, 15], [-12, 12]);

    const color = categoryColors[element.category] || '#38bdf8';
    const stateAtTemp = getElementStateAtTemp(element.atomicNumber, currentTemp);

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
                hidden: { opacity: 0, scale: 0.6 },
                visible: { opacity: isDimmed ? 0.25 : 1, scale: 1, transition: { type: "spring", stiffness: 350, damping: 22 } }
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.18, zIndex: 30 }}
            whileTap={{ scale: 0.95 }}
            onClick={onQuickView}
            className={cn(
                "w-full aspect-square rounded-md transition-all relative overflow-hidden flex flex-col items-center justify-between p-1 select-none border",
                isSelected ? "ring-2 ring-white shadow-glow" : ""
            )}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                backgroundColor: `${color}18`,
                borderColor: isSelected ? '#ffffff' : `${color}45`,
                boxShadow: isSelected ? `0 0 16px ${color}` : `0 2px 6px rgba(0,0,0,0.4)`
            }}
            title={`${element.name} (${element.symbol}) - #${element.atomicNumber} - ${categoryLabels[element.category]} - ${stateAtTemp}`}
        >
            {/* Top row: Number & State dot */}
            <div className="w-full flex items-center justify-between text-[8px] font-mono leading-none pointer-events-none opacity-80">
                <span className="text-slate-300">{element.atomicNumber}</span>
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    stateAtTemp === 'gas' ? "bg-purple-400 animate-pulse" :
                    stateAtTemp === 'liquid' ? "bg-blue-400" : "bg-emerald-400"
                )} title={`State at ${currentTemp}K: ${stateAtTemp}`} />
            </div>

            {/* Center Symbol */}
            <div
                className="text-xs sm:text-sm font-extrabold tracking-tight leading-none pointer-events-none"
                style={{ color: color, textShadow: `0 0 8px ${color}88` }}
            >
                {element.symbol}
            </div>

            {/* Bottom row: Atomic mass */}
            <div className="w-full text-center text-[7px] font-mono text-slate-400 truncate pointer-events-none leading-none">
                {element.atomicMass < 100 ? element.atomicMass.toFixed(1) : Math.round(element.atomicMass)}
            </div>
        </motion.button>
    );
});

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement, onSelectElement, onChangeViewMode,
}: PeriodicTableGridProps) {
    const [quickViewElement, setQuickViewElement] = useState<ChemicalElement | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeBlock, setActiveBlock] = useState<ElementBlock | 'all'>('all');
    const [currentTemp, setCurrentTemp] = useState<number>(298); // Room temp default: 298 K (25 °C)
    const [tempUnit, setTempUnit] = useState<'K' | 'C'>('K');

    const grid = useMemo(() => {
        const cells: (ChemicalElement | null)[][] = Array(11).fill(null).map(() => Array(19).fill(null));
        elements.forEach((element) => {
            const pos = LAYOUT[element.atomicNumber];
            if (pos) cells[pos[0]][pos[1]] = element;
        });
        return cells;
    }, []);

    const isElementDimmed = (element: ChemicalElement) => {
        const matchesCategory = activeCategory === 'all' || element.category === activeCategory;
        const matchesBlock = activeBlock === 'all' || getElementBlock(element.atomicNumber) === activeBlock;
        return !matchesCategory || !matchesBlock;
    };

    const filteredElements = useMemo(() => {
        return elements.filter(el => {
            const matchesCat = activeCategory === 'all' || el.category === activeCategory;
            const matchesBlk = activeBlock === 'all' || getElementBlock(el.atomicNumber) === activeBlock;
            return matchesCat && matchesBlk;
        });
    }, [activeCategory, activeBlock]);

    const handleQuickView = (element: ChemicalElement) => setQuickViewElement(element);
    const handleSelect = () => {
        if (quickViewElement) {
            onSelectElement(quickViewElement);
            setQuickViewElement(null);
        }
    };

    const tempDisplay = tempUnit === 'K' ? `${currentTemp} K` : `${currentTemp - 273} °C`;

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-950 via-black to-slate-950 overflow-hidden">
            {/* Top Interactive Controls Toolbar */}
            <div className="flex-none p-3 sm:px-6 sm:py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-20">
                {/* Category & Block Filters */}
                <div className="flex items-center flex-wrap gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Filter:
                    </span>
                    <button
                        onClick={() => { setActiveCategory('all'); setActiveBlock('all'); }}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                            activeCategory === 'all' && activeBlock === 'all'
                                ? "bg-white text-black font-semibold shadow-md"
                                : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                        )}
                    >
                        All (118)
                    </button>

                    {/* Block filters */}
                    {(['s', 'p', 'd', 'f'] as ElementBlock[]).map((block) => (
                        <button
                            key={block}
                            onClick={() => { setActiveBlock(activeBlock === block ? 'all' : block); }}
                            className={cn(
                                "px-2 py-0.5 rounded text-xs font-mono transition-all",
                                activeBlock === block
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                            )}
                        >
                            {block}-block
                        </button>
                    ))}
                </div>

                {/* Temperature Simulator Slider (0 K to 6000 K) */}
                <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        <span className="font-mono font-bold text-white min-w-[70px]">{tempDisplay}</span>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="6000"
                        step="10"
                        value={currentTemp}
                        onChange={(e) => setCurrentTemp(Number(e.target.value))}
                        className="w-24 sm:w-36 accent-primary cursor-pointer"
                        title="Simulate Temperature"
                    />

                    {/* Quick Temp Presets */}
                    <div className="hidden lg:flex items-center gap-1 text-[10px]">
                        <button onClick={() => setCurrentTemp(0)} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300">0K</button>
                        <button onClick={() => setCurrentTemp(273)} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300">0°C</button>
                        <button onClick={() => setCurrentTemp(298)} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300">25°C</button>
                        <button onClick={() => setCurrentTemp(373)} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300">100°C</button>
                        <button onClick={() => setCurrentTemp(5778)} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-orange-400 font-bold">Sun</button>
                    </div>

                    <button
                        onClick={() => setTempUnit(tempUnit === 'K' ? 'C' : 'K')}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white hover:bg-white/20"
                    >
                        °{tempUnit}
                    </button>
                </div>
            </div>

            {/* Category Quick Tags Strip */}
            <div className="flex-none px-4 py-2 border-b border-white/5 bg-slate-950/40 overflow-x-auto hide-scrollbar flex items-center gap-1.5">
                {CATEGORIES.slice(1).map((cat) => {
                    const color = categoryColors[cat as keyof typeof categoryColors];
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all border",
                                isActive ? "bg-white/15 font-semibold text-white" : "text-slate-400 hover:text-white bg-slate-900/60 border-white/5"
                            )}
                            style={{ borderColor: isActive ? color : undefined }}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {categoryLabels[cat as keyof typeof categoryLabels]}
                        </button>
                    );
                })}
            </div>

            {/* ===== MOBILE VIEW ===== */}
            <div className="sm:hidden flex-1 overflow-y-auto p-3 space-y-2">
                <div className="text-xs text-muted-foreground px-1 pb-1">
                    Showing {filteredElements.length} elements (Tap for 3D model & details):
                </div>
                {filteredElements.map((element) => (
                    <MobileElementCard
                        key={element.atomicNumber}
                        element={element}
                        onTap={() => handleQuickView(element)}
                        currentTemp={currentTemp}
                    />
                ))}
            </div>

            {/* ===== DESKTOP 18-COLUMN GRID VIEW ===== */}
            <div className="hidden sm:flex flex-1 overflow-auto p-4 items-center justify-center">
                <div className="w-full max-w-5xl mx-auto">
                    {/* Periods 1 to 7 Main Grid */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.008 } } }}
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: 'repeat(18, minmax(28px, 1fr))', perspective: 1200 }}
                    >
                        {grid.slice(1, 8).map((row, rowIndex) =>
                            row.slice(1).map((element, colIndex) => (
                                <div key={`main-${rowIndex}-${colIndex}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            isDimmed={isElementDimmed(element)}
                                            onQuickView={() => handleQuickView(element)}
                                            currentTemp={currentTemp}
                                        />
                                    ) : (
                                        <div className="w-full h-full pointer-events-none" />
                                    )}
                                </div>
                            ))
                        )}
                    </motion.div>

                    {/* Gap between Main Grid and f-block */}
                    <div className="h-3 sm:h-4" />

                    {/* Lanthanides Series */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-indigo-400 w-12 text-right">57-71 La</span>
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.008, delayChildren: 0.2 } } }}
                            className="flex-1 grid gap-1.5"
                            style={{ gridTemplateColumns: 'repeat(15, minmax(28px, 1fr))', perspective: 1200 }}
                        >
                            {grid[9].slice(3, 18).map((element, i) => (
                                <div key={`lanthanide-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            isDimmed={isElementDimmed(element)}
                                            onQuickView={() => handleQuickView(element)}
                                            currentTemp={currentTemp}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Actinides Series */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-rose-400 w-12 text-right">89-103 Ac</span>
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.008, delayChildren: 0.3 } } }}
                            className="flex-1 grid gap-1.5"
                            style={{ gridTemplateColumns: 'repeat(15, minmax(28px, 1fr))', perspective: 1200 }}
                        >
                            {grid[10].slice(3, 18).map((element, i) => (
                                <div key={`actinide-${i}`} className="aspect-square">
                                    {element ? (
                                        <DesktopElementCell
                                            element={element}
                                            isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                            isDimmed={isElementDimmed(element)}
                                            onQuickView={() => handleQuickView(element)}
                                            currentTemp={currentTemp}
                                        />
                                    ) : <div />}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Quick View Popup Modal */}
            <AnimatePresence>
                {quickViewElement && (
                    <ElementPopup
                        element={quickViewElement}
                        onClose={() => setQuickViewElement(null)}
                        onSelect={handleSelect}
                        currentTemp={currentTemp}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});
