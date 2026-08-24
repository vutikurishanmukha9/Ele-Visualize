import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Atom,
  Beaker,
  BookOpen,
  Boxes,
  ChevronRight,
  Command,
  Compass,
  FlaskConical,
  GitCompare,
  Grid3X3,
  Hand,
  Info,
  Library,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Atom3D, CameraPreset } from '@/components/Atom3D';
import { ARButton } from '@/components/ARButton';
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
import { xrStore } from '@/components/VisualizerCanvas';
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
    selectedElement,
    selectedMolecule,
    uiDensity,
    setCommandOpen,
    setUiDensity,
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

  const activeColor = selectedElement ? getElementColor(selectedElement) : '#38bdf8';

  return (
    <header className="workbench-topbar">
      <button className="flex min-w-0 items-center gap-3 text-left transition-colors hover:opacity-85" onClick={handleHome}>
        <div
          className="brand-mark shadow-glow"
          style={{ backgroundColor: `${activeColor}20`, borderColor: activeColor, color: activeColor }}
        >
          <Atom className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-wide text-slate-900 flex items-center gap-2">
            Ele-Visualize
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono font-medium border border-sky-200">v2.0 Pro</span>
          </div>
          <div className="hidden truncate text-xs text-slate-500 sm:block">
            Scientific workbench for atoms, molecules, reactions, and AR
          </div>
        </div>
      </button>

      <button className="command-trigger group" onClick={() => setCommandOpen(!commandOpen)}>
        <Command className="h-4 w-4 text-sky-600 group-hover:scale-110 transition-transform" />
        <span className="truncate">
          {selectedElement ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getElementColor(selectedElement) }} />
              <strong className="text-slate-900">{selectedElement.symbol}</strong> {selectedElement.name}
            </span>
          ) : selectedMolecule ? (
            <span className="text-slate-900">{selectedMolecule.name}</span>
          ) : (
            'Search elements, molecules, or commands'
          )}
        </span>
        <span className="hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500 md:inline">/</span>
      </button>

      <div className="flex items-center gap-1.5">
        <button
          className="icon-button"
          onClick={() => {
            audioEngine.toggleMute();
          }}
          title={audioEngine.isMuted() ? "Unmute Audio (Ambient & Acoustic Feedback)" : "Mute Audio"}
        >
          {audioEngine.isMuted() ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-600" />}
        </button>
        <button className="icon-button hidden sm:inline-flex" onClick={() => setUiDensity(uiDensity === 'comfortable' ? 'compact' : 'comfortable')} title="Toggle density">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 border border-sky-600 rounded-md transition-all shadow-sm flex items-center gap-1.5"
          onClick={onSave}
          disabled={saveState === 'saving'}
        >
          <Save className="h-3.5 w-3.5 text-white" />
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Save Session'}
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
        className="command-panel bg-white border border-slate-200 text-slate-900 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-sky-600" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search elements, molecules, or commands (e.g. Au, Oxygen, Table)"
          />
          <button className="icon-button" onClick={() => setCommandOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-2">
          <div className="command-section text-slate-500">Commands</div>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              className="command-item hover:bg-slate-100 text-slate-800"
              onClick={() => {
                run();
                setCommandOpen(false);
              }}
            >
              <Icon className="h-4 w-4 text-sky-600" />
              <span>{label}</span>
            </button>
          ))}

          <div className="command-section text-slate-500">Elements</div>
          {filteredElements.slice(0, 8).map((element) => {
            const color = getElementColor(element);
            return (
              <button
                key={element.atomicNumber}
                className="command-item hover:bg-slate-100 text-slate-800"
                onClick={() => {
                  onSelectElement(element);
                  setCommandOpen(false);
                }}
              >
                <span
                  className="element-dot"
                  style={{ backgroundColor: `${color}25`, color: color, borderColor: `${color}55` }}
                >
                  {element.symbol}
                </span>
                <span className="font-medium text-white">{element.name}</span>
                <span className="text-xs text-muted-foreground ml-2 capitalize">({categoryLabels[element.category]})</span>
                <span className="ml-auto text-xs font-mono text-muted-foreground">#{element.atomicNumber}</span>
              </button>
            );
          })}

          <div className="command-section">Molecules</div>
          {filteredMolecules.slice(0, 6).map((molecule) => (
            <button
              key={molecule.formula}
              className="command-item hover:bg-slate-900"
              onClick={() => {
                onSelectMolecule(molecule);
                setCommandOpen(false);
              }}
            >
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="font-medium text-white">{molecule.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{molecule.formula}</span>
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
  const { activeFilter, searchQuery, viewMode, setActiveFilter, setSearchQuery, setViewMode, selectedElement } = useAppStore();

  return (
    <aside className="discovery-rail flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header & Segmented Mode Switch */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">Discovery</span>
          <span className="text-xs font-bold text-slate-900">Elements & Molecules</span>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            className={cn(
              "px-2.5 py-1 rounded-md transition-all text-[11px]",
              viewMode === 'atoms' ? "bg-white text-sky-700 font-bold shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
            onClick={() => setViewMode('atoms')}
          >
            Atoms
          </button>
          <button
            className={cn(
              "px-2.5 py-1 rounded-md transition-all text-[11px]",
              viewMode === 'molecules' ? "bg-white text-sky-700 font-bold shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
            onClick={() => setViewMode('molecules')}
          >
            Molecules
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search element, formula..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Horizontal Scroll Strip */}
      {viewMode === 'atoms' && (
        <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto hide-scrollbar">
          <button
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all shrink-0 border",
              activeFilter === 'all'
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            )}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          {categories.map((category) => {
            const color = categoryColors[category];
            const isActive = activeFilter === category;
            return (
              <button
                key={category}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all shrink-0 flex items-center gap-1 border",
                  isActive
                    ? "bg-sky-50 text-sky-800 border-sky-300 font-bold shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
                onClick={() => setActiveFilter(category)}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{categoryLabels[category].replace(' Metals', '').replace(' Earth', '')}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="rail-list flex-1 overflow-y-auto p-2 space-y-1">
        {viewMode === 'atoms'
          ? filteredElements.map((element) => {
            const color = getElementColor(element);
            const isSelected = selectedElement?.atomicNumber === element.atomicNumber;
            return (
              <button
                key={element.atomicNumber}
                className={cn(
                  "w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all",
                  isSelected
                    ? "bg-sky-50/90 border-sky-300 shadow-xs ring-1 ring-sky-400/30"
                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                )}
                onClick={() => onSelectElement(element)}
              >
                <span
                  className="flex h-9 w-9 flex-col items-center justify-center font-bold text-sm rounded-lg border shrink-0"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                    borderColor: `${color}40`
                  }}
                >
                  <small className="text-[8px] font-mono leading-none">{element.atomicNumber}</small>
                  {element.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900">{element.name}</span>
                  <span className="block truncate text-[10px] text-slate-500 font-mono">
                    <span style={{ color }}>{categoryLabels[element.category]}</span> • {element.atomicMass.toFixed(1)} u
                  </span>
                </span>
                <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isSelected ? "text-sky-600" : "text-slate-300")} />
              </button>
            );
          })
          : filteredMolecules.map((molecule) => (
            <button
              key={molecule.formula}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-200 text-left transition-all"
              onClick={() => onSelectMolecule(molecule)}
            >
              <span className="flex h-9 w-12 items-center justify-center font-bold text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 font-mono">
                {molecule.formula}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-900">{molecule.name}</span>
                <span className="block truncate text-[10px] text-slate-500 font-mono">{molecule.atoms.length} atoms • {molecule.bonds.length} bonds</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            </button>
          ))}
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
    workspaceMode,
    zoomLevel,
    zenMode,
    isMobile,
    setIsFullscreen,
    setShowOrbitals,
    setWorkspaceMode,
    togglePaused,
    setAnimationSpeed,
    toggleZenMode,
    setMobileDrawer,
  } = useAppStore();

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('3d');
  const [showNucleusDetail, setShowNucleusDetail] = useState(false);
  const [selectedShellIdx, setSelectedShellIdx] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [enableBloom, setEnableBloom] = useState(true);
  const [spaceFilling, setSpaceFilling] = useState(false);
  const [selectedIsotopeIdx, setSelectedIsotopeIdx] = useState<number>(0);
  const [ionCharge, setIonCharge] = useState<number>(0);
  const [showSpectroscopy, setShowSpectroscopy] = useState(false);

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

  const stageColor = selectedElement ? getElementColor(selectedElement) : '#0284c7';
  const stageTitle = selectedElement
    ? `${selectedElement.name} (${activeIsotope?.symbol || selectedElement.symbol}) • #${selectedElement.atomicNumber}`
    : selectedMolecule
    ? `${selectedMolecule.name} (${selectedMolecule.formula})`
    : 'Interactive 3D Visualizer Stage';

  // Quick picks for immediate exploration
  const featuredQuickPicks = useMemo(() => [
    elements.find(e => e.symbol === 'H'),
    elements.find(e => e.symbol === 'C'),
    elements.find(e => e.symbol === 'O'),
    elements.find(e => e.symbol === 'Ne'),
    elements.find(e => e.symbol === 'Fe'),
    elements.find(e => e.symbol === 'Cu'),
    elements.find(e => e.symbol === 'Au'),
    elements.find(e => e.symbol === 'U'),
  ].filter(Boolean) as ChemicalElement[], []);

  return (
    <section className={cn('visual-stage relative', isFullscreen && 'is-fullscreen')}>
      {/* Top Stage Toolbar */}
      <div className="stage-toolbar flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="min-w-0 flex items-center gap-2">
          {selectedElement && (
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: stageColor, boxShadow: `0 0 8px ${stageColor}` }}
            />
          )}
          <div className="min-w-0">
            <div className="truncate text-[9.5px] uppercase tracking-[0.18em] text-slate-500 font-mono flex items-center gap-2">
              <span>{workspaceMode === 'lab' ? 'AR & Gesture Lab' : 'Quantum Visual Stage'}</span>
              {zenMode && (
                <span className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-[9px] font-bold">MAX 3D</span>
              )}
            </div>
            <div className="truncate text-sm font-bold text-slate-900 flex items-center gap-2">
              {stageTitle}
              {selectedElement && (
                <span
                  className="hidden md:inline text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-200"
                  style={{ backgroundColor: `${stageColor}12`, color: stageColor }}
                >
                  {categoryLabels[selectedElement.category]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Isotope Quick Selector */}
          {selectedElement && isotopes.length > 1 && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-bold px-1 font-mono">Nuclide:</span>
              {isotopes.map((iso, idx) => (
                <button
                  key={iso.symbol}
                  onClick={() => {
                    audioEngine.playClick(880);
                    setSelectedIsotopeIdx(idx);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 text-[9px] font-mono rounded font-bold transition-all",
                    selectedIsotopeIdx === idx ? "bg-white text-sky-700 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                  )}
                  title={`${iso.symbol}: ${iso.halfLife} (${iso.decayMode})`}
                >
                  {iso.symbol}
                </button>
              ))}
            </div>
          )}

          {/* Ionization Charge State Scrubber */}
          {selectedElement && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-bold px-1 font-mono">Charge:</span>
              {[-1, 0, 1, 2].map((chg) => (
                <button
                  key={chg}
                  onClick={() => {
                    audioEngine.playClick(chg === 0 ? 600 : 750);
                    setIonCharge(chg);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 text-[9px] font-mono rounded font-bold transition-all",
                    ionCharge === chg ? "bg-white text-sky-700 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {chg > 0 ? `+${chg}` : chg === 0 ? '0' : chg}
                </button>
              ))}
            </div>
          )}

          {/* Camera Presets (3D / Top / Side) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-1">
            <button
              onClick={() => setCameraPreset('3d')}
              className={cn("px-2 py-1 text-[10px] font-mono rounded-md transition-all", cameraPreset === '3d' ? "bg-white text-sky-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900")}
              title="Perspective 3D View"
            >
              3D
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={cn("px-2 py-1 text-[10px] font-mono rounded-md transition-all", cameraPreset === 'top' ? "bg-white text-sky-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900")}
              title="Top Polar View"
            >
              Top
            </button>
            <button
              onClick={() => setCameraPreset('side')}
              className={cn("px-2 py-1 text-[10px] font-mono rounded-md transition-all", cameraPreset === 'side' ? "bg-white text-sky-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900")}
              title="Side View"
            >
              Side
            </button>
          </div>

          <ARButton xrStore={xrStore} />

          {/* Auto-Orbit Rotation Toggle */}
          <button
            className={cn('icon-button', autoRotate && 'is-active')}
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Disable Auto-Rotation" : "Enable Cinematic Auto-Orbit"}
          >
            <RotateCcw className={cn("h-4 w-4", autoRotate && "animate-spin text-sky-600")} />
          </button>

          {/* Bloom Postprocessing Glow Toggle */}
          <button
            className={cn('icon-button', enableBloom && 'is-active')}
            onClick={() => setEnableBloom(!enableBloom)}
            title={enableBloom ? "Disable Bloom Glow" : "Enable Quantum Bloom Glow"}
          >
            <Sparkles className="h-4 w-4" />
          </button>

          {/* Nucleus Particles Detail Toggle */}
          {selectedElement && (
            <button
              className={cn('icon-button', showNucleusDetail && 'is-active')}
              onClick={() => setShowNucleusDetail(!showNucleusDetail)}
              title={showNucleusDetail ? "Switch to Glowing Symbol" : "Zoom into Protons & Neutrons"}
            >
              <Compass className="h-4 w-4" />
            </button>
          )}

          {/* Molecule Style Toggle */}
          {viewMode === 'molecules' && (
            <button
              className={cn('icon-button', spaceFilling && 'is-active')}
              onClick={() => setSpaceFilling(!spaceFilling)}
              title={spaceFilling ? "Switch to Ball-and-Stick Bonds" : "Switch to Space-Filling CPK Radii"}
            >
              <Boxes className="h-4 w-4" />
            </button>
          )}

          {/* Orbitals Toggle */}
          {viewMode === 'atoms' && (
            <button
              className={cn('icon-button', showOrbitals && 'is-active')}
              onClick={() => setShowOrbitals(!showOrbitals)}
              title="Toggle Quantum Probability Clouds (s, p, d orbitals)"
            >
              <Atom className="h-4 w-4" />
            </button>
          )}

          {/* Pause / Play */}
          <button className="icon-button" onClick={togglePaused} title={isPaused ? 'Play animation' : 'Pause animation'}>
            {isPaused ? <Play className="h-4 w-4 text-emerald-600" /> : <Pause className="h-4 w-4" />}
          </button>

          {/* Mobile Details Drawer Button */}
          {isMobile && (selectedElement || selectedMolecule) && (
            <button
              className="icon-button bg-sky-50 text-sky-700 border border-sky-200"
              onClick={() => setMobileDrawer('inspector')}
              title="Open Detailed Inspector & Bohr Model"
            >
              <Info className="h-4 w-4" />
            </button>
          )}

          {/* Zen Mode / Maximize Stage Toggle */}
          <button
            className={cn("icon-button hidden md:inline-flex", zenMode && "is-active font-bold")}
            onClick={toggleZenMode}
            title={zenMode ? "Restore Sidebars" : "Maximize Stage (Zen Mode)"}
          >
            {zenMode ? <Minimize2 className="h-4 w-4 text-sky-600" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Fullscreen */}
          <button className="icon-button" onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div
        className="stage-canvas w-full h-full flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 45%, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%)`
        }}
      >
        <div className="stage-grid opacity-20 pointer-events-none" />

        {/* Reticle & Nuclear Stability Telemetry Overlay */}
        <div className="absolute top-3 left-3 text-[9px] font-mono text-slate-500 pointer-events-none z-20 flex flex-col gap-0.5 select-none">
          <span className="text-sky-600 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
            [QUANTUM.OBS-01]
          </span>
          <span>CAM: {cameraPreset.toUpperCase()} • BLOOM: {enableBloom ? 'ON' : 'OFF'} {ionCharge !== 0 ? `• CHARGE: [${ionCharge > 0 ? `+${ionCharge}` : ionCharge}]` : ''}</span>
          {activeIsotope && (
            <span className="text-slate-600">
              NUCLIDE: {activeIsotope.symbol} • HALF-LIFE: {activeIsotope.halfLife} • DECAY: {activeIsotope.decayMode}
            </span>
          )}
        </div>

        {/* AR & Gesture Lab Active Overlay */}
        {workspaceMode === 'lab' && (
          <div className="absolute top-3 right-3 p-3 bg-white/95 border border-sky-300 rounded-xl shadow-lg z-20 font-mono text-[10px] space-y-1.5 max-w-xs pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-700 uppercase flex items-center gap-1">
                <Hand className="w-3.5 h-3.5 text-sky-600" /> AR Gesture Lab Active
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-slate-600 text-[9px] space-y-1">
              <div>🤏 <strong>Pinch & Drag:</strong> Rotate Model in 3D</div>
              <div>✋ <strong>Open Palm:</strong> Hand Position Tracking</div>
              <div>✊ <strong>Fist Clench:</strong> Freeze / Lock Rotation</div>
              <div>✌️ <strong>Victory Sign:</strong> Toggle Quantum Orbitals</div>
              <div>↔️ <strong>Hand Swipe:</strong> Next / Previous Element</div>
            </div>
          </div>
        )}

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
                    showNucleusDetail={showNucleusDetail}
                    isFrozenRef={isFrozen}
                    animationSpeed={animationSpeed}
                    isPaused={isPaused}
                    autoRotate={autoRotate}
                    enableBloom={enableBloom}
                    cameraPreset={cameraPreset}
                    onSelectShell={setSelectedShellIdx}
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
                    enableBloom={enableBloom}
                    spaceFilling={spaceFilling}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {((viewMode === 'atoms' && !selectedElement) || (viewMode === 'molecules' && !selectedMolecule)) && (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="empty-stage max-w-lg mx-auto text-center p-6 z-10">
              <div className="brand-mark mx-auto h-16 w-16 mb-4 shadow-sm bg-sky-50 border border-sky-200">
                <Atom className="h-8 w-8 text-sky-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Explore the Elements</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Select an atom from the discovery rail, open the full periodic table, or launch a featured element below.
              </p>

              {/* Quick Launch Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {featuredQuickPicks.map((el) => {
                  const color = getElementColor(el);
                  return (
                    <button
                      key={el.symbol}
                      onClick={() => onSelectElement(el)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all hover:scale-105 border bg-white shadow-xs hover:border-sky-300"
                    >
                      <span className="font-extrabold" style={{ color }}>{el.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{el.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center gap-3">
                <button className="premium-button shadow-xs flex items-center gap-2" onClick={() => setWorkspaceMode('table')}>
                  <Grid3X3 className="h-4 w-4" />
                  Open Periodic Table Grid
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Stage Status & Controls Bar */}
      <div className="stage-status flex items-center justify-between px-4 py-2 bg-white/95 border-t border-slate-200 text-xs font-mono text-slate-600 shadow-xs">
        <div className="flex items-center gap-3">
          <span>Zoom: <strong className="text-slate-900">{zoomLevel.toFixed(1)}x</strong></span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Speed:</span>
            <input
              aria-label="Animation speed"
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={animationSpeed}
              onChange={(event) => setAnimationSpeed(Number(event.target.value))}
              className="w-20 sm:w-24 accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded"
            />
            <span className="text-slate-900 font-bold">{animationSpeed.toFixed(1)}x</span>
          </div>
        </div>

        {/* Spectroscopy Toggle & Active Shell Indicator */}
        <div className="flex items-center gap-2">
          {selectedElement && (
            <button
              onClick={() => setShowSpectroscopy(!showSpectroscopy)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 transition-all border",
                showSpectroscopy
                  ? "bg-sky-100 text-sky-800 border-sky-300"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
              )}
            >
              <Zap className="w-3 h-3 text-sky-600" />
              <span>Spectrum</span>
            </button>
          )}

          {selectedElement && (
            <div className="hidden md:flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Shells:</span>
              {selectedElement.shells.map((count, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                    selectedShellIdx === idx ? "bg-sky-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  )}
                  onClick={() => setSelectedShellIdx(selectedShellIdx === idx ? null : idx)}
                  title={`Shell n=${idx + 1}: ${count} electrons (Click to isolate)`}
                >
                  K{idx + 1}:{count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Inspector({
  selectedElement,
  selectedMolecule,
  onCompare,
  onSave,
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  onCompare: (element: ChemicalElement) => void;
  onSave: () => void;
}) {
  const { inspectorTab, setInspectorTab, setWorkspaceMode } = useAppStore();
  const [tempUnit, setTempUnit] = useState<'C' | 'K' | 'F'>('C');
  const props = selectedElement ? elementProperties[selectedElement.atomicNumber] : null;
  const elementColor = selectedElement ? getElementColor(selectedElement) : '#0284c7';

  return (
    <aside className="inspector-panel flex flex-col h-full bg-white">
      {/* Header */}
      <div className="rail-header flex items-center justify-between p-3 border-b border-slate-200">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono font-bold">Scientific Inspector</div>
          <div className="text-base font-bold text-slate-900 truncate max-w-[200px]">
            {selectedElement?.name || selectedMolecule?.name || 'No selection'}
          </div>
        </div>
        <button className="icon-button" onClick={onSave} title="Save exploration session">
          <Save className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      {/* Segmented Light Theme Tab Bar */}
      <div className="inspector-tabs flex items-center gap-1 p-1 mx-3 mt-3 mb-2 rounded-xl bg-slate-100 border border-slate-200">
        {(['overview', 'properties', 'learning', 'actions'] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all font-sans',
              inspectorTab === tab ? 'bg-white text-sky-700 font-bold shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
            )}
            onClick={() => setInspectorTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {!selectedElement && !selectedMolecule && (
        <div className="empty-inspector flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-xs">
            <BookOpen className="h-7 w-7 text-sky-600" />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            Select an atom or molecule from the rail to inspect atomic shells, physical metrics, thermal states, and actions.
          </p>
        </div>
      )}

      {selectedElement && (
        <div className="inspector-content p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* Hero Header Card */}
          <div
            className="hero-element p-3 rounded-xl border flex items-center gap-3 relative overflow-hidden bg-white shadow-xs"
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
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Atomic Mass</small>
                  <strong className="text-sm text-slate-900 font-mono">{selectedElement.atomicMass.toFixed(3)} u</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Valence Electrons</small>
                  <strong className="text-sm text-sky-700 font-mono">{selectedElement.shells[selectedElement.shells.length - 1]} e⁻</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">State @ 25°C</small>
                  <strong className="text-sm text-slate-900 capitalize">{props?.state || 'Unknown'}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
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
                      className={cn("px-2 py-0.5 text-[10px] font-mono rounded font-bold transition-all", tempUnit === u ? "bg-white text-sky-700 shadow-xs" : "text-slate-500 hover:text-slate-800")}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
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
                  <strong className="text-sky-700">{props?.electronegativity ? `χ ${props.electronegativity}` : 'N/A'}</strong>
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
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider">
                  <Beaker className="h-4 w-4" /> Atomic Configuration
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>{selectedElement.name}</strong> possesses <strong>{selectedElement.shells.length}</strong> discrete electron shells with <strong>{selectedElement.atomicNumber}</strong> orbiting electrons. It belongs to the <strong>{categoryLabels[selectedElement.category]}</strong> group in Block-{getElementBlock(selectedElement.atomicNumber).toUpperCase()}.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
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
                className="w-full py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => onCompare(selectedElement)}
              >
                <GitCompare className="h-4 w-4 text-sky-600" /> Add to Side-by-Side Comparison
              </button>
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => setWorkspaceMode('reactions')}
              >
                <Zap className="h-4 w-4 text-amber-600" /> Explore in Chemical Reactions
              </button>
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                onClick={() => setWorkspaceMode('builder')}
              >
                <Boxes className="h-4 w-4 text-emerald-600" /> Construct Molecule in Builder
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMolecule && (
        <div className="inspector-content p-3.5 space-y-3 overflow-y-auto flex-1">
          <div className="hero-element p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3.5 shadow-xs">
            <span className="flex h-12 w-14 items-center justify-center text-lg font-bold rounded-xl border border-emerald-300 bg-white text-emerald-700 font-mono shadow-xs shrink-0">
              {selectedMolecule.formula}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 truncate">{selectedMolecule.name}</h3>
              <p className="text-xs text-slate-500 truncate">{selectedMolecule.description}</p>
            </div>
          </div>

          <div className="metric-grid grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Total Atoms</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.atoms.length}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Chemical Bonds</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.bonds.length}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Bond Orders</small>
              <strong className="text-sm text-slate-900 font-mono">{selectedMolecule.bonds.map(b => b.order).join(', ')}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <small className="text-[9.5px] text-slate-500 uppercase font-mono font-bold">Elements</small>
              <strong className="text-sm text-sky-700 font-mono">{Array.from(new Set(selectedMolecule.atoms.map(a => a.symbol))).join(', ')}</strong>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              onClick={() => setWorkspaceMode('builder')}
            >
              <Boxes className="h-4 w-4 text-emerald-600" /> Modify in 2D Molecule Builder
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
