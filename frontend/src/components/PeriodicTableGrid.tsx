import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, categoryColors, getElementBlock } from '../data/elements';
import { elementProperties, getElementStateAtTemp } from '../data/elementProperties';
import { cn } from '@/lib/utils';
import { X, Atom, Grid3X3, Activity, Search, GitCompare, Zap, Boxes, History, ArrowUpRight, TrendingUp } from 'lucide-react';
import { SpectroscopyBar } from './SpectroscopyBar';
import { ThermalScrubber } from './ThermalScrubber';
import { useAppStore } from '@/store/useAppStore';
import { audioEngine } from '@/lib/audioEngine';

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

// Approximate Discovery Timeline Years
const DISCOVERY_YEARS: Record<number, number> = {
    1: 1766, 2: 1868, 3: 1817, 4: 1798, 5: 1808, 6: -3000, 7: 1772, 8: 1774, 9: 1886, 10: 1898,
    11: 1807, 12: 1755, 13: 1825, 14: 1823, 15: 1669, 16: -2000, 17: 1774, 18: 1894,
    19: 1807, 20: 1808, 21: 1879, 22: 1791, 23: 1801, 24: 1797, 25: 1774, 26: -3500,
    27: 1735, 28: 1751, 29: -5000, 30: -1000, 31: 1875, 32: 1886, 33: -1250, 34: 1817,
    35: 1826, 36: 1898, 37: 1861, 38: 1787, 39: 1794, 40: 1789, 41: 1801, 42: 1778,
    43: 1937, 44: 1844, 45: 1803, 46: 1803, 47: -3000, 48: 1817, 49: 1863, 50: -3000,
    51: -3000, 52: 1782, 53: 1811, 54: 1898, 55: 1860, 56: 1772, 57: 1839,
    72: 1923, 73: 1802, 74: 1781, 75: 1925, 76: 1803, 77: 1803, 78: 1735, 79: -4000,
    80: -1500, 81: 1861, 82: -3000, 83: 1753, 84: 1898, 85: 1940, 86: 1900, 87: 1939,
    88: 1898, 89: 1899, 90: 1829, 91: 1913, 92: 1789, 93: 1940, 94: 1940, 95: 1944,
    96: 1944, 97: 1949, 98: 1950, 99: 1952, 100: 1952, 101: 1955, 102: 1958, 103: 1961,
    104: 1964, 105: 1970, 106: 1974, 107: 1981, 108: 1984, 109: 1982, 110: 1994, 111: 1994,
    112: 1996, 113: 2003, 114: 1998, 115: 2003, 116: 2000, 117: 2010, 118: 2002
};

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement,
    onSelectElement,
}: PeriodicTableGridProps) {
    const { setWorkspaceMode, setCompareElement1, setSelectedElement } = useAppStore();
    const [selectedBlock, setSelectedBlock] = useState<string>('all');
    const [temperatureK, setTemperatureK] = useState(298); // 25°C standard room temp
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('category');
    const [searchQuery, setSearchQuery] = useState('');
    const [maxYear, setMaxYear] = useState<number>(2026);
    const [hoveredElement, setHoveredElement] = useState<ChemicalElement | null>(null);
    const [popupElement, setPopupElement] = useState<ChemicalElement | null>(null);
    const [showTrendsOverlay, setShowTrendsOverlay] = useState(false);
    const [cellSize, setCellSize] = useState<'sm' | 'md' | 'lg'>('md');

    // Filter elements based on Block, Search, and Discovery Year
    const filteredElements = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return elements.filter((el) => {
            const block = getElementBlock(el.atomicNumber);
            const matchesBlock = selectedBlock === 'all' || block === selectedBlock;
            const matchesSearch = !query ||
                el.name.toLowerCase().includes(query) ||
                el.symbol.toLowerCase().includes(query) ||
                el.atomicNumber.toString() === query;
            const year = DISCOVERY_YEARS[el.atomicNumber] ?? 2026;
            const matchesYear = year <= maxYear;

            return matchesBlock && matchesSearch && matchesYear;
        });
    }, [selectedBlock, searchQuery, maxYear]);

    // Active element preview
    const activeDisplayElement = hoveredElement || selectedElement || elements[0];

    // Compute cell background color dynamically based on heatmap
    const getCellColor = (element: ChemicalElement) => {
        const props = elementProperties[element.atomicNumber];
        const baseColor = categoryColors[element.category] || '#0284c7';

        if (heatmapMode === 'electronegativity') {
            const en = props?.electronegativity;
            if (!en) return '#94a3b8';
            const ratio = Math.max(0, Math.min(1, (en - 0.7) / (4.0 - 0.7)));
            return `hsl(${Math.round(210 - ratio * 210)}, 90%, 48%)`;
        }

        if (heatmapMode === 'ionization') {
            const ie = props?.ionizationEnergy;
            if (!ie) return '#94a3b8';
            const ratio = Math.max(0, Math.min(1, (ie - 350) / (2400 - 350)));
            return `hsl(${Math.round(280 - ratio * 280)}, 90%, 50%)`;
        }

        if (heatmapMode === 'radius') {
            const r = props?.atomicRadius;
            if (!r) return '#94a3b8';
            const ratio = Math.max(0, Math.min(1, (r - 30) / (280 - 30)));
            return `hsl(${Math.round(180 + ratio * 140)}, 85%, 45%)`;
        }

        if (heatmapMode === 'density') {
            const d = props?.density;
            if (!d) return '#94a3b8';
            const ratio = Math.max(0, Math.min(1, d / 22.6));
            return `hsl(${Math.round(35 + ratio * 280)}, 90%, 45%)`;
        }

        return baseColor;
    };

    // Quick action dispatchers
    const handleQuickAction = (action: 'explore' | 'compare' | 'reactions' | 'builder', el: ChemicalElement) => {
        audioEngine.playClick(920);
        setSelectedElement(el);
        if (action === 'compare') {
            setCompareElement1(el);
        }
        setWorkspaceMode(action);
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAF8] text-slate-900 font-sans select-none overflow-hidden relative">
            {/* Top Command Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/80 border-b border-black/[0.06] backdrop-blur-md z-20">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] text-[#087f5b] text-xs font-bold shadow-xs">
                        <Grid3X3 className="w-3.5 h-3.5 text-[#16a875]" />
                        <span>IUPAC PERIODIC MATRIX</span>
                    </div>

                    {/* Search Field */}
                    <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filter symbol/name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200/80 rounded-xl outline-none focus:border-[#16a875] w-36 sm:w-44 text-slate-800 placeholder:text-slate-400 shadow-xs"
                        />
                    </div>

                    {/* Block Quick Filters */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 text-[10.5px]">
                        {['all', 's', 'p', 'd', 'f'].map((b) => (
                            <button
                                key={b}
                                onClick={() => setSelectedBlock(b)}
                                className={cn(
                                    "px-2.5 py-0.5 rounded-lg uppercase font-bold transition-all",
                                    selectedBlock === b
                                        ? "bg-[#e6f6ef] text-[#087f5b] border border-[#bce8d5] shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {b === 'all' ? 'All' : `${b}-blk`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Heatmap & Trends Toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setShowTrendsOverlay(!showTrendsOverlay)}
                        className={cn(
                            "px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs",
                            showTrendsOverlay ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                        title="Toggle Periodic Trend Gradient Vectors"
                    >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Trends
                    </button>

                    <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 text-[10.5px]">
                        <span className="px-2 text-slate-500 flex items-center gap-1 font-semibold">
                            <Activity className="w-3.5 h-3.5 text-[#16a875]" /> Heatmap:
                        </span>
                        {(['category', 'electronegativity', 'ionization', 'radius', 'density'] as HeatmapMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setHeatmapMode(mode)}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg uppercase font-bold transition-all",
                                    heatmapMode === mode
                                        ? "bg-white text-[#087f5b] border border-slate-200 shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {mode.slice(0, 4)}
                            </button>
                        ))}
                    </div>
                    {/* Column / Cell Sizing Presets */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 text-[10.5px]">
                        <span className="px-2 text-slate-500 font-semibold">Size:</span>
                        {(['sm', 'md', 'lg'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setCellSize(s)}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg uppercase font-bold transition-all",
                                    cellSize === s
                                        ? "bg-white text-[#087f5b] border border-slate-200 shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                                title={s === 'sm' ? 'Compact Columns' : s === 'md' ? 'Standard Columns' : 'Expansive Columns'}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Periodic Trends Overlay Banner */}
            {showTrendsOverlay && (
                <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between text-[11px] text-amber-900 z-10 gap-2 font-mono">
                    <span className="flex items-center gap-1.5 font-bold">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Periodic Law Vectors:
                    </span>
                    <span>↗ <strong>Electronegativity & Ionization:</strong> Increases Left → Right & Bottom → Top</span>
                    <span>↙ <strong>Atomic Radius:</strong> Increases Right → Left & Top → Bottom</span>
                    <span>↘ <strong>Metallic Character:</strong> Increases toward bottom-left (Fr)</span>
                </div>
            )}

            {/* Dynamic Heatmap Spectrum Legend Bar */}
            {heatmapMode !== 'category' && (
                <div className="px-4 py-1.5 bg-white/95 border-b border-slate-200 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-700 z-10 gap-2 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[#087f5b] text-[10px]">
                            {heatmapMode === 'electronegativity' && 'Pauling Electronegativity (χ):'}
                            {heatmapMode === 'ionization' && '1st Ionization Energy:'}
                            {heatmapMode === 'radius' && 'Calculated Atomic Radius:'}
                            {heatmapMode === 'density' && 'Room-Temp Density:'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {heatmapMode === 'electronegativity' && '0.79 (Fr) → 3.98 (F)'}
                            {heatmapMode === 'ionization' && '375.7 kJ/mol (Cs) → 2372.3 kJ/mol (He)'}
                            {heatmapMode === 'radius' && '31 pm (He) → 298 pm (Cs)'}
                            {heatmapMode === 'density' && '0.089 g/L (H) → 22.59 g/cm³ (Os)'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">Low</span>
                        <div
                            className="w-32 sm:w-48 h-2 rounded-full border border-black/10"
                            style={{
                                background:
                                    heatmapMode === 'electronegativity'
                                        ? 'linear-gradient(to right, hsl(210, 85%, 50%), hsl(280, 85%, 50%), hsl(350, 85%, 50%))'
                                        : heatmapMode === 'ionization'
                                        ? 'linear-gradient(to right, hsl(180, 80%, 45%), hsl(260, 80%, 45%), hsl(340, 85%, 50%))'
                                        : heatmapMode === 'radius'
                                        ? 'linear-gradient(to right, hsl(140, 80%, 45%), hsl(60, 85%, 45%), hsl(15, 85%, 50%))'
                                        : 'linear-gradient(to right, hsl(35, 90%, 45%), hsl(160, 90%, 45%), hsl(315, 90%, 45%))',
                            }}
                        />
                        <span className="text-[10px] font-bold text-slate-900">High</span>
                    </div>
                </div>
            )}

            {/* Main Interactive Stage Area - Scrollable Workspace Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                {/* 18-Column Interactive Table Grid Hero Container */}
                <div className="w-full rounded-2xl bg-white/90 border border-black/[0.06] p-4 relative shadow-card overflow-x-auto">
                    <div
                        className="grid gap-1.5 pb-2"
                        style={{
                            minWidth: cellSize === 'sm' ? '680px' : cellSize === 'lg' ? '1020px' : '840px',
                            gridTemplateColumns: cellSize === 'sm'
                                ? 'repeat(18, minmax(36px, 1fr))'
                                : cellSize === 'lg'
                                ? 'repeat(18, minmax(52px, 1fr))'
                                : 'repeat(18, minmax(42px, 1fr))',
                            gridTemplateRows: cellSize === 'sm'
                                ? 'repeat(10, minmax(42px, 1fr))'
                                : cellSize === 'lg'
                                ? 'repeat(10, minmax(58px, 1fr))'
                                : 'repeat(10, minmax(48px, 1fr))',
                        }}
                    >
                        {/* Period and Group Header Indicators */}
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={`col-${i}`} className="text-center text-[10px] text-slate-400 font-bold self-end pb-1" style={{ gridColumn: i + 1, gridRow: 1 }}>
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
                                        opacity: isFiltered ? 1.0 : 0.15,
                                        borderColor: isSelected || isHovered ? '#16a875' : `${cellColor}40`,
                                        backgroundColor: isSelected || isHovered ? `${cellColor}20` : `${cellColor}08`,
                                        boxShadow: isSelected || isHovered ? `0 0 12px ${cellColor}50` : 'none',
                                    }}
                                    className={cn(
                                        'relative rounded-xl p-1 flex flex-col items-center justify-between border transition-all text-left group hover:z-30 hover:scale-105 select-none',
                                        isSelected && 'ring-2 ring-[#16a875] z-20 shadow-sm'
                                    )}
                                >
                                    {/* Number & State Icon */}
                                    <div className="w-full flex items-center justify-between text-[9px] text-slate-500 font-mono leading-none px-0.5">
                                        <span className="font-semibold">{el.atomicNumber}</span>
                                        <span className="text-[8px]">
                                            {stateAtTemp === 'gas' ? '💨' : stateAtTemp === 'liquid' ? '💧' : '🧊'}
                                        </span>
                                    </div>

                                    {/* Symbol */}
                                    <div className="text-sm sm:text-base font-extrabold tracking-tight leading-none my-0.5" style={{ color: cellColor }}>
                                        {el.symbol}
                                    </div>

                                    {/* Mass or Heatmap Value */}
                                    <div className="w-full text-center text-[8px] text-slate-500 truncate font-mono">
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
                        <div style={{ gridRow: 6, gridColumn: 3 }} className="flex items-center justify-center text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl">
                            57-71
                        </div>
                        <div style={{ gridRow: 7, gridColumn: 3 }} className="flex items-center justify-center text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                            89-103
                        </div>
                    </div>
                </div>

                {/* Bottom Multi-Column Telemetry & Control Deck */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Discovery Timeline Scrubber Card */}
                    <div className="p-4 rounded-2xl bg-white/90 border border-black/[0.06] space-y-2.5 shadow-card flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                                <History className="w-4 h-4 text-[#16a875]" />
                                Discovery Timeline:
                            </span>
                            <span className="font-bold text-[#087f5b] text-xs font-mono bg-[#e6f6ef] px-2 py-0.5 rounded-md border border-[#bce8d5]">
                                {maxYear <= 0 ? 'Ancient Antiquity' : `≤ ${maxYear} CE`}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1600"
                            max="2026"
                            step="5"
                            value={maxYear}
                            onChange={(e) => setMaxYear(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16a875]"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                            <span>1600 (Alchemical)</span>
                            <span>1869 (Mendeleev)</span>
                            <span>2026 (Modern)</span>
                        </div>
                    </div>

                    {/* Thermal Scrubber Component */}
                    <ThermalScrubber temperatureK={temperatureK} onTemperatureChange={setTemperatureK} />

                    {/* Active Hovered Element Card */}
                    {activeDisplayElement && (
                        <div className="p-4 rounded-2xl bg-white/90 border border-black/[0.06] space-y-3 shadow-card md:col-span-2 lg:col-span-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">Active Target</div>
                                    <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <span style={{ color: categoryColors[activeDisplayElement.category] || '#16a875' }}>
                                            {activeDisplayElement.name}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">#{activeDisplayElement.atomicNumber}</span>
                                    </div>
                                    <div className="text-[11px] font-semibold" style={{ color: categoryColors[activeDisplayElement.category] || '#16a875' }}>
                                        {categoryLabels[activeDisplayElement.category]} • {getElementBlock(activeDisplayElement.atomicNumber).toUpperCase()}-Block
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleQuickAction('explore', activeDisplayElement)}
                                    className="emerald-button text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
                                >
                                    <Atom className="w-3.5 h-3.5" /> Explore
                                </button>
                            </div>

                            {/* Quick Action Dispatch Buttons */}
                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => handleQuickAction('compare', activeDisplayElement)}
                                    className="px-2 py-1.5 bg-[#e6f6ef] hover:bg-[#d8f2e6] border border-[#bce8d5] rounded-xl text-[10px] font-bold text-[#087f5b] flex items-center justify-center gap-1 transition-colors"
                                >
                                    <GitCompare className="w-3 h-3 text-[#16a875]" /> Compare
                                </button>
                                <button
                                    onClick={() => handleQuickAction('reactions', activeDisplayElement)}
                                    className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Zap className="w-3 h-3 text-amber-600" /> React
                                </button>
                                <button
                                    onClick={() => handleQuickAction('builder', activeDisplayElement)}
                                    className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-[10px] font-bold text-teal-900 flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Boxes className="w-3 h-3 text-teal-600" /> Build
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

                            {/* 1-Click Launch Actions in Popup */}
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setPopupElement(null);
                                        handleQuickAction('explore', popupElement);
                                    }}
                                    className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" /> 3D Quantum Stage
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
