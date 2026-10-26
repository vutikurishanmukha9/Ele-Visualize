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
    <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-surface-2)]/90 border border-[var(--color-hairline)] text-xs shadow-2xs backdrop-blur-md shrink-0 select-none">
      <span className="text-[11px] text-[var(--color-ink-muted)] font-medium px-2 hidden sm:inline">Scale</span>
      <div className="flex items-center gap-0.5">
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
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-[0.98]",
                isActive
                  ? "bg-[#5e6ad2] text-white shadow-2xs font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-3)]"
              )}
              title={info.scientificRelevance}
            >
              <span className="opacity-70 text-[11px] font-mono">{info.metricOrderStr}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
