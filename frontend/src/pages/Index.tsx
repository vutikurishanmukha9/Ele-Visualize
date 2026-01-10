import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements, ChemicalElement, categoryLabels, ElementCategory } from '@/data/elements';
import { cn } from '@/lib/utils';

// 2D Atom visualization using CSS
function AtomVisualization({ element }: { element: ChemicalElement }) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
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
    return colors[category] || '#00d4ff';
  };

  const color = getCategoryColor(element.category);

  return (
    <div className="relative w-80 h-80">
      {/* Nucleus */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 40px ${color}, 0 0 80px ${color}40`
        }}
      />

      {/* Electron shells */}
      {element.shells.map((electronCount, shellIndex) => {
        const radius = 60 + shellIndex * 50;
        return (
          <div key={shellIndex} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Orbit ring */}
            <div
              className="rounded-full border opacity-30"
              style={{
                width: radius * 2,
                height: radius * 2,
                marginLeft: -radius,
                marginTop: -radius,
                borderColor: color,
              }}
            />
            {/* Electrons */}
            {Array.from({ length: electronCount }).map((_, i) => {
              const angle = (i / electronCount) * 360;
              return (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}`,
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: Math.cos((angle * Math.PI) / 180) * radius - 6,
                    y: Math.sin((angle * Math.PI) / 180) * radius - 6,
                    rotate: 360,
                  }}
                  transition={{
                    rotate: {
                      duration: 3 + shellIndex * 2,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const Index = () => {
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = Object.keys(categoryLabels) as ElementCategory[];

  const filteredElements = elements.filter((element) => {
    const matchesFilter = activeFilter === 'all' || element.category === activeFilter;
    const matchesSearch =
      element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 h-full bg-card/50 backdrop-blur-xl border-r border-border/30 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <h2 className="text-lg font-bold text-primary mb-4">Ele-Visualize</h2>
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-border/30 flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-all",
              activeFilter === 'all' ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground"
            )}
          >
            All
          </button>
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-all",
                activeFilter === cat ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground"
              )}
            >
              {categoryLabels[cat].split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Element Grid */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filteredElements.map((element, index) => (
              <motion.button
                key={element.atomicNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedElement(element)}
                className={cn(
                  "p-3 rounded-lg text-left transition-all border-l-2",
                  "bg-secondary/30 border border-border/30 hover:border-primary/50",
                  selectedElement?.atomicNumber === element.atomicNumber && "border-primary bg-primary/10"
                )}
              >
                <span className="absolute top-1 right-2 text-[10px] text-muted-foreground">{element.atomicNumber}</span>
                <div className="text-xl font-bold text-primary">{element.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{element.name}</div>
                <div className="text-[10px] text-muted-foreground/60">{element.atomicMass.toFixed(2)}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 text-xs text-muted-foreground">
          {filteredElements.length} elements
        </div>
      </motion.aside>

      {/* Main Canvas */}
      <main className="flex-1 relative flex items-center justify-center bg-gradient-radial">
        <AnimatePresence mode="wait">
          {selectedElement ? (
            <motion.div
              key={selectedElement.atomicNumber}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <AtomVisualization element={selectedElement} />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10"
              >
                <div className="text-5xl font-bold text-primary mb-2">{selectedElement.symbol}</div>
                <div className="text-2xl text-foreground">{selectedElement.name}</div>
                <div className="flex gap-4 justify-center mt-2 text-muted-foreground">
                  <span>Atomic: {selectedElement.atomicNumber}</span>
                  <span>Mass: {selectedElement.atomicMass.toFixed(2)}</span>
                </div>
                <div className="flex gap-2 justify-center mt-3">
                  {selectedElement.shells.map((s, i) => (
                    <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      Shell {i + 1}: {s}e⁻
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground"
            >
              <div className="text-6xl mb-4 opacity-20">⚛</div>
              <p className="text-xl">Select an element to visualize</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
