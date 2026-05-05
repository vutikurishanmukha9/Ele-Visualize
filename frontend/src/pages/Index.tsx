import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Atom,
  Beaker,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Command,
  FlaskConical,
  Gauge,
  GitCompare,
  Grid3X3,
  Hand,
  Library,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Atom3D } from '@/components/Atom3D';
import { ARButton } from '@/components/ARButton';
import { ComparisonMode } from '@/components/ComparisonMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HandTracker } from '@/components/HandTracker';
import { Molecule3D } from '@/components/Molecule3D';
import { MoleculeBuilder } from '@/components/MoleculeBuilder';
import { PeriodicTableGrid } from '@/components/PeriodicTableGrid';
import { ReactionSimulator } from '@/components/ReactionSimulator';
import { xrStore } from '@/components/VisualizerCanvas';
import { elementProperties } from '@/data/elementProperties';
import { categoryLabels, ChemicalElement, ElementCategory, elements } from '@/data/elements';
import { Molecule, molecules } from '@/data/molecules';
import { cn } from '@/lib/utils';
import { sendProductEvent } from '@/lib/productSocket';
import { sessionApi } from '@/lib/sessions';
import { SavedSession, WorkspaceMode, useAppStore } from '@/store/useAppStore';

const categoryColors: Record<ElementCategory, string> = {
  'alkali-metal': '#ef476f',
  'alkaline-earth': '#f78c35',
  'transition-metal': '#ffd166',
  'post-transition': '#6fd08c',
  metalloid: '#4cc9f0',
  nonmetal: '#2dd4bf',
  halogen: '#a78bfa',
  'noble-gas': '#f472b6',
  lanthanide: '#fb7185',
  actinide: '#f43f5e',
};

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
  const config: string[] = [];
  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const count = Math.min(remaining, maxElectrons[i]);
    config.push(`${orbitals[i]}${count}`);
    remaining -= count;
  }
  return config.join(' ');
}

const formatTemp = (kelvin: number | null | undefined) => {
  if (kelvin == null) return 'Not available';
  return `${Math.round(kelvin - 273.15)} C`;
};

const Loader = () => (
  <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
    <Sparkles className="mr-2 h-4 w-4 animate-pulse text-primary" />
    Preparing visual stage
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
  } = useAppStore();

  return (
    <header className="workbench-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <div className="brand-mark">
          <Atom className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-wide">Ele-Visualize</div>
          <div className="hidden truncate text-xs text-muted-foreground sm:block">
            Scientific workbench for atoms, molecules, reactions, and AR
          </div>
        </div>
      </div>

      <button className="command-trigger" onClick={() => setCommandOpen(!commandOpen)}>
        <Command className="h-4 w-4 text-primary" />
        <span className="truncate">
          {selectedElement ? `${selectedElement.symbol} ${selectedElement.name}` : selectedMolecule ? selectedMolecule.name : 'Search or run command'}
        </span>
        <span className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">/</span>
      </button>

      <div className="flex items-center gap-1.5">
        <button className="icon-button hidden sm:inline-flex" onClick={() => setUiDensity(uiDensity === 'comfortable' ? 'compact' : 'comfortable')} title="Toggle density">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button className="premium-button" onClick={onSave} disabled={saveState === 'saving'}>
          {saveState === 'saved' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">{saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </header>
  );
}

function WorkspaceNav() {
  const { workspaceMode, setWorkspaceMode, setMainViewMode } = useAppStore();

  const selectWorkspace = (mode: WorkspaceMode) => {
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
          title={label}
        >
          <Icon className="h-4 w-4" />
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
    <div className="fixed inset-0 z-[80] bg-black/50 p-3 backdrop-blur-sm" onMouseDown={() => setCommandOpen(false)}>
      <motion.div
        initial={{ y: -18, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="command-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-primary" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search elements, molecules, or commands"
          />
          <button className="icon-button" onClick={() => setCommandOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-2">
          <div className="command-section">Commands</div>
          {actions.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              className="command-item"
              onClick={() => {
                run();
                setCommandOpen(false);
              }}
            >
              <Icon className="h-4 w-4 text-primary" />
              <span>{label}</span>
            </button>
          ))}

          <div className="command-section">Elements</div>
          {filteredElements.slice(0, 8).map((element) => (
            <button
              key={element.atomicNumber}
              className="command-item"
              onClick={() => {
                onSelectElement(element);
                setCommandOpen(false);
              }}
            >
              <span className="element-dot" style={{ backgroundColor: categoryColors[element.category] }}>{element.symbol}</span>
              <span>{element.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">#{element.atomicNumber}</span>
            </button>
          ))}

          <div className="command-section">Molecules</div>
          {filteredMolecules.slice(0, 6).map((molecule) => (
            <button
              key={molecule.formula}
              className="command-item"
              onClick={() => {
                onSelectMolecule(molecule);
                setCommandOpen(false);
              }}
            >
              <FlaskConical className="h-4 w-4 text-primary" />
              <span>{molecule.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{molecule.formula}</span>
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
  const { activeFilter, searchQuery, viewMode, setActiveFilter, setSearchQuery, setViewMode } = useAppStore();

  return (
    <aside className="discovery-rail">
      <div className="rail-header">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Discovery</div>
          <div className="text-lg font-semibold">Find faster</div>
        </div>
        <div className="segmented">
          <button className={cn(viewMode === 'atoms' && 'is-active')} onClick={() => setViewMode('atoms')}>Atoms</button>
          <button className={cn(viewMode === 'molecules' && 'is-active')} onClick={() => setViewMode('molecules')}>Molecules</button>
        </div>
      </div>

      <label className="search-field">
        <Search className="h-4 w-4" />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Symbol, name, mass, formula" />
      </label>

      {viewMode === 'atoms' && (
        <div className="category-strip">
          <button className={cn(activeFilter === 'all' && 'is-active')} onClick={() => setActiveFilter('all')}>All</button>
          {categories.map((category) => (
            <button
              key={category}
              className={cn(activeFilter === category && 'is-active')}
              onClick={() => setActiveFilter(category)}
              style={activeFilter === category ? { borderColor: categoryColors[category], color: categoryColors[category] } : undefined}
            >
              {categoryLabels[category].replace(' Metals', '').replace(' Earth', '')}
            </button>
          ))}
        </div>
      )}

      <div className="rail-list">
        {viewMode === 'atoms'
          ? filteredElements.map((element) => (
            <button key={element.atomicNumber} className="result-card" onClick={() => onSelectElement(element)}>
              <span className="periodic-tile" style={{ borderColor: categoryColors[element.category], color: categoryColors[element.category] }}>
                <small>{element.atomicNumber}</small>
                {element.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{element.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{categoryLabels[element.category]} / {element.atomicMass.toFixed(2)} u</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))
          : filteredMolecules.map((molecule) => (
            <button key={molecule.formula} className="result-card" onClick={() => onSelectMolecule(molecule)}>
              <span className="molecule-tile">{molecule.formula}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{molecule.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{molecule.atoms.length} atoms / {molecule.bonds.length} bonds</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
}: {
  selectedElement: ChemicalElement | null;
  selectedMolecule: Molecule | null;
  handPositionX: React.MutableRefObject<number>;
  handPositionY: React.MutableRefObject<number>;
  isHandControlled: React.MutableRefObject<boolean>;
  isFrozen: React.MutableRefObject<boolean>;
}) {
  const {
    animationSpeed,
    isFullscreen,
    isPaused,
    showOrbitals,
    viewMode,
    workspaceMode,
    zoomLevel,
    setIsFullscreen,
    setShowOrbitals,
    setWorkspaceMode,
    togglePaused,
    setAnimationSpeed,
  } = useAppStore();

  const stageTitle = selectedElement ? `${selectedElement.name} atomic model` : selectedMolecule ? `${selectedMolecule.name} molecule` : 'Ready to explore';

  return (
    <section className={cn('visual-stage', isFullscreen && 'is-fullscreen')}>
      <div className="stage-toolbar">
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">{workspaceMode === 'lab' ? 'AR and gesture lab' : 'Visual stage'}</div>
          <div className="truncate text-base font-semibold">{stageTitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <ARButton xrStore={xrStore} />
          <button className="icon-button" onClick={togglePaused} title={isPaused ? 'Play animation' : 'Pause animation'}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button className={cn('icon-button', showOrbitals && 'is-active')} onClick={() => setShowOrbitals(!showOrbitals)} title="Toggle orbitals">
            <Sparkles className="h-4 w-4" />
          </button>
          <button className="icon-button" onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="stage-canvas">
        <div className="stage-grid" />
        <AnimatePresence mode="wait">
          {viewMode === 'atoms' && selectedElement && (
            <motion.div key={selectedElement.atomicNumber} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <Atom3D
                    protons={selectedElement.atomicNumber}
                    neutrons={Math.round(selectedElement.atomicMass) - selectedElement.atomicNumber}
                    electrons={selectedElement.shells}
                    color={categoryColors[selectedElement.category]}
                    symbol={selectedElement.symbol}
                    handRotationXRef={handPositionY}
                    handRotationYRef={handPositionX}
                    isHandControlledRef={isHandControlled}
                    zoom={zoomLevel}
                    showOrbitals={showOrbitals}
                    isFrozenRef={isFrozen}
                    animationSpeed={animationSpeed}
                    isPaused={isPaused}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {viewMode === 'molecules' && selectedMolecule && (
            <motion.div key={selectedMolecule.formula} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <Molecule3D
                    molecule={selectedMolecule}
                    handRotationXRef={handPositionY}
                    handRotationYRef={handPositionX}
                    isHandControlledRef={isHandControlled}
                    zoom={zoomLevel}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {((viewMode === 'atoms' && !selectedElement) || (viewMode === 'molecules' && !selectedMolecule)) && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-stage">
              <div className="brand-mark mx-auto h-14 w-14">
                <Atom className="h-7 w-7" />
              </div>
              <h2>Choose a starting point</h2>
              <p>Search an element, open a molecule, compare two discoveries, or run a reaction from the workbench.</p>
              <button className="premium-button mx-auto" onClick={() => setWorkspaceMode('table')}>
                <Grid3X3 className="h-4 w-4" />
                Open periodic table
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="stage-status">
        <span>Zoom {zoomLevel.toFixed(1)}x</span>
        <span>Speed {animationSpeed.toFixed(1)}x</span>
        <input
          aria-label="Animation speed"
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={animationSpeed}
          onChange={(event) => setAnimationSpeed(Number(event.target.value))}
        />
        <span>{showOrbitals ? 'Orbitals on' : 'Orbitals off'}</span>
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
  const props = selectedElement ? elementProperties[selectedElement.atomicNumber] : null;

  return (
    <aside className="inspector-panel">
      <div className="rail-header">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inspector</div>
          <div className="text-lg font-semibold">{selectedElement?.name || selectedMolecule?.name || 'No selection'}</div>
        </div>
        <button className="icon-button" onClick={onSave} title="Save session">
          <Save className="h-4 w-4" />
        </button>
      </div>

      <div className="inspector-tabs">
        {(['overview', 'properties', 'learning', 'actions'] as const).map((tab) => (
          <button key={tab} className={cn(inspectorTab === tab && 'is-active')} onClick={() => setInspectorTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {!selectedElement && !selectedMolecule && (
        <div className="empty-inspector">
          <BookOpen className="h-8 w-8 text-primary" />
          <p>Select an atom or molecule to reveal properties, learning notes, and quick actions.</p>
        </div>
      )}

      {selectedElement && (
        <div className="inspector-content">
          <div className="hero-element" style={{ borderColor: categoryColors[selectedElement.category] }}>
            <span style={{ color: categoryColors[selectedElement.category] }}>{selectedElement.symbol}</span>
            <div>
              <h3>{selectedElement.name}</h3>
              <p>{categoryLabels[selectedElement.category]} / Atomic #{selectedElement.atomicNumber}</p>
            </div>
          </div>

          {inspectorTab === 'overview' && (
            <div className="metric-grid">
              <div><small>Mass</small><strong>{selectedElement.atomicMass.toFixed(2)} u</strong></div>
              <div><small>Shells</small><strong>{selectedElement.shells.join(' - ')}</strong></div>
              <div><small>State</small><strong>{props?.state || 'Unknown'}</strong></div>
              <div><small>Density</small><strong>{props?.density || 'N/A'}</strong></div>
            </div>
          )}

          {inspectorTab === 'properties' && (
            <div className="detail-list">
              <div><span>Electron config</span><strong>{getElectronConfig(selectedElement.atomicNumber)}</strong></div>
              <div><span>Melting point</span><strong>{formatTemp(props?.meltingPoint)}</strong></div>
              <div><span>Boiling point</span><strong>{formatTemp(props?.boilingPoint)}</strong></div>
              <div><span>Category</span><strong>{categoryLabels[selectedElement.category]}</strong></div>
            </div>
          )}

          {inspectorTab === 'learning' && (
            <div className="learning-card">
              <Beaker className="h-5 w-5 text-primary" />
              <p>{selectedElement.name} has {selectedElement.shells.length} electron shell{selectedElement.shells.length === 1 ? '' : 's'} and belongs to {categoryLabels[selectedElement.category].toLowerCase()}. Use compare mode to see how mass, shells, and thermal properties shift across the table.</p>
            </div>
          )}

          {inspectorTab === 'actions' && (
            <div className="action-stack">
              <button onClick={() => onCompare(selectedElement)}><GitCompare className="h-4 w-4" /> Add to compare</button>
              <button onClick={() => setWorkspaceMode('reactions')}><Zap className="h-4 w-4" /> Try in reactions</button>
              <button onClick={() => setWorkspaceMode('builder')}><Boxes className="h-4 w-4" /> Open builder</button>
            </div>
          )}
        </div>
      )}

      {selectedMolecule && (
        <div className="inspector-content">
          <div className="hero-element">
            <span>{selectedMolecule.formula}</span>
            <div>
              <h3>{selectedMolecule.name}</h3>
              <p>{selectedMolecule.description}</p>
            </div>
          </div>
          <div className="metric-grid">
            <div><small>Atoms</small><strong>{selectedMolecule.atoms.length}</strong></div>
            <div><small>Bonds</small><strong>{selectedMolecule.bonds.length}</strong></div>
            <div><small>Bond orders</small><strong>{selectedMolecule.bonds.map(bond => bond.order).join(', ')}</strong></div>
            <div><small>Elements</small><strong>{Array.from(new Set(selectedMolecule.atoms.map(atom => atom.symbol))).join(', ')}</strong></div>
          </div>
          <div className="action-stack">
            <button onClick={() => setWorkspaceMode('builder')}><Boxes className="h-4 w-4" /> Rebuild concept</button>
            <button onClick={() => setWorkspaceMode('reactions')}><Zap className="h-4 w-4" /> Explore reactions</button>
          </div>
        </div>
      )}
    </aside>
  );
}

function LibraryView({
  sessions,
  onOpen,
  onDelete,
}: {
  sessions: SavedSession[];
  onOpen: (session: SavedSession) => void;
  onDelete: (session: SavedSession) => void;
}) {
  return (
    <section className="workspace-surface">
      <div className="surface-heading">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Library</div>
          <h2>Saved explorations</h2>
        </div>
        <Library className="h-6 w-6 text-primary" />
      </div>

      <div className="session-grid">
        {sessions.length === 0 && (
          <div className="empty-inspector col-span-full">
            <Save className="h-8 w-8 text-primary" />
            <p>Save an atom, molecule, comparison, or builder exploration and it will appear here.</p>
          </div>
        )}
        {sessions.map((session) => (
          <article key={session.id} className="session-card">
            <div>
              <h3>{session.title}</h3>
              <p>{new Date(session.updatedAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(session.tags.length ? session.tags : [session.workspaceMode]).map(tag => <span key={tag}>{tag}</span>)}
            </div>
            <div className="flex gap-2">
              <button className="premium-button flex-1" onClick={() => onOpen(session)}>Open</button>
              <button className="icon-button" onClick={() => onDelete(session)}><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
    savedSessions,
    searchQuery,
    selectedElement,
    selectedMolecule,
    viewMode,
    workspaceMode,
    zoomLevel,
    addRecentItem,
    addSavedSession,
    addToComparisonBasket,
    removeSavedSession,
    setCommandOpen,
    setComparisonBasket,
    setIsMobile,
    setMainViewMode,
    setSavedSessions,
    setSearchQuery,
    setSelectedElement,
    setSelectedMolecule,
    setSidebarOpen,
    setViewMode,
    setWorkspaceMode,
    setZoomLevel,
  } = useAppStore();

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const handPositionX = useRef(0.5);
  const handPositionY = useRef(0.5);
  const isHandControlled = useRef(false);
  const isFrozen = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setWorkspaceMode]);

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
    setSelectedElement(element);
    setSelectedMolecule(null);
    setViewMode('atoms');
    addRecentItem(`element:${element.atomicNumber}`);
    sendProductEvent({ type: 'presence', workspaceMode });
  }, [addRecentItem, setSelectedElement, setSelectedMolecule, setViewMode, workspaceMode]);

  const selectMolecule = useCallback((molecule: Molecule) => {
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
    isHandControlled.current = gesture === 'open';
    isFrozen.current = gesture === 'fist';
  }, []);

  const handleHandPosition = useCallback((x: number, y: number) => {
    handPositionX.current = x;
    handPositionY.current = y;
    isHandControlled.current = true;
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const list = viewMode === 'atoms' ? filteredElements : [];
    if (!selectedElement || list.length === 0) return;
    const current = list.findIndex(element => element.atomicNumber === selectedElement.atomicNumber);
    const nextIndex = direction === 'right' ? (current + 1) % list.length : (current <= 0 ? list.length - 1 : current - 1);
    selectElement(list[nextIndex]);
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
          categoryColors={categoryColors}
          onChangeViewMode={(mode) => {
            const map: Record<string, WorkspaceMode> = { '3d': 'explore', grid: 'table', compare: 'compare', reaction: 'reactions', builder: 'builder' };
            setWorkspaceMode(map[mode] || 'explore');
            setMainViewMode(mode);
          }}
        />
      );
    }
    if (workspaceMode === 'compare') {
      return <ComparisonMode element1={compareElement1} element2={compareElement2} onRemoveElement={(slot) => setComparisonBasket(slot === 1 ? comparisonBasket.slice(1) : comparisonBasket.slice(0, 1))} categoryColors={categoryColors} />;
    }
    if (workspaceMode === 'reactions') return <ReactionSimulator onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'builder') return <MoleculeBuilder onClose={() => setWorkspaceMode('explore')} />;
    if (workspaceMode === 'library') return <LibraryView sessions={savedSessions} onOpen={openSession} onDelete={deleteSession} />;
    return (
      <VisualStage
        selectedElement={selectedElement}
        selectedMolecule={selectedMolecule}
        handPositionX={handPositionX}
        handPositionY={handPositionY}
        isHandControlled={isHandControlled}
        isFrozen={isFrozen}
      />
    );
  };

  return (
    <WorkbenchFrame>
      <TopBar onSave={saveSession} saveState={saveState} />
      <WorkspaceNav />

      <CommandPalette
        filteredElements={filteredElements}
        filteredMolecules={filteredMolecules}
        onSelectElement={selectElement}
        onSelectMolecule={selectMolecule}
        onSave={saveSession}
      />

      <div className={cn('workbench-layout', isMobile && 'is-mobile')}>
        {!isMobile && (
          <DiscoveryRail
            filteredElements={filteredElements}
            filteredMolecules={filteredMolecules}
            onSelectElement={selectElement}
            onSelectMolecule={selectMolecule}
          />
        )}

        <main className="workbench-main">
          {workspaceContent()}
        </main>

        {!isMobile && (
          <Inspector
            selectedElement={selectedElement}
            selectedMolecule={selectedMolecule}
            onCompare={addCompare}
            onSave={saveSession}
          />
        )}
      </div>

      {isMobile && (
        <div className="mobile-dock">
          <button onClick={() => setCommandOpen(true)}><Search className="h-4 w-4" />Search</button>
          <button onClick={() => setWorkspaceMode('table')}><Grid3X3 className="h-4 w-4" />Table</button>
          <button onClick={() => selectedElement && addCompare(selectedElement)}><Plus className="h-4 w-4" />Compare</button>
          <button onClick={saveSession}><Save className="h-4 w-4" />Save</button>
        </div>
      )}

      <BottomStatus selectedElement={selectedElement} selectedMolecule={selectedMolecule} />
      <HandTracker
        onZoomChange={setZoomLevel}
        onGestureDetected={handleGestureDetected}
        onSwipe={handleSwipe}
        onHandPosition={handleHandPosition}
      />
    </WorkbenchFrame>
  );
}
