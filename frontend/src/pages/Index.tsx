import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Atom,
  Beaker,
  BookOpen,
  Boxes,
  ChevronRight,
  FlaskConical,
  GitCompare,
  Grid3X3,
  Info,
  Library,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  Keyboard,
  RotateCcw,
  Bookmark,
  Check,
  Search,
  Volume2,
  VolumeX,
  X,
  Zap,
  ArrowUpRight,
  Compass,
  Sliders,
  Flame,
  Activity,
  Layers3,
  Dna,
  PanelLeft,
  Save,
} from 'lucide-react';
import { Atom3D, CameraPreset } from '@/components/Atom3D';
import { AtomStage, QuantumVisualizationMode } from '@/visualization/scene/AtomStage';
import { buildScientificState } from '@/scientific/ScientificEngine';
import { BohrModel3D } from '@/components/BohrModel3D';
import { ComparisonMode } from '@/components/ComparisonMode';
import { CrystalLattice3D } from '@/components/CrystalLattice3D';
import { NuclearDecayLab } from '@/components/NuclearDecayLab';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Molecule3D } from '@/components/Molecule3D';
import { MoleculeBuilder } from '@/components/MoleculeBuilder';
import { PeriodicTableGrid } from '@/components/PeriodicTableGrid';
import { ReactionSimulator } from '@/components/ReactionSimulator';
import { SpectroscopyBar } from '@/components/SpectroscopyBar';
import { QuantumNumbersHUD } from '@/components/QuantumNumbersHUD';
import { LibraryManager } from '@/components/LibraryManager';
import { elementProperties } from '@/data/elementProperties';
import { getIsotopesForElement } from '@/data/isotopes';
import { categoryLabels, categoryColors, getElementColor, getElementBlock, ChemicalElement, ElementCategory, elements } from '@/data/elements';
import { Molecule, molecules } from '@/data/molecules';
import { cn } from '@/lib/utils';
import { sendProductEvent } from '@/lib/productSocket';
import { sessionApi } from '@/lib/sessions';
import { audioEngine } from '@/lib/audioEngine';
import { SavedSession, WorkspaceMode, useAppStore } from '@/store/useAppStore';

const workspaces: { id: WorkspaceMode; label: string; icon: typeof Atom }[] = [
  { id: 'explore', label: 'Explore', icon: Atom },
  { id: 'table', label: 'Periodic Table', icon: Grid3X3 },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'reactions', label: 'Reactions', icon: Zap },
  { id: 'builder', label: 'Builder', icon: Boxes },
  { id: 'decay', label: 'Nuclear Decay', icon: Radio },
  { id: 'lattice', label: 'Crystal Lattice', icon: Layers },
  { id: 'library', label: 'Library', icon: Library },
];

const categories = Object.keys(categoryLabels) as ElementCategory[];

const KNOWN_ELECTRON_CONFIGS: Record<number, string> = {
  1: '1s¹',
  2: '1s²',
  3: '[He] 2s¹',
  4: '[He] 2s²',
  5: '[He] 2s² 2p¹',
  6: '[He] 2s² 2p²',
  7: '[He] 2s² 2p³',
  8: '[He] 2s² 2p⁴',
  9: '[He] 2s² 2p⁵',
  10: '[He] 2s² 2p⁶',
  11: '[Ne] 3s¹',
  12: '[Ne] 3s²',
  13: '[Ne] 3s² 3p¹',
  14: '[Ne] 3s² 3p²',
  15: '[Ne] 3s² 3p³',
  16: '[Ne] 3s² 3p⁴',
  17: '[Ne] 3s² 3p⁵',
  18: '[Ne] 3s² 3p⁶',
  19: '[Ar] 4s¹',
  20: '[Ar] 4s²',
  21: '[Ar] 3d¹ 4s²',
  22: '[Ar] 3d² 4s²',
  23: '[Ar] 3d³ 4s²',
  24: '[Ar] 3d⁵ 4s¹',
  25: '[Ar] 3d⁵ 4s²',
  26: '[Ar] 3d⁶ 4s²',
  27: '[Ar] 3d⁷ 4s²',
  28: '[Ar] 3d⁸ 4s²',
  29: '[Ar] 3d¹⁰ 4s¹',
  30: '[Ar] 3d¹⁰ 4s²',
  31: '[Ar] 3d¹⁰ 4s² 4p¹',
  32: '[Ar] 3d¹⁰ 4s² 4p²',
  33: '[Ar] 3d¹⁰ 4s² 4p³',
  34: '[Ar] 3d¹⁰ 4s² 4p⁴',
  35: '[Ar] 3d¹⁰ 4s² 4p⁵',
  36: '[Ar] 3d¹⁰ 4s² 4p⁶',
  47: '[Kr] 4d¹⁰ 5s¹',
  79: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹',
  92: '[Rn] 5f³ 6d¹ 7s²',
};

function getElectronConfig(atomicNumber: number): React.ReactNode {
  if (KNOWN_ELECTRON_CONFIGS[atomicNumber]) {
    const raw = KNOWN_ELECTRON_CONFIGS[atomicNumber];
    return <span className="font-mono font-semibold tracking-tight text-slate-800">{raw}</span>;
  }
  const orbitals = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
  const maxElectrons = [2, 2, 6, 2, 6, 2, 10, 6, 2, 10, 6, 2, 14, 10, 6, 2, 14, 10, 6];
  let remaining = atomicNumber;
  const config: React.ReactNode[] = [];
  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const count = Math.min(remaining, maxElectrons[i]);
    config.push(
      <span key={orbitals[i]} className="mr-[2px]">
        {orbitals[i]}<sup className="text-[10px] text-[#0071e3] font-bold">{count}</sup>
      </span>
    );
    remaining -= count;
  }
  return <span className="font-mono font-medium">{config}</span>;
}

const formatTemp = (kelvin: number | null | undefined, unit: 'C' | 'K' | 'F' = 'C') => {
  if (kelvin == null) return 'N/A';
  if (unit === 'K') return `${kelvin} K`;
  if (unit === 'F') return `${Math.round((kelvin - 273.15) * 9/5 + 32)} °F`;
  return `${Math.round(kelvin - 273.15)} °C`;
};

const Loader = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-400">
    <Atom className="mr-2 h-4 w-4 animate-spin text-[#0071e3]" />
    <span>Loading interactive quantum model...</span>
  </div>
);

function TopBar({
  onSave,
  saveState,
  onOpenShortcuts,
  leftCollapsed,
  onToggleLeftCollapse,
}: {
  onSave: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onOpenShortcuts: () => void;
  leftCollapsed?: boolean;
  onToggleLeftCollapse?: () => void;
}) {
  const {
    commandOpen,
    setCommandOpen,
    setWorkspaceMode,
    setSelectedElement,
    setSelectedMolecule,
    setSearchQuery,
  } = useAppStore();

  const [isMuted, setIsMuted] = useState(audioEngine.isMuted());

  const handleHome = () => {
    setWorkspaceMode('explore');
    setSelectedElement(null);
    setSelectedMolecule(null);
    setSearchQuery('');
  };

  const toggleSound = () => {
    audioEngine.toggleMute();
    setIsMuted(audioEngine.isMuted());
  };

  return (
    <header className="workbench-topbar">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleLeftCollapse && (
          <button
            onClick={onToggleLeftCollapse}
            className={cn(
              "w-7 h-7 rounded-md border flex items-center justify-center transition-colors shrink-0",
              !leftCollapsed
                ? "bg-slate-100 border-slate-300 text-[#0071e3]"
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
            )}
            title={leftCollapsed ? "Expand Elements Rail" : "Collapse Elements Rail"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <button 
          className="flex items-center gap-2.5 text-left transition-transform hover:opacity-90 active:scale-[0.99] group shrink-0" 
          onClick={handleHome}
          title="Return to Workbench Home"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0071e3] shadow-xs shrink-0 group-hover:scale-105 transition-all">
            <Atom className="h-4 w-4 animate-[spin_16s_linear_infinite]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-extrabold tracking-tight text-slate-900 leading-none">
              Ele-Visualize
            </span>
            <span className="hidden lg:inline-block text-[10px] text-slate-400 font-mono font-medium pl-1.5 border-l border-slate-200">
              Quantum Workbench
            </span>
          </div>
        </button>
      </div>

      {/* Pill Search Input */}
      <button 
        className="command-trigger group hidden md:flex max-w-md mx-4 h-8 px-3 rounded-full bg-slate-100/70 hover:bg-slate-100/90 border border-slate-200/80 transition-all items-center gap-2" 
        onClick={() => setCommandOpen(!commandOpen)}
      >
        <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0071e3] transition-colors shrink-0" />
        <span className="truncate flex-1 text-slate-400 font-medium text-xs text-left">
          Search 118 elements, molecules, or workspaces...
        </span>
        <kbd className="hidden rounded bg-white border border-slate-200/80 px-1.5 py-0.2 text-[9px] text-slate-500 font-mono font-bold sm:inline shadow-xs">⌘K</kbd>
      </button>

      {/* Right Action Icons & Controls Deck */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {/* Real-time Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[10px] font-mono font-semibold text-slate-600 mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>118 Elements Online</span>
        </div>

        <button
          className="icon-button md:hidden"
          onClick={() => setCommandOpen(!commandOpen)}
          title="Search (/)"
        >
          <Search className="h-3.5 w-3.5 text-slate-600" />
        </button>

        <button
          className="icon-button"
          onClick={toggleSound}
          title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5 text-slate-400" /> : <Volume2 className="h-3.5 w-3.5 text-slate-600" />}
        </button>

        <button
          className="icon-button hidden sm:inline-flex"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5 text-slate-600" />
        </button>

        <button
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 ml-1 border active:scale-[0.98]",
            saveState === 'saved'
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200"
              : saveState === 'error'
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : saveState === 'saving'
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-wait"
              : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 hover:border-slate-800 shadow-sm"
          )}
          onClick={onSave}
          disabled={saveState === 'saving'}
          title="Save current workspace snapshot to Library"
        >
          {saveState === 'saving' ? (
            <>
              <Atom className="h-3.5 w-3.5 animate-spin text-slate-400" />
              <span>Saving...</span>
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in-50" />
              <span className="font-bold">Saved to Library</span>
            </>
          ) : saveState === 'error' ? (
            <>
              <X className="h-3.5 w-3.5 text-rose-600" />
              <span>Failed</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5 text-slate-300" />
              <span>Save State</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

function WorkspaceNav() {
  const { workspaceMode, setWorkspaceMode, setMainViewMode } = useAppStore();

  const selectWorkspace = (mode: WorkspaceMode) => {
    audioEngine.playClick(840);
    setWorkspaceMode(mode);
    const map: Record<WorkspaceMode, '3d' | 'grid' | 'compare' | 'reaction' | 'builder'> = {
      explore: '3d',
      table: 'grid',
      compare: 'compare',
      reactions: 'reaction',
      builder: 'builder',
      decay: '3d',
      lattice: '3d',
      lab: '3d',
      library: '3d',
    };
    setMainViewMode(map[mode]);
    sendProductEvent({ type: 'presence', workspaceMode: mode });
  };

  return (
    <nav className="workspace-nav">
      {workspaces.map(({ id, label, icon: Icon }) => {
        const isActive = workspaceMode === id;
        return (
          <button
            key={id}
            onClick={() => selectWorkspace(id)}
            className={cn('workspace-tab relative', isActive && 'is-active')}
          >
            <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#0071e3]" : "text-slate-400")} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function CommandPalette({
  filteredElements,
  filteredMolecules,
  onSelectElement,
  onSelectMolecule,
  onSave,
}: {
  filteredElements: ChemicalElement[];
  filteredMolecules: Molecule[];
  onSelectElement: (element: ChemicalElement) => void;
  onSelectMolecule: (molecule: Molecule) => void;
  onSave: () => void;
}) {
  const {
    commandOpen,
    searchQuery,
    showOrbitals,
    setCommandOpen,
    setSearchQuery,
    setShowOrbitals,
    setWorkspaceMode,
  } = useAppStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandOpen, commandOpen]);

  const actions = [
    { label: 'Open Periodic Table', icon: Grid3X3, run: () => setWorkspaceMode('table') },
    { label: 'Compare Elements', icon: GitCompare, run: () => setWorkspaceMode('compare') },
    { label: 'Start Reaction Simulator', icon: Zap, run: () => setWorkspaceMode('reactions') },
    { label: 'Open Molecule Builder', icon: Boxes, run: () => setWorkspaceMode('builder') },
    { label: 'Explore Nuclear Decay', icon: Radio, run: () => setWorkspaceMode('decay') },
    { label: showOrbitals ? 'Hide Orbitals' : 'Show Quantum Orbitals', icon: Layers, run: () => setShowOrbitals(!showOrbitals) },
    { label: 'Save Current Session', icon: Bookmark, run: onSave },
  ];

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/30 backdrop-blur-sm p-4 flex items-start justify-center pt-20" onMouseDown={() => setCommandOpen(false)}>
      <motion.div
        initial={{ y: -15, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -15, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white border border-slate-200 text-slate-900 shadow-2xl rounded-2xl max-w-xl w-full overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <Search className="h-4 w-4 text-[#0071e3]" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 font-sans"
            placeholder="Search elements, molecules, or commands..."
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider px-3 py-1 font-semibold">Quick Actions</div>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 transition-colors"
              onClick={() => {
                run();
                setCommandOpen(false);
              }}
            >
              <Icon className="h-4 w-4 text-[#0071e3]" />
              <span>{label}</span>
            </button>
          ))}

          <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider px-3 py-1 font-semibold mt-3">Elements</div>
          {filteredElements.slice(0, 8).map((element) => {
            const color = getElementColor(element);
            return (
              <button
                key={element.atomicNumber}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 transition-colors"
                onClick={() => {
                  onSelectElement(element);
                  setCommandOpen(false);
                }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center font-bold text-xs rounded-lg font-mono shrink-0 shadow-xs"
                  style={{ backgroundColor: `${color}15`, color: color }}
                >
                  {element.symbol}
                </span>
                <span className="font-semibold text-slate-900">{element.name}</span>
                <span className="text-xs text-slate-400 font-normal">({categoryLabels[element.category]})</span>
                <span className="ml-auto text-xs font-mono text-slate-400 font-medium">#{element.atomicNumber}</span>
              </button>
            );
          })}

          <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider px-3 py-1 font-semibold mt-3">Molecules</div>
          {filteredMolecules.slice(0, 6).map((molecule) => (
            <button
              key={molecule.formula}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 transition-colors"
              onClick={() => {
                onSelectMolecule(molecule);
                setCommandOpen(false);
              }}
            >
              <FlaskConical className="h-4 w-4 text-[#0071e3]" />
              <span className="font-semibold text-slate-900">{molecule.name}</span>
              <span className="ml-auto text-xs font-mono text-slate-400 font-semibold">{molecule.formula}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function DiscoveryRail({
  filteredElements,
  filteredMolecules,
  onSelectElement,
  onSelectMolecule,
  onToggleCollapse,
}: {
  filteredElements: ChemicalElement[];
  filteredMolecules: Molecule[];
  onSelectElement: (element: ChemicalElement) => void;
  onSelectMolecule: (molecule: Molecule) => void;
  onToggleCollapse?: () => void;
}) {
  const { activeFilter, viewMode, setActiveFilter, setViewMode, selectedElement, searchQuery, setSearchQuery } = useAppStore();

  // Dynamic count of elements per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: elements.length };
    elements.forEach((el) => {
      counts[el.category] = (counts[el.category] || 0) + 1;
    });
    return counts;
  }, []);

  const CATEGORY_CHIP_DATA: Record<ElementCategory, {
    label: string;
    dotColor: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    activeBg: string;
    activeText: string;
  }> = {
    'alkali-metal': {
      label: 'Alkali',
      dotColor: '#dc2626',
      bgClass: 'bg-red-50/90',
      textClass: 'text-red-950',
      borderClass: 'border-red-200/80',
      activeBg: 'bg-red-600',
      activeText: 'text-white',
    },
    'alkaline-earth': {
      label: 'Alkaline',
      dotColor: '#ea580c',
      bgClass: 'bg-orange-50/90',
      textClass: 'text-orange-950',
      borderClass: 'border-orange-200/80',
      activeBg: 'bg-orange-600',
      activeText: 'text-white',
    },
    'transition-metal': {
      label: 'Transition',
      dotColor: '#d97706',
      bgClass: 'bg-amber-50/90',
      textClass: 'text-amber-950',
      borderClass: 'border-amber-200/80',
      activeBg: 'bg-amber-600',
      activeText: 'text-white',
    },
    'post-transition': {
      label: 'Post-Trans',
      dotColor: '#059669',
      bgClass: 'bg-emerald-50/90',
      textClass: 'text-emerald-950',
      borderClass: 'border-emerald-200/80',
      activeBg: 'bg-emerald-600',
      activeText: 'text-white',
    },
    'metalloid': {
      label: 'Metalloids',
      dotColor: '#0891b2',
      bgClass: 'bg-cyan-50/90',
      textClass: 'text-cyan-950',
      borderClass: 'border-cyan-200/80',
      activeBg: 'bg-cyan-600',
      activeText: 'text-white',
    },
    'nonmetal': {
      label: 'Nonmetals',
      dotColor: '#2563eb',
      bgClass: 'bg-blue-50/90',
      textClass: 'text-blue-950',
      borderClass: 'border-blue-200/80',
      activeBg: 'bg-[#0071e3]',
      activeText: 'text-white',
    },
    'halogen': {
      label: 'Halogens',
      dotColor: '#7c3aed',
      bgClass: 'bg-purple-50/90',
      textClass: 'text-purple-950',
      borderClass: 'border-purple-200/80',
      activeBg: 'bg-purple-600',
      activeText: 'text-white',
    },
    'noble-gas': {
      label: 'Noble Gases',
      dotColor: '#c026d3',
      bgClass: 'bg-fuchsia-50/90',
      textClass: 'text-fuchsia-950',
      borderClass: 'border-fuchsia-200/80',
      activeBg: 'bg-fuchsia-600',
      activeText: 'text-white',
    },
    'lanthanide': {
      label: 'Lanthanides',
      dotColor: '#db2777',
      bgClass: 'bg-pink-50/90',
      textClass: 'text-pink-950',
      borderClass: 'border-pink-200/80',
      activeBg: 'bg-pink-600',
      activeText: 'text-white',
    },
    'actinide': {
      label: 'Actinides',
      dotColor: '#be123c',
      bgClass: 'bg-rose-50/90',
      textClass: 'text-rose-950',
      borderClass: 'border-rose-200/80',
      activeBg: 'bg-rose-700',
      activeText: 'text-white',
    },
  };

  const [showCategoryGrid, setShowCategoryGrid] = useState(true);

  return (
    <aside className="discovery-rail flex flex-col h-full bg-[#fbfbfd]">
      {/* Pinned Top: Mode Switcher & Search (Slim ~75px header) */}
      <div className="p-3 border-b border-slate-200/80 space-y-2 flex-none bg-[#fbfbfd] z-10">
        {/* Section 1: DISCOVERY Segmented Pill Switcher */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-200/70 border border-slate-200/80 text-xs font-semibold shadow-inner">
          <button
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all text-xs font-bold",
              viewMode === 'atoms'
                ? "bg-white text-[#0071e3] shadow-sm border border-slate-200/80 ring-1 ring-black/[0.03]"
                : "text-slate-500 hover:text-slate-900"
            )}
            onClick={() => setViewMode('atoms')}
          >
            <Atom className={cn("h-3.5 w-3.5", viewMode === 'atoms' ? "text-[#0071e3]" : "text-slate-400")} />
            <span>Atoms ({elements.length})</span>
          </button>
          <button
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all text-xs font-bold",
              viewMode === 'molecules'
                ? "bg-white text-[#0071e3] shadow-sm border border-slate-200/80 ring-1 ring-black/[0.03]"
                : "text-slate-500 hover:text-slate-900"
            )}
            onClick={() => setViewMode('molecules')}
          >
            <FlaskConical className={cn("h-3.5 w-3.5", viewMode === 'molecules' ? "text-[#0071e3]" : "text-slate-400")} />
            <span>Molecules (20)</span>
          </button>
        </div>

        {/* Section 2: Quick Search inside Sidebar */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'atoms' ? "Filter 118 elements..." : "Filter molecules..."}
            className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-slate-200/80 rounded-lg outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-blue-100 transition-all font-sans text-slate-900 placeholder:text-slate-400"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-400 border border-slate-200">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Unified Smooth Scrollable Stream (Category Grid + Elements List) */}
      <div className="rail-list flex-1 overflow-y-auto p-3 space-y-3">
        {/* Section 3: Category Filter (Standard 2-Column Grid) */}
        {viewMode === 'atoms' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Category</span>
              <span className="text-[10px] font-mono text-slate-400">10 Groups</span>
            </div>

            {/* Master "All 118 Elements" Chip */}
            <button
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs",
                activeFilter === 'all'
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              onClick={() => setActiveFilter('all')}
            >
              <div className="flex items-center gap-1.5">
                <Layers className={cn("w-3.5 h-3.5", activeFilter === 'all' ? "text-[#0071e3]" : "text-slate-400")} />
                <span className="font-bold">All 118 Elements</span>
              </div>
              <span className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                activeFilter === 'all' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {elements.length}
              </span>
            </button>

            {/* 2-Column Grid with Authentic Chemistry Colors */}
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((category) => {
                const config = CATEGORY_CHIP_DATA[category] || {
                  label: categoryLabels[category],
                  dotColor: '#0284c7',
                  bgClass: 'bg-slate-50',
                  textClass: 'text-slate-800',
                  borderClass: 'border-slate-200',
                  activeBg: 'bg-[#0071e3]',
                  activeText: 'text-white',
                };
                const isActive = activeFilter === category;
                const count = categoryCounts[category] || 0;

                return (
                  <button
                    key={category}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border shadow-xs text-left group",
                      isActive
                        ? `${config.activeBg} ${config.activeText} border-transparent shadow-sm ring-1 ring-black/10`
                        : `${config.bgClass} ${config.textClass} ${config.borderClass} hover:opacity-90`
                    )}
                    onClick={() => setActiveFilter(category)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0 shadow-xs",
                          isActive ? "bg-white ring-1 ring-white/60" : ""
                        )}
                        style={{ backgroundColor: isActive ? '#ffffff' : config.dotColor }}
                      />
                      <span className="truncate">{config.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ml-1",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-white/80 text-slate-700 border border-black/[0.04]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: ELEMENTS Header */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {viewMode === 'atoms' ? `Elements (${filteredElements.length})` : `Molecules (${filteredMolecules.length})`}
          </span>
        </div>

        {/* Section 5: ELEMENTS List with Rich Cards */}
        <div className="space-y-1.5 pb-2">
          {viewMode === 'atoms'
            ? filteredElements.map((element) => {
              const color = getElementColor(element);
              const isSelected = selectedElement?.atomicNumber === element.atomicNumber;
              return (
                <button
                  key={element.atomicNumber}
                  className={cn(
                    "w-full p-2.5 rounded-xl border border-slate-200/70 bg-white hover:border-blue-300 hover:shadow-card transition-all flex items-center gap-3 text-left group",
                    isSelected && "bg-blue-50/70 border-[#0071e3] ring-1 ring-[#0071e3]/40 shadow-xs"
                  )}
                  onClick={() => onSelectElement(element)}
                >
                  {/* Large Symbol Box with Atomic Number */}
                  <div
                    className="flex flex-col items-center justify-center h-11 w-11 rounded-xl border font-sans shrink-0 shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${color}14`,
                      borderColor: isSelected ? '#0071e3' : `${color}40`,
                    }}
                  >
                    <span className="text-[9px] font-mono leading-none text-slate-400 font-bold">{element.atomicNumber}</span>
                    <span className="text-sm font-extrabold leading-none my-0.5" style={{ color }}>{element.symbol}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-slate-900 group-hover:text-[#0071e3] transition-colors">{element.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 font-medium">{element.atomicMass.toFixed(1)} u</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                      <span className="font-semibold truncate" style={{ color }}>{categoryLabels[element.category]}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 uppercase font-bold shrink-0">{getElementBlock(element.atomicNumber)}-BLK</span>
                    </div>
                  </div>
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isSelected ? "text-[#0071e3]" : "text-slate-300 group-hover:text-slate-600")} />
                </button>
              );
            })
            : filteredMolecules.map((molecule) => (
              <button
                key={molecule.formula}
                className="w-full p-2.5 rounded-xl border border-slate-200/70 bg-white hover:border-blue-300 hover:shadow-card transition-all flex items-center gap-3 text-left group"
                onClick={() => onSelectMolecule(molecule)}
              >
                <span className="flex h-11 w-12 items-center justify-center font-bold text-xs rounded-xl bg-blue-50 text-[#0071e3] border border-blue-200 shrink-0 font-mono shadow-xs">
                  {molecule.formula}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-[#0071e3] transition-colors">{molecule.name}</span>
                  <span className="block truncate text-[10px] text-slate-400 font-mono">{molecule.atoms.length} atoms • {molecule.bonds.length} bonds</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
              </button>
            ))}
        </div>
      </div>

      {/* Collapse Rail Button */}
      {onToggleCollapse && (
        <div className="p-2 border-t border-slate-200/80 flex items-center justify-center">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-xs"
            title="Collapse Sidebar"
          >
            <span className="font-mono text-xs font-bold">«</span>
          </button>
        </div>
      )}
    </aside>
  );
}

function VisualStage({
  selectedElement,
  selectedMolecule,
  onSelectElement,
  onToggleInspector,
  isInspectorOpen,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onSelectElement: (element: ChemicalElement) => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}) {
  const {
    animationSpeed,
    isFullscreen,
    isPaused,
    showOrbitals,
    viewMode,
    zoomLevel,
    setIsFullscreen,
    setShowOrbitals,
    setWorkspaceMode,
    setAnimationSpeed,
    setZoomLevel,
  } = useAppStore();

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('3d');
  const [quantumMode, setQuantumMode] = useState<QuantumVisualizationMode>('SHELLS');
  const [autoRotate, setAutoRotate] = useState(false);
  const selectedIsotopeIdx = 0;
  const ionCharge = 0;

  const isotopes = useMemo(() => (selectedElement ? getIsotopesForElement(selectedElement.atomicNumber) : []), [selectedElement]);
  const activeIsotope = isotopes[selectedIsotopeIdx] || isotopes[0];

  const scientificState = useMemo(() => {
    if (!selectedElement) return null;
    return buildScientificState(selectedElement, activeIsotope || undefined);
  }, [selectedElement, activeIsotope]);

  const ionizedElectrons = useMemo(() => {
    if (!selectedElement) return [];
    const shells = [...selectedElement.shells];
    if (ionCharge !== 0 && shells.length > 0) {
      const lastIdx = shells.length - 1;
      shells[lastIdx] = Math.max(0, shells[lastIdx] - ionCharge);
    }
    return shells;
  }, [selectedElement, ionCharge]);

  const stageColor = selectedElement ? getElementColor(selectedElement) : '#0071e3';

  // Popular elements quick picks
  const featuredQuickPicks = useMemo(() => [
    { symbol: 'H', name: 'Hydrogen', color: '#0284c7' },
    { symbol: 'C', name: 'Carbon', color: '#059669' },
    { symbol: 'O', name: 'Oxygen', color: '#2563eb' },
    { symbol: 'Au', name: 'Gold', color: '#d97706' },
    { symbol: 'Fe', name: 'Iron', color: '#ea580c' },
    { symbol: 'U', name: 'Uranium', color: '#9333ea' },
    { symbol: 'Ne', name: 'Neon', color: '#c026d3' },
    { symbol: 'Ti', name: 'Titanium', color: '#475569' },
  ], []);

  // Quick feature launch cards
  const featureLaunchCards = [
    {
      title: '3D Atomic Visualizer',
      description: 'Interact with Bohr quantum shells, electron probability orbitals, and nuclear clusters.',
      icon: Atom,
      action: () => {
        const el = elements[0];
        if (el) onSelectElement(el);
      },
      tag: 'Core Stage',
    },
    {
      title: 'Interactive Periodic Table',
      description: 'Explore the complete 118-element IUPAC matrix with electronic configurations.',
      icon: Grid3X3,
      action: () => setWorkspaceMode('table'),
      tag: '118 Elements',
    },
    {
      title: 'Element Comparison',
      description: 'Side-by-side metric comparison, ionization energies, and electronegativity curves.',
      icon: GitCompare,
      action: () => setWorkspaceMode('compare'),
      tag: 'Analytics',
    },
    {
      title: 'Chemical Reaction Lab',
      description: 'Simulate molecular bonding, reaction kinetics, and exothermic enthalpy releases.',
      icon: Zap,
      action: () => setWorkspaceMode('reactions'),
      tag: 'Simulation',
    },
    {
      title: 'Molecule Builder',
      description: 'Construct custom 2D & 3D chemical structures with real-time valence solver.',
      icon: Boxes,
      action: () => setWorkspaceMode('builder'),
      tag: 'Synthesis',
    },
    {
      title: 'Nuclear Decay Lab',
      description: 'Track isotope half-lives, alpha/beta decay chains, and radiation emissions.',
      icon: Radio,
      action: () => setWorkspaceMode('decay'),
      tag: 'Nuclear Lab',
    },
  ];

  return (
    <section className={cn('visual-stage relative', isFullscreen && 'is-fullscreen')}>
      {/* Active Element Top Laboratory Command Bar */}
      {(selectedElement || selectedMolecule) && (
        <div className="stage-toolbar flex items-center justify-between px-3 sm:px-4 h-12 bg-white/90 border-b border-[#e5e5ea] z-20 gap-2 sm:gap-3 select-none backdrop-blur-md">
          {/* Left: Element Lockup & Adaptive Metrics */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {selectedElement && (
              <div
                className="w-8 h-8 rounded-md border flex flex-col items-center justify-center font-mono shrink-0 shadow-2xs"
                style={{
                  backgroundColor: `${stageColor}12`,
                  borderColor: `${stageColor}40`,
                }}
              >
                <span className="text-[7.5px] font-bold text-slate-400 leading-none">{selectedElement.atomicNumber}</span>
                <span className="text-xs font-black leading-none mt-0.5" style={{ color: stageColor }}>
                  {selectedElement.symbol}
                </span>
              </div>
            )}

            {selectedMolecule && (
              <div className="w-8 h-8 rounded-md border border-blue-200 bg-blue-50 flex items-center justify-center font-mono font-bold text-[10px] text-[#0071e3] shrink-0 shadow-2xs">
                {selectedMolecule.formula}
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <h2 className="font-display font-extrabold text-sm text-slate-900 truncate tracking-tight shrink-0">
                {selectedElement ? selectedElement.name : selectedMolecule?.name}
              </h2>

              {selectedElement && (
                <span 
                  className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shadow-2xs shrink-0 whitespace-nowrap",
                    isInspectorOpen ? "hidden 2xl:inline-flex" : "hidden sm:inline-flex"
                  )}
                  style={{
                    backgroundColor: `${stageColor}14`,
                    color: stageColor,
                    borderColor: `${stageColor}40`,
                  }}
                >
                  #{selectedElement.atomicNumber} · {categoryLabels[selectedElement.category]}
                </span>
              )}

              {selectedElement && !isInspectorOpen && (
                <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 text-[11px] font-mono text-slate-500 shrink-0 whitespace-nowrap">
                  <span className="text-slate-700 font-semibold">{getElectronConfig(selectedElement.atomicNumber)}</span>
                  <span>·</span>
                  <span>{selectedElement.atomicMass.toFixed(3)} u</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Adaptive Mode Switcher, Quick Actions & Telemetry Inspector */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Scientific Instrument Mode Switcher */}
            {selectedElement && (
              <div className="flex items-center p-0.5 rounded-md bg-slate-100 border border-[#e5e5ea] text-xs font-mono font-bold shadow-2xs shrink-0">
                {(['SHELLS', 'ORBITALS', 'NUCLEUS', 'SPECTRUM'] as const).map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => {
                      audioEngine.playClick(880);
                      setQuantumMode(m);
                    }}
                    title={`Mode 0${idx + 1}: ${m}`}
                    className={cn(
                      "px-2 py-0.5 text-[10px] uppercase rounded transition-all font-mono whitespace-nowrap",
                      quantumMode === m
                        ? "bg-slate-900 text-white shadow-xs font-extrabold"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {isInspectorOpen ? (
                      <>
                        <span className="hidden xl:inline">0{idx + 1} {m}</span>
                        <span className="xl:hidden">0{idx + 1}</span>
                      </>
                    ) : (
                      <>0{idx + 1} {m}</>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Auto-Spin Orbit */}
            <button
              className={cn(
                "h-7.5 w-7.5 rounded-md border flex items-center justify-center transition-all shadow-2xs shrink-0",
                autoRotate
                  ? "bg-blue-50 border-blue-300 text-[#0071e3]"
                  : "bg-white border-[#e5e5ea] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => {
                audioEngine.playClick(720);
                setAutoRotate(!autoRotate);
              }}
              title="Toggle Auto-Spin Orbit"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Fullscreen */}
            <button
              className="h-7.5 w-7.5 rounded-md bg-white border border-[#e5e5ea] text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs shrink-0"
              onClick={() => {
                audioEngine.playClick(780);
                setIsFullscreen(!isFullscreen);
              }}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            {/* Scientific Telemetry Inspector Sidebar Toggle */}
            {onToggleInspector && (
              <button
                className={cn(
                  "h-7.5 rounded-md text-xs font-mono font-bold transition-all border flex items-center gap-1.5 shadow-2xs shrink-0",
                  isInspectorOpen
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs px-2"
                    : "bg-white text-slate-700 border-[#e5e5ea] hover:bg-slate-50 hover:text-slate-900 px-2.5"
                )}
                onClick={() => {
                  audioEngine.playClick(840);
                  onToggleInspector();
                }}
                title={isInspectorOpen ? "Collapse Telemetry Inspector Sidebar" : "Open Telemetry Inspector Sidebar"}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className={cn(isInspectorOpen ? "hidden 2xl:inline" : "hidden sm:inline")}>Telemetry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="stage-canvas w-full h-full flex-1 relative overflow-y-auto flex flex-col">
        <AnimatePresence mode="wait">
          {/* Active 3D Atom State */}
          {viewMode === 'atoms' && selectedElement && (
            <motion.div
              key={`${selectedElement.atomicNumber}-${activeIsotope?.symbol}-${ionCharge}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full relative flex-1"
            >
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                  {scientificState ? (
                    <AtomStage
                      scientificState={scientificState}
                      activeMode={quantumMode}
                      isPaused={isPaused}
                      autoRotate={autoRotate}
                      animationSpeed={animationSpeed}
                      onSelectMode={setQuantumMode}
                    />
                  ) : (
                    <Atom3D
                      protons={selectedElement.atomicNumber}
                      neutrons={activeIsotope?.neutrons ?? (Math.round(selectedElement.atomicMass) - selectedElement.atomicNumber)}
                      electrons={ionizedElectrons}
                      color={stageColor}
                      symbol={selectedElement.symbol}
                      zoom={zoomLevel}
                      showOrbitals={showOrbitals}
                      showNucleusDetail={false}
                      animationSpeed={animationSpeed}
                      isPaused={isPaused}
                      autoRotate={autoRotate}
                      enableBloom={true}
                      cameraPreset={cameraPreset}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {/* Active 3D Molecule State */}
          {viewMode === 'molecules' && selectedMolecule && (
            <motion.div
              key={selectedMolecule.formula}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full relative flex-1"
            >
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <Molecule3D
                    molecule={selectedMolecule}
                    zoom={zoomLevel}
                    autoRotate={autoRotate}
                    enableBloom={true}
                    spaceFilling={false}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {/* HERO HOME STATE (When No Element/Molecule is Active) */}
          {((viewMode === 'atoms' && !selectedElement) || (viewMode === 'molecules' && !selectedMolecule)) && (
            <motion.div
              key="hero-home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative z-10 max-w-5xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-center text-center w-full my-auto"
            >
              {/* Brand Pill Capsule */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-mono font-bold text-slate-600 mb-2.5 shadow-xs">
                <Atom className="w-3.5 h-3.5 text-[#0071e3] animate-[spin_10s_linear_infinite]" />
                <span>Ele-Visualize · Quantum Workbench</span>
              </div>

              {/* Hero Typography */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-[-0.04em] leading-tight mb-1.5">
                Interactive 3D Chemistry & Atomic Physics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-sans font-medium max-w-xl mx-auto mb-3.5 leading-normal">
                Explore 118 periodic elements, Bohr shells, electron probability orbitals, crystal lattices, and reaction kinetics in real time.
              </p>

              {/* Curated Popular Elements Quick-Pick Strip */}
              <div className="w-full max-w-2xl mb-4">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Quick Pick:
                  </span>
                  {featuredQuickPicks.map((item) => {
                    const el = elements.find(e => e.symbol === item.symbol);
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => el && onSelectElement(el)}
                        className="px-2 py-0.5 rounded-lg border border-slate-200/80 bg-white hover:border-[#0071e3] hover:shadow-xs hover:-translate-y-0.5 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-subtle group"
                      >
                        <span 
                          className="w-4 h-4 rounded flex items-center justify-center font-mono font-bold text-[10px]"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          {item.symbol}
                        </span>
                        <span className="text-slate-700 group-hover:text-slate-900 text-xs">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6 High-Density Precision Feature Launch Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full text-left">
                {featureLaunchCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      onClick={card.action}
                      className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-[#0071e3]/60 hover:shadow-card transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100/90 group-hover:bg-blue-50 group-hover:text-[#0071e3] transition-colors flex items-center justify-center text-slate-600">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 border border-slate-200/60">
                            {card.tag}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#0071e3] transition-colors flex items-center justify-between">
                          <span>{card.title}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#0071e3]" />
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#0071e3] mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        Launch workspace →
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Floating Instrument Scrubber (Active in Molecules Mode) */}
      {viewMode === 'molecules' && selectedMolecule && (
        <div className="stage-status flex flex-wrap items-center justify-between px-5 py-2 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-20 gap-3">
          {/* Left: Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">Zoom:</span>
            
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80">
              {[0.5, 1.0, 2.0].map((zVal) => (
                <button
                  key={zVal}
                  onClick={() => setZoomLevel(zVal)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all",
                    Math.abs(zoomLevel - zVal) < 0.1 ? "bg-white text-[#0071e3] shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {zVal}x
                </button>
              ))}
            </div>

            <input
              aria-label="Zoom slider"
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-20 sm:w-28 accent-[#0071e3] cursor-pointer h-1 bg-slate-200 rounded"
            />
            <span className="text-[10px] font-mono font-bold text-slate-500">{zoomLevel.toFixed(1)}x</span>
          </div>

          {/* Center: Live Shell Telemetry */}
          {selectedElement && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/80">
              <span>Shells: {selectedElement.shells.join(' · ')}</span>
              <span className="text-slate-300">•</span>
              <span>Valence: {selectedElement.shells[selectedElement.shells.length - 1]}e⁻</span>
              <span className="text-slate-300">•</span>
              <span>Radius: {elementProperties[selectedElement.atomicNumber]?.atomicRadius ? `${elementProperties[selectedElement.atomicNumber].atomicRadius} pm` : `${53 * selectedElement.shells.length} pm`}</span>
            </div>
          )}

          {/* Right: Simulation Speed */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">Speed:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80">
              {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAnimationSpeed(spd)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all",
                    Math.abs(animationSpeed - spd) < 0.1 ? "bg-white text-[#0071e3] shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Inspector({
  selectedElement,
  selectedMolecule,
  onCompare,
  onToggleCollapse,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onCompare: (element: ChemicalElement) => void;
  onToggleCollapse?: () => void;
}) {
  const { inspectorTab, setInspectorTab, setWorkspaceMode } = useAppStore();
  const [tempUnit, setTempUnit] = useState<'C' | 'K' | 'F'>('C');
  const props = selectedElement ? elementProperties[selectedElement.atomicNumber] : null;
  const elementColor = selectedElement ? getElementColor(selectedElement) : '#0071e3';

  if (!selectedElement && !selectedMolecule) {
    return null;
  }

  return (
    <aside className="inspector-panel flex flex-col h-full bg-[#fbfbfd]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-[#0071e3]" />
          <span className="text-[11px] uppercase tracking-wider text-slate-800 font-bold font-mono">Scientific Inspector</span>
        </div>
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse} 
            className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" 
            title="Collapse Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Tabs Switcher */}
      <div className="p-2.5 border-b border-slate-200/80 bg-[#fbfbfd]">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-mono font-bold shadow-2xs">
          {(['overview', 'physics', 'structure', 'actions'] as const).map((tab) => {
            const isActive = inspectorTab === tab;
            return (
              <button
                key={tab}
                className={cn(
                  'py-1 rounded-md transition-all uppercase text-center font-mono font-bold',
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                )}
                onClick={() => {
                  audioEngine.playClick(840);
                  setInspectorTab(tab);
                }}
              >
                {tab === 'physics' ? 'Phys' : tab === 'structure' ? 'Struct' : tab}
              </button>
            );
          })}
        </div>
      </div>

      {selectedElement && (
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 font-sans">
          {/* Hero Element Card */}
          <div
            className="p-3 rounded-xl border flex items-center gap-3 bg-white shadow-xs"
            style={{ borderColor: `${elementColor}40` }}
          >
            <div
              className="flex flex-col items-center justify-center h-12 w-12 rounded-xl border shadow-xs shrink-0 font-sans"
              style={{
                backgroundColor: `${elementColor}12`,
                borderColor: `${elementColor}40`,
              }}
            >
              <span className="text-[9px] font-mono leading-none text-slate-400 font-bold">{selectedElement.atomicNumber}</span>
              <span className="text-lg font-black leading-none my-0.5" style={{ color: elementColor }}>{selectedElement.symbol}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-extrabold text-slate-900 truncate font-display tracking-tight">{selectedElement.name}</h3>
                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">#{selectedElement.atomicNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span 
                  className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border"
                  style={{
                    backgroundColor: `${elementColor}14`,
                    color: elementColor,
                    borderColor: `${elementColor}40`,
                  }}
                >
                  {categoryLabels[selectedElement.category]}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {getElementBlock(selectedElement.atomicNumber).toUpperCase()}-BLK
                </span>
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {inspectorTab === 'overview' && (
            <div className="space-y-2.5">
              <QuantumNumbersHUD element={selectedElement} />

              <SpectroscopyBar element={selectedElement} />

              {/* Quantitative Telemetry Matrix (Single Unified Card) */}
              <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden text-xs">
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 font-mono">
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Atomic Mass</span>
                    <span className="mt-0.5 text-xs font-bold text-slate-900">{selectedElement.atomicMass.toFixed(4)} u</span>
                  </div>
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Configuration</span>
                    <span className="mt-0.5 text-xs font-bold text-[#0071e3] truncate">{getElectronConfig(selectedElement.atomicNumber)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 font-mono">
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Electronegativity</span>
                    <span className="mt-0.5 text-xs font-bold text-slate-900">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 2.20'}</span>
                  </div>
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Standard Phase</span>
                    <span className="mt-0.5 text-xs font-bold text-slate-900 capitalize">{props?.state || 'Solid'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Laboratory Action Toolstrip */}
              <div className="grid grid-cols-3 gap-1 pt-0.5 font-sans">
                <button
                  onClick={() => onCompare(selectedElement)}
                  className="h-8 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>
                <button
                  onClick={() => setWorkspaceMode('reactions')}
                  className="h-8 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>React</span>
                </button>
                <button
                  onClick={() => setWorkspaceMode('builder')}
                  className="h-8 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Build</span>
                </button>
              </div>
            </div>
          )}

          {/* Physics & Thermodynamics Tab */}
          {inspectorTab === 'physics' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-0.5">
                <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Thermal Unit:</span>
                <div className="flex gap-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80">
                  {(['C', 'K', 'F'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setTempUnit(u)}
                      className={cn(
                        "px-1.5 py-0.2 text-[10px] font-mono rounded font-bold transition-all",
                        tempUnit === u ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
                      )}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Electron Configuration</span>
                  <strong className="text-slate-900 text-right">{getElectronConfig(selectedElement.atomicNumber)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bohr Shell Population</span>
                  <strong className="text-slate-900">{selectedElement.shells.join(' · ')}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Melting Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.meltingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Boiling Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.boilingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Electronegativity (Pauling)</span>
                  <strong className="text-[#0071e3]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 2.20'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">1st Ionization Energy</span>
                  <strong className="text-slate-900">{props?.ionizationEnergy ? `${props.ionizationEnergy} kJ/mol` : '1312.0 kJ/mol'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mass Density</span>
                  <strong className="text-slate-900">{props?.density ? `${props.density} g/cm³` : '0.08988 g/L'}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Atomic Radius</span>
                  <strong className="text-slate-900">{props?.atomicRadius ? `${props.atomicRadius} pm` : '53 pm'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Structure Tab */}
          {inspectorTab === 'structure' && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Beaker className="h-3.5 w-3.5 text-[#0071e3]" /> Subatomic Particles
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Protons</span>
                    <span className="block mt-0.5 text-xs font-bold text-slate-900">{selectedElement.atomicNumber}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Neutrons</span>
                    <span className="block mt-0.5 text-xs font-bold text-slate-900">{Math.round(selectedElement.atomicMass - selectedElement.atomicNumber)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Electrons</span>
                    <span className="block mt-0.5 text-xs font-bold text-slate-900">{selectedElement.atomicNumber}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Info className="h-3.5 w-3.5 text-[#0071e3]" /> Natural History
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {props?.discoveryYear ? `Isolated and documented in ${props.discoveryYear} CE. ` : 'Known and documented since ancient antiquity. '}
                  At standard temperature and pressure (298.15 K, 1 atm), it adopts a stable <strong>{props?.state || 'solid'}</strong> phase.
                </p>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {inspectorTab === 'actions' && (
            <div className="space-y-1.5 pt-0.5 font-sans">
              <button
                className="w-full h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                onClick={() => onCompare(selectedElement)}
              >
                <GitCompare className="h-3.5 w-3.5 text-[#0071e3]" />
                <span>Compare with Another Element</span>
              </button>
              <button
                className="w-full h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('reactions')}
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                <span>Test in Chemical Reaction Lab</span>
              </button>
              <button
                className="w-full h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('builder')}
              >
                <Boxes className="h-3.5 w-3.5 text-emerald-600" />
                <span>Build Molecules with {selectedElement.symbol}</span>
              </button>
              <button
                className="w-full h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('table')}
              >
                <Grid3X3 className="h-3.5 w-3.5 text-slate-500" />
                <span>View in Periodic Table Grid</span>
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMolecule && (
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 font-sans">
          {/* Hero Molecule Card */}
          <div className="p-3 rounded-lg border border-slate-200/80 bg-white flex items-center gap-3 shadow-xs">
            <span className="flex h-10 w-12 items-center justify-center text-xs font-black rounded-md border border-blue-200 bg-blue-50 text-[#0071e3] font-mono shadow-2xs shrink-0">
              {selectedMolecule.formula}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-slate-900 truncate font-display">{selectedMolecule.name}</h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{selectedMolecule.description}</p>
            </div>
          </div>

          {/* Molecule Overview Tab */}
          {inspectorTab === 'overview' && (
            <div className="space-y-2.5">
              {/* Molecule Telemetry Grid */}
              <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden text-xs font-mono shadow-2xs">
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 p-2">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Total Atoms</span>
                    <span className="mt-0.5 text-xs font-bold text-slate-900 block">{selectedMolecule.atoms.length} atoms</span>
                  </div>
                  <div className="pl-2">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Chemical Bonds</span>
                    <span className="mt-0.5 text-xs font-bold text-slate-900 block">{selectedMolecule.bonds.length} bonds</span>
                  </div>
                </div>
                <div className="p-2 bg-slate-50/50">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Constituent Atoms</span>
                  <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                    {Array.from(new Set(selectedMolecule.atoms.map(a => a.symbol))).map(sym => {
                      const count = selectedMolecule.atoms.filter(a => a.symbol === sym).length;
                      return (
                        <span key={sym} className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0071e3] border border-blue-200/60 font-bold">
                          {count}× {sym}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5 font-sans">
                <button
                  className="h-8 px-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  onClick={() => setWorkspaceMode('builder')}
                >
                  <Boxes className="h-3.5 w-3.5 text-[#0071e3]" />
                  <span>Edit in Builder</span>
                </button>
                <button
                  className="h-8 px-2 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  onClick={() => setWorkspaceMode('reactions')}
                >
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  <span>Reaction Lab</span>
                </button>
              </div>
            </div>
          )}

          {/* Molecule Physics & Thermodynamics Tab */}
          {inspectorTab === 'physics' && (
            <div className="space-y-2">
              <div className="space-y-1.5 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Chemical Formula</span>
                  <strong className="text-[#0071e3] font-bold">{selectedMolecule.formula}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Bond Count</span>
                  <strong className="text-slate-900">{selectedMolecule.bonds.length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Single Bonds (σ)</span>
                  <strong className="text-slate-900">{selectedMolecule.bonds.filter(b => b.order === 1).length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Multiple Bonds (π)</span>
                  <strong className="text-slate-900">{selectedMolecule.bonds.filter(b => b.order > 1).length}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Molecular Mass Estimate</span>
                  <strong className="text-slate-900">
                    {selectedMolecule.atoms.reduce((sum, a) => {
                      const el = elements.find(e => e.symbol === a.symbol);
                      return sum + (el?.atomicMass || 1);
                    }, 0).toFixed(3)} g/mol
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Molecule Structure & VSEPR Tab */}
          {inspectorTab === 'structure' && (
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-slate-200/80 bg-white shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Beaker className="h-3.5 w-3.5 text-[#0071e3]" />
                  <span>3D Atom Coordinates</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[10.5px]">
                  {selectedMolecule.atoms.map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-1.5 rounded bg-slate-50 border border-slate-200/60">
                      <span className="font-bold text-slate-800">{i + 1}. {a.element} ({a.symbol})</span>
                      <span className="text-slate-400 text-[9.5px]">[{a.position.map(n => n.toFixed(1)).join(', ')}]</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200/80 bg-white shadow-xs space-y-1 font-sans">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Info className="h-3.5 w-3.5 text-[#0071e3]" />
                  <span>VSEPR Geometry Note</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedMolecule.description}
                </p>
              </div>
            </div>
          )}

          {/* Molecule Actions Tab */}
          {inspectorTab === 'actions' && (
            <div className="space-y-1.5 pt-0.5 font-sans">
              <button
                className="w-full h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('builder')}
              >
                <Boxes className="h-3.5 w-3.5 text-[#0071e3]" />
                <span>Edit in Molecule Builder</span>
              </button>
              <button
                className="w-full h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('reactions')}
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                <span>Test in Chemical Reaction Lab</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default function Index() {
  const {
    activeFilter,
    comparisonBasket,
    isMobile,
    mainViewMode,
    mobileDrawer,
    savedSessions,
    searchQuery,
    selectedElement,
    selectedMolecule,
    showOrbitals,
    viewMode,
    workspaceMode,
    zenMode,
    addRecentItem,
    addSavedSession,
    addToComparisonBasket,
    removeSavedSession,
    setComparisonBasket,
    setComparisonSlot,
    setIsMobile,
    setMainViewMode,
    setMobileDrawer,
    setSavedSessions,
    setSelectedElement,
    setSelectedMolecule,
    setShowOrbitals,
    setSidebarOpen,
    setViewMode,
    setWorkspaceMode,
    togglePaused,
    toggleZenMode,
  } = useAppStore();

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Dynamic Column Resizing & Width States
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('ele_left_col_width');
    return saved ? Math.max(220, Math.min(450, Number(saved))) : 260;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem('ele_right_col_width');
    return saved ? Math.max(260, Math.min(500, Number(saved))) : 320;
  });
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ele_left_collapsed') === 'true';
  });
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ele_right_collapsed') === 'true';
  });

  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeftRef.current) {
        const newWidth = Math.max(200, Math.min(480, e.clientX));
        setLeftWidth(newWidth);
        localStorage.setItem('ele_left_col_width', String(newWidth));
      } else if (isDraggingRightRef.current) {
        const newWidth = Math.max(260, Math.min(520, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
        localStorage.setItem('ele_right_col_width', String(newWidth));
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeftRef.current) {
        isDraggingLeftRef.current = false;
        setIsDraggingLeft(false);
      }
      if (isDraggingRightRef.current) {
        isDraggingRightRef.current = false;
        setIsDraggingRight(false);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDragLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingLeftRef.current = true;
    setIsDraggingLeft(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startDragRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRightRef.current = true;
    setIsDraggingRight(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleLeftCollapse = () => {
    setLeftCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ele_left_collapsed', String(next));
      return next;
    });
  };

  const toggleRightCollapse = () => {
    setRightCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ele_right_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile, setSidebarOpen]);

  useEffect(() => {
    sessionApi.list().then(setSavedSessions).catch(() => setSavedSessions([]));
  }, [setSavedSessions]);

  const selectElement = useCallback((element: ChemicalElement) => {
    audioEngine.playElementChime(element.atomicNumber);
    setSelectedElement(element);
    setSelectedMolecule(null);
    setViewMode('atoms');
    setWorkspaceMode('explore');
    setRightCollapsed(false);
    setLeftCollapsed(false);
    addRecentItem(`element:${element.atomicNumber}`);
    sendProductEvent({ type: 'presence', workspaceMode: 'explore' });
  }, [addRecentItem, setSelectedElement, setSelectedMolecule, setViewMode, setWorkspaceMode]);

  const selectMolecule = useCallback((molecule: Molecule) => {
    audioEngine.playBondingChord();
    setSelectedMolecule(molecule);
    setSelectedElement(null);
    setViewMode('molecules');
    setWorkspaceMode('explore');
    setRightCollapsed(false);
    setLeftCollapsed(false);
    addRecentItem(`molecule:${molecule.formula}`);
    sendProductEvent({ type: 'molecule_selected', formula: molecule.formula });
  }, [addRecentItem, setSelectedElement, setSelectedMolecule, setViewMode, setWorkspaceMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
      if (event.key === 'e' || event.key === 'E') setWorkspaceMode('explore');
      if (event.key === 't' || event.key === 'T') setWorkspaceMode('table');
      if (event.key === 'c' || event.key === 'C') setWorkspaceMode('compare');
      if (event.key === 'r' || event.key === 'R') setWorkspaceMode('reactions');
      if (event.key === 'b' || event.key === 'B') setWorkspaceMode('builder');
      if (event.key === 'd' || event.key === 'D') setWorkspaceMode('decay');
      if (event.key === 'l' || event.key === 'L') setWorkspaceMode('lattice');
      if (event.key === 'z' || event.key === 'Z') toggleZenMode();
      if (event.key === 'm' || event.key === 'M') audioEngine.toggleMute();
      if (event.key === ' ') {
        event.preventDefault();
        togglePaused();
      }
      if (event.key === 'o' || event.key === 'O') setShowOrbitals(!showOrbitals);
      if (event.key === '[') {
        const currentZ = selectedElement?.atomicNumber || 1;
        const prevEl = elements.find((e) => e.atomicNumber === Math.max(1, currentZ - 1));
        if (prevEl) selectElement(prevEl);
      }
      if (event.key === ']') {
        const currentZ = selectedElement?.atomicNumber || 1;
        const nextEl = elements.find((e) => e.atomicNumber === Math.min(118, currentZ + 1));
        if (nextEl) selectElement(nextEl);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setWorkspaceMode, toggleZenMode, togglePaused, setShowOrbitals, showOrbitals, selectedElement, selectElement]);

  const query = searchQuery.toLowerCase();
  const filteredElements = useMemo(() => elements.filter((element) => {
    const matchesFilter = activeFilter === 'all' || element.category === activeFilter;
    const matchesQuery = !query || element.name.toLowerCase().includes(query) || element.symbol.toLowerCase().includes(query) || String(element.atomicNumber).includes(query);
    return matchesFilter && matchesQuery;
  }), [activeFilter, query]);

  const filteredMolecules = useMemo(() => molecules.filter((molecule) => (
    !query || molecule.name.toLowerCase().includes(query) || molecule.formula.toLowerCase().includes(query) || molecule.description.toLowerCase().includes(query)
  )), [query]);

  const compareElement1 = useMemo(() => elements.find(element => element.atomicNumber === comparisonBasket[0]) || null, [comparisonBasket]);
  const compareElement2 = useMemo(() => elements.find(element => element.atomicNumber === comparisonBasket[1]) || null, [comparisonBasket]);

  const addCompare = (element: ChemicalElement) => {
    addToComparisonBasket(element.atomicNumber);
    setWorkspaceMode('compare');
    setMainViewMode('compare');
    sendProductEvent({ type: 'compare_updated', compareElements: [element.atomicNumber, ...comparisonBasket].slice(0, 2) });
  };

  const saveSession = useCallback(async () => {
    setSaveState('saving');
    try {
      const session = await sessionApi.create({
        title: selectedElement ? `${selectedElement.name} exploration` : selectedMolecule ? `${selectedMolecule.name} molecule` : `${workspaceMode} workspace`,
        selectedElement: selectedElement?.atomicNumber || null,
        selectedMolecule: selectedMolecule?.formula || null,
        workspaceMode,
        compareElements: comparisonBasket,
        builderAtoms: [],
        builderBonds: [],
        notes: '',
        tags: [workspaceMode, viewMode],
      });
      addSavedSession(session);
      sendProductEvent({ type: 'session_opened', sessionId: session.id });
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('error');
      window.setTimeout(() => setSaveState('idle'), 1500);
    }
  }, [addSavedSession, comparisonBasket, selectedElement, selectedMolecule, viewMode, workspaceMode]);

  const openSession = (session: SavedSession) => {
    const element = elements.find(item => item.atomicNumber === session.selectedElement) || null;
    const molecule = molecules.find(item => item.formula === session.selectedMolecule) || null;
    setSelectedElement(element);
    setSelectedMolecule(molecule);
    setComparisonBasket(session.compareElements || []);
    setWorkspaceMode((session.workspaceMode as WorkspaceMode) || 'explore');
    setViewMode(molecule ? 'molecules' : 'atoms');
    sendProductEvent({ type: 'session_opened', sessionId: session.id });
  };

  const deleteSession = async (session: SavedSession) => {
    await sessionApi.delete(session.id).catch(() => undefined);
    removeSavedSession(session.id);
  };

  const workspaceContent = () => {
    if (workspaceMode === 'table' || mainViewMode === 'grid') {
      return (
        <PeriodicTableGrid
          selectedElement={selectedElement}
          onSelectElement={(element) => {
            selectElement(element);
            setWorkspaceMode('explore');
            setMainViewMode('3d');
          }}
          onChangeViewMode={(mode) => {
            const map: Record<string, WorkspaceMode> = { '3d': 'explore', grid: 'table', compare: 'compare', reaction: 'reactions', builder: 'builder' };
            setWorkspaceMode(map[mode] || 'explore');
            setMainViewMode(mode);
          }}
        />
      );
    }
    if (workspaceMode === 'compare') {
      return (
        <ComparisonMode
          element1={compareElement1}
          element2={compareElement2}
          onRemoveElement={(slot) => setComparisonSlot(slot, null)}
        />
      );
    }
    if (workspaceMode === 'reactions') return <ReactionSimulator onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'builder') return <MoleculeBuilder onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'decay') return <NuclearDecayLab onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'lattice') return <CrystalLattice3D onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'library') return <LibraryManager sessions={savedSessions} onOpen={openSession} onDelete={deleteSession} />;
    return (
      <VisualStage
        selectedElement={selectedElement}
        selectedMolecule={selectedMolecule}
        onSelectElement={selectElement}
        onToggleInspector={toggleRightCollapse}
        isInspectorOpen={!rightCollapsed && showInspector}
      />
    );
  };

  const showInspector = (selectedElement !== null || selectedMolecule !== null) && workspaceMode === 'explore';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] font-sans flex flex-col">
      <TopBar
        onSave={saveSession}
        saveState={saveState}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        leftCollapsed={leftCollapsed}
        onToggleLeftCollapse={toggleLeftCollapse}
      />

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <CommandPalette
        filteredElements={filteredElements}
        filteredMolecules={filteredMolecules}
        onSelectElement={selectElement}
        onSelectMolecule={selectMolecule}
        onSave={saveSession}
      />

      <div className={cn('workbench-layout', isMobile && 'is-mobile', zenMode && 'is-zen')}>
        {/* Left Discovery Rail (Full Height below TopBar) */}
        {!isMobile && !zenMode && !leftCollapsed && (
          <div style={{ width: leftWidth, minWidth: 240, maxWidth: 450, flexShrink: 0 }} className="h-full">
            <DiscoveryRail
              filteredElements={filteredElements}
              filteredMolecules={filteredMolecules}
              onSelectElement={selectElement}
              onSelectMolecule={selectMolecule}
              onToggleCollapse={toggleLeftCollapse}
            />
          </div>
        )}

        {/* Left Splitter Handle */}
        {!isMobile && !zenMode && !leftCollapsed && (
          <div
            className={cn('layout-splitter', isDraggingLeft && 'is-dragging')}
            onMouseDown={startDragLeft}
            onDoubleClick={() => setLeftWidth(260)}
            title="Drag to resize Discovery Rail"
          />
        )}

        {/* Center Main Stage */}
        <main className="workbench-main flex-1 min-w-0 h-full overflow-hidden flex flex-col bg-white">
          <WorkspaceNav />
          <div key={workspaceMode} className="flex-1 min-h-0 relative flex flex-col">
            {workspaceContent()}
          </div>
        </main>

        {/* Right Splitter Handle */}
        {!isMobile && !zenMode && !rightCollapsed && showInspector && (
          <div
            className={cn('layout-splitter', isDraggingRight && 'is-dragging')}
            onMouseDown={startDragRight}
            onDoubleClick={() => setRightWidth(320)}
            title="Drag to resize Inspector"
          />
        )}

        {/* Right Scientific Inspector (Only opens when an element/molecule is active) */}
        {!isMobile && !zenMode && !rightCollapsed && showInspector && (
          <div style={{ width: rightWidth, minWidth: 260, maxWidth: 500, flexShrink: 0 }} className="h-full">
            <Inspector
              selectedElement={selectedElement}
              selectedMolecule={selectedMolecule}
              onCompare={addCompare}
              onToggleCollapse={toggleRightCollapse}
            />
          </div>
        )}

        {/* Left Floating Reopen Tab when collapsed */}
        {!isMobile && !zenMode && leftCollapsed && (
          <button
            onClick={toggleLeftCollapse}
            className="absolute left-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-r-xl bg-white border-y border-r border-slate-200/80 shadow-card text-slate-700 hover:text-[#0071e3] text-xs font-semibold transition-all hover:pl-3.5"
            title="Expand Discovery Rail"
          >
            <Atom className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Elements »</span>
          </button>
        )}

        {/* Right Floating Reopen Tab when collapsed */}
        {!isMobile && !zenMode && rightCollapsed && showInspector && (
          <button
            onClick={() => setRightCollapsed(false)}
            className="absolute right-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-white border-y border-l border-slate-200/80 shadow-card text-slate-700 hover:text-[#0071e3] text-xs font-semibold transition-all hover:pr-3.5"
            title="Expand Scientific Telemetry Inspector"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>« Telemetry</span>
          </button>
        )}
      </div>

      {/* Mobile Drawers */}
      <AnimatePresence>
        {isMobile && mobileDrawer === 'discovery' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex flex-col"
            onClick={() => setMobileDrawer('none')}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-[85vw] max-w-sm h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Browse Elements</span>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900" onClick={() => setMobileDrawer('none')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <DiscoveryRail
                  filteredElements={filteredElements}
                  filteredMolecules={filteredMolecules}
                  onSelectElement={(el) => {
                    selectElement(el);
                    setMobileDrawer('none');
                  }}
                  onSelectMolecule={(mol) => {
                    selectMolecule(mol);
                    setMobileDrawer('none');
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {isMobile && mobileDrawer === 'inspector' && showInspector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setMobileDrawer('none')}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-h-[85vh] bg-white border-t border-slate-200 rounded-t-2xl flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Element Details</span>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900" onClick={() => setMobileDrawer('none')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Inspector
                  selectedElement={selectedElement}
                  selectedMolecule={selectedMolecule}
                  onCompare={(el) => {
                    addCompare(el);
                    setMobileDrawer('none');
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Dock */}
      {isMobile && (
        <div className="mobile-dock">
          <button onClick={() => setMobileDrawer('discovery')}><Search className="h-4 w-4" />Browse</button>
          <button onClick={() => setWorkspaceMode('table')}><Grid3X3 className="h-4 w-4" />Table</button>
          {showInspector && (
            <button onClick={() => setMobileDrawer('inspector')}><Info className="h-4 w-4" />Details</button>
          )}
          <button onClick={() => selectedElement ? addCompare(selectedElement) : setWorkspaceMode('compare')}>
            <GitCompare className="h-4 w-4" />Compare
          </button>
          <button onClick={saveSession}><Save className="h-4 w-4" />Save</button>
        </div>
      )}
    </div>
  );
}
