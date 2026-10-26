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
  ArrowUpRight,
  Compass,
  Sliders,
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
  { id: 'reactions', label: 'Reactions', icon: FlaskConical },
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
    return <span className="font-mono font-semibold tracking-tight text-[#f7f8f8]">{raw}</span>;
  }
  const orbitals = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
  const maxElectrons = [2, 2, 6, 2, 6, 2, 10, 6, 2, 10, 6, 2, 14, 10, 6, 2, 14, 10, 6];
  let remaining = atomicNumber;
  const config: React.ReactNode[] = [];
  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const count = Math.min(remaining, maxElectrons[i]);
    config.push(
      <span key={orbitals[i]} className="mr-[2px]">
        {orbitals[i]}<sup className="text-[10px] text-[#5e6ad2] font-bold">{count}</sup>
      </span>
    );
    remaining -= count;
  }
  return <span className="font-mono font-medium text-[#c5cbda]">{config}</span>;
}

const formatTemp = (kelvin: number | null | undefined, unit: 'C' | 'K' | 'F' = 'C') => {
  if (kelvin == null) return 'N/A';
  if (unit === 'K') return `${kelvin} K`;
  if (unit === 'F') return `${Math.round((kelvin - 273.15) * 9/5 + 32)} °F`;
  return `${Math.round(kelvin - 273.15)} °C`;
};

const Loader = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-[#8a91a0]">
    <Atom className="mr-2 h-4 w-4 animate-spin text-[#5e6ad2]" />
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
            onClick={() => {
              audioEngine.playClick(640);
              onToggleLeftCollapse();
            }}
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer select-none active:scale-95 shadow-2xs",
              !leftCollapsed
                ? "bg-[#161922] border-[var(--color-hairline-strong)] text-[#5e6ad2] shadow-xs"
                : "bg-[#11131a] border-[var(--color-hairline)] text-[#8a91a0] hover:text-[#f7f8f8] hover:bg-[#161922]"
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
          <div className="w-7 h-7 rounded-lg bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center text-[#5e6ad2] shadow-xs shrink-0 group-hover:scale-105 transition-all">
            <Atom className="h-4 w-4 animate-[spin_16s_linear_infinite]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-tight text-[#f7f8f8] leading-none">
              Ele-Visualize
            </span>
            <span className="hidden lg:inline-block text-[11px] text-[#8a91a0] font-medium pl-2 border-l border-[var(--color-hairline)]">
              Quantum Workbench
            </span>
          </div>
        </button>
      </div>

      {/* Pill Search Input */}
      <button 
        className="command-trigger group hidden md:flex max-w-md mx-4 h-8 px-3 rounded-full bg-[#161922] hover:bg-[#1f2432] border border-[var(--color-hairline)] transition-all items-center gap-2" 
        onClick={() => setCommandOpen(!commandOpen)}
      >
        <Search className="h-3.5 w-3.5 text-[#8a91a0] group-hover:text-[#5e6ad2] transition-colors shrink-0" />
        <span className="truncate flex-1 text-[#8a91a0] font-medium text-xs text-left">
          Search 118 elements, molecules, or workspaces...
        </span>
        <kbd className="hidden rounded bg-[#11131a] border border-[var(--color-hairline)] px-1.5 py-0.2 text-[9px] text-[#8a91a0] font-mono font-bold sm:inline shadow-xs">⌘K</kbd>
      </button>

      {/* Right Action Icons & Controls Deck */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {/* Real-time Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161922] border border-[var(--color-hairline)] text-[11px] font-mono font-medium text-[#8a91a0] mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>118 Elements Online</span>
        </div>

        <button
          className="icon-button md:hidden"
          onClick={() => setCommandOpen(!commandOpen)}
          title="Search (/)"
        >
          <Search className="h-3.5 w-3.5 text-[#8a91a0]" />
        </button>

        <button
          className="icon-button"
          onClick={toggleSound}
          title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-[#8a91a0]" /> : <Volume2 className="h-4 w-4 text-[#5e6ad2]" />}
        </button>

        <button
          className="icon-button hidden sm:inline-flex"
          onClick={() => {
            audioEngine.playClick(840);
            onOpenShortcuts();
          }}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="h-4 w-4 text-[#c5cbda]" />
        </button>

        <button
          className={cn(
            "btn-primary h-8 px-3.5 ml-1.5",
            saveState === 'saved' && "bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]",
            saveState === 'error' && "bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-[0_0_12px_rgba(244,63,94,0.35)]",
            saveState === 'saving' && "opacity-80 cursor-wait"
          )}
          onClick={() => {
            audioEngine.playClick(920);
            onSave();
          }}
          disabled={saveState === 'saving'}
          title="Save current workspace snapshot to Library"
        >
          {saveState === 'saving' ? (
            <>
              <Atom className="h-3.5 w-3.5 animate-spin text-[#8a91a0]" />
              <span>Saving...</span>
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300 animate-in zoom-in-50" />
              <span className="font-bold">Saved to Library</span>
            </>
          ) : saveState === 'error' ? (
            <>
              <X className="h-3.5 w-3.5 text-rose-300" />
              <span>Failed</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5 text-white/80" />
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
            <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#5e6ad2]" : "text-[#8a91a0]")} />
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
    { label: 'Start Reaction Simulator', icon: FlaskConical, run: () => setWorkspaceMode('reactions') },
    { label: 'Open Molecule Builder', icon: Boxes, run: () => setWorkspaceMode('builder') },
    { label: 'Explore Nuclear Decay', icon: Radio, run: () => setWorkspaceMode('decay') },
    { label: showOrbitals ? 'Hide Orbitals' : 'Show Quantum Orbitals', icon: Layers, run: () => setShowOrbitals(!showOrbitals) },
    { label: 'Save Current Session', icon: Bookmark, run: onSave },
  ];

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md p-4 flex items-start justify-center pt-20" onMouseDown={() => setCommandOpen(false)}>
      <motion.div
        initial={{ y: -15, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -15, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-[#161922] border border-[var(--color-hairline-strong)] text-[#f7f8f8] shadow-elevated rounded-xl max-w-xl w-full overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-3 bg-[#11131a]">
          <Search className="h-4 w-4 text-[#5e6ad2]" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#f7f8f8] outline-none placeholder:text-[#8a91a0] font-sans"
            placeholder="Search elements, molecules, or commands..."
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2432] text-[#8a91a0] border border-[var(--color-hairline)]">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          <div className="section-label px-3 py-1.5">Quick Actions</div>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-[#c5cbda] hover:bg-[#1f2432] hover:text-[#f7f8f8] transition-colors"
              onClick={() => {
                run();
                setCommandOpen(false);
              }}
            >
              <Icon className="h-4 w-4 text-[#5e6ad2]" />
              <span>{label}</span>
            </button>
          ))}

          <div className="section-label px-3 py-1.5 mt-3">Elements</div>
          {filteredElements.slice(0, 8).map((element) => {
            const color = getElementColor(element);
            return (
              <button
                key={element.atomicNumber}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs text-[#c5cbda] hover:bg-[#1f2432] hover:text-[#f7f8f8] transition-colors"
                onClick={() => {
                  onSelectElement(element);
                  setCommandOpen(false);
                }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center font-semibold text-xs rounded-md font-mono shrink-0 shadow-xs border border-white/10"
                  style={{ backgroundColor: `${color}20`, color: color }}
                >
                  {element.symbol}
                </span>
                <span className="font-semibold text-[#f7f8f8]">{element.name}</span>
                <span className="text-xs text-[#8a91a0]">{categoryLabels[element.category]}</span>
                <span className="ml-auto text-xs font-mono text-[#8a91a0]">#{element.atomicNumber}</span>
              </button>
            );
          })}

          <div className="section-label px-3 py-1.5 mt-3">Molecules</div>
          {filteredMolecules.slice(0, 6).map((molecule) => (
            <button
              key={molecule.formula}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs text-[#c5cbda] hover:bg-[#1f2432] hover:text-[#f7f8f8] transition-colors"
              onClick={() => {
                onSelectMolecule(molecule);
                setCommandOpen(false);
              }}
            >
              <FlaskConical className="h-4 w-4 text-[#5e6ad2]" />
              <span className="font-semibold text-[#f7f8f8]">{molecule.name}</span>
              <span className="ml-auto text-xs font-mono text-[#8a91a0]">{molecule.formula}</span>
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
      dotColor: '#f43f5e',
      bgClass: 'bg-rose-950/30',
      textClass: 'text-rose-200',
      borderClass: 'border-rose-500/30',
      activeBg: 'bg-rose-600',
      activeText: 'text-white',
    },
    'alkaline-earth': {
      label: 'Alkaline',
      dotColor: '#fb923c',
      bgClass: 'bg-orange-950/30',
      textClass: 'text-orange-200',
      borderClass: 'border-orange-500/30',
      activeBg: 'bg-orange-600',
      activeText: 'text-white',
    },
    'transition-metal': {
      label: 'Transition',
      dotColor: '#facc15',
      bgClass: 'bg-amber-950/30',
      textClass: 'text-amber-200',
      borderClass: 'border-amber-500/30',
      activeBg: 'bg-amber-600',
      activeText: 'text-white',
    },
    'post-transition': {
      label: 'Post-Trans',
      dotColor: '#34d399',
      bgClass: 'bg-emerald-950/30',
      textClass: 'text-emerald-200',
      borderClass: 'border-emerald-500/30',
      activeBg: 'bg-emerald-600',
      activeText: 'text-white',
    },
    'metalloid': {
      label: 'Metalloids',
      dotColor: '#2dd4bf',
      bgClass: 'bg-teal-950/30',
      textClass: 'text-teal-200',
      borderClass: 'border-teal-500/30',
      activeBg: 'bg-teal-600',
      activeText: 'text-white',
    },
    'nonmetal': {
      label: 'Nonmetals',
      dotColor: '#38bdf8',
      bgClass: 'bg-sky-950/30',
      textClass: 'text-sky-200',
      borderClass: 'border-sky-500/30',
      activeBg: 'bg-[#5e6ad2]',
      activeText: 'text-white',
    },
    'halogen': {
      label: 'Halogens',
      dotColor: '#c084fc',
      bgClass: 'bg-purple-950/30',
      textClass: 'text-purple-200',
      borderClass: 'border-purple-500/30',
      activeBg: 'bg-purple-600',
      activeText: 'text-white',
    },
    'noble-gas': {
      label: 'Noble Gases',
      dotColor: '#f472b6',
      bgClass: 'bg-fuchsia-950/30',
      textClass: 'text-fuchsia-200',
      borderClass: 'border-fuchsia-500/30',
      activeBg: 'bg-fuchsia-600',
      activeText: 'text-white',
    },
    'lanthanide': {
      label: 'Lanthanides',
      dotColor: '#cbd5e1',
      bgClass: 'bg-slate-800/40',
      textClass: 'text-slate-200',
      borderClass: 'border-slate-500/30',
      activeBg: 'bg-slate-600',
      activeText: 'text-white',
    },
    'actinide': {
      label: 'Actinides',
      dotColor: '#fda4af',
      bgClass: 'bg-rose-950/40',
      textClass: 'text-rose-200',
      borderClass: 'border-rose-500/40',
      activeBg: 'bg-rose-700',
      activeText: 'text-white',
    },
  };

  const [showCategoryGrid, setShowCategoryGrid] = useState(true);

  return (
    <aside className="discovery-rail flex flex-col h-full bg-[#0f1117]">
      {/* Pinned Top: Mode Switcher & Search (Slim ~75px header) */}
      <div className="p-3 border-b border-[var(--color-hairline)] space-y-2 flex-none bg-[#0f1117] z-10">
        {/* Section 1: DISCOVERY Segmented Pill Switcher */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#161922] border border-[var(--color-hairline)] text-xs font-semibold shadow-inner">
          <button
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all text-xs font-bold",
              viewMode === 'atoms'
                ? "bg-[#1f2432] text-[#f7f8f8] shadow-xs border border-[var(--color-hairline-strong)]"
                : "text-[#8a91a0] hover:text-[#f7f8f8]"
            )}
            onClick={() => setViewMode('atoms')}
          >
            <Atom className={cn("h-3.5 w-3.5", viewMode === 'atoms' ? "text-[#5e6ad2]" : "text-[#8a91a0]")} />
            <span>Atoms ({elements.length})</span>
          </button>
          <button
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all text-xs font-bold",
              viewMode === 'molecules'
                ? "bg-[#1f2432] text-[#f7f8f8] shadow-xs border border-[var(--color-hairline-strong)]"
                : "text-[#8a91a0] hover:text-[#f7f8f8]"
            )}
            onClick={() => setViewMode('molecules')}
          >
            <FlaskConical className={cn("h-3.5 w-3.5", viewMode === 'molecules' ? "text-[#5e6ad2]" : "text-[#8a91a0]")} />
            <span>Molecules (20)</span>
          </button>
        </div>

        {/* Section 2: Quick Search inside Sidebar */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a91a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'atoms' ? "Filter 118 elements..." : "Filter molecules..."}
            className="w-full pl-7 pr-6 py-1.5 text-xs bg-[#161922] border border-[var(--color-hairline)] rounded-md outline-none focus:border-[#5e6ad2] transition-all font-sans text-[#f7f8f8] placeholder:text-[#8a91a0]"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a91a0] hover:text-[#f7f8f8]">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 py-0.2 rounded bg-[#1f2432] text-[#8a91a0] border border-[var(--color-hairline)]">
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
              <span className="section-label">Category</span>
              <span className="text-[11px] text-[#8a91a0]">10 Groups</span>
            </div>

            {/* Master "All 118 Elements" Chip */}
            <button
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs",
                activeFilter === 'all'
                  ? "bg-[#5e6ad2] text-white border-transparent shadow-xs"
                  : "bg-[#11131a] text-[#c5cbda] border-[var(--color-hairline)] hover:bg-[#161922]"
              )}
              onClick={() => setActiveFilter('all')}
            >
              <div className="flex items-center gap-1.5">
                <Layers className={cn("w-3.5 h-3.5", activeFilter === 'all' ? "text-white" : "text-[#8a91a0]")} />
                <span className="font-semibold">All 118 Elements</span>
              </div>
              <span className={cn(
                "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full",
                activeFilter === 'all' ? "bg-white/20 text-white" : "bg-[#161922] text-[#8a91a0]"
              )}>
                {elements.length}
              </span>
            </button>

            {/* 2-Column Grid with Authentic Chemistry Colors */}
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((category) => {
                const config = CATEGORY_CHIP_DATA[category] || {
                  label: categoryLabels[category],
                  dotColor: '#5e6ad2',
                  bgClass: 'bg-[#161922]',
                  textClass: 'text-[#c5cbda]',
                  borderClass: 'border-[var(--color-hairline)]',
                  activeBg: 'bg-[#5e6ad2]',
                  activeText: 'text-white',
                };
                const isActive = activeFilter === category;
                const count = categoryCounts[category] || 0;

                return (
                  <button
                    key={category}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-xs text-left group",
                      isActive
                        ? `${config.activeBg} ${config.activeText} border-transparent shadow-xs`
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
                        "text-[10px] font-mono font-medium px-1 py-0.5 rounded shrink-0 ml-1",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-black/30 text-[#8a91a0]"
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
          <span className="section-label">
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
                    "w-full p-2.5 rounded-md border border-[var(--color-hairline)] bg-[#11131a] hover:bg-[#161922] hover:border-[var(--color-hairline-strong)] transition-all flex items-center gap-3 text-left group",
                    isSelected && "bg-[#161922] border-[#5e6ad2] ring-1 ring-[#5e6ad2]/50 shadow-xs"
                  )}
                  onClick={() => onSelectElement(element)}
                >
                  {/* Large Symbol Box with Atomic Number */}
                  <div
                    className="flex flex-col items-center justify-center h-10 w-10 rounded-md border font-sans shrink-0 shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${color}18`,
                      borderColor: isSelected ? '#5e6ad2' : `${color}40`,
                    }}
                  >
                    <span className="text-[9px] font-mono leading-none text-[#8a91a0] font-semibold">{element.atomicNumber}</span>
                    <span className="text-sm font-bold leading-none my-0.5" style={{ color }}>{element.symbol}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-[#f7f8f8] group-hover:text-[#717ce0] transition-colors">{element.name}</span>
                      <span className="text-[10px] text-[#8a91a0] font-mono shrink-0">{element.atomicMass.toFixed(1)} u</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                      <span className="font-medium truncate" style={{ color }}>{categoryLabels[element.category]}</span>
                      <span className="text-white/20">•</span>
                      <span className="text-[#8a91a0] uppercase font-semibold shrink-0">{getElementBlock(element.atomicNumber)}-BLK</span>
                    </div>
                  </div>
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isSelected ? "text-[#5e6ad2]" : "text-white/20 group-hover:text-white/60")} />
                </button>
              );
            })
            : filteredMolecules.map((molecule) => (
              <button
                key={molecule.formula}
                className="w-full p-2.5 rounded-md border border-[var(--color-hairline)] bg-[#11131a] hover:bg-[#161922] hover:border-[var(--color-hairline-strong)] transition-all flex items-center gap-3 text-left group"
                onClick={() => onSelectMolecule(molecule)}
              >
                <span className="flex h-10 w-12 items-center justify-center font-bold text-xs rounded-md bg-[#5e6ad2]/15 text-[#5e6ad2] border border-[#5e6ad2]/30 shrink-0 font-mono shadow-xs">
                  {molecule.formula}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-[#f7f8f8] group-hover:text-[#717ce0] transition-colors">{molecule.name}</span>
                  <span className="block truncate text-[10px] text-[#8a91a0] font-mono">{molecule.atoms.length} atoms • {molecule.bonds.length} bonds</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 shrink-0" />
              </button>
            ))}
        </div>
      </div>

      {/* Collapse Rail Button */}
      {onToggleCollapse && (
        <div className="p-2 border-t border-[var(--color-hairline)] flex items-center justify-center bg-[#0f1117]">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-md border border-[var(--color-hairline)] bg-[#161922] hover:bg-[#1f2432] flex items-center justify-center text-[#8a91a0] hover:text-[#f7f8f8] transition-colors shadow-xs"
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
      icon: FlaskConical,
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
        <div className="stage-toolbar flex items-center justify-between px-3 sm:px-4 h-12 bg-[var(--color-surface-1)] border-b border-[var(--color-hairline)] z-20 gap-2 sm:gap-3 select-none backdrop-blur-md">
          {/* Left: Element Lockup & Adaptive Metrics */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {selectedElement && (
              <div
                className="w-8 h-8 rounded-md border flex flex-col items-center justify-center font-mono shrink-0 shadow-2xs"
                style={{
                  backgroundColor: `${stageColor}18`,
                  borderColor: `${stageColor}45`,
                }}
              >
                <span className="text-[7.5px] font-bold text-[var(--color-ink-muted)] leading-none">{selectedElement.atomicNumber}</span>
                <span className="text-xs font-black leading-none mt-0.5" style={{ color: stageColor }}>
                  {selectedElement.symbol}
                </span>
              </div>
            )}

            {selectedMolecule && (
              <div className="w-8 h-8 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 flex items-center justify-center font-mono font-bold text-[10px] text-[var(--color-accent)] shrink-0 shadow-2xs">
                {selectedMolecule.formula}
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <h2 className="font-display font-bold text-sm text-[var(--color-ink-primary)] truncate tracking-tight shrink-0">
                {selectedElement ? selectedElement.name : selectedMolecule?.name}
              </h2>

              {selectedElement && (
                <span 
                  className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shadow-2xs shrink-0 whitespace-nowrap",
                    isInspectorOpen ? "hidden 2xl:inline-flex" : "hidden sm:inline-flex"
                  )}
                  style={{
                    backgroundColor: `${stageColor}18`,
                    color: stageColor,
                    borderColor: `${stageColor}45`,
                  }}
                >
                  #{selectedElement.atomicNumber} · {categoryLabels[selectedElement.category]}
                </span>
              )}

              {selectedElement && !isInspectorOpen && (
                <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[var(--color-hairline)] text-[11px] font-mono text-[var(--color-ink-muted)] shrink-0 whitespace-nowrap">
                  <span className="text-[var(--color-ink-secondary)] font-semibold">{getElectronConfig(selectedElement.atomicNumber)}</span>
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
              <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-xs font-mono font-bold shadow-2xs shrink-0">
                {(['SHELLS', 'ORBITALS', 'NUCLEUS', 'SPECTRUM'] as const).map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => {
                      audioEngine.playClick(880 + idx * 40);
                      setQuantumMode(m);
                    }}
                    title={`Mode 0${idx + 1}: ${m}`}
                    className={cn(
                      "px-2.5 py-1 text-[10px] uppercase rounded-md transition-all font-mono whitespace-nowrap cursor-pointer select-none active:scale-[0.96]",
                      quantumMode === m
                        ? "bg-[#5e6ad2] text-white shadow-xs font-bold ring-1 ring-white/20"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-3)]"
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
                "h-8 w-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer select-none active:scale-[0.92]",
                autoRotate
                  ? "bg-[#5e6ad2]/20 border-[#5e6ad2]/50 text-[#5e6ad2] shadow-xs"
                  : "bg-[var(--color-surface-2)] border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-primary)]"
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
              className="h-8 w-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-primary)] flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer select-none active:scale-[0.92]"
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
                  "h-8 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer select-none active:scale-[0.96]",
                  isInspectorOpen
                    ? "btn-primary shadow-xs px-2.5"
                    : "bg-[var(--color-surface-2)] text-[var(--color-ink-secondary)] border-[var(--color-hairline)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-primary)] px-3"
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-[11px] font-medium text-[var(--color-ink-secondary)] mb-3 shadow-xs">
                <Atom className="w-3.5 h-3.5 text-[var(--color-accent)] animate-[spin_10s_linear_infinite]" />
                <span>Ele-Visualize · Quantum Workbench</span>
              </div>

              {/* Hero Typography */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-[var(--color-ink-primary)] tracking-tight leading-[1.15] mb-2">
                Interactive 3D Chemistry & Atomic Physics
              </h1>
              <p className="text-sm text-[var(--color-ink-secondary)] font-sans font-normal max-w-xl mx-auto mb-4 leading-relaxed">
                Explore 118 periodic elements, Bohr shells, electron probability orbitals, crystal lattices, and reaction kinetics in real time.
              </p>

              {/* Curated Popular Elements Quick-Pick Strip */}
              <div className="w-full max-w-2xl mb-4">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[11px] font-medium tracking-wide text-[var(--color-ink-muted)] mr-1">
                    Quick Pick:
                  </span>
                  {featuredQuickPicks.map((item) => {
                    const el = elements.find(e => e.symbol === item.symbol);
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => el && onSelectElement(el)}
                        className="px-2 py-0.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-1)] hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-surface-2)] transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs group"
                      >
                        <span 
                          className="w-4 h-4 rounded flex items-center justify-center font-mono font-bold text-[10px]"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {item.symbol}
                        </span>
                        <span className="text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink-primary)] text-xs">{item.name}</span>
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
                      className="p-3 sm:p-3.5 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-hairline)] hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-surface-2)] transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-2)] group-hover:bg-[var(--color-surface-3)] group-hover:text-[var(--color-accent)] transition-colors flex items-center justify-center text-[var(--color-ink-secondary)]">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] border border-[var(--color-hairline)]">
                            {card.tag}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-xs sm:text-sm text-[var(--color-ink-primary)] group-hover:text-[var(--color-accent)] transition-colors flex items-center justify-between">
                          <span>{card.title}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-accent)]" />
                        </h3>
                        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 leading-snug line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--color-accent)] mt-2.5 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
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
        <div className="stage-status flex flex-wrap items-center justify-between px-5 py-2 bg-[var(--color-surface-1)]/95 backdrop-blur-md border-t border-[var(--color-hairline)] z-20 gap-3">
          {/* Left: Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-ink-muted)] tracking-wide text-[11px]">Zoom:</span>
            
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)]">
              {[0.5, 1.0, 2.0].map((zVal) => (
                <button
                  key={zVal}
                  onClick={() => setZoomLevel(zVal)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all",
                    Math.abs(zoomLevel - zVal) < 0.1 ? "bg-[var(--color-accent)] text-white shadow-xs" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
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
              className="w-20 sm:w-28 accent-[var(--color-accent)] cursor-pointer h-1 bg-[var(--color-surface-3)] rounded"
            />
            <span className="text-[10px] font-mono font-bold text-[var(--color-ink-muted)]">{zoomLevel.toFixed(1)}x</span>
          </div>

          {/* Center: Live Shell Telemetry */}
          {selectedElement && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono font-semibold text-[var(--color-ink-secondary)] bg-[var(--color-surface-2)] px-3 py-1 rounded-full border border-[var(--color-hairline)]">
              <span>Shells: {selectedElement.shells.join(' · ')}</span>
              <span className="text-[var(--color-ink-muted)]">•</span>
              <span>Valence: {selectedElement.shells[selectedElement.shells.length - 1]}e⁻</span>
              <span className="text-[var(--color-ink-muted)]">•</span>
              <span>Radius: {elementProperties[selectedElement.atomicNumber]?.atomicRadius ? `${elementProperties[selectedElement.atomicNumber].atomicRadius} pm` : `${53 * selectedElement.shells.length} pm`}</span>
            </div>
          )}

          {/* Right: Simulation Speed */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-ink-muted)] tracking-wide text-[11px]">Speed:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)]">
              {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAnimationSpeed(spd)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all",
                    Math.abs(animationSpeed - spd) < 0.1 ? "bg-[var(--color-accent)] text-white shadow-xs" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
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
    <aside className="inspector-panel flex flex-col h-full bg-[var(--color-surface-1)] border-l border-[var(--color-hairline)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          <span className="text-xs tracking-wide text-[var(--color-ink-primary)] font-semibold">Scientific Inspector</span>
        </div>
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse} 
            className="w-6 h-6 rounded-md hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors" 
            title="Collapse Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Tabs Switcher */}
      <div className="p-2.5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-1)]">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-xs font-medium shadow-2xs">
          {(['overview', 'physics', 'structure', 'actions'] as const).map((tab) => {
            const isActive = inspectorTab === tab;
            return (
              <button
                key={tab}
                className={cn(
                  'py-1 rounded-md transition-all text-center font-medium',
                  isActive
                    ? 'bg-[var(--color-surface-3)] text-white shadow-xs border border-[var(--color-hairline)] font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-3)]/50'
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
            className="p-3 rounded-xl border flex items-center gap-3 bg-[var(--color-surface-2)] shadow-xs"
            style={{ borderColor: `${elementColor}45` }}
          >
            <div
              className="flex flex-col items-center justify-center h-12 w-12 rounded-xl border shadow-xs shrink-0 font-sans"
              style={{
                backgroundColor: `${elementColor}18`,
                borderColor: `${elementColor}45`,
              }}
            >
              <span className="text-[9px] font-mono leading-none text-[var(--color-ink-muted)] font-medium">{selectedElement.atomicNumber}</span>
              <span className="text-lg font-bold leading-none my-0.5" style={{ color: elementColor }}>{selectedElement.symbol}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-[var(--color-ink-primary)] truncate font-display tracking-tight">{selectedElement.name}</h3>
                <span className="text-[10px] font-mono font-medium text-[var(--color-ink-muted)] shrink-0">#{selectedElement.atomicNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span 
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${elementColor}18`,
                    color: elementColor,
                    borderColor: `${elementColor}45`,
                  }}
                >
                  {categoryLabels[selectedElement.category]}
                </span>
                <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
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
              <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] overflow-hidden text-xs">
                <div className="grid grid-cols-2 divide-x divide-[var(--color-hairline)] border-b border-[var(--color-hairline)] font-mono">
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Atomic Mass</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)]">{selectedElement.atomicMass.toFixed(4)} u</span>
                  </div>
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Configuration</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-accent)] truncate">{getElectronConfig(selectedElement.atomicNumber)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-[var(--color-hairline)] font-mono">
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Electronegativity</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 2.20'}</span>
                  </div>
                  <div className="p-2 flex flex-col justify-between">
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Standard Phase</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)] capitalize">{props?.state || 'Solid'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Laboratory Action Toolstrip */}
              <div className="grid grid-cols-3 gap-1 pt-0.5 font-sans">
                <button
                  onClick={() => onCompare(selectedElement)}
                  className="h-8 px-2 bg-[var(--color-accent)] hover:bg-[#6875e5] text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>
                <button
                  onClick={() => setWorkspaceMode('reactions')}
                  className="h-8 px-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                  <span>React</span>
                </button>
                <button
                  onClick={() => setWorkspaceMode('builder')}
                  className="h-8 px-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Boxes className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Build</span>
                </button>
              </div>
            </div>
          )}

          {/* Physics & Thermodynamics Tab */}
          {inspectorTab === 'physics' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-0.5">
                <span className="text-[var(--color-ink-muted)] section-label">Thermal Unit:</span>
                <div className="flex gap-0.5 bg-[var(--color-surface-2)] p-0.5 rounded-lg border border-[var(--color-hairline)]">
                  {(['C', 'K', 'F'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setTempUnit(u)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-mono rounded font-bold transition-all",
                        tempUnit === u ? "bg-[var(--color-accent)] text-white shadow-xs" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
                      )}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-hairline)] shadow-xs">
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Electron Configuration</span>
                  <strong className="text-[var(--color-accent)] text-right">{getElectronConfig(selectedElement.atomicNumber)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Bohr Shell Population</span>
                  <strong className="text-[var(--color-ink-primary)]">{selectedElement.shells.join(' · ')}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Melting Point</span>
                  <strong className="text-[var(--color-ink-primary)]">{formatTemp(props?.meltingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Boiling Point</span>
                  <strong className="text-[var(--color-ink-primary)]">{formatTemp(props?.boilingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Electronegativity (Pauling)</span>
                  <strong className="text-[var(--color-accent)]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 2.20'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">1st Ionization Energy</span>
                  <strong className="text-[var(--color-ink-primary)]">{props?.ionizationEnergy ? `${props.ionizationEnergy} kJ/mol` : '1312.0 kJ/mol'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Mass Density</span>
                  <strong className="text-[var(--color-ink-primary)]">{props?.density ? `${props.density} g/cm³` : '0.08988 g/L'}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-ink-muted)]">Atomic Radius</span>
                  <strong className="text-[var(--color-ink-primary)]">{props?.atomicRadius ? `${props.atomicRadius} pm` : '53 pm'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Structure Tab */}
          {inspectorTab === 'structure' && (
            <div className="space-y-2">
              {/* Dual-Engine 3D & 2D Vector SVG Bohr Orbital Model */}
              <BohrModel3D
                shells={selectedElement.shells}
                color={elementColor}
                symbol={selectedElement.symbol}
                name={selectedElement.name}
                element={selectedElement}
                defaultMode="svg"
                size={180}
              />

              <div className="p-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-[var(--color-ink-primary)] font-semibold text-xs tracking-wide">
                  <Beaker className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Subatomic Particles
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="p-2 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                    <span className="block text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Protons</span>
                    <span className="block mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)]">{selectedElement.atomicNumber}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                    <span className="block text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Neutrons</span>
                    <span className="block mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)]">{Math.round(selectedElement.atomicMass - selectedElement.atomicNumber)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                    <span className="block text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium">Electrons</span>
                    <span className="block mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)]">{selectedElement.atomicNumber}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] shadow-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[var(--color-ink-primary)] font-semibold text-xs tracking-wide">
                  <Info className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Natural History
                </div>
                <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed font-sans">
                  {props?.discoveryYear ? `Isolated and documented in ${props.discoveryYear} CE. ` : 'Known and documented since ancient antiquity. '}
                  At standard temperature and pressure (298.15 K, 1 atm), it adopts a stable <strong className="text-[var(--color-ink-primary)]">{props?.state || 'solid'}</strong> phase.
                </p>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {inspectorTab === 'actions' && (
            <div className="space-y-2 pt-0.5 font-sans">
              <button
                className="btn-primary w-full h-9 flex items-center justify-center gap-2"
                onClick={() => {
                  audioEngine.playClick(880);
                  onCompare(selectedElement);
                }}
              >
                <GitCompare className="h-3.5 w-3.5 text-white" />
                <span>Compare with Another Element</span>
              </button>
              <button
                className="btn-secondary w-full h-9 flex items-center justify-center gap-2 hover:border-amber-500/40 hover:text-amber-300"
                onClick={() => {
                  audioEngine.playClick(840);
                  setWorkspaceMode('reactions');
                }}
              >
                <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
                <span>Test in Chemical Reaction Lab</span>
              </button>
              <button
                className="btn-secondary w-full h-9 flex items-center justify-center gap-2 hover:border-emerald-500/40 hover:text-emerald-300"
                onClick={() => {
                  audioEngine.playClick(800);
                  setWorkspaceMode('builder');
                }}
              >
                <Boxes className="h-3.5 w-3.5 text-emerald-500" />
                <span>Build Molecules with {selectedElement.symbol}</span>
              </button>
              <button
                className="btn-secondary w-full h-9 flex items-center justify-center gap-2"
                onClick={() => {
                  audioEngine.playClick(760);
                  setWorkspaceMode('table');
                }}
              >
                <Grid3X3 className="h-3.5 w-3.5 text-[var(--color-ink-muted)]" />
                <span>View in Periodic Table Grid</span>
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMolecule && (
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 font-sans">
          {/* Hero Molecule Card */}
          <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] flex items-center gap-3 shadow-xs">
            <span className="flex h-10 w-12 items-center justify-center text-xs font-black rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono shadow-2xs shrink-0">
              {selectedMolecule.formula}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold text-[var(--color-ink-primary)] truncate font-display">{selectedMolecule.name}</h3>
              <p className="text-[11px] text-[var(--color-ink-muted)] truncate mt-0.5">{selectedMolecule.description}</p>
            </div>
          </div>

          {/* Molecule Overview Tab */}
          {inspectorTab === 'overview' && (
            <div className="space-y-2.5">
              {/* Molecule Telemetry Grid */}
              <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] overflow-hidden text-xs font-mono shadow-2xs">
                <div className="grid grid-cols-2 divide-x divide-[var(--color-hairline)] border-b border-[var(--color-hairline)] p-2">
                  <div>
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium block">Total Atoms</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)] block">{selectedMolecule.atoms.length} atoms</span>
                  </div>
                  <div className="pl-2">
                    <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium block">Chemical Bonds</span>
                    <span className="mt-0.5 text-xs font-semibold text-[var(--color-ink-primary)] block">{selectedMolecule.bonds.length} bonds</span>
                  </div>
                </div>
                <div className="p-2 bg-[var(--color-surface-3)]/30">
                  <span className="text-[10px] tracking-wide text-[var(--color-ink-muted)] font-medium block">Constituent Atoms</span>
                  <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                    {Array.from(new Set(selectedMolecule.atoms.map(a => a.symbol))).map(sym => {
                      const count = selectedMolecule.atoms.filter(a => a.symbol === sym).length;
                      return (
                        <span key={sym} className="px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 font-bold">
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
                  className="h-8 px-2 rounded-md bg-[var(--color-accent)] hover:bg-[#6875e5] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  onClick={() => setWorkspaceMode('builder')}
                >
                  <Boxes className="h-3.5 w-3.5 text-white" />
                  <span>Edit in Builder</span>
                </button>
                <button
                  className="h-8 px-2 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  onClick={() => setWorkspaceMode('reactions')}
                >
                  <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
                  <span>Reaction Lab</span>
                </button>
              </div>
            </div>
          )}

          {/* Molecule Physics & Thermodynamics Tab */}
          {inspectorTab === 'physics' && (
            <div className="space-y-2">
              <div className="space-y-1.5 text-xs font-mono bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-hairline)] shadow-xs">
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Chemical Formula</span>
                  <strong className="text-[var(--color-accent)] font-bold">{selectedMolecule.formula}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Total Bond Count</span>
                  <strong className="text-[var(--color-ink-primary)]">{selectedMolecule.bonds.length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Single Bonds (σ)</span>
                  <strong className="text-[var(--color-ink-primary)]">{selectedMolecule.bonds.filter(b => b.order === 1).length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                  <span className="text-[var(--color-ink-muted)]">Multiple Bonds (π)</span>
                  <strong className="text-[var(--color-ink-primary)]">{selectedMolecule.bonds.filter(b => b.order > 1).length}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-ink-muted)]">Molecular Mass Estimate</span>
                  <strong className="text-[var(--color-ink-primary)]">
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
              <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-[var(--color-ink-primary)] font-semibold text-xs tracking-wide">
                  <Beaker className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <span>3D Atom Coordinates</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[10.5px]">
                  {selectedMolecule.atoms.map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-1.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-hairline)]">
                      <span className="font-bold text-[var(--color-ink-primary)]">{i + 1}. {a.element} ({a.symbol})</span>
                      <span className="text-[var(--color-ink-muted)] text-[9.5px]">[{a.position.map(n => n.toFixed(1)).join(', ')}]</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] shadow-xs space-y-1 font-sans">
                <div className="flex items-center gap-1.5 text-[var(--color-ink-primary)] font-semibold text-xs tracking-wide">
                  <Info className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <span>VSEPR Geometry Note</span>
                </div>
                <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                  {selectedMolecule.description}
                </p>
              </div>
            </div>
          )}

          {/* Molecule Actions Tab */}
          {inspectorTab === 'actions' && (
            <div className="space-y-1.5 pt-0.5 font-sans">
              <button
                className="w-full h-8 px-3 rounded-md bg-[var(--color-accent)] hover:bg-[#6875e5] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('builder')}
              >
                <Boxes className="h-3.5 w-3.5 text-white" />
                <span>Edit in Molecule Builder</span>
              </button>
              <button
                className="w-full h-8 px-3 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                onClick={() => setWorkspaceMode('reactions')}
              >
                <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
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
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink-primary)] font-sans flex flex-col select-none">
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
        <main className="workbench-main flex-1 min-w-0 h-full overflow-hidden flex flex-col bg-[var(--color-canvas)]">
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
            className="absolute left-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-r-xl bg-[var(--color-surface-2)] border-y border-r border-[var(--color-hairline)] shadow-card text-[var(--color-ink-secondary)] hover:text-[var(--color-accent)] text-xs font-semibold transition-all hover:pl-3.5"
            title="Expand Discovery Rail"
          >
            <Atom className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Elements »</span>
          </button>
        )}

        {/* Right Floating Reopen Tab when collapsed */}
        {!isMobile && !zenMode && rightCollapsed && showInspector && (
          <button
            onClick={() => setRightCollapsed(false)}
            className="absolute right-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-[var(--color-surface-2)] border-y border-l border-[var(--color-hairline)] shadow-card text-[var(--color-ink-secondary)] hover:text-[var(--color-accent)] text-xs font-semibold transition-all hover:pr-3.5"
            title="Expand Scientific Telemetry Inspector"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--color-accent)]" />
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col"
            onClick={() => setMobileDrawer('none')}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-[85vw] max-w-sm h-full bg-[var(--color-surface-1)] border-r border-[var(--color-hairline)] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                <span className="text-xs font-bold text-[var(--color-ink-primary)] uppercase tracking-wider font-mono">Browse Elements</span>
                <button className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]" onClick={() => setMobileDrawer('none')}>
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setMobileDrawer('none')}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-h-[85vh] bg-[var(--color-surface-1)] border-t border-[var(--color-hairline)] rounded-t-2xl flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                <span className="text-xs font-bold text-[var(--color-ink-primary)] uppercase tracking-wider font-mono">Element Details</span>
                <button className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]" onClick={() => setMobileDrawer('none')}>
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
