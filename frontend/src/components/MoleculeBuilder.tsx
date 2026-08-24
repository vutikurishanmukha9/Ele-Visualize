import { useState, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Trash2, X, Check, AlertTriangle, Atom, Wand2 } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

interface MoleculeBuilderProps {
    onClose?: () => void;
}

interface PlacedAtom {
    id: string;
    symbol: string;
    x: number;
    y: number;
    color: string;
    bonds: number;
    maxBonds: number;
}

interface Bond {
    id: string;
    from: string;
    to: string;
}

// Valence electrons & bonding limits
const VALENCE: Record<string, number> = {
    H: 1, C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1,
    S: 2, P: 3, B: 3, Si: 4, Na: 1, K: 1, Ca: 2, Mg: 2,
};

// Element colors
const ELEMENT_COLORS: Record<string, string> = {
    H: '#ffffff', C: '#334155', N: '#3050F8', O: '#FF0D0D',
    S: '#FFFF30', P: '#FF8000', F: '#90E050', Cl: '#1FF01F',
    Br: '#A62929',
};

// Quick Templates for rapid molecular exploration
interface MoleculeTemplate {
    name: string;
    formula: string;
    atoms: { symbol: string; x: number; y: number }[];
    bonds: [number, number][];
}

const TEMPLATES: MoleculeTemplate[] = [
    {
        name: 'Water',
        formula: 'H₂O',
        atoms: [
            { symbol: 'O', x: 260, y: 180 },
            { symbol: 'H', x: 190, y: 240 },
            { symbol: 'H', x: 330, y: 240 },
        ],
        bonds: [[0, 1], [0, 2]],
    },
    {
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        atoms: [
            { symbol: 'C', x: 260, y: 200 },
            { symbol: 'O', x: 150, y: 200 },
            { symbol: 'O', x: 370, y: 200 },
        ],
        bonds: [[0, 1], [0, 1], [0, 2], [0, 2]],
    },
    {
        name: 'Methane',
        formula: 'CH₄',
        atoms: [
            { symbol: 'C', x: 260, y: 200 },
            { symbol: 'H', x: 260, y: 100 },
            { symbol: 'H', x: 160, y: 200 },
            { symbol: 'H', x: 360, y: 200 },
            { symbol: 'H', x: 260, y: 300 },
        ],
        bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
    },
    {
        name: 'Ammonia',
        formula: 'NH₃',
        atoms: [
            { symbol: 'N', x: 260, y: 180 },
            { symbol: 'H', x: 180, y: 250 },
            { symbol: 'H', x: 260, y: 270 },
            { symbol: 'H', x: 340, y: 250 },
        ],
        bonds: [[0, 1], [0, 2], [0, 3]],
    },
    {
        name: 'Ethanol',
        formula: 'C₂H₅OH',
        atoms: [
            { symbol: 'C', x: 180, y: 200 },
            { symbol: 'C', x: 280, y: 200 },
            { symbol: 'O', x: 370, y: 200 },
            { symbol: 'H', x: 440, y: 200 },
            { symbol: 'H', x: 180, y: 110 },
            { symbol: 'H', x: 180, y: 290 },
            { symbol: 'H', x: 110, y: 200 },
            { symbol: 'H', x: 280, y: 110 },
            { symbol: 'H', x: 280, y: 290 },
        ],
        bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]],
    },
];

export const MoleculeBuilder = memo(function MoleculeBuilder({ onClose }: MoleculeBuilderProps) {
    const [atoms, setAtoms] = useState<PlacedAtom[]>([]);
    const [bonds, setBonds] = useState<Bond[]>([]);
    const [selectedPaletteAtom, setSelectedPaletteAtom] = useState<string>('C');
    const [selectedCanvasAtom, setSelectedCanvasAtom] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Compute chemical formula from placed atoms
    const chemicalFormula = useMemo(() => {
        if (atoms.length === 0) return 'Empty';
        const counts: Record<string, number> = {};
        atoms.forEach((a) => {
            counts[a.symbol] = (counts[a.symbol] || 0) + 1;
        });

        // Hill system ordering: C first, then H, then alphabetical
        const order = ['C', 'H', ...Object.keys(counts).filter((k) => k !== 'C' && k !== 'H').sort()];
        let formula = '';
        order.forEach((sym) => {
            if (counts[sym]) {
                formula += `${sym}${counts[sym] > 1 ? counts[sym] : ''}`;
            }
        });
        return formula;
    }, [atoms]);

    // Valence satisfaction metrics
    const validation = useMemo(() => {
        if (atoms.length === 0) return { isValid: false, message: 'Add atoms to build a molecule' };
        
        let allSatisfied = true;
        for (const atom of atoms) {
            if (atom.bonds !== atom.maxBonds) {
                allSatisfied = false;
                break;
            }
        }

        return {
            isValid: allSatisfied,
            message: allSatisfied ? 'All valence octets satisfied ✓' : 'Incomplete bonding pairs detected',
        };
    }, [atoms]);

    // Add atom to canvas
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const maxBonds = VALENCE[selectedPaletteAtom] || 1;
        const newAtom: PlacedAtom = {
            id: `atom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            symbol: selectedPaletteAtom,
            x,
            y,
            color: ELEMENT_COLORS[selectedPaletteAtom] || '#38bdf8',
            bonds: 0,
            maxBonds,
        };

        setAtoms((prev) => [...prev, newAtom]);
        audioEngine.playClick(680);
    };

    // Bond between two atoms
    const handleAtomClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedCanvasAtom) {
            setSelectedCanvasAtom(id);
            audioEngine.playClick(880);
            return;
        }

        if (selectedCanvasAtom === id) {
            setSelectedCanvasAtom(null);
            return;
        }

        const atom1 = atoms.find((a) => a.id === selectedCanvasAtom);
        const atom2 = atoms.find((a) => a.id === id);

        if (!atom1 || !atom2) return;

        if (atom1.bonds >= atom1.maxBonds || atom2.bonds >= atom2.maxBonds) {
            toast({
                title: 'Valence Exceeded',
                description: `Cannot add bond: ${atom1.bonds >= atom1.maxBonds ? atom1.symbol : atom2.symbol} reached maximum valence capacity.`,
                variant: 'destructive',
            });
            setSelectedCanvasAtom(null);
            return;
        }

        // Add bond
        const newBond: Bond = {
            id: `bond-${Date.now()}`,
            from: selectedCanvasAtom,
            to: id,
        };

        setBonds((prev) => [...prev, newBond]);
        setAtoms((prev) =>
            prev.map((a) =>
                a.id === selectedCanvasAtom || a.id === id
                    ? { ...a, bonds: a.bonds + 1 }
                    : a
            )
        );

        setSelectedCanvasAtom(null);
        audioEngine.playBondingChord();
    };

    // Auto-Bond Solver: automatically establishes covalent bonds
    const handleAutoBond = () => {
        if (atoms.length < 2) return;

        const nextBonds: Bond[] = [];
        const nextAtoms = atoms.map((a) => ({ ...a, bonds: 0 }));

        for (let i = 0; i < nextAtoms.length; i++) {
            for (let j = i + 1; j < nextAtoms.length; j++) {
                const a1 = nextAtoms[i];
                const a2 = nextAtoms[j];

                const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
                if (dist < 140 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
                    nextBonds.push({
                        id: `bond-auto-${i}-${j}`,
                        from: a1.id,
                        to: a2.id,
                    });
                    a1.bonds += 1;
                    a2.bonds += 1;
                }
            }
        }

        setAtoms(nextAtoms);
        setBonds(nextBonds);
        audioEngine.playBondingChord();
        toast({
            title: 'Auto-Bond Generated',
            description: `Resolved ${nextBonds.length} covalent bonds.`,
        });
    };

    // Load preset template
    const loadTemplate = (tmpl: MoleculeTemplate) => {
        const newAtoms: PlacedAtom[] = tmpl.atoms.map((a, idx) => ({
            id: `atom-${idx}`,
            symbol: a.symbol,
            x: a.x,
            y: a.y,
            color: ELEMENT_COLORS[a.symbol] || '#38bdf8',
            bonds: 0,
            maxBonds: VALENCE[a.symbol] || 1,
        }));

        const newBonds: Bond[] = tmpl.bonds.map(([f, t], bIdx) => ({
            id: `bond-${bIdx}`,
            from: `atom-${f}`,
            to: `atom-${t}`,
        }));

        // Calculate bond counts
        newBonds.forEach((b) => {
            const a1 = newAtoms.find((a) => a.id === b.from);
            const a2 = newAtoms.find((a) => a.id === b.to);
            if (a1) a1.bonds += 1;
            if (a2) a2.bonds += 1;
        });

        setAtoms(newAtoms);
        setBonds(newBonds);
        setSelectedCanvasAtom(null);
        audioEngine.playBondingChord();
    };

    // Clear canvas
    const handleClear = () => {
        setAtoms([]);
        setBonds([]);
        setSelectedCanvasAtom(null);
        audioEngine.playClick(440);
    };

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-50 font-mono text-slate-900 select-none overflow-y-auto matrix-grid-bg">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Atom className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span className="font-bold text-xs tracking-wider uppercase text-emerald-700">
                        INTERACTIVE 2D/3D MOLECULAR SYNTHESIZER
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Quick Templates & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Preset Templates:</span>
                    <div className="flex gap-1.5 flex-wrap">
                        {TEMPLATES.map((tmpl) => (
                            <button
                                key={tmpl.name}
                                onClick={() => loadTemplate(tmpl)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[10px] font-bold text-slate-700 hover:text-emerald-800 transition-colors"
                            >
                                {tmpl.name} ({tmpl.formula})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoBond}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                        <Wand2 className="w-3 h-3" />
                        Auto-Bond Solver
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear
                    </button>
                </div>
            </div>

            {/* Main Stage Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1 min-h-[460px]">
                {/* Palette Sidebar */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Element Palette</span>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(VALENCE).slice(0, 9).map((sym) => {
                            const isSelected = selectedPaletteAtom === sym;
                            const color = ELEMENT_COLORS[sym] || '#0284c7';
                            return (
                                <button
                                    key={sym}
                                    onClick={() => setSelectedPaletteAtom(sym)}
                                    className={cn(
                                        "p-2.5 rounded-lg flex flex-col items-center justify-center border font-bold transition-all",
                                        isSelected
                                            ? "bg-emerald-50 border-emerald-500 shadow-sm scale-105"
                                            : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                                    )}
                                >
                                    <span className="text-base font-extrabold" style={{ color }}>{sym}</span>
                                    <span className="text-[8px] text-slate-500 font-mono">v:{VALENCE[sym]}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[10px] text-slate-600">
                        <p className="font-bold text-slate-900 uppercase">How To Assemble:</p>
                        <p>1. Click canvas to place selected atom.</p>
                        <p>2. Click first atom, then second atom to form a covalent bond.</p>
                    </div>
                </div>

                {/* Synthesis 2D Interactive Canvas */}
                <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="lg:col-span-3 rounded-xl bg-slate-100/90 border border-slate-300 relative overflow-hidden cursor-crosshair min-h-[380px] shadow-inner"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(2, 132, 199, 0.04) 0%, transparent 80%)',
                    }}
                >
                    {/* SVG Bonds */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {bonds.map((bond) => {
                            const a1 = atoms.find((a) => a.id === bond.from);
                            const a2 = atoms.find((a) => a.id === bond.to);
                            if (!a1 || !a2) return null;
                            return (
                                <line
                                    key={bond.id}
                                    x1={a1.x}
                                    y1={a1.y}
                                    x2={a2.x}
                                    y2={a2.y}
                                    stroke="#0284c7"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    opacity="0.85"
                                />
                            );
                        })}
                    </svg>

                    {/* Placed Atoms */}
                    {atoms.map((atom) => {
                        const isSelected = selectedCanvasAtom === atom.id;
                        const isSatisfied = atom.bonds === atom.maxBonds;
                        return (
                            <div
                                key={atom.id}
                                onClick={(e) => handleAtomClick(atom.id, e)}
                                className={cn(
                                    "absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex flex-col items-center justify-center font-extrabold cursor-pointer transition-transform shadow-md border-2 select-none",
                                    isSelected && "ring-4 ring-sky-500 scale-110",
                                    isSatisfied ? "border-emerald-500" : "border-amber-500 animate-pulse"
                                )}
                                style={{
                                    left: atom.x,
                                    top: atom.y,
                                    backgroundColor: atom.color,
                                    color: ['H', 'S', 'F'].includes(atom.symbol) ? '#0f172a' : '#ffffff',
                                }}
                            >
                                <span className="text-sm font-black leading-none">{atom.symbol}</span>
                                <span className="text-[8px] font-mono leading-none mt-0.5 opacity-85">
                                    {atom.bonds}/{atom.maxBonds}
                                </span>
                            </div>
                        );
                    })}

                    {/* Bottom Status Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 rounded-lg bg-white/95 border border-slate-200 backdrop-blur-md text-xs shadow-md">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase">Formula:</span>
                            <span className="font-bold text-emerald-700 text-sm">{chemicalFormula}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {validation.isValid ? (
                                <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                    <Check className="w-3.5 h-3.5" />
                                    {validation.message}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {validation.message}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
