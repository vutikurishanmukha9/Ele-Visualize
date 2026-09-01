import { memo } from 'react';
import { ScientificState } from '@/scientific/models/ScientificState';
import { SemanticScaleDomain, SemanticScaleController } from '../continuum/SemanticScaleController';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge';

interface QuantumTelemetryHUDProps {
  scientificState: ScientificState;
  activeDomain: SemanticScaleDomain;
  onSelectDomain: (domain: SemanticScaleDomain) => void;
  onOpenExplain: () => void;
}

export const QuantumTelemetryHUD = memo(function QuantumTelemetryHUD({
  scientificState,
  activeDomain,
  onSelectDomain,
  onOpenExplain,
}: QuantumTelemetryHUDProps) {
  const { element, electronConfiguration, energy, nucleus, provenance } = scientificState;

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between z-10 select-none">
      {/* Top Bar Overlay: Provenance Contract */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <ScientificProvenanceBadge provenance={provenance} onOpenExplain={onOpenExplain} />
      </div>

      {/* Bottom Control & Telemetry Strip */}
      <div className="flex items-center justify-between gap-2 w-full pointer-events-auto flex-wrap sm:flex-nowrap">
        {/* Subatomic Quantum Telemetry Micro-Card */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xs text-[10.5px] font-mono text-slate-700 whitespace-nowrap shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400 font-bold text-[9.5px]">CONFIG:</span>
            <span className="font-extrabold text-slate-900">{electronConfiguration.nobleGasCoreNotation}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 whitespace-nowrap">
            <span className="text-slate-400 font-bold text-[9.5px]">Z_eff:</span>
            <span className="font-extrabold text-indigo-700">{energy.effectiveNuclearChargeZeff}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200 whitespace-nowrap">
            <span className="text-slate-400 font-bold text-[9.5px]">NUCLEONS:</span>
            <span className="text-rose-700 font-bold">{nucleus.protons}p⁺</span>
            <span className="text-slate-300">/</span>
            <span className="text-sky-700 font-bold">{nucleus.neutrons}n⁰</span>
          </div>
        </div>

        {/* Semantic Scale Continuum Controller */}
        <SemanticScaleController activeDomain={activeDomain} onSelectDomain={onSelectDomain} />
      </div>
    </div>
  );
});
