import { motion } from 'framer-motion';
import { ChemicalElement, categoryColors, ElementCategory } from '@/data/elements';
import { cn } from '@/lib/utils';

interface ElementCardProps {
  element: ChemicalElement;
  isSelected?: boolean;
  onClick?: () => void;
  index?: number;
}

const getCategoryStyle = (category: ElementCategory): string => {
  const styles: Record<ElementCategory, string> = {
    'alkali-metal': 'border-l-element-alkali hover:shadow-[0_0_20px_-5px_hsl(350,70%,55%)]',
    'alkaline-earth': 'border-l-element-alkaline hover:shadow-[0_0_20px_-5px_hsl(30,80%,55%)]',
    'transition-metal': 'border-l-element-transition hover:shadow-[0_0_20px_-5px_hsl(45,70%,55%)]',
    'post-transition': 'border-l-element-post hover:shadow-[0_0_20px_-5px_hsl(160,50%,50%)]',
    'metalloid': 'border-l-element-metalloid hover:shadow-[0_0_20px_-5px_hsl(200,60%,50%)]',
    'nonmetal': 'border-l-element-nonmetal hover:shadow-[0_0_20px_-5px_hsl(120,60%,45%)]',
    'halogen': 'border-l-element-halogen hover:shadow-[0_0_20px_-5px_hsl(280,60%,60%)]',
    'noble-gas': 'border-l-element-noble hover:shadow-[0_0_20px_-5px_hsl(220,70%,60%)]',
    'lanthanide': 'border-l-element-lanthanide hover:shadow-[0_0_20px_-5px_hsl(320,60%,55%)]',
    'actinide': 'border-l-element-actinide hover:shadow-[0_0_20px_-5px_hsl(0,60%,50%)]',
  };
  return styles[category];
};

export function ElementCard({ element, isSelected, onClick, index = 0 }: ElementCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.02,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'element-card group relative w-full p-3 rounded-lg text-left cursor-pointer',
        'border-l-2 transition-all duration-300',
        getCategoryStyle(element.category),
        isSelected && 'selected ring-1 ring-primary/50'
      )}
    >
      {/* Atomic number */}
      <span className="absolute top-2 right-2 text-[10px] font-medium text-muted-foreground">
        {element.atomicNumber}
      </span>

      {/* Element symbol */}
      <div className={cn(
        'text-2xl font-semibold tracking-tight transition-all duration-300',
        isSelected ? 'text-primary text-glow-sm' : 'text-foreground group-hover:text-primary'
      )}>
        {element.symbol}
      </div>

      {/* Element name */}
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {element.name}
      </div>

      {/* Atomic mass */}
      <div className="text-[10px] text-muted-foreground/60 mt-1 font-light">
        {element.atomicMass.toFixed(3)}
      </div>

      {/* Hover glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300',
        'bg-gradient-to-br from-primary/5 to-transparent',
        'group-hover:opacity-100'
      )} />
    </motion.button>
  );
}
