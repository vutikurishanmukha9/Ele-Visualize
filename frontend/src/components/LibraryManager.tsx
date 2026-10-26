import { memo, useState, useMemo } from 'react';
import { CURRICULUM_MODULES, CurriculumModule } from '@/data/curriculum';
import { SavedSession, useAppStore } from '@/store/useAppStore';
import { elements } from '@/data/elements';
import { BookOpen, GraduationCap, ArrowRight, Save, Trash2, Download, Upload, FileText, Search, Plus, Check } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

interface LibraryManagerProps {
    sessions: SavedSession[];
    onOpen: (session: SavedSession) => void;
    onDelete: (session: SavedSession) => void;
}

export const LibraryManager = memo(function LibraryManager({
    sessions,
    onOpen,
    onDelete,
}: LibraryManagerProps) {
    const { setWorkspaceMode, setSelectedElement, setCompareElement1, setCompareElement2, addSavedSession } = useAppStore();
    const [activeTab, setActiveTab] = useState<'curriculum' | 'saved' | 'notebook'>('curriculum');
    const [searchQuery, setSearchQuery] = useState('');
    const [labNotes, setLabNotes] = useState<string>(() => {
        return localStorage.getItem('ele_visualize_lab_notes') || '# Scientific Experiment Journal\n\n- Date: ' + new Date().toLocaleDateString() + '\n- Objective: Analyze atomic structure & bonding characteristics.\n- Observations: \n- Conclusions: \n';
    });

    const handleNotesChange = (text: string) => {
        setLabNotes(text);
        localStorage.setItem('ele_visualize_lab_notes', text);
    };

    // Launch a curriculum module
    const handleLaunchCurriculum = (module: CurriculumModule) => {
        audioEngine.playClick(940);
        if (module.defaultElement) {
            const el = elements.find((e) => e.atomicNumber === module.defaultElement) || null;
            setSelectedElement(el);
        }
        if (module.compareElements) {
            const el1 = elements.find((e) => e.atomicNumber === module.compareElements![0]) || null;
            const el2 = elements.find((e) => e.atomicNumber === module.compareElements![1]) || null;
            setCompareElement1(el1);
            setCompareElement2(el2);
        }
        setWorkspaceMode(module.targetMode);
    };

    // Export sessions to JSON
    const handleExportSessions = () => {
        audioEngine.playClick(720);
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `ele_visualize_sessions_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // Import session from JSON
    const handleImportSession = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (Array.isArray(parsed)) {
                    parsed.forEach((s) => addSavedSession(s));
                } else if (parsed && typeof parsed === 'object') {
                    addSavedSession(parsed);
                }
                audioEngine.playBondingChord();
            } catch {
                alert('Invalid JSON session file.');
            }
        };
        reader.readAsText(file);
    };

    const filteredCurriculum = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return CURRICULUM_MODULES.filter(
            (m) =>
                !q ||
                m.title.toLowerCase().includes(q) ||
                m.category.toLowerCase().includes(q) ||
                m.keyConcepts.some((k) => k.toLowerCase().includes(q))
        );
    }, [searchQuery]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 gap-4 bg-[var(--color-canvas)] text-[var(--color-ink)] font-sans select-none overflow-y-auto">
            {/* Structured Laboratory Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-[var(--color-hairline)] gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-[var(--color-ink)] font-display tracking-tight">
                                Scientific Curriculum & Experiment Library
                            </h1>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] border border-[var(--color-hairline)]">
                                Guided Modules
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-ink-muted)] font-sans mt-0.5">
                            Interactive study sets, saved quantum explorations, and digital lab journal.
                        </p>
                    </div>
                </div>

                {/* Segmented Mode Tabs */}
                <div className="flex items-center p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-xs font-sans font-medium shrink-0">
                    <button
                        onClick={() => {
                            audioEngine.playClick(720);
                            setActiveTab('curriculum');
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-2",
                            activeTab === 'curriculum'
                                ? "bg-[var(--color-surface-3)] text-[var(--color-ink)] border border-[var(--color-hairline)] font-semibold shadow-2xs"
                                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-3)]/60"
                        )}
                    >
                        <GraduationCap className={cn("w-3.5 h-3.5", activeTab === 'curriculum' ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]")} />
                        <span>Curriculum</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium tnum",
                            activeTab === 'curriculum' ? "bg-[var(--color-surface-1)] text-[var(--color-accent)] border border-[var(--color-hairline)]" : "bg-[var(--color-surface-1)] text-[var(--color-ink-muted)]"
                        )}>
                            {CURRICULUM_MODULES.length}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            audioEngine.playClick(720);
                            setActiveTab('saved');
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-2",
                            activeTab === 'saved'
                                ? "bg-[var(--color-surface-3)] text-[var(--color-ink)] border border-[var(--color-hairline)] font-semibold shadow-2xs"
                                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-3)]/60"
                        )}
                    >
                        <Save className={cn("w-3.5 h-3.5", activeTab === 'saved' ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]")} />
                        <span>Saved</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium tnum",
                            activeTab === 'saved' ? "bg-[var(--color-surface-1)] text-[var(--color-accent)] border border-[var(--color-hairline)]" : "bg-[var(--color-surface-1)] text-[var(--color-ink-muted)]"
                        )}>
                            {sessions.length}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            audioEngine.playClick(720);
                            setActiveTab('notebook');
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-2",
                            activeTab === 'notebook'
                                ? "bg-[var(--color-surface-3)] text-[var(--color-ink)] border border-[var(--color-hairline)] font-semibold shadow-2xs"
                                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-3)]/60"
                        )}
                    >
                        <FileText className={cn("w-3.5 h-3.5", activeTab === 'notebook' ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]")} />
                        <span>Lab Notes</span>
                    </button>
                </div>
            </div>

            {/* Curriculum Master Study Sets Tab */}
            {activeTab === 'curriculum' && (
                <div className="space-y-3.5 flex-1">
                    {/* Search Field */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)] absolute left-3 top-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search curriculum by topic, concept, or category (e.g. Alkali, Bohr, VSEPR, Isotopes)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--color-surface-1)] border border-[var(--color-hairline)] rounded-md outline-none focus:border-[var(--color-accent)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] font-sans"
                        />
                    </div>

                    {/* Modules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredCurriculum.map((mod) => (
                            <div
                                key={mod.id}
                                className="p-4 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] hover:border-[var(--color-surface-4)] transition-all flex flex-col justify-between space-y-3"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)] border border-[var(--color-hairline)]">
                                            {mod.category}
                                        </span>
                                        <span className="text-xs text-[var(--color-ink-muted)] font-sans font-medium capitalize">{mod.level}</span>
                                    </div>

                                    <h3 className="font-semibold text-sm text-[var(--color-ink)] font-display">
                                        {mod.title}
                                    </h3>

                                    <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed font-sans">
                                        {mod.description}
                                    </p>

                                    {/* Objectives */}
                                    <div className="space-y-1 pt-2 border-t border-[var(--color-hairline)] font-sans">
                                        <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold tracking-wider">Key Objectives:</span>
                                        {mod.objectives.map((obj, i) => (
                                            <div key={i} className="text-xs text-[var(--color-ink-secondary)] flex items-start gap-1.5">
                                                <span className="text-[var(--color-accent)] font-semibold">•</span>
                                                <span>{obj}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Concept Tags */}
                                    <div className="flex flex-wrap gap-1 pt-1 font-mono">
                                        {mod.keyConcepts.map((k) => (
                                            <span key={k} className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] px-1.5 py-0.5 rounded border border-[var(--color-hairline)] font-normal">
                                                #{k}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleLaunchCurriculum(mod)}
                                    className="w-full h-8 bg-[var(--color-accent)] hover:bg-[#4f5ac4] active:scale-[0.99] text-white text-xs font-semibold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <span>Launch Interactive Module</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Explorations Tab */}
            {activeTab === 'saved' && (
                <div className="space-y-3 flex-1 font-sans">
                    {/* Action Bar */}
                    <div className="flex justify-between items-center bg-[var(--color-surface-1)] p-3 rounded-lg border border-[var(--color-hairline)]">
                        <span className="text-xs text-[var(--color-ink)] font-semibold font-mono tnum">
                            {sessions.length} Saved Experiment Session(s)
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportSessions}
                                className="h-7.5 px-3 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                                <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Export JSON
                            </button>
                            <label className="h-7.5 px-3 rounded-md bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-hairline)] text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                                <Upload className="w-3.5 h-3.5 text-emerald-400" /> Import JSON
                                <input type="file" accept=".json" onChange={handleImportSession} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Sessions Grid */}
                    {sessions.length === 0 ? (
                        <div className="p-12 text-center bg-[var(--color-surface-1)] rounded-lg border border-[var(--color-hairline)] text-[var(--color-ink-muted)] space-y-2">
                            <Save className="w-8 h-8 text-[var(--color-ink-muted)]/50 mx-auto" />
                            <p className="text-xs text-[var(--color-ink)] font-semibold">No saved explorations yet.</p>
                            <p className="text-xs text-[var(--color-ink-muted)]">Save atoms, reactions, comparisons, or molecules and they will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sessions.map((session) => (
                                <article
                                    key={session.id}
                                    className="p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] space-y-2.5 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-sm text-[var(--color-ink)] font-display">{session.title}</h3>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)] font-medium uppercase font-mono border border-[var(--color-hairline)]">
                                                {session.workspaceMode}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono tnum">
                                            {new Date(session.updatedAt).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-1 font-mono">
                                        {(session.tags.length ? session.tags : [session.workspaceMode]).map((tag) => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] border border-[var(--color-hairline)]">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-1 border-t border-[var(--color-hairline)]">
                                        <button
                                            className="flex-1 h-7.5 rounded-md bg-[var(--color-accent)] hover:bg-[#4f5ac4] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-xs"
                                            onClick={() => onOpen(session)}
                                        >
                                            Open Exploration
                                        </button>
                                        <button
                                            className="w-7.5 h-7.5 rounded-md hover:bg-rose-950/40 border border-[var(--color-hairline)] hover:border-rose-800/60 text-[var(--color-ink-muted)] hover:text-rose-400 flex items-center justify-center transition-colors shadow-2xs"
                                            onClick={() => onDelete(session)}
                                            title="Delete Session"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Lab Notebook Tab */}
            {activeTab === 'notebook' && (
                <div className="space-y-3 flex-1 flex flex-col font-sans">
                    <div className="p-3 bg-[var(--color-surface-1)] rounded-lg border border-[var(--color-hairline)] flex justify-between items-center">
                        <div>
                            <span className="text-xs font-semibold text-[var(--color-ink)] block">Digital Lab Experiment Journal</span>
                            <span className="text-xs text-[var(--color-ink-muted)]">Record hypotheses, observations, and calculations. Automatically persists locally.</span>
                        </div>
                        <button
                            onClick={() => {
                                handleNotesChange(
                                    labNotes + `\n\n## Entry: ${new Date().toLocaleTimeString()}\n- Observation: \n`
                                );
                            }}
                            className="h-7.5 px-3 rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent)] border border-[var(--color-hairline)] text-xs font-medium hover:bg-[var(--color-surface-3)] transition-colors shadow-2xs"
                        >
                            + New Timestamp Entry
                        </button>
                    </div>

                    <textarea
                        value={labNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        className="flex-1 min-h-[360px] p-4 bg-[var(--color-surface-1)] border border-[var(--color-hairline)] rounded-lg outline-none font-mono text-xs text-[var(--color-ink)] leading-relaxed resize-none focus:border-[var(--color-accent)]"
                        placeholder="Type experimental notes and calculations here in Markdown..."
                    />
                </div>
            )}
        </div>
    );
});
