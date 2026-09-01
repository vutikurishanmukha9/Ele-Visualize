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
        <div className="h-full flex flex-col p-4 sm:p-6 gap-4 bg-[#fbfbfd] text-slate-900 font-sans select-none overflow-y-auto">
            {/* Structured Laboratory Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200/80 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0071e3] shadow-xs shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 font-display tracking-tight">
                                Scientific Curriculum & Experiment Library
                            </h1>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                Guided Modules
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-sans mt-0.5">
                            Interactive study sets, saved quantum explorations, and digital lab journal.
                        </p>
                    </div>
                </div>

                {/* Segmented Mode Tabs */}
                <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-mono font-bold shrink-0 shadow-2xs">
                    <button
                        onClick={() => {
                            audioEngine.playClick(720);
                            setActiveTab('curriculum');
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5",
                            activeTab === 'curriculum'
                                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                    >
                        <GraduationCap className={cn("w-3.5 h-3.5", activeTab === 'curriculum' ? "text-[#0071e3]" : "text-slate-400")} />
                        <span>Curriculum</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                            activeTab === 'curriculum' ? "bg-blue-50 text-[#0071e3] border border-blue-200/60" : "bg-slate-200/80 text-slate-600"
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
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5",
                            activeTab === 'saved'
                                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                    >
                        <Save className={cn("w-3.5 h-3.5", activeTab === 'saved' ? "text-[#0071e3]" : "text-slate-400")} />
                        <span>Saved</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                            activeTab === 'saved' ? "bg-blue-50 text-[#0071e3] border border-blue-200/60" : "bg-slate-200/80 text-slate-600"
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
                            "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5",
                            activeTab === 'notebook'
                                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                    >
                        <FileText className={cn("w-3.5 h-3.5", activeTab === 'notebook' ? "text-[#0071e3]" : "text-slate-400")} />
                        <span>Lab Notes</span>
                    </button>
                </div>
            </div>

            {/* Curriculum Master Study Sets Tab */}
            {activeTab === 'curriculum' && (
                <div className="space-y-3.5 flex-1">
                    {/* Search Field */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search curriculum by topic, concept, or category (e.g. Alkali, Bohr, VSEPR, Isotopes)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200/80 rounded-md outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/30 shadow-xs text-slate-800 placeholder:text-slate-400 font-sans"
                        />
                    </div>

                    {/* Modules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredCurriculum.map((mod) => (
                            <div
                                key={mod.id}
                                className="p-4 rounded-lg bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0071e3] border border-blue-200/60">
                                            {mod.category}
                                        </span>
                                        <span className="text-[9.5px] text-slate-400 uppercase font-mono font-bold">{mod.level}</span>
                                    </div>

                                    <h3 className="font-bold text-sm text-slate-900 font-display">
                                        {mod.title}
                                    </h3>

                                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                        {mod.description}
                                    </p>

                                    {/* Objectives */}
                                    <div className="space-y-1 pt-2 border-t border-slate-100 font-sans">
                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider font-mono">Key Objectives:</span>
                                        {mod.objectives.map((obj, i) => (
                                            <div key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                                <span className="text-[#0071e3] font-bold">•</span>
                                                <span>{obj}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Concept Tags */}
                                    <div className="flex flex-wrap gap-1 pt-1 font-mono">
                                        {mod.keyConcepts.map((k) => (
                                            <span key={k} className="text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium">
                                                #{k}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleLaunchCurriculum(mod)}
                                    className="w-full h-8 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] text-white text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all shadow-xs"
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
                <div className="space-y-3 flex-1">
                    {/* Action Bar */}
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs font-mono">
                        <span className="text-xs text-slate-700 font-bold">
                            {sessions.length} Saved Experiment Session(s)
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportSessions}
                                className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                                <Download className="w-3.5 h-3.5 text-[#0071e3]" /> Export JSON
                            </button>
                            <label className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                                <Upload className="w-3.5 h-3.5 text-emerald-600" /> Import JSON
                                <input type="file" accept=".json" onChange={handleImportSession} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Sessions Grid */}
                    {sessions.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-lg border border-slate-200/80 text-slate-400 space-y-2 font-mono">
                            <Save className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs text-slate-700 font-bold">No saved explorations yet.</p>
                            <p className="text-[11px] text-slate-400">Save atoms, reactions, comparisons, or molecules and they will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sessions.map((session) => (
                                <article
                                    key={session.id}
                                    className="p-3.5 rounded-lg bg-white border border-slate-200/80 shadow-xs space-y-2.5 flex flex-col justify-between font-mono"
                                >
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sm text-slate-900 font-sans">{session.title}</h3>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-[#0071e3] font-bold uppercase border border-blue-200">
                                                {session.workspaceMode}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(session.updatedAt).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {(session.tags.length ? session.tags : [session.workspaceMode]).map((tag) => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                                        <button
                                            className="flex-1 h-7 rounded-md bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                                            onClick={() => onOpen(session)}
                                        >
                                            Open Exploration
                                        </button>
                                        <button
                                            className="w-7 h-7 rounded-md hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
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
                <div className="space-y-3 flex-1 flex flex-col font-mono">
                    <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-slate-900 block font-sans">Digital Lab Experiment Journal</span>
                            <span className="text-[10px] text-slate-400">Record hypotheses, observations, and calculations. Automatically persists locally.</span>
                        </div>
                        <button
                            onClick={() => {
                                handleNotesChange(
                                    labNotes + `\n\n## Entry: ${new Date().toLocaleTimeString()}\n- Observation: \n`
                                );
                            }}
                            className="h-7 px-2.5 rounded-md bg-blue-50 text-[#0071e3] border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors shadow-2xs"
                        >
                            + New Timestamp Entry
                        </button>
                    </div>

                    <textarea
                        value={labNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        className="flex-1 min-h-[360px] p-4 bg-white border border-slate-200/80 rounded-lg outline-none font-mono text-xs text-slate-800 leading-relaxed resize-none shadow-xs focus:border-[#0071e3]"
                        placeholder="Type experimental notes and calculations here in Markdown..."
                    />
                </div>
            )}
        </div>
    );
});
