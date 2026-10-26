import { memo } from 'react';
import { EpistemologyMetadata, EPISTEMOLOGY_DEFINITIONS } from '@/scientific/models/Epistemology';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface ScientificProvenanceBadgeProps {
  provenance: EpistemologyMetadata;
  onOpenExplain?: () => void;
}

export const ScientificProvenanceBadge = memo(function ScientificProvenanceBadge({
  provenance,
  onOpenExplain,
}: ScientificProvenanceBadgeProps) {
  const def = (provenance && EPISTEMOLOGY_DEFINITIONS[provenance.provenance]) || EPISTEMOLOGY_DEFINITIONS.MODEL_DERIVED;

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-hairline)] backdrop-blur-md text-[10.5px] font-mono select-none">
      <span className={cn("font-extrabold px-1.5 py-0.5 rounded text-[9px] border", def.bgClass, def.colorClass, def.borderClass)}>
        {def.badgeLabel}
      </span>
      <span className="text-[var(--color-ink-muted)] font-medium truncate max-w-[200px] sm:max-w-[280px]">
        {provenance.label}
      </span>
      {onOpenExplain && (
        <button
          onClick={onOpenExplain}
          className="flex items-center gap-1 text-[var(--color-accent)] hover:underline font-bold pl-1.5 border-l border-[var(--color-hairline)]"
          title="Open Scientific Methodology & Citations"
        >
          <Info className="w-3 h-3" />
          <span>Explain</span>
        </button>
      )}
    </div>
  );
});
