import { useState, useCallback, useEffect, useMemo, memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, ElementCategory } from '@/data/elements';
import { elementProperties } from '@/data/elementProperties';
import { molecules, Molecule } from '@/data/molecules';
import { HandTracker } from '@/components/HandTracker';
import { Atom3D } from '@/components/Atom3D';
import { Molecule3D } from '@/components/Molecule3D';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GestureTutorial } from '@/components/GestureTutorial';
import { cn } from '@/lib/utils';
import { Sun, Moon, Maximize2, Minimize2, Info, Thermometer, Droplets, Scale, Loader, HelpCircle, Menu, X, Atom, FlaskConical } from 'lucide-react';

// Category colors
const categoryColors: Record<ElementCategory, string> = {
  'alkali-metal': '#FF3366',
  'alkaline-earth': '#FF9933',
  'transition-metal': '#FFCC33',
  'post-transition': '#33CC99',
  'metalloid': '#33CCCC',
  'nonmetal': '#3399FF',
  'halogen': '#9933FF',
  'noble-gas': '#CC33FF',
  'lanthanide': '#FF66CC',
  'actinide': '#FF3333',
};

// Accurate electron configuration using aufbau principle
const getElectronConfig = (atomicNumber: number): string => {
  const orbitals = [
    '1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p',
    '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'
  ];
  const maxElectrons = [2, 2, 6, 2, 6, 2, 10, 6, 2, 10, 6, 2, 14, 10, 6, 2, 14, 10, 6];
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  let remaining = atomicNumber;
  const config: string[] = [];

  for (let i = 0; i < orbitals.length && remaining > 0; i++) {
    const electrons = Math.min(remaining, maxElectrons[i]);
    const sup = electrons.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    config.push(`${orbitals[i]}${sup}`);
    remaining -= electrons;
  }

  return config.join(' ');
};

// Element card with focus styles
const ElementCard = memo(({
  element,
  isSelected,
  onClick,
  color
}: {
  element: ChemicalElement;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative p-2 rounded text-center transition-all border overflow-hidden",
      "bg-secondary/20 border-border/30 hover:border-primary/50",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background",
      isSelected && "border-primary bg-primary/10"
    )}
    aria-label={`Select ${element.name}`}
  >
    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
    <div className="text-[10px] text-muted-foreground">{element.atomicNumber}</div>
    <div className="text-lg font-bold" style={{ color }}>{element.symbol}</div>
    <div className="text-[9px] text-muted-foreground truncate">{element.name}</div>
  </button>
));

ElementCard.displayName = 'ElementCard';

const formatTemp = (kelvin: number | null) => {
  if (kelvin === null) return '—';
  const celsius = kelvin - 273.15;
  return `${Math.round(celsius)}°C`;
};

// Loading spinner for 3D
const Atom3DLoader = () => (
  <div className="w-full h-[350px] flex items-center justify-center">
    <div className="text-center">
      <Loader className="w-10 h-10 animate-spin text-primary mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading 3D Atom...</p>
    </div>
  </div>
);

const Index = () => {
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [selectedMolecule, setSelectedMolecule] = useState<Molecule | null>(null);
  const [viewMode, setViewMode] = useState<'atoms' | 'molecules'>('atoms');
  const [activeFilter, setActiveFilter] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentGesture, setCurrentGesture] = useState('none');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [handPositionX, setHandPositionX] = useState(0.5);
  const [handPositionY, setHandPositionY] = useState(0.5);
  const [isHandControlled, setIsHandControlled] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showOrbitals, setShowOrbitals] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenGestureTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenGestureTutorial', 'true');
    }
  }, []);

  const filteredElements = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return elements.filter((element) => {
      const matchesFilter = activeFilter === 'all' || element.category === activeFilter;
      const matchesSearch = !query ||
        element.name.toLowerCase().includes(query) ||
        element.symbol.toLowerCase().includes(query) ||
        element.atomicNumber.toString().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const categories = useMemo(() => Object.keys(categoryLabels) as ElementCategory[], []);
  const selectedProps = useMemo(() =>
    selectedElement ? elementProperties[selectedElement.atomicNumber] : null,
    [selectedElement]
  );

  const electronConfig = useMemo(() =>
    selectedElement ? getElectronConfig(selectedElement.atomicNumber) : '',
    [selectedElement]
  );

  // Keyboard shortcuts with focus handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const currentIndex = selectedElement
        ? filteredElements.findIndex(el => el.atomicNumber === selectedElement.atomicNumber)
        : -1;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedElement(filteredElements[(currentIndex + 1) % filteredElements.length] || null);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedElement(filteredElements[currentIndex > 0 ? currentIndex - 1 : filteredElements.length - 1] || null);
          break;
        case 'Escape':
          setSelectedElement(null);
          setIsFullscreen(false);
          break;
        case '+':
        case '=':
          setZoomLevel(z => Math.min(3, z + 0.2));
          break;
        case '-':
          setZoomLevel(z => Math.max(0.5, z - 0.2));
          break;
        case 'f':
          setIsFullscreen(f => !f);
          break;
        case '?':
          setShowTutorial(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, filteredElements]);

  const handleZoomChange = useCallback((zoom: number) => setZoomLevel(zoom), []);

  const handleGestureDetected = useCallback((gesture: string) => {
    setCurrentGesture(gesture);
    setIsHandControlled(gesture === 'open');
  }, []);

  const handleHandPosition = useCallback((x: number, y: number) => {
    setHandPositionX(x);
    setHandPositionY(y);
    setIsHandControlled(true);
  }, []);

  const handleElementClick = useCallback((element: ChemicalElement) => {
    setSelectedElement(element);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const currentIndex = selectedElement
      ? filteredElements.findIndex(el => el.atomicNumber === selectedElement.atomicNumber)
      : -1;

    if (direction === 'right') {
      setSelectedElement(filteredElements[(currentIndex + 1) % filteredElements.length] || filteredElements[0]);
    } else {
      setSelectedElement(filteredElements[currentIndex > 0 ? currentIndex - 1 : filteredElements.length - 1] || filteredElements[0]);
    }
  }, [selectedElement, filteredElements]);

  // Touch support for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.currentTarget as any).touchStartX = touch.clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const startX = (e.currentTarget as any).touchStartX;
    const diff = touch.clientX - startX;

    if (Math.abs(diff) > 50) {
      handleSwipe(diff > 0 ? 'left' : 'right');
    }
  }, [handleSwipe]);

  return (
    <div className={cn(
      "h-screen w-screen flex overflow-hidden transition-colors",
      isDarkMode
        ? "bg-background text-foreground"
        : "bg-white text-gray-900"
    )}>
      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && <GestureTutorial onClose={() => setShowTutorial(false)} />}
      </AnimatePresence>

      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-30 p-2 bg-card/80 rounded-lg border border-border/50"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      <AnimatePresence>
        {(sidebarOpen || !isMobile) && !isFullscreen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "h-full backdrop-blur-xl border-r flex flex-col",
              isMobile ? "fixed z-20 w-72" : "w-72",
              isDarkMode
                ? "bg-card/50 border-border/30"
                : "bg-gray-50 border-gray-200"
            )}
          >
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-primary">Ele-Visualize</h2>
                  <p className="text-xs text-muted-foreground">3D Atomic Explorer</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="p-1.5 rounded hover:bg-secondary/50"
                    aria-label="Show gesture tutorial"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-1.5 rounded hover:bg-secondary/50"
                    aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-1.5 rounded hover:bg-secondary/50"
                    aria-label="Enter fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => { setViewMode('atoms'); setSelectedMolecule(null); }}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                    viewMode === 'atoms'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Atom className="w-4 h-4" />
                  Atoms
                </button>
                <button
                  onClick={() => { setViewMode('molecules'); setSelectedElement(null); }}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                    viewMode === 'molecules'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <FlaskConical className="w-4 h-4" />
                  Molecules
                </button>
              </div>

              {viewMode === 'atoms' && (
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Search elements"
                />
              )}
            </div>

            {/* Filters - only show for atoms mode */}
            {viewMode === 'atoms' && (
              <div className="p-2 border-b border-border/30 flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded focus:outline-none focus:ring-1 focus:ring-primary",
                    activeFilter === 'all' ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground"
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className="px-2 py-1 text-[10px] rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    style={activeFilter === cat ? {
                      color: categoryColors[cat],
                      backgroundColor: `${categoryColors[cat]}20`
                    } : { backgroundColor: 'hsl(var(--secondary)/0.3)', color: 'hsl(var(--muted-foreground))' }}
                  >
                    {categoryLabels[cat].split(' ')[0]}
                  </button>
                ))}
              </div>
            )}

            {/* Atoms List */}
            {viewMode === 'atoms' && (
              <div className="flex-1 overflow-auto p-2" role="listbox" aria-label="Element list">
                <div className="grid grid-cols-3 gap-1">
                  {filteredElements.map((element) => (
                    <ElementCard
                      key={element.atomicNumber}
                      element={element}
                      color={categoryColors[element.category]}
                      isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                      onClick={() => handleElementClick(element)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Molecules List */}
            {viewMode === 'molecules' && (
              <div className="flex-1 overflow-auto p-2" role="listbox" aria-label="Molecule list">
                <div className="space-y-2">
                  {molecules.map((molecule) => (
                    <button
                      key={molecule.formula}
                      onClick={() => { setSelectedMolecule(molecule); if (isMobile) setSidebarOpen(false); }}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors border",
                        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                        selectedMolecule?.formula === molecule.formula
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/20 border-border/30"
                      )}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-primary">{molecule.formula}</span>
                        <span className="text-sm text-foreground">{molecule.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{molecule.description}</p>
                      <div className="flex gap-1 mt-2">
                        {molecule.atoms.slice(0, 4).map((atom, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full text-[8px] flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: atom.color }}
                          >
                            {atom.symbol}
                          </span>
                        ))}
                        {molecule.atoms.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{molecule.atoms.length - 4}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between">
              <span>{viewMode === 'atoms' ? `${filteredElements.length} elements` : `${molecules.length} molecules`}</span>
              <span>Press ? for help</span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main
        className={cn(
          "flex-1 relative flex items-center justify-center",
          isDarkMode ? "bg-black/20" : "bg-gradient-to-br from-blue-50 to-purple-50"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 left-4 z-20 p-2 bg-black/40 rounded-lg border border-white/10"
            aria-label="Exit fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* Atom View */}
          {viewMode === 'atoms' && selectedElement && (
            <motion.div
              key={`atom-${selectedElement.atomicNumber}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-lg px-4"
            >
              <ErrorBoundary>
                <Suspense fallback={<Atom3DLoader />}>
                  <Atom3D
                    protons={selectedElement.atomicNumber}
                    neutrons={Math.round(selectedElement.atomicMass) - selectedElement.atomicNumber}
                    electrons={selectedElement.shells}
                    color={categoryColors[selectedElement.category]}
                    symbol={selectedElement.symbol}
                    handRotationX={handPositionY}
                    handRotationY={handPositionX}
                    isHandControlled={isHandControlled && currentGesture === 'open'}
                    zoom={zoomLevel}
                    showOrbitals={showOrbitals}
                  />
                </Suspense>
              </ErrorBoundary>

              <div className={cn(
                "mt-2 text-center backdrop-blur-md p-4 rounded-xl border w-full",
                isDarkMode ? "bg-black/60 border-white/10" : "bg-white/90 border-gray-200 shadow-lg"
              )}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-3xl font-bold" style={{ color: categoryColors[selectedElement.category] }}>
                    {selectedElement.symbol}
                  </span>
                  <span className="text-lg text-foreground">{selectedElement.name}</span>
                  <a
                    href={`https://en.wikipedia.org/wiki/${selectedElement.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>

                <div className="text-xs px-2 py-0.5 rounded inline-block mb-2"
                  style={{ color: categoryColors[selectedElement.category], backgroundColor: `${categoryColors[selectedElement.category]}20` }}>
                  {categoryLabels[selectedElement.category]}
                </div>

                <div className="text-xs font-mono text-primary/80 bg-white/5 rounded px-2 py-1 mb-2 break-all">
                  {electronConfig}
                </div>

                <div className="flex gap-3 justify-center text-muted-foreground text-xs">
                  <span>#{selectedElement.atomicNumber}</span>
                  <span>{selectedElement.atomicMass.toFixed(2)} u</span>
                </div>

                {selectedProps && (
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div className="bg-white/5 rounded p-1">
                      <Thermometer className="w-3 h-3 text-orange-400 mx-auto" />
                      <div className="font-mono">{formatTemp(selectedProps.meltingPoint)}</div>
                    </div>
                    <div className="bg-white/5 rounded p-1">
                      <Droplets className="w-3 h-3 text-blue-400 mx-auto" />
                      <div className="font-mono">{formatTemp(selectedProps.boilingPoint)}</div>
                    </div>
                    <div className="bg-white/5 rounded p-1">
                      <Scale className="w-3 h-3 text-green-400 mx-auto" />
                      <div className="font-mono">{selectedProps.density || '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Molecule View */}
          {viewMode === 'molecules' && selectedMolecule && (
            <motion.div
              key={`molecule-${selectedMolecule.formula}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-lg px-4"
            >
              <ErrorBoundary>
                <Suspense fallback={<Atom3DLoader />}>
                  <Molecule3D
                    molecule={selectedMolecule}
                    handRotationX={handPositionY}
                    handRotationY={handPositionX}
                    isHandControlled={isHandControlled && currentGesture === 'open'}
                    zoom={zoomLevel}
                  />
                </Suspense>
              </ErrorBoundary>

              <div className={cn(
                "mt-2 text-center backdrop-blur-md p-4 rounded-xl border w-full",
                isDarkMode ? "bg-black/60 border-white/10" : "bg-white/90 border-gray-200 shadow-lg"
              )}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-3xl font-bold text-primary">{selectedMolecule.formula}</span>
                  <span className="text-lg text-foreground">{selectedMolecule.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{selectedMolecule.description}</p>

                <div className="flex flex-wrap justify-center gap-2">
                  {selectedMolecule.atoms.map((atom, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${atom.color}30`, color: atom.color }}
                    >
                      <span className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                        style={{ backgroundColor: atom.color }}>
                        {atom.symbol}
                      </span>
                      {atom.element}
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  {selectedMolecule.bonds.length} bond{selectedMolecule.bonds.length !== 1 ? 's' : ''} •
                  {selectedMolecule.atoms.length} atom{selectedMolecule.atoms.length !== 1 ? 's' : ''}
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {((viewMode === 'atoms' && !selectedElement) || (viewMode === 'molecules' && !selectedMolecule)) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground px-4">
              <div className="text-6xl mb-4 opacity-20">{viewMode === 'atoms' ? '⚛' : '🧪'}</div>
              <p className="text-xl">{viewMode === 'atoms' ? 'Select an Element' : 'Select a Molecule'}</p>
              <p className="text-sm mt-2 opacity-60">Use 👋 open hand to rotate</p>
              <p className="text-sm opacity-60">Use 🤏 pinch to zoom</p>
              {isMobile && <p className="text-sm opacity-60 mt-2">Swipe left/right to navigate</p>}
              <button
                onClick={() => setShowTutorial(true)}
                className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
              >
                View Gesture Guide
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {(selectedElement || selectedMolecule) && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="bg-black/60 px-3 py-2 rounded-lg text-sm">
              <span className="text-muted-foreground">Zoom: </span>
              <span className="text-primary font-mono">{zoomLevel.toFixed(1)}x</span>
            </div>

            {/* Orbital toggle - only for atoms */}
            {viewMode === 'atoms' && selectedElement && (
              <button
                onClick={() => setShowOrbitals(!showOrbitals)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  showOrbitals
                    ? "bg-purple-500/30 text-purple-300 border border-purple-400/50"
                    : "bg-black/60 text-muted-foreground hover:bg-purple-500/20"
                )}
              >
                {showOrbitals ? '🔮 Orbitals ON' : '🔮 Show Orbitals'}
              </button>
            )}

            {viewMode === 'atoms' && zoomLevel > 1.5 && (
              <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                Nucleus Detail
              </div>
            )}

            {showOrbitals && viewMode === 'atoms' && (
              <div className="bg-black/60 p-2 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400 opacity-50" />
                  <span className="text-muted-foreground">s orbital</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 opacity-50" />
                  <span className="text-muted-foreground">p orbital</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-50" />
                  <span className="text-muted-foreground">d orbital</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <HandTracker
        onZoomChange={handleZoomChange}
        onGestureDetected={handleGestureDetected}
        onSwipe={handleSwipe}
        onHandPosition={handleHandPosition}
      />
    </div>
  );
};

export default Index;
