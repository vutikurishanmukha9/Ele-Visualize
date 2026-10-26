import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, ElementBlock, categoryLabels, categoryColors, getElementBlock, getElementPalette } from '../data/elements';
import { elementProperties, getElementStateAtTemp } from '../data/elementProperties';
import { cn } from '@/lib/utils';
import { X, Atom, Grid3X3, Activity, Search, GitCompare, FlaskConical, Boxes, History, ArrowUpRight, TrendingUp } from 'lucide-react';
import { SpectroscopyBar } from './SpectroscopyBar';
import { ThermalScrubber } from './ThermalScrubber';
import { AtomSvgDiagram } from './AtomSvgDiagram';
import { useAppStore } from '@/store/useAppStore';
import { audioEngine } from '@/lib/audioEngine';
import { TiltCard } from './ui/TiltCard';

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

// Universal IUPAC Standard Periodic Table Block Color System (Scientific Lab Tones)
export const UNIVERSAL_BLOCK_COLORS: Record<ElementBlock, {
    label: string;
    bg: string;
    hoverBg: string;
    border: string;
    text: string;
    symbol: string;
    badgeBg: string;
    activeBg: string;
}> = {
    s: {
        label: 's-block',
        bg: 'rgba(244, 63, 94, 0.08)',
        hoverBg: 'rgba(244, 63, 94, 0.16)',
        border: 'rgba(244, 63, 94, 0.28)',
        text: '#fb7185',
        symbol: '#fecdd3',
        badgeBg: 'rgba(244, 63, 94, 0.12)',
        activeBg: '#e11d48',
    },
    p: {
        label: 'p-block',
        bg: 'rgba(245, 158, 11, 0.08)',
        hoverBg: 'rgba(245, 158, 11, 0.16)',
        border: 'rgba(245, 158, 11, 0.28)',
        text: '#f59e0b',
        symbol: '#fde68a',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        activeBg: '#d97706',
    },
    d: {
        label: 'd-block',
        bg: 'rgba(56, 189, 248, 0.08)',
        hoverBg: 'rgba(56, 189, 248, 0.16)',
        border: 'rgba(56, 189, 248, 0.28)',
        text: '#38bdf8',
        symbol: '#bae6fd',
        badgeBg: 'rgba(56, 189, 248, 0.12)',
        activeBg: '#0284c7',
    },
    f: {
        label: 'f-block',
        bg: 'rgba(16, 185, 129, 0.08)',
        hoverBg: 'rgba(16, 185, 129, 0.16)',
        border: 'rgba(16, 185, 129, 0.28)',
        text: '#34d399',
        symbol: '#a7f3d0',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        activeBg: '#059669',
    },
};

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement,
    onSelectElement,
}: PeriodicTableGridProps) {
    const { setWorkspaceMode, setCompareElement1, setSelectedElement } = useAppStore();
    const [selectedBlock, setSelectedBlock] = useState<string | 'all'>('all');
    const [temperatureK, setTemperatureK] = useState(298);
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
            const matchesSearch =
                !query ||
                el.name.toLowerCase().includes(query) ||
                el.symbol.toLowerCase().includes(query) ||
                el.atomicNumber.toString().includes(query) ||
                el.category.toLowerCase().includes(query);
            const discYear = DISCOVERY_YEARS[el.atomicNumber] ?? 1800;
            const matchesYear = discYear <= maxYear;
            return matchesBlock && matchesSearch && matchesYear;
        });
    }, [selectedBlock, searchQuery, maxYear]);

    // Active element preview
    const activeDisplayElement = hoveredElement || selectedElement || elements[0];

    // Compute universal cell styling based on IUPAC standard block colors or heatmaps
    const getCellStyles = (element: ChemicalElement, isSelected: boolean, isHovered: boolean) => {
        const block = getElementBlock(element.atomicNumber);
        const blockColor = UNIVERSAL_BLOCK_COLORS[block];

        if (heatmapMode === 'category') {
            return {
                backgroundColor: isSelected ? 'var(--color-surface-3)' : isHovered ? blockColor.hoverBg : blockColor.bg,
                borderColor: isSelected ? 'var(--color-accent)' : isHovered ? blockColor.border : blockColor.border,
                symbolColor: blockColor.symbol,
                textColor: blockColor.text,
            };
        }

        const props = elementProperties[element.atomicNumber];
        let heatColor = '#94a3b8';
        if (heatmapMode === 'electronegativity') {
            const en = props?.electronegativity;
            if (en) {
                const ratio = Math.max(0, Math.min(1, (en - 0.7) / (4.0 - 0.7)));
                heatColor = `hsl(${Math.round(210 - ratio * 210)}, 90%, 55%)`;
            }
        } else if (heatmapMode === 'ionization') {
            const ie = props?.ionizationEnergy;
            if (ie) {
                const ratio = Math.max(0, Math.min(1, (ie - 350) / (2400 - 350)));
                heatColor = `hsl(${Math.round(280 - ratio * 280)}, 90%, 55%)`;
            }
        } else if (heatmapMode === 'radius') {
            const r = props?.atomicRadius;
            if (r) {
                const ratio = Math.max(0, Math.min(1, (r - 30) / (280 - 30)));
                heatColor = `hsl(${Math.round(180 + ratio * 140)}, 85%, 50%)`;
            }
        } else if (heatmapMode === 'density') {
            const d = props?.density;
            if (d) {
                const ratio = Math.max(0, Math.min(1, d / 22.6));
                heatColor = `hsl(${Math.round(35 + ratio * 280)}, 90%, 50%)`;
            }
        }

        return {
            backgroundColor: isSelected ? 'var(--color-surface-3)' : isHovered ? `${heatColor}30` : `${heatColor}15`,
            borderColor: isSelected ? 'var(--color-accent)' : `${heatColor}60`,
            symbolColor: heatColor,
            textColor: 'var(--color-ink-secondary)',
        };
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
        <div className="h-full flex flex-col bg-[var(--color-canvas)] text-[var(--color-ink-primary)] font-sans select-none overflow-hidden relative">
            {/* Top Primary Command Bar (Tier 1) */}
            <div className="min-h-12 w-full px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-surface-1)] z-20 gap-2.5">
                {/* Left: Brand Lockup & Search */}
                <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-md">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink-primary)] border border-[var(--color-hairline)] text-xs font-semibold shrink-0 shadow-2xs">
                        <Grid3X3 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span className="hidden xs:inline">IUPAC Matrix</span>
                    </div>

                    {/* Search Field */}
                    <div className="relative flex items-center flex-1">
                        <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)] absolute left-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search elements by name, symbol, number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 text-xs bg-[var(--color-surface-2)] border border-[var(--color-hairline)] rounded-md outline-none focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-3)] text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-muted)] transition-colors shadow-2xs font-sans"
                        />
                    </div>
                </div>

                {/* Right: Universal Block Filter Matrix & Trends */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-0.5 rounded-lg border border-[var(--color-hairline)] text-xs">
                        <button
                            onClick={() => {
                                audioEngine.playClick(800);
                                setSelectedBlock('all');
                            }}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-medium transition-all text-xs cursor-pointer select-none active:scale-[0.98]",
                                selectedBlock === 'all'
                                    ? "bg-[#5e6ad2] text-white shadow-2xs font-semibold"
                                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-3)]"
                            )}
                        >
                            All Blocks
                        </button>
                        {(['s', 'd', 'p', 'f'] as ElementBlock[]).map((b) => {
                            const isBlockActive = selectedBlock === b;
                            const bColors = UNIVERSAL_BLOCK_COLORS[b];
                            return (
                                <button
                                    key={b}
                                    onClick={() => {
                                        audioEngine.playClick(840);
                                        setSelectedBlock(b);
                                    }}
                                    className={cn(
                                        "px-2 py-1 rounded-md font-medium transition-all text-xs border cursor-pointer select-none active:scale-[0.98]",
                                        isBlockActive
                                            ? "text-white shadow-2xs font-semibold ring-1 ring-white/20"
                                            : "hover:brightness-110"
                                    )}
                                    style={{
                                        backgroundColor: isBlockActive ? bColors.activeBg : bColors.badgeBg,
                                        borderColor: bColors.border,
                                        color: isBlockActive ? '#ffffff' : bColors.text,
                                    }}
                                >
                                    {b}-block
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => {
                            audioEngine.playClick(840);
                            setShowTrendsOverlay(!showTrendsOverlay);
                        }}
                        className={cn(
                            "h-7.5 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none active:scale-[0.98]",
                            showTrendsOverlay ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-xs" : "bg-[var(--color-surface-2)] text-[var(--color-ink-secondary)] border-[var(--color-hairline)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-primary)]"
                        )}
                        title="Toggle Periodic Trend Gradient Vectors"
                    >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden md:inline">Periodic Trends</span>
                    </button>
                </div>
            </div>

            {/* Sub-Tier: Quantitative Heatmap & Grid Display Controls (Tier 2) */}
            <div className="min-h-9 w-full px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-surface-1)] text-xs z-10 gap-2">
                {/* Left: Heatmap Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="section-label flex items-center gap-1 shrink-0">
                        <Activity className="w-3 h-3 text-[var(--color-accent)]" />
                        <span>Color Mode:</span>
                    </span>

                    <div className="flex items-center gap-0.5 bg-[var(--color-surface-2)] p-0.5 rounded-lg border border-[var(--color-hairline)] text-xs flex-wrap">
                        {(['category', 'electronegativity', 'ionization', 'radius', 'density'] as HeatmapMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    audioEngine.playClick(860);
                                    setHeatmapMode(mode);
                                }}
                                className={cn(
                                    "px-2.5 py-0.5 rounded-md font-medium transition-all text-[11px] cursor-pointer select-none active:scale-[0.98]",
                                    heatmapMode === mode
                                        ? "bg-[#5e6ad2] text-white shadow-2xs font-semibold"
                                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-3)]"
                                )}
                            >
                                {mode === 'category' ? 'Universal IUPAC' : mode === 'electronegativity' ? 'Electronegativity (χ)' : mode === 'ionization' ? 'Ionization (kJ)' : mode === 'radius' ? 'Radius' : 'Density'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Grid Scale & Status */}
                <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[var(--color-ink-muted)] text-[11px] font-medium">Grid:</span>
                        <div className="flex items-center gap-0.5 bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-hairline)]">
                            {(['sm', 'md', 'lg'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setCellSize(s)}
                                    className={cn(
                                        "px-2 py-0.5 rounded font-medium transition-all text-[10.5px]",
                                        cellSize === s
                                            ? "bg-[var(--color-accent)] text-white shadow-2xs font-semibold"
                                            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
                                    )}
                                    title={s === 'sm' ? 'Compact Columns' : s === 'md' ? 'Standard Columns' : 'Expansive Columns'}
                                >
                                    {s === 'sm' ? 'Compact' : s === 'md' ? 'Standard' : 'Large'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--color-ink-muted)] pl-2.5 border-l border-[var(--color-hairline)]">
                        {filteredElements.length} Elements
                    </span>
                </div>
            </div>

            {/* Periodic Trends Overlay Banner */}
            {showTrendsOverlay && (
                <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between text-[11px] text-amber-200 z-10 gap-2 font-mono">
                    <span className="flex items-center gap-1.5 font-bold text-amber-400">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Periodic Law Vectors:
                    </span>
                    <span>↗ <strong>Electronegativity & Ionization:</strong> Increases Left → Right & Bottom → Top</span>
                    <span>↙ <strong>Atomic Radius:</strong> Increases Right → Left & Top → Bottom</span>
                    <span>↘ <strong>Metallic Character:</strong> Increases toward bottom-left (Fr)</span>
                </div>
            )}

            {/* Dynamic Heatmap Spectrum Legend Bar */}
            {heatmapMode !== 'category' && (
                <div className="px-4 py-1.5 bg-[var(--color-surface-1)] border-b border-[var(--color-hairline)] flex flex-wrap items-center justify-between text-[11px] font-mono text-[var(--color-ink-secondary)] z-10 gap-2 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[var(--color-accent)] text-[10px]">
                            {heatmapMode === 'electronegativity' && 'Pauling Electronegativity (χ):'}
                            {heatmapMode === 'ionization' && '1st Ionization Energy:'}
                            {heatmapMode === 'radius' && 'Calculated Atomic Radius:'}
                            {heatmapMode === 'density' && 'Room-Temp Density:'}
                        </span>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">
                            {heatmapMode === 'electronegativity' && '0.79 (Fr) → 3.98 (F)'}
                            {heatmapMode === 'ionization' && '375.7 kJ/mol (Cs) → 2372.3 kJ/mol (He)'}
                            {heatmapMode === 'radius' && '31 pm (He) → 298 pm (Cs)'}
                            {heatmapMode === 'density' && '0.089 g/L (H) → 22.59 g/cm³ (Os)'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--color-ink-muted)]">Low</span>
                        <div
                            className="w-32 sm:w-48 h-2 rounded-full border border-[var(--color-hairline)]"
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
                        <span className="text-[10px] font-bold text-[var(--color-ink-primary)]">High</span>
                    </div>
                </div>
            )}

            {/* Main Interactive Stage Area - Scrollable Workspace Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-[var(--color-canvas)]">
                {/* 18-Column Interactive Table Grid Hero Container */}
                <div className="w-full rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] p-3.5 sm:p-4 relative shadow-xs overflow-x-auto select-none">
                    <div
                        className="grid gap-1 pb-2"
                        style={{
                            minWidth: cellSize === 'sm' ? '680px' : cellSize === 'lg' ? '1040px' : '860px',
                            gridTemplateColumns: cellSize === 'sm'
                                ? 'repeat(18, minmax(36px, 1fr))'
                                : cellSize === 'lg'
                                ? 'repeat(18, minmax(54px, 1fr))'
                                : 'repeat(18, minmax(44px, 1fr))',
                            gridTemplateRows: cellSize === 'sm'
                                ? 'repeat(10, minmax(42px, 1fr))'
                                : cellSize === 'lg'
                                ? 'repeat(10, minmax(58px, 1fr))'
                                : 'repeat(10, minmax(48px, 1fr))',
                        }}
                    >
                        {/* Period and Group Header Indicators */}
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={`col-${i}`} className="text-center text-[10px] font-mono text-[var(--color-ink-muted)] font-medium self-end pb-1" style={{ gridColumn: i + 1, gridRow: 1 }}>
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
                            const styles = getCellStyles(el, isSelected, isHovered);

                            return (
                                <button
                                    key={el.atomicNumber}
                                    onClick={() => {
                                        audioEngine.playClick(840);
                                        onSelectElement(el);
                                        setPopupElement(el);
                                    }}
                                    onMouseEnter={() => setHoveredElement(el)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    style={{
                                        gridRow: row,
                                        gridColumn: col,
                                        opacity: isFiltered ? 1.0 : 0.12,
                                        borderColor: styles.borderColor,
                                        backgroundColor: styles.backgroundColor,
                                    }}
                                    className={cn(
                                        'relative rounded-md p-1 flex flex-col items-center justify-between border transition-all text-left group select-none shadow-2xs',
                                        isSelected
                                            ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-canvas)] z-20 shadow-md scale-[1.04]'
                                            : 'hover:z-30 hover:scale-[1.06] hover:shadow-sm'
                                    )}
                                >
                                    {/* Number & State Indicator */}
                                    <div className="w-full flex items-center justify-between text-[8.5px] font-mono leading-none px-0.5">
                                        <span className="font-semibold" style={{ color: styles.textColor }}>{el.atomicNumber}</span>
                                        <span
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full shrink-0 border border-black/10",
                                                stateAtTemp === 'gas' ? "bg-amber-400" : stateAtTemp === 'liquid' ? "bg-sky-400" : "bg-slate-400"
                                            )}
                                            title={`State at ${temperatureK}K: ${stateAtTemp}`}
                                        />
                                    </div>

                                    {/* Symbol */}
                                    <div className="text-sm sm:text-base font-bold tracking-tight leading-none my-0.5 font-display" style={{ color: styles.symbolColor }}>
                                        {el.symbol}
                                    </div>

                                    {/* Mass or Heatmap Value */}
                                    <div className="w-full text-center text-[8.5px] font-mono truncate leading-none font-normal" style={{ color: styles.textColor }}>
                                        {heatmapMode === 'electronegativity' && elementProperties[el.atomicNumber]?.electronegativity
                                            ? `χ ${elementProperties[el.atomicNumber]?.electronegativity}`
                                            : heatmapMode === 'ionization' && elementProperties[el.atomicNumber]?.ionizationEnergy
                                            ? `${elementProperties[el.atomicNumber]?.ionizationEnergy}`
                                            : heatmapMode === 'radius' && elementProperties[el.atomicNumber]?.atomicRadius
                                            ? `${elementProperties[el.atomicNumber]?.atomicRadius}pm`
                                            : heatmapMode === 'density' && elementProperties[el.atomicNumber]?.density
                                            ? `${elementProperties[el.atomicNumber]?.density}`
                                            : el.atomicMass.toFixed(1)}
                                    </div>
                                </button>
                            );
                        })}

                        {/* Lanthanide & Actinide Labels (f-block refined tones) */}
                        <div
                            style={{ gridRow: 6, gridColumn: 3 }}
                            className="flex flex-col items-center justify-center text-[9px] font-medium font-mono text-[#34d399] bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] rounded-md shadow-2xs leading-tight"
                            title="Lanthanides (La to Yb)"
                        >
                            <span>La–Yb</span>
                            <span className="text-[7.5px] text-[#6ee7b7] opacity-80">57–70</span>
                        </div>
                        <div
                            style={{ gridRow: 7, gridColumn: 3 }}
                            className="flex flex-col items-center justify-center text-[9px] font-medium font-mono text-[#34d399] bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] rounded-md shadow-2xs leading-tight"
                            title="Actinides (Ac to No)"
                        >
                            <span>Ac–No</span>
                            <span className="text-[7.5px] text-[#6ee7b7] opacity-80">89–102</span>
                        </div>
                    </div>

                    {/* Universal IUPAC Block Classification Bar Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 pt-3 mt-2 border-t border-[var(--color-hairline)] text-xs select-none">
                        {(['s', 'd', 'p', 'f'] as ElementBlock[]).map((b) => {
                            const isBlockActive = selectedBlock === b;
                            const bColors = UNIVERSAL_BLOCK_COLORS[b];
                            return (
                                <button
                                    key={b}
                                    onClick={() => setSelectedBlock(selectedBlock === b ? 'all' : b)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all shadow-2xs",
                                        isBlockActive
                                            ? "ring-1 ring-[var(--color-accent)] font-semibold"
                                            : "hover:brightness-110"
                                    )}
                                    style={{
                                        backgroundColor: isBlockActive ? bColors.activeBg : bColors.badgeBg,
                                        borderColor: bColors.border,
                                        color: isBlockActive ? '#ffffff' : bColors.text,
                                    }}
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bColors.activeBg }} />
                                    <span>{bColors.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Multi-Column Telemetry & Control Deck */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Discovery Timeline Scrubber Card */}
                    <div className="p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] space-y-2.5 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-[var(--color-ink-primary)] font-semibold text-xs">
                                <History className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                                <span>Discovery Chronology</span>
                            </span>
                            <span className="font-medium text-[var(--color-accent)] text-xs font-mono bg-[var(--color-accent)]/10 px-2 py-0.5 rounded border border-[var(--color-hairline)]">
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
                            className="w-full h-1.5 bg-[var(--color-surface-3)] rounded appearance-none cursor-pointer accent-[var(--color-accent)]"
                        />
                        <div className="flex justify-between items-center text-[10px] text-[var(--color-ink-muted)] font-mono pt-1 border-t border-[var(--color-hairline)]">
                            <span>1600 (Alchemical)</span>
                            <span>1869 (Mendeleev)</span>
                            <span>2026 ({filteredElements.length}/118)</span>
                        </div>
                    </div>

                    {/* Thermal Scrubber Component */}
                    <ThermalScrubber temperatureK={temperatureK} onTemperatureChange={setTemperatureK} />

                    {/* Active Hovered Element Card */}
                    {activeDisplayElement && (
                        <div className="p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] space-y-2.5 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-10 h-10 rounded-md border flex flex-col items-center justify-center font-mono shadow-2xs shrink-0"
                                        style={{
                                            backgroundColor: `${categoryColors[activeDisplayElement.category]}18`,
                                            borderColor: `${categoryColors[activeDisplayElement.category]}45`,
                                        }}
                                    >
                                        <span className="text-[9px] text-[var(--color-ink-muted)] font-medium leading-none">{activeDisplayElement.atomicNumber}</span>
                                        <span className="text-sm font-bold leading-none mt-0.5 font-display" style={{ color: categoryColors[activeDisplayElement.category] }}>
                                            {activeDisplayElement.symbol}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-semibold text-sm text-[var(--color-ink-primary)] font-display">{activeDisplayElement.name}</h3>
                                            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">#{activeDisplayElement.atomicNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span
                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                                                style={{
                                                    backgroundColor: `${categoryColors[activeDisplayElement.category]}18`,
                                                    color: categoryColors[activeDisplayElement.category],
                                                    borderColor: `${categoryColors[activeDisplayElement.category]}40`,
                                                }}
                                            >
                                                {categoryLabels[activeDisplayElement.category]}
                                            </span>
                                            <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                                                {activeDisplayElement.atomicMass.toFixed(2)} u
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleQuickAction('explore', activeDisplayElement)}
                                    className="btn-primary h-7.5 px-3 text-xs flex items-center gap-1.5"
                                >
                                    <Atom className="w-3.5 h-3.5 text-white" />
                                    <span>Explore 3D</span>
                                </button>
                            </div>

                            {/* Quick Action Dispatch Buttons */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[var(--color-hairline)] font-sans">
                                <button
                                    onClick={() => handleQuickAction('compare', activeDisplayElement)}
                                    className="h-7.5 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <GitCompare className="w-3 h-3 text-[var(--color-accent)]" /> Compare
                                </button>
                                <button
                                    onClick={() => handleQuickAction('reactions', activeDisplayElement)}
                                    className="h-7.5 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <FlaskConical className="w-3 h-3 text-amber-400" /> React
                                </button>
                                <button
                                    onClick={() => handleQuickAction('builder', activeDisplayElement)}
                                    className="h-7.5 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Boxes className="w-3 h-3 text-emerald-400" /> Build
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
                        onClick={() => setPopupElement(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="bg-[var(--color-surface-2)] border border-[var(--color-hairline)] rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3.5 text-[var(--color-ink-primary)] font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const pal = getElementPalette(popupElement);
                                return (
                                    <>
                                        <div className="flex items-start justify-between border-b border-[var(--color-hairline)] pb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold border shadow-xs"
                                                    style={{
                                                        borderColor: pal.border,
                                                        backgroundColor: `${pal.primary}18`,
                                                    }}
                                                >
                                                    <span className="text-[10px] text-[var(--color-ink-muted)] font-mono leading-none">{popupElement.atomicNumber}</span>
                                                    <span className="text-lg font-bold leading-none mt-0.5 font-display" style={{ color: pal.primary }}>{popupElement.symbol}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-semibold text-[var(--color-ink-primary)] font-display">{popupElement.name}</h3>
                                                    <p className="text-xs font-medium" style={{ color: pal.primary }}>{categoryLabels[popupElement.category]}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setPopupElement(null)} className="w-7 h-7 rounded-md hover:bg-[var(--color-surface-3)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Vector SVG Atom Bohr Shells Diagram */}
                                        <div className="flex items-center justify-center p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] overflow-hidden">
                                            <AtomSvgDiagram
                                                element={popupElement}
                                                size={150}
                                                animated={true}
                                                interactive={true}
                                                showLabels={true}
                                            />
                                        </div>

                                        <SpectroscopyBar element={popupElement} />
                                    </>
                                );
                            })()}

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                                    <span className="text-[var(--color-ink-muted)] text-[11px] font-sans font-medium block">Atomic Mass</span>
                                    <div className="font-semibold text-xs text-[var(--color-ink-primary)] mt-0.5 font-mono tnum">{popupElement.atomicMass} u</div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                                    <span className="text-[var(--color-ink-muted)] text-[11px] font-sans font-medium block">Electron Shells</span>
                                    <div className="font-semibold text-xs text-[var(--color-ink-primary)] mt-0.5 font-mono tnum">{popupElement.shells.join(' · ')}</div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                                    <span className="text-[var(--color-ink-muted)] text-[11px] font-sans font-medium block">Melting Point</span>
                                    <div className="font-semibold text-xs text-[var(--color-ink-primary)] mt-0.5 font-mono tnum">{elementProperties[popupElement.atomicNumber]?.meltingPoint ?? 'N/A'} K</div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                                    <span className="text-[var(--color-ink-muted)] text-[11px] font-sans font-medium block">Boiling Point</span>
                                    <div className="font-semibold text-xs text-[var(--color-ink-primary)] mt-0.5 font-mono tnum">{elementProperties[popupElement.atomicNumber]?.boilingPoint ?? 'N/A'} K</div>
                                </div>
                            </div>

                            {/* 1-Click Launch Actions in Popup */}
                            <div className="flex gap-2 pt-2 border-t border-[var(--color-hairline)]">
                                <button
                                    onClick={() => {
                                        audioEngine.playClick(920);
                                        setPopupElement(null);
                                        handleQuickAction('explore', popupElement);
                                    }}
                                    className="btn-primary flex-1 h-9 flex items-center justify-center gap-1.5"
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Launch 3D Quantum Stage
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
