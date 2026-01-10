import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, ElementCategory } from '@/data/elements';
import { HandTracker } from '@/components/HandTracker';
import { cn } from '@/lib/utils';
import { Sun, Moon, Maximize2, Minimize2, Info } from 'lucide-react';

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

// Memoized atom visualization
const AtomVisualization = memo(({ element, zoom }: { element: ChemicalElement; zoom: number }) => {
  const color = categoryColors[element.category] || '#00d4ff';
  const maxShells = Math.min(element.shells.length, 4);
  const protons = element.atomicNumber;
  const neutrons = Math.round(element.atomicMass) - protons;

  const shellData = useMemo(() =>
    element.shells.slice(0, maxShells).map((electronCount, shellIndex) => ({
      electronCount,
      shellIndex,
      radius: 55 + shellIndex * 40,
      displayedElectrons: Math.min(electronCount, 8),
      shellName: ['K', 'L', 'M', 'N', 'O', 'P', 'Q'][shellIndex],
      speed: 8 + shellIndex * 4,
    })),
    [element.shells, maxShells]
  );

  return (
    <motion.div
      className="relative w-80 h-80"
      animate={{ scale: zoom }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      <div className="absolute inset-0 rounded-full blur-3xl opacity-15" style={{ backgroundColor: color }} />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full z-10 flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}99 60%, ${color}55)`,
          boxShadow: `0 0 30px ${color}80`
        }}
      >
        <span className="text-2xl font-bold text-white">{element.symbol}</span>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-20">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-red-500/80 text-white px-1.5 py-0.5 rounded-full">
          p⁺ {protons}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] bg-gray-500/80 text-white px-1.5 py-0.5 rounded-full">
          n⁰ {neutrons}
        </div>
      </div>

      {shellData.map(({ shellIndex, radius, displayedElectrons, shellName, electronCount, speed }) => (
        <div key={shellIndex} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute text-[9px] text-white/50 font-mono" style={{ left: radius + 8, top: -4 }}>
            {shellName}:{electronCount}
          </div>

          <div
            className="rounded-full absolute"
            style={{
              width: radius * 2,
              height: radius * 2,
              left: -radius,
              top: -radius,
              border: `1px solid ${color}30`,
            }}
          />

          {Array.from({ length: displayedElectrons }).map((_, i) => {
            const angle = (i / displayedElectrons) * 360;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, white, ${color})`,
                  boxShadow: `0 0 6px ${color}`,
                }}
                animate={{
                  x: Math.cos(((angle) * Math.PI) / 180) * radius - 4,
                  y: Math.sin(((angle) * Math.PI) / 180) * radius - 4,
                  rotate: [0, 360],
                }}
                transition={{
                  rotate: { duration: speed, repeat: Infinity, ease: 'linear' },
                }}
              />
            );
          })}
        </div>
      ))}
    </motion.div>
  );
});

AtomVisualization.displayName = 'AtomVisualization';

// Memoized element card
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
      "relative p-2 rounded text-center transition-colors border overflow-hidden",
      "bg-secondary/20 border-border/30 hover:border-primary/50",
      isSelected && "border-primary bg-primary/10"
    )}
  >
    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
    <div className="text-[10px] text-muted-foreground">{element.atomicNumber}</div>
    <div className="text-lg font-bold" style={{ color }}>{element.symbol}</div>
    <div className="text-[9px] text-muted-foreground truncate">{element.name}</div>
  </button>
));

ElementCard.displayName = 'ElementCard';

const Index = () => {
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentGesture, setCurrentGesture] = useState('none');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, filteredElements]);

  const handleZoomChange = useCallback((zoom: number) => setZoomLevel(zoom), []);
  const handleGestureDetected = useCallback((gesture: string) => setCurrentGesture(gesture), []);
  const handleElementClick = useCallback((element: ChemicalElement) => setSelectedElement(element), []);

  return (
    <div className={cn(
      "h-screen w-screen bg-background text-foreground flex overflow-hidden",
      !isDarkMode && "bg-gray-100 text-gray-900"
    )}>
      <AnimatePresence>
        {!isFullscreen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-72 h-full bg-card/50 backdrop-blur-xl border-r border-border/30 flex flex-col"
          >
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-primary">Ele-Visualize</h2>
                  <p className="text-xs text-muted-foreground">All 118 Elements</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 rounded hover:bg-secondary/50">
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setIsFullscreen(true)} className="p-1.5 rounded hover:bg-secondary/50">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="p-2 border-b border-border/30 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "px-2 py-1 text-[10px] rounded",
                  activeFilter === 'all' ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className="px-2 py-1 text-[10px] rounded"
                  style={activeFilter === cat ? {
                    color: categoryColors[cat],
                    backgroundColor: `${categoryColors[cat]}20`
                  } : { backgroundColor: 'hsl(var(--secondary)/0.3)', color: 'hsl(var(--muted-foreground))' }}
                >
                  {categoryLabels[cat].split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-2">
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

            <div className="p-2 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between">
              <span>{filteredElements.length} elements</span>
              <span>←→ +/- F</span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 relative flex items-center justify-center">
        {isFullscreen && (
          <button onClick={() => setIsFullscreen(false)} className="absolute top-4 left-4 z-20 p-2 bg-black/40 rounded-lg border border-white/10">
            <Minimize2 className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {selectedElement ? (
            <motion.div
              key={selectedElement.atomicNumber}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <AtomVisualization element={selectedElement} zoom={zoomLevel} />

              <div className="mt-6 text-center bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-4xl font-bold" style={{ color: categoryColors[selectedElement.category] }}>
                    {selectedElement.symbol}
                  </span>
                  <a
                    href={`https://en.wikipedia.org/wiki/${selectedElement.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
                <div className="text-xl text-foreground">{selectedElement.name}</div>
                <div
                  className="text-xs mt-1 px-2 py-0.5 rounded inline-block"
                  style={{ color: categoryColors[selectedElement.category], backgroundColor: `${categoryColors[selectedElement.category]}20` }}
                >
                  {categoryLabels[selectedElement.category]}
                </div>
                <div className="flex gap-3 justify-center mt-2 text-muted-foreground text-sm">
                  <span>#{selectedElement.atomicNumber}</span>
                  <span>{selectedElement.atomicMass.toFixed(2)} u</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground">
              <div className="text-5xl mb-3 opacity-20">⚛</div>
              <p className="text-lg">Select an element</p>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedElement && (
          <div className="absolute top-4 right-4 bg-black/40 px-3 py-2 rounded-lg text-sm">
            <span className="text-muted-foreground">Zoom: </span>
            <span className="text-primary font-mono">{zoomLevel.toFixed(1)}x</span>
          </div>
        )}
      </main>

      <HandTracker onZoomChange={handleZoomChange} onGestureDetected={handleGestureDetected} />
    </div>
  );
};

export default Index;
