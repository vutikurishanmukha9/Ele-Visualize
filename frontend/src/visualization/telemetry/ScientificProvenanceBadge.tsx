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
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border bg-white/95 backdrop-blur-md shadow-2xs text-[10.5px] font-mono select-none">
      <span className={cn("font-extrabold px-1.5 py-0.5 rounded text-[9px] border", def.bgClass, def.colorClass, def.borderClass)}>
        {def.badgeLabel}
      </span>
      <span className="text-slate-600 font-medium truncate max-w-[200px] sm:max-w-[280px]">
        {provenance.label}
      </span>
      {onOpenExplain && (
        <button
          onClick={onOpenExplain}
          className="flex items-center gap-1 text-[#0071e3] hover:underline font-bold pl-1 border-l border-slate-200"
          title="Open Scientific Methodology & Citations"
        >
          <Info className="w-3 h-3" />
          <span>Explain</span>
        </button>
      )}
    </div>
  );
});
