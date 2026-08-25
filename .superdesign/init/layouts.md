# Shared Layout Components

## 1. TopBar Header
- File: `frontend/src/pages/Index.tsx` (TopBar component)
- Description: Editorial brand header with logo spin, pill command search trigger, session storage action, and laboratory utility buttons.

```tsx
function TopBar({ onSave, saveState }: { onSave: () => void; saveState: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { commandOpen, setCommandOpen, setWorkspaceMode, setSelectedElement, setSelectedMolecule, setSearchQuery } = useAppStore();

  const handleHome = () => {
    setWorkspaceMode('explore');
    setSelectedElement(null);
    setSelectedMolecule(null);
    setSearchQuery('');
  };

  return (
    <header className="workbench-topbar">
      <button className="flex min-w-0 items-center gap-3 text-left transition-transform hover:scale-[1.01]" onClick={handleHome}>
        <div className="w-9 h-9 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] flex items-center justify-center text-[#16a875] shadow-xs">
          <Atom className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-lg font-bold tracking-tight text-slate-900 leading-tight">
            Ele-visualize
          </div>
          <div className="hidden truncate text-xs text-slate-500 sm:block font-normal">
            Visualize the building blocks of the universe.
          </div>
        </div>
      </button>
      {/* Pill Search Input */}
      <button className="command-trigger group" onClick={() => setCommandOpen(!commandOpen)}>
        <Search className="h-4 w-4 text-slate-400 group-hover:text-[#16a875] transition-colors" />
        <span className="truncate flex-1 text-slate-500 font-normal">Search elements, molecules, or commands...</span>
        <span className="hidden rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono md:inline">/</span>
      </button>
    </header>
  );
}
```

## 2. Workspace Navigation Bar
- Segmented mode switcher for switching between `Explore`, `Table`, `Compare`, `Reactions`, and `Builder`.
