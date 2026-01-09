import { useState } from 'react';
import { motion } from 'framer-motion';
import { Atom, Filter, Search } from 'lucide-react';
import { ChemicalElement, categoryLabels, ElementCategory } from '@/data/elements';
import { ElementCard } from './ElementCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { useElements } from '@/hooks/useElements';

interface ElementSidebarProps {
  selectedElement: ChemicalElement | null;
  onSelectElement: (element: ChemicalElement) => void;
}

const categories = Object.keys(categoryLabels) as ElementCategory[];

export function ElementSidebar({ selectedElement, onSelectElement }: ElementSidebarProps) {
  const [activeFilter, setActiveFilter] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: elements = [], isLoading, error } = useElements();

  const filteredElements = elements.filter((element) => {
    const matchesFilter = activeFilter === 'all' || element.category === activeFilter;
    const matchesSearch =
      element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <aside className="glass-panel w-80 flex flex-col h-full border-r border-border/30 p-4 items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        <p className="mt-2 text-sm text-muted-foreground">Loading elements...</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="glass-panel w-80 flex flex-col h-full border-r border-border/30 p-4 items-center justify-center">
        <p className="text-sm text-destructive">Failed to load elements</p>
        <p className="text-xs text-muted-foreground mt-1">Check if backend is running</p>
      </aside>
    );
  }

  return (
    <aside className="glass-panel w-80 flex flex-col h-full border-r border-border/30">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Atom className="w-5 h-5 text-primary" />
            <div className="absolute inset-0 animate-ping opacity-30">
              <Atom className="w-5 h-5 text-primary" />
            </div>
          </div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-foreground">
            Element Categories
          </h2>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm',
              'bg-secondary/50 border border-border/30',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30',
              'transition-all duration-200'
            )}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Filter</span>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-all duration-200',
                activeFilter === 'all'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-secondary/30 text-muted-foreground border border-transparent hover:bg-secondary/50'
              )}
            >
              All
            </button>
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-all duration-200',
                  activeFilter === cat
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/30 text-muted-foreground border border-transparent hover:bg-secondary/50'
                )}
              >
                {categoryLabels[cat].split(' ')[0]}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Element grid */}
      <ScrollArea className="flex-1 p-3">
        <motion.div
          className="grid grid-cols-2 gap-2"
          layout
        >
          {filteredElements.map((element, index) => (
            <ElementCard
              key={element.atomicNumber}
              element={element}
              isSelected={selectedElement?.atomicNumber === element.atomicNumber}
              onClick={() => onSelectElement(element)}
              index={index}
            />
          ))}
        </motion.div>

        {filteredElements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Atom className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">No elements found</p>
          </div>
        )}
      </ScrollArea>

      {/* Footer status */}
      <div className="p-3 border-t border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="status-dot" />
          <span className="text-xs text-muted-foreground">
            {filteredElements.length} elements
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
          v1.0.0
        </span>
      </div>
    </aside>
  );
}
