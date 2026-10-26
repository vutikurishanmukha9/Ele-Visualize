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
  { keys: ['B'], description: 'Switch to Molecule Builder Lab', category: 'Workspace' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--color-surface-1)] rounded-xl border border-[var(--color-hairline-strong)] shadow-elevated overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-semibold text-[var(--color-ink-primary)] leading-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Quick navigation & 3D controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog"
            className="w-7 h-7 rounded-md bg-[var(--color-surface-3)]/60 hover:bg-[var(--color-surface-3)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut List */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {(['Workspace', '3D Stage', 'Navigation'] as const).map((cat) => (
            <div key={cat} className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--color-accent)] px-1">
                {cat} Controls
              </div>
              <div className="bg-[var(--color-surface-2)]/50 border border-[var(--color-hairline)] rounded-lg p-1.5 space-y-0.5">
                {SHORTCUTS.filter((s) => s.category === cat).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 rounded-md hover:bg-[var(--color-surface-3)]/50 transition-colors">
                    <span className="text-xs text-[var(--color-ink-secondary)] font-normal">{s.description}</span>
                    <div className="flex gap-1 shrink-0">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-hairline-strong)] text-xs font-medium text-[var(--color-ink-primary)] font-mono shadow-2xs"
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
        <div className="p-3 bg-[var(--color-surface-2)]/60 border-t border-[var(--color-hairline)] text-center text-xs text-[var(--color-ink-muted)]">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-hairline-strong)] text-[11px] font-mono font-medium text-[var(--color-ink-primary)]">?</kbd> at any time to toggle this cheatsheet.
        </div>
      </div>
    </div>
  );
});
