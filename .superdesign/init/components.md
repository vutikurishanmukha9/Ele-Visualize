# Shared UI Primitives & Components

## 1. ElementCard (`frontend/src/components/ElementCard.tsx`)
```tsx
import { motion } from 'framer-motion';
import { ChemicalElement, ElementCategory } from '@/data/elements';
import { cn } from '@/lib/utils';

interface ElementCardProps {
  element: ChemicalElement;
  isSelected?: boolean;
  onClick?: () => void;
  index?: number;
}

export function ElementCard({ element, isSelected, onClick, index = 0 }: ElementCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'element-card group relative w-full p-3 rounded-lg text-left cursor-pointer border-l-2 transition-all duration-300',
        isSelected && 'selected ring-1 ring-primary/50'
      )}
    >
      <span className="absolute top-2 right-2 text-[10px] font-medium text-muted-foreground">
        {element.atomicNumber}
      </span>
      <div className={cn(
        'text-2xl font-semibold tracking-tight transition-all duration-300',
        isSelected ? 'text-primary text-glow-sm' : 'text-foreground group-hover:text-primary'
      )}>
        {element.symbol}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {element.name}
      </div>
      <div className="text-[10px] text-muted-foreground/60 mt-1 font-light">
        {element.atomicMass.toFixed(3)}
      </div>
    </motion.button>
  );
}
```

## 2. BohrModel3D (`frontend/src/components/BohrModel3D.tsx`)
Interactive React Three Fiber 3D Bohr hologram with optical quartz core and rotating photon electron beads.

## 3. QuantumNumbersHUD (`frontend/src/components/QuantumNumbersHUD.tsx`)
Detailed quantum number cards ($n, l, m_l, m_s$) with orbital degenerate states and electron capacity.

## 4. SpectroscopyBar (`frontend/src/components/SpectroscopyBar.tsx`)
Interactive optical emission spectrum preview with wavelength-to-RGB synthesis and physical transition labels (Balmer, Lyman, Paschen series).
