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
    <div className={`p-2.5 rounded-lg bg-white border border-slate-200/80 font-sans select-none space-y-2 ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-mono">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
          Valence Quantum State
        </span>
        <span className="text-[#0071e3] font-bold bg-blue-50 px-1.5 py-0.2 rounded text-[10px] border border-blue-200/60 font-mono">
          Orbital: {n}{orbitalType}
        </span>
      </div>

      {/* 4 Fundamental Quantum Numbers Unified Matrix */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 rounded-md border border-slate-200/80 bg-slate-50/60 text-center font-mono overflow-hidden">
        <div className="p-1.5">
          <div className="text-[8px] text-slate-400 font-semibold uppercase">Principal</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">n = {n}</div>
        </div>
        <div className="p-1.5">
          <div className="text-[8px] text-slate-400 font-semibold uppercase">Azimuthal</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">ℓ = {l} ({orbitalType})</div>
        </div>
        <div className="p-1.5">
          <div className="text-[8px] text-slate-400 font-semibold uppercase">Magnetic</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">mℓ = 0</div>
        </div>
        <div className="p-1.5">
          <div className="text-[8px] text-slate-400 font-semibold uppercase">Spin</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">ms = +½</div>
        </div>
      </div>

      {/* Electron Shell Population */}
      <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-md bg-slate-50 border border-slate-200/70 font-mono">
        <span className="text-slate-500 font-semibold">Bohr Shell Distribution:</span>
        <span className="font-bold text-slate-900">
          {element.shells.join(' · ')} ({element.atomicNumber} e⁻ total)
        </span>
      </div>
    </div>
  );
});
