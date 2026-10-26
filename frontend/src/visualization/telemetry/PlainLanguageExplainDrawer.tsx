import { memo } from 'react';
import { ScientificState } from '@/scientific/models/ScientificState';
import { EPISTEMOLOGY_DEFINITIONS } from '@/scientific/models/Epistemology';
import { X, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlainLanguageExplainDrawerProps {
  scientificState: ScientificState;
  isOpen: boolean;
  onClose: () => void;
}

export const PlainLanguageExplainDrawer = memo(function PlainLanguageExplainDrawer({
  scientificState,
  isOpen,
  onClose,
}: PlainLanguageExplainDrawerProps) {
  if (!isOpen) return null;

  const { provenance, modelContext, element } = scientificState;
  const def = (provenance && EPISTEMOLOGY_DEFINITIONS[provenance.provenance]) || EPISTEMOLOGY_DEFINITIONS.MODEL_DERIVED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[var(--color-surface-1)] rounded-lg border border-[var(--color-hairline)] max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-display font-extrabold text-sm text-[var(--color-ink)]">
              Scientific Provenance & Methodology
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-3)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[var(--color-ink-muted)] leading-relaxed">
          {/* Provenance Badge Lockup */}
          <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">Classification</span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border", def.bgClass, def.colorClass, def.borderClass)}>
                {def.badgeLabel}
              </span>
            </div>
            <p className="text-[var(--color-ink)] font-medium text-xs">
              {provenance.shortDescription}
            </p>
          </div>

          {/* Mathematical & Physical Methodology */}
          <div className="space-y-1">
            <h4 className="font-display font-bold text-[var(--color-ink)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Computational Methodology</span>
            </h4>
            <p className="text-[var(--color-ink-muted)] bg-[var(--color-surface-2)] p-2.5 rounded border border-[var(--color-hairline)] font-mono text-[11px]">
              {provenance.detailedMethodology}
            </p>
          </div>

          {/* Model Scope & Theoretical Limitations */}
          <div className="space-y-1">
            <h4 className="font-display font-bold text-[var(--color-ink)]">Theoretical Scope & Limitations</h4>
            <p className="text-amber-300 italic bg-amber-950/20 p-2.5 rounded border border-amber-800/40 text-[11px]">
              {provenance.limitations}
            </p>
          </div>

          {/* Standard Reference Citations */}
          {modelContext.dataSources.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--color-hairline)]">
              <h4 className="font-display font-bold text-[var(--color-ink)]">Reference Sources & Standards</h4>
              <div className="space-y-1">
                {modelContext.dataSources.map((ds, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-[10.5px] font-mono">
                    <span className="truncate max-w-[340px] text-[var(--color-ink)] font-medium">{ds.sourceName}</span>
                    {ds.sourceUrl && (
                      <a
                        href={ds.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-accent)] hover:underline flex items-center gap-1 shrink-0 ml-2 font-bold"
                      >
                        <span>Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-surface-2)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-[var(--color-ink)] text-xs font-mono font-bold border border-[var(--color-hairline)] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
