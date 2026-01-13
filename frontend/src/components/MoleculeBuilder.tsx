import { useState, useCallback, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { elements } from '@/data/elements';
import { cn } from '@/lib/utils';
import { Trash2, Save, RotateCcw, Link2, X, Check, AlertTriangle, Atom, Plus, Minus } from 'lucide-react';

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

// Valence electrons
const VALENCE: Record<string, number> = {
    H: 1, C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1,
    S: 2, P: 3, B: 3, Si: 4, Na: 1, K: 1, Ca: 2, Mg: 2,
};

// Element colors
const ELEMENT_COLORS: Record<string, string> = {
    H: '#ffffff', C: '#333333', N: '#3050F8', O: '#FF0D0D',
    S: '#FFFF30', P: '#FF8000', F: '#90E050', Cl: '#1FF01F',
    Br: '#A62929',
};

// Palette atom
const PaletteAtom = memo(function PaletteAtom({
    symbol,
    color,
    valence,
    isSelected,
    onClick,
}: {
    symbol: string;
    color: string;
    valence: number;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold shadow-lg transition-all border-2",
                isSelected
                    ? "border-white ring-2 ring-white/50"
                    : "border-transparent hover:border-white/30"
            )}
            style={{
                backgroundColor: color,
                color: ['H', 'S', 'F'].includes(symbol) ? '#000' : '#fff'
            }}
        >
            <span className="text-lg sm:text-xl">{symbol}</span>
            <span className="text-[8px] sm:text-[9px] opacity-70">v:{valence}</span>
        </motion.button>
    );
});

// Canvas atom
const CanvasAtom = memo(function CanvasAtom({
    atom,
    isSelected,
    isValidBonds,
    onClick,
    onDrag,
}: {
    atom: PlacedAtom;
    isSelected: boolean;
    isValidBonds: boolean;
    onClick: () => void;
    onDrag: (x: number, y: number) => void;
}) {
    const handleDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startAtomX = atom.x;
        const startAtomY = atom.y;

        const handleMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            onDrag(startAtomX + dx, startAtomY + dy);
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
                "absolute w-12 h-12 rounded-full flex flex-col items-center justify-center cursor-pointer font-bold transition-all select-none",
                isSelected && "ring-4 ring-cyan-400 z-10",
                !isValidBonds && atom.bonds > 0 && "ring-2 ring-yellow-500",
                atom.bonds === atom.maxBonds && "ring-2 ring-green-500"
            )}
            style={{
                left: atom.x - 24,
                top: atom.y - 24,
                backgroundColor: atom.color,
                color: ['H', 'S', 'F'].includes(atom.symbol) ? '#000' : '#fff',
                boxShadow: isSelected
                    ? `0 0 20px rgba(0,200,255,0.5)`
                    : `0 4px 12px rgba(0,0,0,0.4)`
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseDown={(e) => {
                e.stopPropagation(); // Prevent canvas click
                handleDrag(e);
            }}
        >
            <span className="text-lg leading-none">{atom.symbol}</span>
            <span className="text-[9px] opacity-80">{atom.bonds}/{atom.maxBonds}</span>
        </motion.div>
    );
});

export const MoleculeBuilder = memo(function MoleculeBuilder({ onClose }: MoleculeBuilderProps) {
    const [atoms, setAtoms] = useState<PlacedAtom[]>([]);
    const [bonds, setBonds] = useState<Bond[]>([]);
    const [selectedAtom, setSelectedAtom] = useState<string | null>(null);
    const [selectedPalette, setSelectedPalette] = useState<string>('C');
    const canvasRef = useRef<HTMLDivElement>(null);

    // Palette elements
    const paletteElements = useMemo(() => {
        const symbols = ['H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br'];
        return symbols.map(symbol => ({
            symbol,
            color: ELEMENT_COLORS[symbol] || '#666',
            valence: VALENCE[symbol] || 1,
        }));
    }, []);

    // Validation
    const isValid = useMemo(() => {
        return atoms.length > 0 && atoms.every(a => a.bonds === a.maxBonds);
    }, [atoms]);

    // Formula
    const formula = useMemo(() => {
        if (atoms.length === 0) return '';
        const counts: Record<string, number> = {};
        atoms.forEach(a => { counts[a.symbol] = (counts[a.symbol] || 0) + 1; });
        const order = ['C', 'H'];
        const others = Object.keys(counts).filter(s => !order.includes(s)).sort();
        return [...order, ...others]
            .filter(s => counts[s])
            .map(s => `${s}${counts[s] > 1 ? counts[s] : ''}`)
            .join('');
    }, [atoms]);

    // Click on canvas to add atom
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const target = e.target as HTMLElement;
        if (target !== canvasRef.current) return; // Only if clicking canvas directly

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const palEl = paletteElements.find(p => p.symbol === selectedPalette);

        const newAtom: PlacedAtom = {
            id: `atom-${Date.now()}-${Math.random()}`,
            symbol: selectedPalette,
            x,
            y,
            color: palEl?.color || '#666',
            bonds: 0,
            maxBonds: palEl?.valence || 1,
        };

        setAtoms(prev => [...prev, newAtom]);
    }, [selectedPalette, paletteElements]);

    // Move atom
    const moveAtom = useCallback((atomId: string, x: number, y: number) => {
        setAtoms(prev => prev.map(a => a.id === atomId ? { ...a, x, y } : a));
    }, []);

    // Click on placed atom
    const handleAtomClick = useCallback((atomId: string) => {
        if (!selectedAtom) {
            setSelectedAtom(atomId);
        } else if (selectedAtom === atomId) {
            setSelectedAtom(null);
        } else {
            // Create bond
            const from = atoms.find(a => a.id === selectedAtom);
            const to = atoms.find(a => a.id === atomId);

            if (from && to && from.bonds < from.maxBonds && to.bonds < to.maxBonds) {
                const bondExists = bonds.some(
                    b => (b.from === selectedAtom && b.to === atomId) ||
                        (b.from === atomId && b.to === selectedAtom)
                );

                if (!bondExists) {
                    setBonds(prev => [...prev, { id: `bond-${Date.now()}`, from: selectedAtom, to: atomId }]);
                    setAtoms(prev => prev.map(a => {
                        if (a.id === selectedAtom || a.id === atomId) {
                            return { ...a, bonds: a.bonds + 1 };
                        }
                        return a;
                    }));
                }
            }
            setSelectedAtom(null);
        }
    }, [selectedAtom, atoms, bonds]);

    const deleteAtom = useCallback((atomId: string) => {
        const connectedBonds = bonds.filter(b => b.from === atomId || b.to === atomId);
        connectedBonds.forEach(bond => {
            const otherId = bond.from === atomId ? bond.to : bond.from;
            setAtoms(prev => prev.map(a =>
                a.id === otherId ? { ...a, bonds: Math.max(0, a.bonds - 1) } : a
            ));
        });
        setBonds(prev => prev.filter(b => b.from !== atomId && b.to !== atomId));
        setAtoms(prev => prev.filter(a => a.id !== atomId));
        setSelectedAtom(null);
    }, [bonds]);

    const reset = useCallback(() => {
        setAtoms([]);
        setBonds([]);
        setSelectedAtom(null);
    }, []);

    const saveMolecule = useCallback(() => {
        if (!isValid) return;
        const saved = JSON.parse(localStorage.getItem('savedMolecules') || '[]');
        saved.push({ id: Date.now(), formula, atoms: atoms.length, date: new Date().toISOString() });
        localStorage.setItem('savedMolecules', JSON.stringify(saved));
        alert(`Saved: ${formula}`);
    }, [isValid, atoms, formula]);

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 pt-14 sm:pt-4 border-b border-white/10">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Atom className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-xl font-bold text-white">Molecule Builder</h2>
                        <p className="hidden sm:block text-xs text-slate-400">Select atom type, click canvas to place</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {formula && (
                        <div className={cn(
                            "px-2 sm:px-4 py-1 sm:py-2 rounded-xl font-mono text-sm sm:text-lg flex items-center gap-1 sm:gap-2 border",
                            isValid
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        )}>
                            {isValid ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
                            <span className="font-bold">{formula}</span>
                        </div>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Palette - scrollable on mobile */}
            <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-white/10 bg-black/20 overflow-x-auto">
                <div className="flex items-center gap-2 sm:gap-3 min-w-max">
                    <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">Select:</span>
                    <div className="flex gap-1.5 sm:gap-2">
                        {paletteElements.map(el => (
                            <PaletteAtom
                                key={el.symbol}
                                symbol={el.symbol}
                                color={el.color}
                                valence={el.valence}
                                isSelected={selectedPalette === el.symbol}
                                onClick={() => setSelectedPalette(el.symbol)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={canvasRef}
                    className="absolute inset-0 cursor-crosshair"
                    onClick={handleCanvasClick}
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                    }}
                >
                    {/* Bonds SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {bonds.map(bond => {
                            const from = atoms.find(a => a.id === bond.from);
                            const to = atoms.find(a => a.id === bond.to);
                            if (!from || !to) return null;
                            return (
                                <g key={bond.id}>
                                    {/* Glow effect */}
                                    <line
                                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                        stroke="rgba(100,200,255,0.3)"
                                        strokeWidth={8}
                                        strokeLinecap="round"
                                    />
                                    {/* Main line */}
                                    <line
                                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                        stroke="rgba(255,255,255,0.9)"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Atoms */}
                    <AnimatePresence>
                        {atoms.map(atom => (
                            <CanvasAtom
                                key={atom.id}
                                atom={atom}
                                isSelected={selectedAtom === atom.id}
                                isValidBonds={atom.bonds === atom.maxBonds}
                                onClick={() => handleAtomClick(atom.id)}
                                onDrag={(x, y) => moveAtom(atom.id, x, y)}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty state */}
                    {atoms.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-slate-500">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                                    <Plus className="w-10 h-10 opacity-50" />
                                </div>
                                <p className="text-sm sm:text-lg font-medium text-center">Click anywhere to add atoms</p>
                                <p className="text-xs sm:text-sm opacity-60 mt-1 text-center">Then click two atoms to create a bond</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action bar for selected atom */}
                <AnimatePresence>
                    {selectedAtom && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur px-3 sm:px-5 py-2 sm:py-3 rounded-xl border border-white/10 flex items-center gap-2 sm:gap-4 shadow-2xl max-w-[90%]"
                        >
                            <span className="text-xs sm:text-sm text-slate-300 hidden sm:inline">Click another atom to bond</span>
                            <button
                                onClick={() => deleteAtom(selectedAtom)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedAtom(null)}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-600" />
                        {atoms.length} atoms
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-1 rounded bg-slate-600" />
                        {bonds.length} bonds
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-300"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={saveMolecule}
                        disabled={!isValid}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all",
                            isValid
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        Save Molecule
                    </button>
                </div>
            </div>
        </div>
    );
});
