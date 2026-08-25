import { memo } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Workspace' | '3D Stage' | 'Navigation';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['/'], description: 'Open Quick Search & Command Palette', category: 'Workspace' },
  { keys: ['E'], description: 'Switch to 3D Explore Visualizer', category: 'Workspace' },
  { keys: ['T'], description: 'Switch to Interactive Periodic Table', category: 'Workspace' },
  { keys: ['C'], description: 'Switch to Side-by-Side Comparison Lab', category: 'Workspace' },
  { keys: ['R'], description: 'Switch to Chemical Reactions Lab', category: 'Workspace' },
  { keys: ['D'], description: 'Switch to Nuclear Radioactivity & Decay Lab', category: 'Workspace' },
  { keys: ['L'], description: 'Switch to Solid State Crystal Lattice Lab', category: 'Workspace' },

  { keys: ['Space'], description: 'Pause / Resume Subatomic Particle Motion', category: '3D Stage' },
  { keys: ['1', '2', '3', '4'], description: 'Magnification Presets (0.5x, 1x, 2x, 4x Core)', category: '3D Stage' },
  { keys: ['O'], description: 'Toggle Quantum Probability Wave Orbitals (ψ)', category: '3D Stage' },
  { keys: ['M'], description: 'Mute / Unmute Laboratory Sound Engine', category: '3D Stage' },
  { keys: ['Z'], description: 'Toggle Zen Mode (Clean UI Canvas)', category: '3D Stage' },

  { keys: ['['], description: 'Previous Atomic Number (Z - 1)', category: 'Navigation' },
  { keys: [']'], description: 'Next Atomic Number (Z + 1)', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close Modals & Clear Selection', category: 'Navigation' },
];

export const ShortcutsModal = memo(function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white/95 rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] flex items-center justify-center text-[#16a875]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-slate-900 leading-none">
                Laboratory Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-slate-500 font-mono mt-1">Fast quantum navigation & 3D controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 font-mono">
          {(['Workspace', '3D Stage', 'Navigation'] as const).map((cat) => (
            <div key={cat} className="space-y-1.5">
              <div className="text-[10px] font-bold text-[#087f5b] uppercase tracking-wider px-1">
                {cat} Controls
              </div>
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-2 space-y-1">
                {SHORTCUTS.filter((s) => s.category === cat).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-white transition-colors">
                    <span className="text-xs text-slate-700 font-sans">{s.description}</span>
                    <div className="flex gap-1 shrink-0">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-800 shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500 font-sans">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700">?</kbd> at any time to toggle this cheatsheet.
        </div>
      </div>
    </div>
  );
});
