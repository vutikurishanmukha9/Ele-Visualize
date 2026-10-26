import { memo } from 'react';
import { ChemicalElement } from '@/data/elements';

interface QuantumNumbersHUDProps {
  element: ChemicalElement;
  className?: string;
}

export const QuantumNumbersHUD = memo(function QuantumNumbersHUD({ element, className = '' }: QuantumNumbersHUDProps) {
  const numShells = element.shells.length;
  const valenceElectrons = element.shells[element.shells.length - 1] || 0;

  // Derive quantum numbers for outermost valence electron
  const n = numShells; // Principal quantum number
  const l = element.category.includes('transition') ? 2 : element.category.includes('actinide') || element.category.includes('lanthanide') ? 3 : valenceElectrons > 2 ? 1 : 0;
  const lSymbols = ['s', 'p', 'd', 'f'];
  const orbitalType = lSymbols[l] || 's';

  return (
    <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] font-sans select-none space-y-2.5 shadow-xs ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20" />
          Valence Quantum State
        </span>
        <span className="text-[var(--color-accent)] font-semibold bg-[var(--color-accent)]/10 px-2 py-0.5 rounded text-[11px] border border-[var(--color-accent)]/20 font-mono">
          Orbital {n}{orbitalType}
        </span>
      </div>

      {/* 4 Fundamental Quantum Numbers Unified Matrix */}
      <div className="grid grid-cols-4 divide-x divide-[var(--color-hairline)] rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-3)]/60 text-center font-mono overflow-hidden">
        <div className="py-2 px-1">
          <div className="text-[10px] text-[var(--color-ink-muted)] font-sans font-medium">Principal</div>
          <div className="text-xs font-semibold text-[var(--color-ink-primary)] mt-0.5 tnum">n = {n}</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-[10px] text-[var(--color-ink-muted)] font-sans font-medium">Azimuthal</div>
          <div className="text-xs font-semibold text-[var(--color-ink-primary)] mt-0.5 tnum">ℓ = {l} ({orbitalType})</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-[10px] text-[var(--color-ink-muted)] font-sans font-medium">Magnetic</div>
          <div className="text-xs font-semibold text-[var(--color-ink-primary)] mt-0.5 tnum">mℓ = 0</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-[10px] text-[var(--color-ink-muted)] font-sans font-medium">Spin</div>
          <div className="text-xs font-semibold text-[var(--color-ink-primary)] mt-0.5 tnum">ms = +½</div>
        </div>
      </div>

      {/* Electron Shell Population */}
      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-[var(--color-surface-3)]/40 border border-[var(--color-hairline)]">
        <span className="text-[var(--color-ink-muted)] font-medium">Bohr Shell Distribution:</span>
        <span className="font-semibold text-[var(--color-ink-primary)] font-mono tnum">
          {element.shells.join(' · ')} <span className="text-[var(--color-ink-muted)] font-normal font-sans">({element.atomicNumber} e⁻)</span>
        </span>
      </div>
    </div>
  );
});
