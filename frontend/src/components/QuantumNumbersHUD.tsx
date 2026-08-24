import { memo } from 'react';
import { ChemicalElement } from '@/data/elements';
import { elementProperties } from '@/data/elementProperties';

interface QuantumNumbersHUDProps {
  element: ChemicalElement;
  className?: string;
}

export const QuantumNumbersHUD = memo(function QuantumNumbersHUD({ element, className = '' }: QuantumNumbersHUDProps) {
  const props = elementProperties[element.atomicNumber];
  const numShells = element.shells.length;
  const valenceElectrons = element.shells[element.shells.length - 1] || 0;

  // Derive quantum numbers for outermost valence electron
  const n = numShells; // Principal quantum number
  const l = element.category.includes('transition') ? 2 : element.category.includes('actinide') || element.category.includes('lanthanide') ? 3 : valenceElectrons > 2 ? 1 : 0;
  const lSymbols = ['s', 'p', 'd', 'f'];
  const orbitalType = lSymbols[l] || 's';

  return (
    <div className={`p-3 rounded-lg bg-black/85 border border-white/10 font-mono select-none ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2">
        <span className="font-bold text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Valence Quantum State
        </span>
        <span className="text-purple-300 font-bold">
          Orbital: {n}{orbitalType}
        </span>
      </div>

      {/* 4 Fundamental Quantum Numbers Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center mb-2.5">
        <div className="p-1.5 rounded bg-white/5 border border-white/10">
          <div className="text-[9px] text-slate-500">Principal</div>
          <div className="text-xs font-bold text-cyan-300">n = {n}</div>
        </div>
        <div className="p-1.5 rounded bg-white/5 border border-white/10">
          <div className="text-[9px] text-slate-500">Azimuthal</div>
          <div className="text-xs font-bold text-purple-300">l = {l} ({orbitalType})</div>
        </div>
        <div className="p-1.5 rounded bg-white/5 border border-white/10">
          <div className="text-[9px] text-slate-500">Magnetic</div>
          <div className="text-xs font-bold text-amber-300">mₗ = 0</div>
        </div>
        <div className="p-1.5 rounded bg-white/5 border border-white/10">
          <div className="text-[9px] text-slate-500">Spin</div>
          <div className="text-xs font-bold text-emerald-300">mₛ = +½</div>
        </div>
      </div>

      {/* Electron Configuration Shorthand & Shell Matrix */}
      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-900/90 border border-white/10">
        <span className="text-slate-400">Config:</span>
        <span className="font-bold text-white tracking-wide">
          {props?.electronConfiguration || element.shells.join(' • ')}
        </span>
      </div>
    </div>
  );
});
