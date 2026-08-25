import { useState, useRef, useMemo, memo } from 'react';
import { Atom, Wand2, Trash2, Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

interface MoleculeBuilderProps {
    onClose?: () => void;
}

interface PlacedAtom {
    id: string;
    symbol: string;
    x: number;
    y: number;
    z?: number;
    bonds: number;
    maxBonds: number;
    color: string;
}

interface Bond {
    id: string;
    from: string;
    to: string;
    order: number;
}

const VALENCE: Record<string, number> = {
    H: 1, C: 4, N: 3, O: 2, F: 1, P: 5, S: 6, Cl: 1, Br: 1, I: 1, Na: 1, Mg: 2,
};

const ATOMIC_MASSES: Record<string, number> = {
    H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Na: 22.990, Mg: 24.305, P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.904
};

const ELEMENT_COLORS: Record<string, string> = {
    H: '#f8fafc', C: '#334155', N: '#3b82f6', O: '#ef4444', F: '#10b981',
    P: '#f97316', S: '#eab308', Cl: '#22c55e', Br: '#854d0e', I: '#7c3aed',
    Na: '#a855f7', Mg: '#64748b'
};

const TEMPLATES: { name: string; formula: string; atoms: { symbol: string; x: number; y: number }[]; bonds: [number, number][] }[] = [
    {
        name: 'Water',
        formula: 'H₂O',
        atoms: [{ symbol: 'O', x: 200, y: 150 }, { symbol: 'H', x: 140, y: 200 }, { symbol: 'H', x: 260, y: 200 }],
        bonds: [[0, 1], [0, 2]],
    },
    {
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        atoms: [{ symbol: 'C', x: 200, y: 150 }, { symbol: 'O', x: 110, y: 150 }, { symbol: 'O', x: 290, y: 150 }],
        bonds: [[0, 1], [0, 2]],
    },
    {
        name: 'Methane',
        formula: 'CH₄',
        atoms: [{ symbol: 'C', x: 200, y: 150 }, { symbol: 'H', x: 200, y: 70 }, { symbol: 'H', x: 280, y: 150 }, { symbol: 'H', x: 200, y: 230 }, { symbol: 'H', x: 120, y: 150 }],
        bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
    },
    {
        name: 'Ammonia',
        formula: 'NH₃',
        atoms: [{ symbol: 'N', x: 200, y: 140 }, { symbol: 'H', x: 130, y: 190 }, { symbol: 'H', x: 270, y: 190 }, { symbol: 'H', x: 200, y: 70 }],
        bonds: [[0, 1], [0, 2], [0, 3]],
    },
    {
        name: 'Ethanol',
        formula: 'C₂H₅OH',
        atoms: [
            { symbol: 'C', x: 140, y: 150 }, { symbol: 'C', x: 220, y: 150 }, { symbol: 'O', x: 290, y: 150 },
            { symbol: 'H', x: 340, y: 150 }, { symbol: 'H', x: 140, y: 90 }, { symbol: 'H', x: 140, y: 210 },
            { symbol: 'H', x: 80, y: 150 }, { symbol: 'H', x: 220, y: 90 }, { symbol: 'H', x: 220, y: 210 }
        ],
        bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]],
    },
    {
        name: 'Benzene Ring',
        formula: 'C₆H₆',
        atoms: [
            { symbol: 'C', x: 170, y: 90 }, { symbol: 'C', x: 230, y: 90 }, { symbol: 'C', x: 260, y: 145 },
            { symbol: 'C', x: 230, y: 200 }, { symbol: 'C', x: 170, y: 200 }, { symbol: 'C', x: 140, y: 145 },
        ],
        bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    },
];

// Live 3D Viewport of Synthesized Molecule
const LiveMolecule3D = memo(function LiveMolecule3D({
    atoms,
    bonds,
}: {
    atoms: PlacedAtom[];
    bonds: Bond[];
}) {
    return (
        <div className="w-full h-44 rounded-xl bg-slate-100/90 border border-slate-200 overflow-hidden relative shadow-inner">
            <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
                <ambientLight intensity={0.9} color="#f8fafc" />
                <directionalLight position={[10, 10, 10]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-10, -10, -10]} intensity={0.8} color="#38bdf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.6} color="#f59e0b" />
                <OrbitControls autoRotate autoRotateSpeed={1.8} />

                {/* 3D Atoms */}
                {atoms.map((atom, idx) => {
                    const cx = (atom.x - 200) * 0.022;
                    const cy = -(atom.y - 150) * 0.022;
                    const cz = (idx % 2 === 0 ? 0.3 : -0.3);
                    const color = ELEMENT_COLORS[atom.symbol] || '#0284c7';
                    const radius = atom.symbol === 'H' ? 0.28 : 0.48;

                    return (
                        <group key={atom.id} position={[cx, cy, cz]}>
                            <Sphere args={[radius, 24, 24]}>
                                <meshPhysicalMaterial
                                    color={color}
                                    emissive={color}
                                    emissiveIntensity={0.35}
                                    roughness={0.06}
                                    metalness={0.25}
                                    transmission={0.6}
                                    ior={1.75}
                                    thickness={0.8}
                                    clearcoat={1.0}
                                />
                            </Sphere>
                        </group>
                    );
                })}

                {/* 3D Bonds */}
                {bonds.map((bond) => {
                    const a1 = atoms.find((a) => a.id === bond.from);
                    const a2 = atoms.find((a) => a.id === bond.to);
                    if (!a1 || !a2) return null;

                    const p1 = new THREE.Vector3((a1.x - 200) * 0.022, -(a1.y - 150) * 0.022, 0);
                    const p2 = new THREE.Vector3((a2.x - 200) * 0.022, -(a2.y - 150) * 0.022, 0);
                    const mid = p1.clone().add(p2).multiplyScalar(0.5);
                    const length = p1.distanceTo(p2);

                    return (
                        <group key={bond.id} position={mid}>
                            <Cylinder args={[0.06, 0.06, length, 16]} rotation={[0, 0, Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2]}>
                                <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} />
                            </Cylinder>
                        </group>
                    );
                })}
            </Canvas>
            <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[9px] font-mono text-slate-800 font-bold backdrop-blur-xs shadow-2xs">
                Real-time 3D Ball & Stick Preview
            </div>
        </div>
    );
});

export const MoleculeBuilder = memo(function MoleculeBuilder({ onClose }: MoleculeBuilderProps) {
    const [atoms, setAtoms] = useState<PlacedAtom[]>([]);
    const [bonds, setBonds] = useState<Bond[]>([]);
    const [selectedPaletteAtom, setSelectedPaletteAtom] = useState<string>('C');
    const [selectedCanvasAtom, setSelectedCanvasAtom] = useState<string | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    // Molar Mass and Formula Computation
    const { chemicalFormula, molarMass, massBreakdown } = useMemo(() => {
        const counts: Record<string, number> = {};
        atoms.forEach((a) => {
            counts[a.symbol] = (counts[a.symbol] || 0) + 1;
        });

        // Hill System sorting: C first, then H, then alphabetical
        const keys = Object.keys(counts).sort((a, b) => {
            if (a === 'C') return -1;
            if (b === 'C') return 1;
            if (a === 'H') return -1;
            if (b === 'H') return 1;
            return a.localeCompare(b);
        });

        let totalMass = 0;
        keys.forEach((sym) => {
            totalMass += (ATOMIC_MASSES[sym] || 12) * counts[sym];
        });

        const formula = keys.map((k) => `${k}${counts[k] > 1 ? counts[k] : ''}`).join('') || 'Empty';
        return {
            chemicalFormula: formula,
            molarMass: totalMass.toFixed(2),
            massBreakdown: keys.map((sym) => ({
                symbol: sym,
                mass: ((ATOMIC_MASSES[sym] || 12) * counts[sym]).toFixed(1),
                pct: totalMass > 0 ? (((ATOMIC_MASSES[sym] || 12) * counts[sym] / totalMass) * 100).toFixed(1) : '0',
            })),
        };
    }, [atoms]);

    // VSEPR Geometry Prediction
    const vseprGeometry = useMemo(() => {
        if (atoms.length < 2) return { shape: 'Atomic Monomer', angle: 'N/A', hybridization: 's' };
        if (atoms.length === 2) return { shape: 'Linear', angle: '180°', hybridization: 'sp' };
        if (atoms.length === 3) {
            const hasBent = atoms.some(a => a.symbol === 'O' || a.symbol === 'S');
            return { shape: hasBent ? 'Bent' : 'Linear', angle: hasBent ? '104.5°' : '180°', hybridization: hasBent ? 'sp³' : 'sp' };
        }
        if (atoms.length === 4) return { shape: 'Trigonal Pyramidal', angle: '107°', hybridization: 'sp³' };
        if (atoms.length === 5) return { shape: 'Tetrahedral', angle: '109.5°', hybridization: 'sp³' };
        return { shape: 'Complex Polyatomic Structure', angle: 'Variable', hybridization: 'sp³d²' };
    }, [atoms]);

    // Valence satisfaction validator
    const validation = useMemo(() => {
        if (atoms.length === 0) return { isValid: false, message: 'Canvas is empty.' };
        const unsatisfied = atoms.filter((a) => a.bonds < a.maxBonds);
        if (unsatisfied.length === 0) {
            return { isValid: true, message: 'All atom valences are fully satisfied (chemically stable).' };
        }
        return {
            isValid: false,
            message: `${unsatisfied.length} atom(s) have unbonded valence electrons.`,
        };
    }, [atoms]);

    // Add atom on canvas click
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        const newAtom: PlacedAtom = {
            id: `atom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            symbol: selectedPaletteAtom,
            x,
            y,
            bonds: 0,
            maxBonds: VALENCE[selectedPaletteAtom] || 1,
            color: ELEMENT_COLORS[selectedPaletteAtom] || '#0284c7',
        };

        audioEngine.playClick(680);
        setAtoms((prev) => [...prev, newAtom]);
    };

    // Form bond between atoms
    const handleAtomClick = (atomId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!selectedCanvasAtom) {
            setSelectedCanvasAtom(atomId);
            audioEngine.playClick(800);
            return;
        }

        if (selectedCanvasAtom === atomId) {
            setSelectedCanvasAtom(null);
            return;
        }

        const a1 = atoms.find((a) => a.id === selectedCanvasAtom);
        const a2 = atoms.find((a) => a.id === atomId);

        if (a1 && a2 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
            const existing = bonds.find(
                (b) => (b.from === a1.id && b.to === a2.id) || (b.from === a2.id && b.to === a1.id)
            );

            if (!existing) {
                setBonds((prev) => [...prev, { id: `bond-${Date.now()}`, from: a1.id, to: a2.id, order: 1 }]);
                setAtoms((prev) =>
                    prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds + 1 } : a))
                );
                audioEngine.playBondingChord();
            }
        }

        setSelectedCanvasAtom(null);
    };

    // Euclidean auto-bond solver
    const handleAutoBond = () => {
        audioEngine.playBondingChord();
        const newBonds: Bond[] = [...bonds];
        const updatedAtoms = [...atoms];

        for (let i = 0; i < updatedAtoms.length; i++) {
            for (let j = i + 1; j < updatedAtoms.length; j++) {
                const a1 = updatedAtoms[i];
                const a2 = updatedAtoms[j];
                const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);

                if (dist < 110 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
                    const exists = newBonds.some(
                        (b) => (b.from === a1.id && b.to === a2.id) || (b.from === a2.id && b.to === a1.id)
                    );
                    if (!exists) {
                        newBonds.push({ id: `bond-${Date.now()}-${i}-${j}`, from: a1.id, to: a2.id, order: 1 });
                        a1.bonds += 1;
                        a2.bonds += 1;
                    }
                }
            }
        }

        setBonds(newBonds);
        setAtoms(updatedAtoms);
    };

    // Load Molecule Template
    const loadTemplate = (tmpl: (typeof TEMPLATES)[0]) => {
        audioEngine.playBondingChord();
        const placed: PlacedAtom[] = tmpl.atoms.map((a, idx) => ({
            id: `tmpl-${idx}`,
            symbol: a.symbol,
            x: a.x,
            y: a.y,
            bonds: 0,
            maxBonds: VALENCE[a.symbol] || 1,
            color: ELEMENT_COLORS[a.symbol] || '#0284c7',
        }));

        const newBonds: Bond[] = tmpl.bonds.map(([fromIdx, toIdx], bIdx) => {
            placed[fromIdx].bonds += 1;
            placed[toIdx].bonds += 1;
            return {
                id: `bond-${bIdx}`,
                from: placed[fromIdx].id,
                to: placed[toIdx].id,
                order: 1,
            };
        });

        setAtoms(placed);
        setBonds(newBonds);
        setSelectedCanvasAtom(null);
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
                        INTERACTIVE 2D/3D MOLECULAR SYNTHESIZER & VSEPR STUDIO
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
                <div className="flex items-center gap-2 flex-wrap">
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
                {/* Palette & VSEPR Sidebar */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm flex flex-col justify-between">
                    <div className="space-y-3">
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

                        {/* VSEPR Geometry Telemetry */}
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[10px]">
                            <span className="font-bold text-slate-900 uppercase block">VSEPR Geometry:</span>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Molecular Shape:</span>
                                <strong className="text-emerald-700">{vseprGeometry.shape}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Bond Angle:</span>
                                <strong className="text-sky-700">{vseprGeometry.angle}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Hybridization:</span>
                                <strong className="text-purple-700">{vseprGeometry.hybridization}</strong>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1">
                                <span className="text-slate-500">Molar Mass:</span>
                                <strong className="text-slate-900">{molarMass} g/mol</strong>
                            </div>
                            {massBreakdown.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {massBreakdown.map((m) => (
                                        <span key={m.symbol} className="px-1.5 py-0.5 rounded bg-slate-100 text-[8.5px] font-mono text-slate-600">
                                            {m.symbol}: {m.pct}%
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live 3D Miniature Studio */}
                    <LiveMolecule3D atoms={atoms} bonds={bonds} />
                </div>

                {/* Synthesis 2D Interactive Canvas */}
                <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="lg:col-span-3 rounded-xl bg-slate-100/90 border border-slate-300 relative overflow-hidden cursor-crosshair min-h-[380px] shadow-inner flex flex-col justify-between"
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

                    <div className="p-3 text-[10px] text-slate-400 pointer-events-none">
                        Click empty space to deposit atom • Click two atoms sequentially to form a covalent bond
                    </div>

                    {/* Bottom Status Overlay */}
                    <div className="m-3 p-2.5 rounded-lg bg-white/95 border border-slate-200 backdrop-blur-md text-xs shadow-md flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase">Formula:</span>
                            <span className="font-bold text-emerald-700 text-sm">{chemicalFormula}</span>
                            <span className="text-slate-400">({molarMass} g/mol)</span>
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
