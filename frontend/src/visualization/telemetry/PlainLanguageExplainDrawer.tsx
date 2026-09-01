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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0071e3]" />
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Scientific Provenance & Methodology
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Provenance Badge Lockup */}
          <div className="p-3 rounded-lg border bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Classification</span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border", def.bgClass, def.colorClass, def.borderClass)}>
                {def.badgeLabel}
              </span>
            </div>
            <p className="text-slate-700 font-medium text-xs">
              {provenance.shortDescription}
            </p>
          </div>

          {/* Mathematical & Physical Methodology */}
          <div className="space-y-1">
            <h4 className="font-display font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Computational Methodology</span>
            </h4>
            <p className="text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 font-mono text-[11px]">
              {provenance.detailedMethodology}
            </p>
          </div>

          {/* Model Scope & Theoretical Limitations */}
          <div className="space-y-1">
            <h4 className="font-display font-bold text-slate-900">Theoretical Scope & Limitations</h4>
            <p className="text-slate-500 italic bg-amber-50/50 p-2.5 rounded-md border border-amber-200/50 text-[11px]">
              {provenance.limitations}
            </p>
          </div>

          {/* Standard Reference Citations */}
          {modelContext.dataSources.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h4 className="font-display font-bold text-slate-900">Reference Sources & Standards</h4>
              <div className="space-y-1">
                {modelContext.dataSources.map((ds, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-[10.5px] font-mono">
                    <span className="truncate max-w-[340px] text-slate-700 font-medium">{ds.sourceName}</span>
                    {ds.sourceUrl && (
                      <a
                        href={ds.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0071e3] hover:underline flex items-center gap-1 shrink-0 ml-2 font-bold"
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
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-mono font-bold hover:bg-slate-800 transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
