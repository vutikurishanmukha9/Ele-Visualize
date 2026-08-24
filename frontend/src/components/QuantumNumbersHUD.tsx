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
    <div className={`p-3.5 rounded-2xl bg-white/90 border border-black/[0.06] font-sans select-none shadow-card ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between text-[10.5px] text-slate-500 uppercase tracking-wider mb-2 font-mono">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16a875] animate-pulse" />
          Valence Quantum State
        </span>
        <span className="text-[#087f5b] font-bold bg-[#e6f6ef] px-2 py-0.5 rounded-md border border-[#bce8d5]">
          Orbital: {n}{orbitalType}
        </span>
      </div>

      {/* 4 Fundamental Quantum Numbers Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center mb-2.5 font-mono">
        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[9px] text-slate-400 font-semibold">Principal</div>
          <div className="text-xs font-bold text-sky-700">n = {n}</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[9px] text-slate-400 font-semibold">Azimuthal</div>
          <div className="text-xs font-bold text-purple-700">l = {l} ({orbitalType})</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[9px] text-slate-400 font-semibold">Magnetic</div>
          <div className="text-xs font-bold text-amber-700">mₗ = 0</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[9px] text-slate-400 font-semibold">Spin</div>
          <div className="text-xs font-bold text-[#087f5b]">mₛ = +½</div>
        </div>
      </div>

      {/* Electron Configuration Shorthand & Shell Matrix */}
      <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl bg-[#e6f6ef]/50 border border-[#bce8d5]/80 font-mono">
        <span className="text-slate-500 font-semibold">Shells (Bohr):</span>
        <span className="font-bold text-[#087f5b] tracking-wide">
          {element.shells.join(' • ')} (total {element.atomicNumber} e⁻)
        </span>
      </div>
    </div>
  );
});
