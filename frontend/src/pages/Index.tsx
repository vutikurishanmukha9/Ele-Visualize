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
  Save,
  Search,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { Atom3D, CameraPreset } from '@/components/Atom3D';
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
  { id: 'table', label: 'Table', icon: Grid3X3 },
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
    return <span className="font-mono font-bold tracking-wide text-slate-800">{raw}</span>;
  }
  const orbitals = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
  const maxElectrons = [2, 2, 6, 2, 6, 2, 10, 6, 2, 10, 6, 2, 14, 10, 6, 2, 14, 10, 6];
  let remaining = atomicNumber;
  const config: React.ReactNode[] = [];
  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const count = Math.min(remaining, maxElectrons[i]);
    config.push(
      <span key={orbitals[i]} className="mr-[2px]">
        {orbitals[i]}<sup className="text-[10px] text-[#16a875] font-bold">{count}</sup>
      </span>
    );
    remaining -= count;
  }
  return <span className="font-mono font-semibold">{config}</span>;
}

const formatTemp = (kelvin: number | null | undefined, unit: 'C' | 'K' | 'F' = 'C') => {
  if (kelvin == null) return 'N/A';
  if (unit === 'K') return `${kelvin} K`;
  if (unit === 'F') return `${Math.round((kelvin - 273.15) * 9/5 + 32)} °F`;
  return `${Math.round(kelvin - 273.15)} °C`;
};

const Loader = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
    <Sparkles className="mr-2 h-5 w-5 animate-spin text-primary" />
    <span>Loading high-fidelity quantum scene...</span>
  </div>
);

interface ShellProps {
  children: React.ReactNode;
}

function WorkbenchFrame({ children }: ShellProps) {
  return <div className="h-screen w-screen overflow-hidden bg-background text-foreground">{children}</div>;
}

function TopBar({
  onSave,
  saveState,
  onOpenShortcuts,
}: {
  onSave: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onOpenShortcuts: () => void;
}) {
  const {
    commandOpen,
    setCommandOpen,
    setWorkspaceMode,
    setSelectedElement,
    setSelectedMolecule,
    setSearchQuery,
  } = useAppStore();

  const handleHome = () => {
    setWorkspaceMode('explore');
    setSelectedElement(null);
    setSelectedMolecule(null);
    setSearchQuery('');
  };

  return (
    <header className="workbench-topbar">
      {/* Brand logo & editorial title */}
      <button className="flex min-w-0 items-center gap-3 text-left transition-transform hover:scale-[1.01]" onClick={handleHome}>
        <div className="w-9 h-9 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] flex items-center justify-center text-[#16a875] shadow-xs">
          <Atom className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-lg font-bold tracking-tight text-slate-900 leading-tight">
            Ele-visualize
          </div>
          <div className="hidden truncate text-xs text-slate-500 sm:block font-normal">
            Visualize the building blocks of the universe.
          </div>
        </div>
      </button>

      {/* Pill Search Input */}
      <button className="command-trigger group" onClick={() => setCommandOpen(!commandOpen)}>
        <Search className="h-4 w-4 text-slate-400 group-hover:text-[#16a875] transition-colors" />
        <span className="truncate flex-1 text-slate-500 font-normal">
          Search elements, molecules, or commands...
        </span>
        <span className="hidden rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono md:inline">/</span>
      </button>

      {/* Right Action Icons & Emerald Save Session Button */}
      <div className="flex items-center gap-2">
        <button
          className="icon-button"
          onClick={() => audioEngine.toggleMute()}
          title={audioEngine.isMuted() ? "Unmute Audio (M)" : "Mute Audio (M)"}
        >
          <Sun className="h-4 w-4 text-slate-600" />
        </button>
        <button
          className="icon-button"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="h-4 w-4 text-slate-600" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#e6f6ef] text-[#16a875] border border-[#bce8d5] font-bold text-xs flex items-center justify-center select-none shadow-xs">
          E
        </div>
        <button
          className="emerald-button ml-1"
          onClick={onSave}
          disabled={saveState === 'saving'}
        >
          <Save className="h-3.5 w-3.5 text-white" />
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Save Session'}</span>
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
      {workspaces.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => selectWorkspace(id)}
          className={cn('workspace-tab', workspaceMode === id && 'is-active')}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
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
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandOpen]);

  const actions = [
    { label: 'Open Periodic Table', icon: Grid3X3, run: () => setWorkspaceMode('table') },
    { label: 'Compare Elements', icon: GitCompare, run: () => setWorkspaceMode('compare') },
    { label: 'Start Reaction Simulator', icon: Zap, run: () => setWorkspaceMode('reactions') },
    { label: 'Open Molecule Builder', icon: Boxes, run: () => setWorkspaceMode('builder') },
    { label: showOrbitals ? 'Hide Orbitals' : 'Show Orbitals', icon: Sparkles, run: () => setShowOrbitals(!showOrbitals) },
    { label: 'Save Current Session', icon: Save, run: onSave },
  ];

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm p-3 flex items-start justify-center" onMouseDown={() => setCommandOpen(false)}>
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="command-panel bg-white border border-slate-200 text-slate-900 shadow-2xl rounded-2xl max-w-lg w-full overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-[#16a875]" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search elements, molecules, or commands..."
          />
          <button className="icon-button" onClick={() => setCommandOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-2">
          <div className="command-section text-slate-500 font-mono text-[10px] uppercase tracking-wider px-2 py-1">Commands</div>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              onClick={() => {
                run();
                setCommandOpen(false);
              }}
            >
              <Icon className="h-4 w-4 text-[#16a875]" />
              <span>{label}</span>
            </button>
          ))}

          <div className="command-section text-slate-500 font-mono text-[10px] uppercase tracking-wider px-2 py-1 mt-2">Elements</div>
          {filteredElements.slice(0, 8).map((element) => {
            const color = getElementColor(element);
            return (
              <button
                key={element.atomicNumber}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  onSelectElement(element);
                  setCommandOpen(false);
                }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center font-bold text-xs rounded-lg border font-mono shrink-0"
                  style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}40` }}
                >
                  {element.symbol}
                </span>
                <span className="font-medium text-slate-900">{element.name}</span>
                <span className="text-xs text-slate-500 ml-1 capitalize font-normal">({categoryLabels[element.category]})</span>
                <span className="ml-auto text-xs font-mono text-slate-400">#{element.atomicNumber}</span>
              </button>
            );
          })}

          <div className="command-section text-slate-500 font-mono text-[10px] uppercase tracking-wider px-2 py-1 mt-2">Molecules</div>
          {filteredMolecules.slice(0, 6).map((molecule) => (
            <button
              key={molecule.formula}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              onClick={() => {
                onSelectMolecule(molecule);
                setCommandOpen(false);
              }}
            >
              <FlaskConical className="h-4 w-4 text-[#16a875]" />
              <span className="font-medium text-slate-900">{molecule.name}</span>
              <span className="ml-auto text-xs font-mono text-slate-400">{molecule.formula}</span>
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
  const { activeFilter, viewMode, setActiveFilter, setViewMode, selectedElement } = useAppStore();

  return (
    <aside className="discovery-rail flex flex-col h-full bg-white/80 border-r border-black/[0.06]">
      <div className="p-3.5 border-b border-black/[0.06] space-y-3">
        {/* Section 1: DISCOVERY Mode Switch */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">Discovery</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs font-semibold">
            <button
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all text-xs font-bold",
                viewMode === 'atoms'
                  ? "bg-[#e6f6ef] text-[#087f5b] border border-[#bce8d5] shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
              onClick={() => setViewMode('atoms')}
            >
              <Atom className="h-3.5 w-3.5" />
              <span>Atoms</span>
            </button>
            <button
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all text-xs font-bold",
                viewMode === 'molecules'
                  ? "bg-[#e6f6ef] text-[#087f5b] border border-[#bce8d5] shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
              onClick={() => setViewMode('molecules')}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Molecules</span>
            </button>
          </div>
        </div>

        {/* Section 2: FILTER BY CATEGORY */}
        {viewMode === 'atoms' && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">Filter by Category</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                  activeFilter === 'all'
                    ? "bg-[#e6f6ef] text-[#087f5b] border-[#16a875] font-bold shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              {categories.map((category) => {
                const color = categoryColors[category];
                const isActive = activeFilter === category;
                const shortLabel = categoryLabels[category]
                  .replace(' Metals', '')
                  .replace(' Metal', '')
                  .replace(' Earth', '');
                return (
                  <button
                    key={category}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 border",
                      isActive
                        ? "bg-[#e6f6ef] text-[#087f5b] border-[#16a875] font-bold shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => setActiveFilter(category)}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: ELEMENTS List */}
      <div className="px-3.5 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">Elements</span>
      </div>

      <div className="rail-list flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {viewMode === 'atoms'
          ? filteredElements.map((element) => {
            const color = getElementColor(element);
            const isSelected = selectedElement?.atomicNumber === element.atomicNumber;
            return (
              <button
                key={element.atomicNumber}
                className={cn(
                  "element-rail-card p-2 rounded-xl flex items-center gap-2.5 transition-all text-left",
                  isSelected && "is-active ring-2 ring-[#16a875] bg-[#e6f6ef]/50"
                )}
                onClick={() => onSelectElement(element)}
              >
                {/* Symbol Box with Distinct Atomic Number */}
                <div
                  className="relative flex flex-col items-center justify-center h-11 w-11 rounded-xl border font-sans shrink-0 shadow-xs"
                  style={{
                    backgroundColor: `${color}15`,
                    borderColor: isSelected ? '#16a875' : `${color}40`,
                  }}
                >
                  <span className="text-[9px] font-mono leading-none text-slate-400 font-semibold">{element.atomicNumber}</span>
                  <span className="text-sm font-extrabold leading-none my-0.5" style={{ color }}>{element.symbol}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-bold text-slate-900">{element.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{element.atomicMass.toFixed(1)} u</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                    <span className="font-semibold truncate" style={{ color }}>{categoryLabels[element.category]}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 uppercase font-bold shrink-0">{getElementBlock(element.atomicNumber)}-blk</span>
                  </div>
                </div>
                <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isSelected ? "text-[#16a875]" : "text-slate-300")} />
              </button>
            );
          })
          : filteredMolecules.map((molecule) => (
            <button
              key={molecule.formula}
              className="element-rail-card"
              onClick={() => onSelectMolecule(molecule)}
            >
              <span className="flex h-10 w-12 items-center justify-center font-bold text-xs rounded-xl bg-emerald-50 text-[#16a875] border border-[#bce8d5] shrink-0 font-mono">
                {molecule.formula}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-900">{molecule.name}</span>
                <span className="block truncate text-[10px] text-slate-500 font-mono">{molecule.atoms.length} atoms • {molecule.bonds.length} bonds</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            </button>
          ))}
      </div>

      {/* Collapse Rail Button */}
      <div className="p-2 border-t border-black/[0.06] flex items-center justify-center">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
          title="Collapse Rail (or Drag Edge to Resize)"
        >
          <span className="font-mono text-xs font-bold">«</span>
        </button>
      </div>
    </aside>
  );
}

function VisualStage({
  selectedElement,
  selectedMolecule,
  onSelectElement,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onSelectElement: (element: ChemicalElement) => void;
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
  const [autoRotate, setAutoRotate] = useState(false);
  const selectedIsotopeIdx = 0;
  const ionCharge = 0;
  const showSpectroscopy = false;

  const isotopes = useMemo(() => (selectedElement ? getIsotopesForElement(selectedElement.atomicNumber) : []), [selectedElement]);
  const activeIsotope = isotopes[selectedIsotopeIdx] || isotopes[0];

  const ionizedElectrons = useMemo(() => {
    if (!selectedElement) return [];
    const shells = [...selectedElement.shells];
    if (ionCharge !== 0 && shells.length > 0) {
      const lastIdx = shells.length - 1;
      shells[lastIdx] = Math.max(0, shells[lastIdx] - ionCharge);
    }
    return shells;
  }, [selectedElement, ionCharge]);

  const stageColor = selectedElement ? getElementColor(selectedElement) : '#16a875';
  const stageTitle = selectedElement
    ? `${selectedElement.name} (${activeIsotope?.symbol || selectedElement.symbol}) • #${selectedElement.atomicNumber}`
    : selectedMolecule
    ? `${selectedMolecule.name} (${selectedMolecule.formula})`
    : 'Interactive 3D Visualizer';

  // Quick picks featured cards exactly matching reference image
  const featuredQuickPicks = useMemo(() => [
    { symbol: 'H', name: 'Hydrogen', color: '#06b6d4' },
    { symbol: 'C', name: 'Carbon', color: '#0d9488' },
    { symbol: 'O', name: 'Oxygen', color: '#16a875' },
    { symbol: 'Ne', name: 'Neon', color: '#c026d3' },
    { symbol: 'Fe', name: 'Iron', color: '#d97706' },
    { symbol: 'Cu', name: 'Copper', color: '#ea580c' },
    { symbol: 'Au', name: 'Gold', color: '#eab308' },
    { symbol: 'U', name: 'Uranium', color: '#7c3aed' },
  ], []);

  return (
    <section className={cn('visual-stage relative', isFullscreen && 'is-fullscreen')}>
      {/* Top Stage Instrument Toolbar */}
      <div className="stage-toolbar flex items-center justify-between px-4 sm:px-6 py-2.5 bg-white/80 backdrop-blur-md border-b border-black/[0.06]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-mono font-semibold">
            Quantum Visual Stage
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {stageTitle}
          </div>
        </div>

        {/* Laboratory Instrument Controls */}
        <div className="flex items-center gap-2">
          {/* Camera View Presets [ 3D | Top | Side ] */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => setCameraPreset('3d')}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                cameraPreset === '3d' ? "bg-[#e6f6ef] text-[#16a875] shadow-xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              3D
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                cameraPreset === 'top' ? "bg-[#e6f6ef] text-[#16a875] shadow-xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Top
            </button>
            <button
              onClick={() => setCameraPreset('side')}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                cameraPreset === 'side' ? "bg-[#e6f6ef] text-[#16a875] shadow-xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Side
            </button>
          </div>

          {/* Reset Orbit Button */}
          <button
            className="icon-button"
            onClick={() => setAutoRotate(!autoRotate)}
            title="Reset Orbit & Position"
          >
            <RotateCcw className="h-4 w-4 text-slate-600" />
          </button>

          {/* Atom Orbitals Toggle */}
          <button
            className={cn('icon-button', showOrbitals && 'is-active')}
            onClick={() => setShowOrbitals(!showOrbitals)}
            title="Toggle Quantum Orbitals"
          >
            <Atom className="h-4 w-4" />
          </button>

          {/* Table Grid Toggle */}
          <button
            className="icon-button"
            onClick={() => setWorkspaceMode('table')}
            title="Open Periodic Table Grid"
          >
            <Grid3X3 className="h-4 w-4 text-slate-600" />
          </button>

          {/* Maximize / Fullscreen */}
          <button
            className="icon-button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen Stage"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-slate-600" /> : <Maximize2 className="h-4 w-4 text-slate-600" />}
          </button>

          {/* More Options Menu */}
          <button className="icon-button" title="Stage Settings">
            <span className="font-bold text-sm text-slate-600">⋮</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="stage-canvas w-full h-full flex-1 relative flex items-center justify-center overflow-hidden spectral-canvas-bg">
        {/* Quantum OS & Interactive Hand Controls Badge (Top Left of Canvas) */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none select-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-black/[0.08] text-slate-700 text-[11px] font-mono font-bold shadow-xs backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#16a875] animate-pulse" />
            <span>QUANTUM.OS v1.0</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-black/[0.06] text-slate-500 text-[10.5px] font-mono shadow-xs backdrop-blur-sm">
            <span>🖐️ Drag to Rotate</span>
            <span className="text-slate-300">•</span>
            <span>🖱️ Scroll to Zoom</span>
            <span className="text-slate-300">•</span>
            <span>⇧ Pan</span>
          </div>
        </div>

        {/* Floating Quick-Spin & Camera Orbit Action Floating Pill (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-black/[0.08] shadow-xs">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center gap-1.5",
              autoRotate ? "bg-[#e6f6ef] text-[#087f5b] border border-[#bce8d5] shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
            )}
            title="Toggle Continuous Auto-Spin Orbit"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", autoRotate ? "bg-[#16a875] animate-ping" : "bg-slate-300")} />
            <span>{autoRotate ? 'AUTO-SPIN ON' : 'AUTO-SPIN'}</span>
          </button>

          <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5" />

          <button
            onClick={() => {
              setCameraPreset('3d');
              setAutoRotate(false);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
            title="Reset 3D Perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Collapsible Spectroscopy Drawer in 3D View */}
        {viewMode === 'atoms' && selectedElement && showSpectroscopy && (
          <div className="absolute bottom-3 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-20 pointer-events-auto">
            <SpectroscopyBar element={selectedElement} collapsible />
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'atoms' && selectedElement && (
            <motion.div
              key={`${selectedElement.atomicNumber}-${activeIsotope?.symbol}-${ionCharge}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
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
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {viewMode === 'molecules' && selectedMolecule && (
            <motion.div
              key={selectedMolecule.formula}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
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

          {((viewMode === 'atoms' && !selectedElement) || (viewMode === 'molecules' && !selectedMolecule)) && (
            <motion.div
              key="empty-stage"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 text-center max-w-xl mx-auto px-4 py-8 flex flex-col items-center justify-center"
            >
              {/* QUANTUM.OS v1.0 Badge */}
              <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-black/[0.06] text-xs font-mono text-slate-600 shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#16a875] animate-pulse" />
                <span className="font-bold text-slate-800">QUANTUM.OS</span>
                <span className="text-slate-400">v1.0</span>
              </div>

              {/* Spectral Wave Canvas Behind Atom Emblem */}
              <div className="relative mb-6 flex items-center justify-center">
                <div className="absolute -inset-10 rounded-full bg-gradient-to-r from-emerald-100/60 via-teal-50/40 to-cyan-100/60 blur-2xl pointer-events-none" />
                
                {/* Concentric Spectral Ring Atom Emblem */}
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white border border-[#bce8d5] shadow-[0_8px_30px_rgb(22,168,117,0.12)]">
                  <div className="absolute inset-2 rounded-full border border-dashed border-[#16a875]/40 animate-[spin_20s_linear_infinite]" />
                  <div className="absolute inset-5 rounded-full border border-[#16a875]/20 animate-[spin_12s_linear_infinite_reverse]" />
                  <Atom className="h-12 w-12 text-[#16a875]" />
                </div>
              </div>

              {/* Editorial Title */}
              <h2 className="text-3xl sm:text-4xl font-normal font-serif-title text-slate-900 tracking-tight mb-2">
                Explore the <span className="text-[#16a875] font-semibold italic">Elements</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                Select an atom from the discovery rail or pick a featured element below to begin quantum interactive inspection.
              </p>

              {/* 8 Featured Element Quick-Pick Cards */}
              <div className="space-y-2 mb-8 max-w-xl mx-auto">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {featuredQuickPicks.slice(0, 4).map((item) => {
                    const el = elements.find(e => e.symbol === item.symbol);
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => el && onSelectElement(el)}
                        className="px-3.5 py-1.5 rounded-xl border bg-white/95 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 shadow-xs"
                        style={{ borderColor: item.color }}
                      >
                        <span className="font-extrabold font-mono" style={{ color: item.color }}>{item.symbol}</span>
                        <span className="text-slate-600">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {featuredQuickPicks.slice(4).map((item) => {
                    const el = elements.find(e => e.symbol === item.symbol);
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => el && onSelectElement(el)}
                        className="px-3.5 py-1.5 rounded-xl border bg-white/95 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 shadow-xs"
                        style={{ borderColor: item.color }}
                      >
                        <span className="font-extrabold font-mono" style={{ color: item.color }}>{item.symbol}</span>
                        <span className="text-slate-600">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Instrument Scrubber (Zoom Magnification & Speed) */}
      <div className="stage-status flex flex-wrap items-center justify-between px-5 py-2.5 bg-white/90 backdrop-blur-md border-t border-black/[0.06] text-xs font-sans text-slate-600">
        {/* Instrument Magnification Scale Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono">Magnification:</span>
          
          <button
            onClick={() => setZoomLevel(0.5)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all border",
              Math.abs(zoomLevel - 0.5) < 0.1 ? "bg-[#e6f6ef] text-[#087f5b] font-bold border-[#16a875] shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="System View: Complete Atomic & Orbital Overview"
          >
            0.5x System
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all border",
              Math.abs(zoomLevel - 1.0) < 0.1 ? "bg-[#e6f6ef] text-[#087f5b] font-bold border-[#16a875] shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Standard View: Balanced Nucleus & Valence Shells"
          >
            1.0x Standard
          </button>
          
          <input
            aria-label="Zoom slider"
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20 sm:w-28 accent-[#16a875] cursor-pointer h-1.5 bg-slate-200 rounded"
          />

          <button
            onClick={() => setZoomLevel(2.0)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all border",
              Math.abs(zoomLevel - 2.0) < 0.1 ? "bg-[#e6f6ef] text-[#087f5b] font-bold border-[#16a875] shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Structural View: Shell Trajectories & Subshells"
          >
            2.0x Structure
          </button>
          <button
            onClick={() => setZoomLevel(4.0)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all border",
              Math.abs(zoomLevel - 4.0) < 0.1 ? "bg-[#e6f6ef] text-[#087f5b] font-bold border-[#16a875] shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Nuclear Detail: Core Magnification & Proton/Neutron Clusters"
          >
            4.0x Core Detail
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono">Speed:</span>
          {[0.5, 1.0, 1.5, 2.0].map((spd) => (
            <button
              key={spd}
              onClick={() => setAnimationSpeed(spd)}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10.5px] font-mono transition-all border",
                Math.abs(animationSpeed - spd) < 0.1 ? "bg-[#e6f6ef] text-[#087f5b] font-bold border-[#16a875] shadow-xs" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              )}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inspector({
  selectedElement,
  selectedMolecule,
  onCompare,
  onSave: _onSave,
  onToggleCollapse,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onCompare: (element: ChemicalElement) => void;
  onSave?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { inspectorTab, setInspectorTab } = useAppStore();
  const [tempUnit, setTempUnit] = useState<'C' | 'K' | 'F'>('C');
  const props = selectedElement ? elementProperties[selectedElement.atomicNumber] : null;
  const elementColor = selectedElement ? getElementColor(selectedElement) : '#16a875';

  return (
    <aside className="inspector-panel flex flex-col h-full bg-white/80 border-l border-black/[0.06]">
      {/* Header */}
      <div className="rail-header flex items-center justify-between p-3.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-[#16a875]" />
          <span className="text-xs uppercase tracking-wider text-slate-800 font-sans font-bold">Scientific Inspector</span>
        </div>
        <button onClick={onToggleCollapse} className="icon-button" title="Collapse Inspector (or Drag Edge to Resize)">
          <span className="text-xs text-slate-400 font-bold">^</span>
        </button>
      </div>

      {/* Segmented Light Theme Tab Bar with Emerald Active Underline */}
      <div className="inspector-tabs flex items-center justify-between px-2 pt-1 border-b border-black/[0.06]">
        {(['overview', 'properties', 'learning', 'actions'] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              'py-2 px-2.5 text-[10.5px] font-bold uppercase tracking-wider transition-all font-sans',
              inspectorTab === tab ? 'is-active' : 'text-slate-400 hover:text-slate-700'
            )}
            onClick={() => setInspectorTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {!selectedElement && !selectedMolecule && (
        <div className="empty-inspector flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#e6f6ef] border border-[#bce8d5]/50 shadow-xs">
            <BookOpen className="h-10 w-10 text-[#16a875]" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs">
            Select an atom or molecule to reveal atomic details, physical metrics, thermal states, and learning notes.
          </p>
        </div>
      )}

      {selectedElement && (
        <div className="inspector-content p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* Hero Header Card */}
          <div
            className="hero-element p-3.5 rounded-2xl border flex items-center gap-3.5 relative overflow-hidden bg-white shadow-card"
            style={{
              borderColor: `${elementColor}40`,
            }}
          >
            <div
              className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl border shadow-xs shrink-0"
              style={{
                backgroundColor: `${elementColor}15`,
                borderColor: `${elementColor}50`,
              }}
            >
              <span className="text-[10px] font-mono leading-none text-slate-400 font-bold">{selectedElement.atomicNumber}</span>
              <span className="text-xl font-extrabold leading-none my-0.5" style={{ color: elementColor }}>{selectedElement.symbol}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 truncate">{selectedElement.name}</h3>
                <span className="text-xs font-mono font-bold text-slate-400">#{selectedElement.atomicNumber}</span>
              </div>
              <p className="text-xs font-semibold" style={{ color: elementColor }}>
                {categoryLabels[selectedElement.category]} • Block-{getElementBlock(selectedElement.atomicNumber).toUpperCase()}
              </p>
              <p className="text-[10.5px] text-slate-400 font-mono">
                {selectedElement.shells.length} Shells • {selectedElement.atomicNumber} Electrons
              </p>
            </div>
          </div>

          {/* Overview Tab */}
          {inspectorTab === 'overview' && (
            <div className="space-y-3">
              <BohrModel3D shells={selectedElement.shells} color={elementColor} symbol={selectedElement.symbol} />

              <QuantumNumbersHUD element={selectedElement} />

              {/* Spectroscopy Preview */}
              <SpectroscopyBar element={selectedElement} />

              {/* 6-Grid Quantitative Metrics */}
              <div className="metric-grid grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">Atomic Mass</small>
                  <strong className="text-xs font-bold text-slate-900">{selectedElement.atomicMass.toFixed(4)} u</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">Electron Config</small>
                  <strong className="text-xs font-bold text-[#087f5b] truncate block">{getElectronConfig(selectedElement.atomicNumber)}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">Bohr Shells</small>
                  <strong className="text-xs font-bold text-slate-900">{selectedElement.shells.join(' • ')}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">State @ 25°C</small>
                  <strong className="text-xs font-bold text-slate-900 capitalize flex items-center gap-1">
                    <span>{props?.state === 'gas' ? '💨 Gas' : props?.state === 'liquid' ? '💧 Liquid' : '🧊 Solid'}</span>
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">Melting Point</small>
                  <strong className="text-xs font-bold text-slate-900">{formatTemp(props?.meltingPoint, tempUnit)}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-400 uppercase font-bold block">Electronegativity</small>
                  <strong className="text-xs font-bold text-[#087f5b]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 1.91'}</strong>
                </div>
              </div>

              {/* Quick Action Dispatch Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => onCompare(selectedElement)}
                  className="px-2 py-2 bg-[#e6f6ef] hover:bg-[#d8f2e6] border border-[#bce8d5] rounded-xl text-[10.5px] font-bold text-[#087f5b] flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[#16a875]" /> Compare
                </button>
                <button
                  onClick={() => setWorkspaceMode('reactions')}
                  className="px-2 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-[10.5px] font-bold text-amber-900 flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> React
                </button>
                <button
                  onClick={() => setWorkspaceMode('builder')}
                  className="px-2 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-[10.5px] font-bold text-teal-900 flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Boxes className="w-3.5 h-3.5 text-teal-600" /> Build
                </button>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {inspectorTab === 'properties' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-500 font-mono text-[11px]">Temperature Units:</span>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  {(['C', 'K', 'F'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setTempUnit(u)}
                      className={cn("px-2.5 py-0.5 text-[10px] font-mono rounded-lg font-bold transition-all", tempUnit === u ? "bg-white text-[#087f5b] shadow-xs" : "text-slate-500 hover:text-slate-800")}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono bg-white p-3.5 rounded-2xl border border-black/[0.06] shadow-card">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Electron Configuration</span>
                  <strong className="text-slate-900 text-right">{getElectronConfig(selectedElement.atomicNumber)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Bohr Shell Population</span>
                  <strong className="text-slate-900">{selectedElement.shells.join(' • ')}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Melting Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.meltingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Boiling Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.boilingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Electronegativity (Pauling)</span>
                  <strong className="text-[#087f5b]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'χ 1.91'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">First Ionization Energy</span>
                  <strong className="text-slate-900">{props?.ionizationEnergy ? `${props.ionizationEnergy} kJ/mol` : '737.1 kJ/mol'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Mass Density</span>
                  <strong className="text-slate-900">{props?.density ? `${props.density} g/cm³` : '8.908 g/cm³'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Atomic Radius</span>
                  <strong className="text-slate-900">{props?.atomicRadius ? `${props.atomicRadius} pm` : '124 pm'}</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Discovery Year</span>
                  <strong className="text-[#087f5b]">{props?.discoveryYear ? `${props.discoveryYear} CE` : 'Antiquity'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Learning Tab */}
          {inspectorTab === 'learning' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-black/[0.06] bg-white shadow-card space-y-1.5">
                <div className="flex items-center gap-2 text-[#087f5b] font-bold text-xs uppercase tracking-wider font-mono">
                  <Beaker className="h-4 w-4 text-[#16a875]" /> Atomic & Subatomic Structure
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>{selectedElement.name} (#{selectedElement.atomicNumber})</strong> has <strong>{selectedElement.atomicNumber} protons</strong>, <strong>{Math.round(selectedElement.atomicMass - selectedElement.atomicNumber)} neutrons</strong>, and <strong>{selectedElement.shells.length} electron shells</strong>. Belonging to the <strong>{categoryLabels[selectedElement.category]}</strong> series in Block-{getElementBlock(selectedElement.atomicNumber).toUpperCase()}, its valence electrons govern its bonding geometry and metallic character.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-black/[0.06] bg-white shadow-card space-y-1.5">
                <div className="flex items-center gap-2 text-[#087f5b] font-bold text-xs uppercase tracking-wider font-mono">
                  <Info className="h-4 w-4 text-[#16a875]" /> Discovery & Natural Occurrence
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {props?.discoveryYear ? `Isolated and documented in ${props.discoveryYear} CE. ` : 'Known and utilized since ancient antiquity. '}
                  At standard temperature and pressure (298.15 K, 1 atm), it naturally adopts a stable <strong>{props?.state || 'solid'}</strong> phase. Highly abundant across planetary crusts and metallic meteorites.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-black/[0.06] bg-white shadow-card space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider font-mono">
                  <Zap className="h-4 w-4 text-amber-600" /> Industrial & Energy Applications
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Extensively engineered in high-performance lithium-ion battery chemistry, corrosion-resistant superalloys for aerospace turbines, catalytic synthesis, and magnetic core architectures.
                </p>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {inspectorTab === 'actions' && (
            <div className="space-y-2 pt-1">
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-[#e6f6ef] hover:bg-[#d8f2e6] border border-[#bce8d5] text-[#087f5b] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => onCompare(selectedElement)}
              >
                <GitCompare className="h-4 w-4 text-[#16a875]" /> Add to Side-by-Side Comparison
              </button>
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => setWorkspaceMode('reactions')}
              >
                <Zap className="h-4 w-4 text-amber-600" /> Explore in Chemical Reactions
              </button>
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => setWorkspaceMode('builder')}
              >
                <Boxes className="h-4 w-4 text-teal-600" /> Construct Molecule in Builder
              </button>
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => setWorkspaceMode('table')}
              >
                <Grid3X3 className="h-4 w-4 text-[#16a875]" /> View in 18-Column IUPAC Matrix
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMolecule && (
        <div className="inspector-content p-3.5 space-y-3 overflow-y-auto flex-1">
          <div className="hero-element p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3.5 shadow-xs">
            <span className="flex h-12 w-14 items-center justify-center text-lg font-bold rounded-xl border border-emerald-300 bg-white text-[#16a875] font-mono shadow-xs shrink-0">
              {selectedMolecule.formula}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 truncate">{selectedMolecule.name}</h3>
              <p className="text-xs text-slate-500 truncate">{selectedMolecule.description}</p>
            </div>
          </div>

          <div className="metric-grid grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Total Atoms</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.atoms.length}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Chemical Bonds</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.bonds.length}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Bond Orders</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.bonds.map(b => b.order).join(', ')}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Elements</small>
              <strong className="text-sm text-[#16a875] font-mono">{Array.from(new Set(selectedMolecule.atoms.map(a => a.symbol))).join(', ')}</strong>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              className="w-full py-2.5 px-3 rounded-xl bg-[#e6f6ef] hover:bg-[#d8f2e6] border border-[#bce8d5] text-[#087f5b] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              onClick={() => setWorkspaceMode('builder')}
            >
              <Boxes className="h-4 w-4 text-[#16a875]" /> Modify in 2D Molecule Builder
            </button>
            <button
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              onClick={() => setWorkspaceMode('reactions')}
            >
              <Zap className="h-4 w-4 text-amber-600" /> Test in Reaction Lab
            </button>
          </div>
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
    return saved ? Math.max(200, Math.min(480, Number(saved))) : 280;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem('ele_right_col_width');
    return saved ? Math.max(260, Math.min(560, Number(saved))) : 340;
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
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setLeftWidth(newWidth);
        localStorage.setItem('ele_left_col_width', String(newWidth));
      } else if (isDraggingRightRef.current) {
        const newWidth = Math.max(260, Math.min(560, window.innerWidth - e.clientX));
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
  }, [setWorkspaceMode, toggleZenMode, togglePaused, setShowOrbitals, showOrbitals, selectedElement]);

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

  const selectElement = useCallback((element: ChemicalElement) => {
    audioEngine.playElementChime(element.atomicNumber);
    setSelectedElement(element);
    setSelectedMolecule(null);
    setViewMode('atoms');
    addRecentItem(`element:${element.atomicNumber}`);
    sendProductEvent({ type: 'presence', workspaceMode });
  }, [addRecentItem, setSelectedElement, setSelectedMolecule, setViewMode, workspaceMode]);

  const selectMolecule = useCallback((molecule: Molecule) => {
    audioEngine.playBondingChord();
    setSelectedMolecule(molecule);
    setSelectedElement(null);
    setViewMode('molecules');
    addRecentItem(`molecule:${molecule.formula}`);
    sendProductEvent({ type: 'molecule_selected', formula: molecule.formula });
  }, [addRecentItem, setSelectedElement, setSelectedMolecule, setViewMode]);

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
      return <ComparisonMode element1={compareElement1} element2={compareElement2} onRemoveElement={(slot) => setComparisonBasket(slot === 1 ? comparisonBasket.slice(1) : comparisonBasket.slice(0, 1))} />;
    }
    if (workspaceMode === 'reactions') return <ReactionSimulator onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'builder') return <MoleculeBuilder onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'decay') return <NuclearDecayLab />;
    if (workspaceMode === 'lattice') return <CrystalLattice3D />;
    if (workspaceMode === 'library') return <LibraryManager sessions={savedSessions} onOpen={openSession} onDelete={deleteSession} />;
    return (
      <VisualStage
        selectedElement={selectedElement}
        selectedMolecule={selectedMolecule}
        onSelectElement={selectElement}
      />
    );
  };

  return (
    <WorkbenchFrame>
      <TopBar onSave={saveSession} saveState={saveState} onOpenShortcuts={() => setShortcutsOpen(true)} />

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <CommandPalette
        filteredElements={filteredElements}
        filteredMolecules={filteredMolecules}
        onSelectElement={selectElement}
        onSelectMolecule={selectMolecule}
        onSave={saveSession}
      />

      <div className={cn('workbench-layout', isMobile && 'is-mobile', zenMode && 'is-zen')}>
        {/* Left Discovery Rail (Resizable) */}
        {!isMobile && !zenMode && !leftCollapsed && (
          <div style={{ width: leftWidth, minWidth: 200, maxWidth: 500, flexShrink: 0 }} className="h-full">
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
            onDoubleClick={() => setLeftWidth(280)}
            title="Drag to resize Discovery Rail (Double-click to reset)"
          />
        )}

        {/* Center Main Stage (Expands Automatically) */}
        <main className="workbench-main flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          <WorkspaceNav />
          <div key={workspaceMode} className="flex-1 min-h-0 relative flex flex-col animate-fade-in">
            {workspaceContent()}
          </div>
        </main>

        {/* Right Splitter Handle */}
        {!isMobile && !zenMode && !rightCollapsed && (
          <div
            className={cn('layout-splitter', isDraggingRight && 'is-dragging')}
            onMouseDown={startDragRight}
            onDoubleClick={() => setRightWidth(340)}
            title="Drag to resize Scientific Inspector (Double-click to reset)"
          />
        )}

        {/* Right Scientific Inspector (Resizable) */}
        {!isMobile && !zenMode && !rightCollapsed && (
          <div style={{ width: rightWidth, minWidth: 260, maxWidth: 560, flexShrink: 0 }} className="h-full">
            <Inspector
              selectedElement={selectedElement}
              selectedMolecule={selectedMolecule}
              onCompare={addCompare}
              onSave={saveSession}
              onToggleCollapse={toggleRightCollapse}
            />
          </div>
        )}

        {/* Left Floating Reopen Tab when collapsed */}
        {!isMobile && !zenMode && leftCollapsed && (
          <button
            onClick={toggleLeftCollapse}
            className="absolute left-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-r-xl bg-white border-y border-r border-black/[0.08] shadow-md text-slate-700 hover:text-[#16a875] text-xs font-bold transition-all hover:pl-3.5"
            title="Expand Discovery Rail"
          >
            <Atom className="w-3.5 h-3.5 text-[#16a875]" />
            <span>Elements »</span>
          </button>
        )}

        {/* Right Floating Reopen Tab when collapsed */}
        {!isMobile && !zenMode && rightCollapsed && (
          <button
            onClick={toggleRightCollapse}
            className="absolute right-0 top-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-white border-y border-l border-black/[0.08] shadow-md text-slate-700 hover:text-[#16a875] text-xs font-bold transition-all hover:pr-3.5"
            title="Expand Scientific Inspector"
          >
            <span>« Inspector</span>
            <FlaskConical className="w-3.5 h-3.5 text-[#16a875]" />
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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col"
            onClick={() => setMobileDrawer('none')}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-[88vw] max-w-sm h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl"
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

        {isMobile && mobileDrawer === 'inspector' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end"
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
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Element Details & Bohr Model</span>
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
                  onSave={() => {
                    saveSession();
                    setMobileDrawer('none');
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Dock with Touch Friendly Quick Actions */}
      {isMobile && (
        <div className="mobile-dock">
          <button onClick={() => setMobileDrawer('discovery')}><Search className="h-4 w-4" />Browse</button>
          <button onClick={() => setWorkspaceMode('table')}><Grid3X3 className="h-4 w-4" />Table</button>
          <button onClick={() => setMobileDrawer('inspector')}><Info className="h-4 w-4" />Details</button>
          <button onClick={() => selectedElement ? addCompare(selectedElement) : setWorkspaceMode('compare')}>
            <GitCompare className="h-4 w-4" />Compare
          </button>
          <button onClick={saveSession}><Save className="h-4 w-4" />Save</button>
        </div>
      )}
    </WorkbenchFrame>
  );
}
