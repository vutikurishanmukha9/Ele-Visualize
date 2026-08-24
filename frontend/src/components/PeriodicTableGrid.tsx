import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, categoryColors, getElementBlock } from '../data/elements';
import { elementProperties, getElementStateAtTemp } from '../data/elementProperties';
import { cn } from '@/lib/utils';
import { X, Atom, Grid3X3, Activity } from 'lucide-react';
import { SpectroscopyBar } from './SpectroscopyBar';
import { ThermalScrubber } from './ThermalScrubber';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    onChangeViewMode?: (mode: '3d' | 'grid' | 'compare' | 'reaction' | 'builder') => void;
}

// 18-Column Standard IUPAC Matrix Positions (Row, Column)
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

type HeatmapMode = 'category' | 'electronegativity' | 'ionization' | 'radius' | 'density';

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement,
    onSelectElement,
}: PeriodicTableGridProps) {
    const [selectedBlock, setSelectedBlock] = useState<string>('all');
    const [temperatureK, setTemperatureK] = useState(298); // 25°C standard room temp
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('category');
    const [hoveredElement, setHoveredElement] = useState<ChemicalElement | null>(null);
    const [popupElement, setPopupElement] = useState<ChemicalElement | null>(null);

    // Filter elements
    const filteredElements = useMemo(() => {
        return elements.filter((el) => {
            const block = getElementBlock(el.atomicNumber);
            return selectedBlock === 'all' || block === selectedBlock;
        });
    }, [selectedBlock]);

    // Active element preview
    const activeDisplayElement = hoveredElement || selectedElement || elements[0];

    // Compute cell background color dynamically based on heatmap
    const getCellColor = (element: ChemicalElement) => {
        const props = elementProperties[element.atomicNumber];
        const baseColor = categoryColors[element.category] || '#38bdf8';

        if (heatmapMode === 'electronegativity') {
            const en = props?.electronegativity;
            if (!en) return '#334155';
            const ratio = Math.max(0, Math.min(1, (en - 0.7) / (4.0 - 0.7)));
            return `hsl(${Math.round(240 - ratio * 240)}, 85%, 50%)`;
        }

        if (heatmapMode === 'ionization') {
            const ie = props?.ionizationEnergy;
            if (!ie) return '#334155';
            const ratio = Math.max(0, Math.min(1, (ie - 350) / (2400 - 350)));
            return `hsl(${Math.round(280 - ratio * 280)}, 90%, 55%)`;
        }

        if (heatmapMode === 'radius') {
            const r = props?.atomicRadius;
            if (!r) return '#334155';
            const ratio = Math.max(0, Math.min(1, (r - 30) / (280 - 30)));
            return `hsl(${Math.round(180 + ratio * 140)}, 85%, 50%)`;
        }

        if (heatmapMode === 'density') {
            const d = props?.density;
            if (!d) return '#334155';
            const ratio = Math.max(0, Math.min(1, d / 22.6));
            return `hsl(${Math.round(45 + ratio * 280)}, 90%, 50%)`;
        }

        return baseColor;
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 text-slate-900 font-mono select-none overflow-hidden relative matrix-grid-bg">
            {/* Top Command Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white/90 border-b border-slate-200 backdrop-blur-md z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-600 text-xs font-bold">
                        <Grid3X3 className="w-3.5 h-3.5" />
                        <span>QUANTUM SPECTROMETRY MATRIX</span>
                    </div>

                    {/* Block Quick Filters */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px]">
                        {['all', 's', 'p', 'd', 'f'].map((b) => (
                            <button
                                key={b}
                                onClick={() => setSelectedBlock(b)}
                                className={`px-2 py-0.5 rounded uppercase font-bold transition-all ${
                                    selectedBlock === b
                                        ? 'bg-sky-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {b === 'all' ? 'All Blocks' : `${b}-block`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Heatmap Telemetry Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px]">
                    <span className="px-2 text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-sky-600" /> Heatmap:
                    </span>
                    {(['category', 'electronegativity', 'ionization', 'radius', 'density'] as HeatmapMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setHeatmapMode(mode)}
                            className={`px-2 py-0.5 rounded uppercase font-bold transition-all ${
                                heatmapMode === mode
                                    ? 'bg-white text-sky-700 border border-slate-200 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {mode.slice(0, 6)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Interactive Stage Area */}
            <div className="flex-1 flex flex-col xl:flex-row gap-2 p-2 overflow-hidden min-h-0">
                {/* 18-Column Interactive Table Grid (Scrollable on tablet/mobile) */}
                <div className="flex-1 overflow-auto rounded-xl bg-white border border-slate-200 p-3 relative shadow-sm">
                    <div
                        className="grid gap-1 min-w-[720px]"
                        style={{
                            gridTemplateColumns: 'repeat(18, minmax(36px, 1fr))',
                            gridTemplateRows: 'repeat(10, minmax(42px, 1fr))',
                        }}
                    >
                        {/* Period and Group Header Indicators */}
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={`col-${i}`} className="text-center text-[9px] text-slate-500 font-bold self-end pb-0.5" style={{ gridColumn: i + 1, gridRow: 1 }}>
                                {i + 1}
                            </div>
                        ))}

                        {/* Element Cells */}
                        {elements.map((el) => {
                            const [row, col] = LAYOUT[el.atomicNumber] || [1, 1];
                            const isFiltered = filteredElements.some((item) => item.atomicNumber === el.atomicNumber);
                            const isSelected = selectedElement?.atomicNumber === el.atomicNumber;
                            const isHovered = hoveredElement?.atomicNumber === el.atomicNumber;
                            const stateAtTemp = getElementStateAtTemp(el.atomicNumber, temperatureK);
                            const cellColor = getCellColor(el);

                            return (
                                <button
                                    key={el.atomicNumber}
                                    onClick={() => {
                                        onSelectElement(el);
                                        setPopupElement(el);
                                    }}
                                    onMouseEnter={() => setHoveredElement(el)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    style={{
                                        gridRow: row,
                                        gridColumn: col,
                                        opacity: isFiltered ? 1.0 : 0.2,
                                        borderColor: isSelected || isHovered ? '#0284c7' : `${cellColor}50`,
                                        backgroundColor: isSelected || isHovered ? `${cellColor}25` : `${cellColor}08`,
                                        boxShadow: isSelected || isHovered ? `0 0 10px ${cellColor}60` : 'none',
                                    }}
                                    className={cn(
                                        'relative rounded p-1 flex flex-col items-center justify-between border transition-all text-left group hover:z-30 hover:scale-105',
                                        isSelected && 'ring-2 ring-sky-500 z-20'
                                    )}
                                >
                                    {/* Number & State Icon */}
                                    <div className="w-full flex items-center justify-between text-[8px] text-slate-600 font-mono leading-none">
                                        <span className="font-semibold">{el.atomicNumber}</span>
                                        <span className="text-[7px]">
                                            {stateAtTemp === 'gas' ? '💨' : stateAtTemp === 'liquid' ? '💧' : '🧊'}
                                        </span>
                                    </div>

                                    {/* Symbol */}
                                    <div className="text-sm font-extrabold tracking-tight leading-none my-0.5" style={{ color: cellColor }}>
                                        {el.symbol}
                                    </div>

                                    {/* Mass or Heatmap Value */}
                                    <div className="w-full text-center text-[7.5px] text-slate-500 truncate font-mono">
                                        {heatmapMode === 'electronegativity' && elementProperties[el.atomicNumber]?.electronegativity
                                            ? `χ ${elementProperties[el.atomicNumber]?.electronegativity}`
                                            : heatmapMode === 'ionization' && elementProperties[el.atomicNumber]?.ionizationEnergy
                                            ? `${elementProperties[el.atomicNumber]?.ionizationEnergy}`
                                            : el.atomicMass.toFixed(1)}
                                    </div>
                                </button>
                            );
                        })}

                        {/* Lanthanide & Actinide Labels */}
                        <div style={{ gridRow: 6, gridColumn: 3 }} className="flex items-center justify-center text-[9px] font-bold text-pink-600 bg-pink-50 border border-pink-200 rounded">
                            57-71
                        </div>
                        <div style={{ gridRow: 7, gridColumn: 3 }} className="flex items-center justify-center text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded">
                            89-103
                        </div>
                    </div>
                </div>

                {/* Right / Bottom Telemetry Control HUD */}
                <div className="w-full xl:w-80 flex flex-col gap-2 overflow-y-auto">
                    {/* Thermal Scrubber Component */}
                    <ThermalScrubber temperatureK={temperatureK} onTemperatureChange={setTemperatureK} />

                    {/* Active Hovered Element Spectroscopy & Telemetry Card */}
                    {activeDisplayElement && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Active Target</div>
                                    <div className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                        <span style={{ color: categoryColors[activeDisplayElement.category] || '#0284c7' }}>
                                            {activeDisplayElement.name}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">#{activeDisplayElement.atomicNumber}</span>
                                    </div>
                                    <div className="text-[10px] text-sky-700 font-mono">
                                        {categoryLabels[activeDisplayElement.category]} • {getElementBlock(activeDisplayElement.atomicNumber).toUpperCase()}-Block
                                    </div>
                                </div>

                                <button
                                    onClick={() => onSelectElement(activeDisplayElement)}
                                    className="hardware-btn bg-sky-600 text-white border-sky-600 hover:bg-sky-700 font-bold px-3 py-1.5 text-xs rounded"
                                >
                                    <Atom className="w-3 h-3" /> Explore
                                </button>
                            </div>

                            {/* Spectroscopy Real-Time Footprint */}
                            <SpectroscopyBar element={activeDisplayElement} />
                        </div>
                    )}
                </div>
            </div>

            {/* Element Detail Popup Modal */}
            <AnimatePresence>
                {popupElement && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setPopupElement(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 text-slate-900"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border-2"
                                        style={{
                                            borderColor: categoryColors[popupElement.category] || '#0284c7',
                                            backgroundColor: `${categoryColors[popupElement.category]}15`,
                                        }}
                                    >
                                        <span className="text-xs text-slate-500">{popupElement.atomicNumber}</span>
                                        <span className="text-xl font-extrabold" style={{ color: categoryColors[popupElement.category] || '#0284c7' }}>{popupElement.symbol}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{popupElement.name}</h3>
                                        <p className="text-xs text-sky-700 font-mono">{categoryLabels[popupElement.category]}</p>
                                    </div>
                                </div>
                                <button onClick={() => setPopupElement(null)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <SpectroscopyBar element={popupElement} />

                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                    <span className="text-slate-500">Atomic Mass:</span>
                                    <div className="font-bold text-slate-900">{popupElement.atomicMass} u</div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                    <span className="text-slate-500">Electron Shells:</span>
                                    <div className="font-bold text-slate-900">{popupElement.shells.join(' - ')}</div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                    <span className="text-slate-500">Melting Point:</span>
                                    <div className="font-bold text-slate-900">{elementProperties[popupElement.atomicNumber]?.meltingPoint ?? 'N/A'} K</div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                    <span className="text-slate-500">Boiling Point:</span>
                                    <div className="font-bold text-slate-900">{elementProperties[popupElement.atomicNumber]?.boilingPoint ?? 'N/A'} K</div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    onSelectElement(popupElement);
                                    setPopupElement(null);
                                }}
                                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                            >
                                <Atom className="w-4 h-4" /> Launch 3D Quantum Stage
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
