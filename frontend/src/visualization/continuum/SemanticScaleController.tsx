import { memo } from 'react';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';

export type SemanticScaleDomain = 'ATOMIC' | 'ORBITAL' | 'NUCLEAR' | 'SUBATOMIC';

export interface SemanticScaleInfo {
  domain: SemanticScaleDomain;
  metricOrderStr: string;
  label: string;
  scientificRelevance: string;
}

export const SEMANTIC_SCALE_DOMAINS: Record<SemanticScaleDomain, SemanticScaleInfo> = {
  ATOMIC: {
    domain: 'ATOMIC',
    metricOrderStr: '10⁻¹⁰m',
    label: 'Atom',
    scientificRelevance: 'Principal energy shells & covalent electronic envelope (10⁻¹⁰ m / 1 Å)',
  },
  ORBITAL: {
    domain: 'ORBITAL',
    metricOrderStr: '10⁻¹¹m',
    label: 'Orbitals',
    scientificRelevance: 'Volumetric quantum probability density |ψ|² (10⁻¹¹ m)',
  },
  NUCLEAR: {
    domain: 'NUCLEAR',
    metricOrderStr: '10⁻¹⁴m',
    label: 'Nucleus',
    scientificRelevance: 'Nucleon spatial distribution & strong force interaction (10⁻¹⁴ m)',
  },
  SUBATOMIC: {
    domain: 'SUBATOMIC',
    metricOrderStr: '10⁻¹⁵m',
    label: 'Quarks',
    scientificRelevance: 'Valence quarks (uud / udd) & color charge confinement (10⁻¹⁵ m / 1 fm)',
  },
};

interface SemanticScaleControllerProps {
  activeDomain: SemanticScaleDomain;
  onSelectDomain: (domain: SemanticScaleDomain) => void;
}

export const SemanticScaleController = memo(function SemanticScaleController({
  activeDomain,
  onSelectDomain,
}: SemanticScaleControllerProps) {
  const domains: SemanticScaleDomain[] = ['ATOMIC', 'ORBITAL', 'NUCLEAR', 'SUBATOMIC'];

  return (
    <div className="flex items-center p-0.5 rounded-md bg-slate-100/95 border border-slate-200/90 text-xs font-mono shadow-2xs backdrop-blur-md shrink-0 select-none">
      <span className="text-[9px] text-slate-400 font-extrabold px-1.5 uppercase tracking-wider hidden sm:inline">SCALE</span>
      {domains.map((dom) => {
        const info = SEMANTIC_SCALE_DOMAINS[dom];
        const isActive = activeDomain === dom;
        return (
          <button
            key={dom}
            onClick={() => {
              audioEngine.playClick(840);
              onSelectDomain(dom);
            }}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1",
              isActive
                ? "bg-slate-900 text-white shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            )}
            title={info.scientificRelevance}
          >
            <span className="opacity-70 text-[9px]">{info.metricOrderStr}</span>
            <span>{info.label}</span>
          </button>
        );
      })}
    </div>
  );
});
