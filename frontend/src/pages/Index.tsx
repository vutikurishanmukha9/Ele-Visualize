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
  Hand,
  HelpCircle,
  Info,
  Library,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { Atom3D, CameraPreset } from '@/components/Atom3D';
import { ComparisonMode } from '@/components/ComparisonMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HandTracker } from '@/components/HandTracker';
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
  { id: 'lab', label: 'AR Lab', icon: Hand },
  { id: 'library', label: 'Library', icon: Library },
];

const categories = Object.keys(categoryLabels) as ElementCategory[];

function getElectronConfig(atomicNumber: number) {
  const orbitals = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
  const maxElectrons = [2, 2, 6, 2, 6, 2, 10, 6, 2, 10, 6, 2, 14, 10, 6, 2, 14, 10, 6];
  let remaining = atomicNumber;
  const config: React.ReactNode[] = [];
  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const count = Math.min(remaining, maxElectrons[i]);
    config.push(<span key={orbitals[i]} className="mr-[2px]">{orbitals[i]}<sup className="text-[10px] text-primary font-semibold">{count}</sup></span>);
    remaining -= count;
  }
  return <>{config}</>;
}

const formatTemp = (kelvin: number | null | undefined, unit: 'C' | 'K' | 'F' = 'C') => {
  if (kelvin == null) return 'Not available';
  if (unit === 'K') return `${kelvin} K`;
  if (unit === 'F') return `${Math.round((kelvin - 273.15) * 9/5 + 32)} °F`;
  return `${Math.round(kelvin - 273.15)} °C`;
};

// Animated 2D Bohr Model SVG Widget
function BohrModel2D({ shells, color, symbol }: { shells: number[]; color: string; symbol: string }) {
  const size = 150;
  const center = size / 2;
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-950/70 rounded-xl border border-white/10 relative overflow-hidden select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Core Nucleus glow */}
        <circle cx={center} cy={center} r={16} fill={color} opacity={0.25} />
        <circle cx={center} cy={center} r={12} fill={color} opacity={0.8} />
        <text x={center} y={center + 4} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
          {symbol}
        </text>
        {/* Orbiting Shells */}
        {shells.map((count, shellIdx) => {
          const radius = 22 + shellIdx * (48 / Math.max(shells.length, 1));
          return (
            <g key={shellIdx}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity={0.35} />
              {Array.from({ length: Math.min(count, 12) }).map((_, electronIdx) => {
                const angle = (electronIdx / Math.min(count, 12)) * Math.PI * 2;
                const ex = center + Math.cos(angle) * radius;
                const ey = center + Math.sin(angle) * radius;
                return (
                  <circle key={electronIdx} cx={ex} cy={ey} r={2.5} fill="#ffffff" stroke={color} strokeWidth="1" opacity={0.9} />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] font-mono text-muted-foreground mt-2 text-center">
        Bohr Configuration: <span className="text-white font-bold">{shells.join(' • ')}</span>
      </div>
    </div>
  );
}

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
}: {
  onSave: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
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
          title={audioEngine.isMuted() ? "Unmute Audio" : "Mute Audio"}
        >
          <Sun className="h-4 w-4 text-slate-600" />
        </button>
        <button className="icon-button" title="Help & Information">
          <HelpCircle className="h-4 w-4 text-slate-600" />
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
}: {
  filteredElements: ChemicalElement[];
  filteredMolecules: Molecule[];
  onSelectElement: (element: ChemicalElement) => void;
  onSelectMolecule: (molecule: Molecule) => void;
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
                  "element-rail-card",
                  isSelected && "is-active"
                )}
                onClick={() => onSelectElement(element)}
              >
                {/* Symbol Box with Superscript Atomic Number */}
                <div
                  className="relative flex h-10 w-10 items-center justify-center font-bold text-base rounded-xl border font-sans shrink-0 shadow-xs"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                    borderColor: `${color}40`,
                  }}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono leading-none text-slate-400">
                    {element.atomicNumber}
                  </span>
                  <span>{element.symbol}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900">{element.name}</span>
                  <span className="block truncate text-[10px] text-slate-500 font-mono">
                    <span className="font-semibold" style={{ color }}>{categoryLabels[element.category]}</span> • {element.atomicMass.toFixed(2)} u
                  </span>
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
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
          title="Collapse Rail"
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
  handPositionX,
  handPositionY,
  isHandControlled,
  isFrozen,
  onSelectElement,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  handPositionX: React.MutableRefObject<number>;
  handPositionY: React.MutableRefObject<number>;
  isHandControlled: React.MutableRefObject<boolean>;
  isFrozen: React.MutableRefObject<boolean>;
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
        {/* Quantum OS v1.0 Pill Badge (Top Left of Canvas) */}
        <div className="absolute top-4 left-4 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f6ef]/90 border border-[#bce8d5] text-[#087f5b] text-[11px] font-mono font-bold shadow-xs backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#16a875] animate-pulse" />
            <span>QUANTUM.OS v1.0</span>
          </div>
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
                    handRotationXRef={handPositionY}
                    handRotationYRef={handPositionX}
                    isHandControlledRef={isHandControlled}
                    zoom={zoomLevel}
                    showOrbitals={showOrbitals}
                    showNucleusDetail={false}
                    isFrozenRef={isFrozen}
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
                    handRotationXRef={handPositionY}
                    handRotationYRef={handPositionX}
                    isHandControlledRef={isHandControlled}
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
              {/* Spectral Rings Atom Emblem */}
              <div className="relative mb-6 flex items-center justify-center">
                {/* Concentric subtle glowing halos */}
                <div className="absolute w-36 h-36 rounded-full border border-teal-200/40 animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-28 h-28 rounded-full border border-purple-200/40 animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute w-20 h-20 rounded-full border border-emerald-200/50" />
                <div className="w-16 h-16 rounded-2xl bg-white/90 border border-slate-200/80 shadow-[0_8px_30px_rgba(22,168,117,0.12)] flex items-center justify-center text-[#16a875]">
                  <Atom className="h-8 w-8 text-[#16a875]" />
                </div>
              </div>

              {/* Editorial Serif Headline */}
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
                Explore the <span className="bg-gradient-to-r from-teal-500 via-[#16a875] to-indigo-600 bg-clip-text text-transparent italic">Elements</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                Select an atom from the discovery rail, open the full periodic table, or launch a featured element below.
              </p>

              {/* Quick Pick Elemental Cards with Spectral Borders (Row 1 & Row 2) */}
              <div className="space-y-2 mb-6 w-full max-w-md">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {featuredQuickPicks.slice(0, 5).map((item) => {
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
                  {featuredQuickPicks.slice(5).map((item) => {
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

              {/* Large Emerald CTA Button */}
              <button
                className="px-6 py-2.5 rounded-2xl bg-[#16a875] hover:bg-[#087f5b] text-white font-bold text-sm shadow-[0_4px_16px_rgba(22,168,117,0.3)] flex items-center gap-2.5 transition-all hover:scale-[1.02]"
                onClick={() => setWorkspaceMode('table')}
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Open Periodic Table</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Instrument Scrubber (Zoom & Speed) */}
      <div className="stage-status flex flex-wrap items-center justify-between px-5 py-2.5 bg-white/90 backdrop-blur-md border-t border-black/[0.06] text-xs font-sans text-slate-600">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Zoom</span>
          <button
            onClick={() => setZoomLevel(0.5)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(zoomLevel - 0.5) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            0.5x
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(zoomLevel - 1.0) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            1.0x
          </button>
          <input
            aria-label="Zoom slider"
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-24 sm:w-32 accent-[#16a875] cursor-pointer h-1.5 bg-slate-200 rounded"
          />
          <button
            onClick={() => setZoomLevel(2.0)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(zoomLevel - 2.0) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            2.0x
          </button>
          <button
            onClick={() => setZoomLevel(4.0)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(zoomLevel - 4.0) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            4.0x
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Speed</span>
          <button
            onClick={() => setAnimationSpeed(0.5)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(animationSpeed - 0.5) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            0.5x
          </button>
          <button
            onClick={() => setAnimationSpeed(1.0)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(animationSpeed - 1.0) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            1.0x
          </button>
          <button
            onClick={() => setAnimationSpeed(1.5)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(animationSpeed - 1.5) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            1.5x
          </button>
          <button
            onClick={() => setAnimationSpeed(2.0)}
            className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono", Math.abs(animationSpeed - 2.0) < 0.1 ? "bg-[#e6f6ef] text-[#16a875] font-bold border border-[#bce8d5]" : "text-slate-500 hover:text-slate-800")}
          >
            2.0x
          </button>
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
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onCompare: (element: ChemicalElement) => void;
  onSave?: () => void;
}) {
  const { inspectorTab, setInspectorTab, setWorkspaceMode } = useAppStore();
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
        <button className="icon-button" title="Collapse Inspector">
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
            className="hero-element p-3.5 rounded-xl border flex items-center gap-3.5 relative overflow-hidden bg-white shadow-xs"
            style={{
              borderColor: `${elementColor}40`,
            }}
          >
            <span
              className="flex h-12 w-12 items-center justify-center text-xl font-extrabold rounded-xl border font-mono shadow-xs shrink-0"
              style={{
                backgroundColor: `${elementColor}15`,
                color: elementColor,
                borderColor: `${elementColor}50`
              }}
            >
              {selectedElement.symbol}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 truncate">{selectedElement.name}</h3>
                <span className="text-xs font-mono font-bold text-slate-400">#{selectedElement.atomicNumber}</span>
              </div>
              <p className="text-[11px] font-semibold" style={{ color: elementColor }}>
                {categoryLabels[selectedElement.category]} • Block-{getElementBlock(selectedElement.atomicNumber).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Overview Tab */}
          {inspectorTab === 'overview' && (
            <div className="space-y-3">
              <BohrModel2D shells={selectedElement.shells} color={elementColor} symbol={selectedElement.symbol} />

              <QuantumNumbersHUD element={selectedElement} />

              {/* Spectroscopy Preview */}
              <SpectroscopyBar element={selectedElement} />

              <div className="metric-grid grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Atomic Mass</small>
                  <strong className="text-sm text-slate-900 font-mono">{selectedElement.atomicMass.toFixed(3)} u</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Valence Electrons</small>
                  <strong className="text-sm text-[#16a875] font-mono">{selectedElement.shells[selectedElement.shells.length - 1]} e⁻</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">State @ 25°C</small>
                  <strong className="text-sm text-slate-900 capitalize">{props?.state || 'Unknown'}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-black/[0.06] shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Density</small>
                  <strong className="text-sm text-slate-900 font-mono">{props?.density ? `${props.density} g/cm³` : 'N/A'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {inspectorTab === 'properties' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-500 font-mono text-[11px]">Temperature Units:</span>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(['C', 'K', 'F'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setTempUnit(u)}
                      className={cn("px-2 py-0.5 text-[10px] font-mono rounded font-bold transition-all", tempUnit === u ? "bg-white text-[#16a875] shadow-xs" : "text-slate-500 hover:text-slate-800")}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono bg-white p-3 rounded-xl border border-black/[0.06] shadow-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Electron Config</span>
                  <strong className="text-slate-900 text-right">{getElectronConfig(selectedElement.atomicNumber)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Melting Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.meltingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Boiling Point</span>
                  <strong className="text-slate-900">{formatTemp(props?.boilingPoint, tempUnit)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Atomic Radius</span>
                  <strong className="text-slate-900">{props?.atomicRadius ? `${props.atomicRadius} pm` : 'N/A'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Electronegativity</span>
                  <strong className="text-[#16a875]">{props?.electronegativity ? `χ ${props.electronegativity}` : 'N/A'}</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Energy Shells</span>
                  <strong className="text-slate-900">{selectedElement.shells.join(' • ')}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Learning Tab */}
          {inspectorTab === 'learning' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-black/[0.06] bg-white shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-[#16a875] font-bold text-xs uppercase tracking-wider">
                  <Beaker className="h-4 w-4" /> Atomic Configuration
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>{selectedElement.name}</strong> possesses <strong>{selectedElement.shells.length}</strong> discrete electron shells with <strong>{selectedElement.atomicNumber}</strong> orbiting electrons. It belongs to the <strong>{categoryLabels[selectedElement.category]}</strong> group in Block-{getElementBlock(selectedElement.atomicNumber).toUpperCase()}.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-black/[0.06] bg-white shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-[#087f5b] font-bold text-xs uppercase tracking-wider">
                  <Info className="h-4 w-4" /> Discovery & Physical State
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {props?.discoveryYear ? `Identified in ${props.discoveryYear}. ` : 'Known since antiquity. '}
                  At standard room temperature (298 K / 25 °C), it naturally exists in the <strong>{props?.state || 'solid'}</strong> phase.
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

function BottomStatus({ selectedElement, selectedMolecule }: { selectedElement: ChemicalElement | null; selectedMolecule: Molecule | null }) {
  const { comparisonBasket, recentItems, workspaceMode } = useAppStore();
  return (
    <footer className="bottom-status">
      <span>{workspaceMode.toUpperCase()}</span>
      <span>{selectedElement ? `${selectedElement.symbol} selected` : selectedMolecule ? `${selectedMolecule.formula} selected` : 'No selection'}</span>
      <span>{comparisonBasket.length}/2 compare slots</span>
      <span className="hidden md:inline">{recentItems.length} recent</span>
    </footer>
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
    setZoomLevel,
    togglePaused,
    toggleZenMode,
  } = useAppStore();

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const handPositionX = useRef(0.5);
  const handPositionY = useRef(0.5);
  const isHandControlled = useRef(false);
  const isFrozen = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 820;
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
      if (event.key === 'g') setWorkspaceMode('table');
      if (event.key === 'c') setWorkspaceMode('compare');
      if (event.key === 'b') setWorkspaceMode('builder');
      if (event.key === 'r') setWorkspaceMode('reactions');
      if (event.key === 'z' || event.key === 'm') toggleZenMode();
      if (event.key === ' ') {
        event.preventDefault();
        togglePaused();
      }
      if (event.key === 'o') setShowOrbitals(!showOrbitals);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setWorkspaceMode, toggleZenMode, togglePaused, setShowOrbitals, showOrbitals]);

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

  const handleGestureDetected = useCallback((gesture: string) => {
    isHandControlled.current = gesture === 'open' || gesture === 'point';
    isFrozen.current = gesture === 'fist';
    if (gesture === 'victory') {
      setShowOrbitals(!showOrbitals);
    }
  }, [showOrbitals, setShowOrbitals]);

  const handleFreeze = useCallback((frozen: boolean) => {
    isFrozen.current = frozen;
  }, []);

  const handleHandPosition = useCallback((x: number, y: number) => {
    handPositionX.current = x;
    handPositionY.current = y;
    isHandControlled.current = true;
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const list = viewMode === 'atoms' ? filteredElements : [];
    if (!selectedElement || list.length === 0) return;
    const current = list.findIndex(element => element.atomicNumber === selectedElement.atomicNumber);
    if (direction === 'right' || direction === 'down') {
      const nextIndex = (current + 1) % list.length;
      selectElement(list[nextIndex]);
    } else if (direction === 'left' || direction === 'up') {
      const prevIndex = current <= 0 ? list.length - 1 : current - 1;
      selectElement(list[prevIndex]);
    }
  }, [filteredElements, selectElement, selectedElement, viewMode]);

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
    if (workspaceMode === 'library') return <LibraryManager sessions={savedSessions} onOpen={openSession} onDelete={deleteSession} />;
    return (
      <VisualStage
        selectedElement={selectedElement}
        selectedMolecule={selectedMolecule}
        handPositionX={handPositionX}
        handPositionY={handPositionY}
        isHandControlled={isHandControlled}
        isFrozen={isFrozen}
        onSelectElement={selectElement}
      />
    );
  };

  return (
    <WorkbenchFrame>
      <TopBar onSave={saveSession} saveState={saveState} />

      <CommandPalette
        filteredElements={filteredElements}
        filteredMolecules={filteredMolecules}
        onSelectElement={selectElement}
        onSelectMolecule={selectMolecule}
        onSave={saveSession}
      />

      <div className={cn('workbench-layout', isMobile && 'is-mobile', zenMode && 'is-zen')}>
        {!isMobile && !zenMode && (
          <DiscoveryRail
            filteredElements={filteredElements}
            filteredMolecules={filteredMolecules}
            onSelectElement={selectElement}
            onSelectMolecule={selectMolecule}
          />
        )}

        <main className="workbench-main">
          <WorkspaceNav />
          <div key={workspaceMode} className="flex-1 min-h-0 relative flex flex-col animate-fade-in">
            {workspaceContent()}
          </div>
        </main>

        {!isMobile && !zenMode && (
          <Inspector
            selectedElement={selectedElement}
            selectedMolecule={selectedMolecule}
            onCompare={addCompare}
            onSave={saveSession}
          />
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

      <BottomStatus selectedElement={selectedElement} selectedMolecule={selectedMolecule} />
      <HandTracker
        onZoomChange={setZoomLevel}
        onGestureDetected={handleGestureDetected}
        onSwipe={handleSwipe}
        onHandPosition={handleHandPosition}
        onFreeze={handleFreeze}
      />
    </WorkbenchFrame>
  );
}
