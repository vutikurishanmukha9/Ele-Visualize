import { useState, useRef, useMemo, memo, useEffect } from 'react';
import { Atom, Zap, Trash2, Check, AlertTriangle, X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Plus, Sparkles, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

interface MoleculeBuilderProps {
    onClose?: () => void;
}

interface PlacedAtom {
    id: string;
    symbol: string;
    x: number;
    y: number;
    bonds: number;
    maxBonds: number;
    color: string;
}

interface Bond {
    id: string;
    from: string;
    to: string;
    order: number; // 1 = single, 2 = double, 3 = triple
}

const VALENCE: Record<string, number> = {
    H: 1, C: 4, N: 3, O: 2, F: 1, P: 5, S: 6, Cl: 1, Br: 1, I: 1, Na: 1, Mg: 2,
};

const ATOMIC_MASSES: Record<string, number> = {
    H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Na: 22.990, Mg: 24.305, P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.904
};

// Standard IUPAC / CPK Color Palette
const ELEMENT_COLORS: Record<string, string> = {
    H: '#f8fafc',
    C: '#1e293b',
    N: '#2563eb',
    O: '#dc2626',
    F: '#10b981',
    P: '#ea580c',
    S: '#ca8a04',
    Cl: '#16a34a',
    Br: '#9a3412',
    I: '#7c3aed',
    Na: '#9333ea',
    Mg: '#475569',
};

interface MoleculeTemplate {
    name: string;
    formula: string;
    description: string;
    atoms: { symbol: string; x: number; y: number }[];
    bonds: [number, number, number?][]; // [fromIdx, toIdx, order]
}

const EXTENDED_TEMPLATES: MoleculeTemplate[] = [
    {
        name: 'Water',
        formula: 'H₂O',
        description: 'Universal polar solvent with 104.5° bent geometry',
        atoms: [{ symbol: 'O', x: 260, y: 160 }, { symbol: 'H', x: 190, y: 220 }, { symbol: 'H', x: 330, y: 220 }],
        bonds: [[0, 1, 1], [0, 2, 1]],
    },
    {
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        description: 'Linear greenhouse gas with double covalent bonds',
        atoms: [{ symbol: 'C', x: 260, y: 160 }, { symbol: 'O', x: 150, y: 160 }, { symbol: 'O', x: 370, y: 160 }],
        bonds: [[0, 1, 2], [0, 2, 2]],
    },
    {
        name: 'Methane',
        formula: 'CH₄',
        description: 'Tetrahedral hydrocarbon with sp³ hybridization',
        atoms: [
            { symbol: 'C', x: 260, y: 160 },
            { symbol: 'H', x: 260, y: 80 },
            { symbol: 'H', x: 340, y: 160 },
            { symbol: 'H', x: 260, y: 240 },
            { symbol: 'H', x: 180, y: 160 }
        ],
        bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    },
    {
        name: 'Ammonia',
        formula: 'NH₃',
        description: 'Trigonal pyramidal geometry with lone pair',
        atoms: [
            { symbol: 'N', x: 260, y: 150 },
            { symbol: 'H', x: 190, y: 210 },
            { symbol: 'H', x: 330, y: 210 },
            { symbol: 'H', x: 260, y: 80 }
        ],
        bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    },
    {
        name: 'Ethanol',
        formula: 'C₂H₅OH',
        description: 'Primary alcohol with hydroxyl functional group',
        atoms: [
            { symbol: 'C', x: 190, y: 160 },
            { symbol: 'C', x: 270, y: 160 },
            { symbol: 'O', x: 350, y: 160 },
            { symbol: 'H', x: 410, y: 160 },
            { symbol: 'H', x: 190, y: 100 },
            { symbol: 'H', x: 190, y: 220 },
            { symbol: 'H', x: 130, y: 160 },
            { symbol: 'H', x: 270, y: 100 },
            { symbol: 'H', x: 270, y: 220 }
        ],
        bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1]],
    },
    {
        name: 'Benzene',
        formula: 'C₆H₆',
        description: 'Aromatic hexagonal planar ring with delocalized pi-electrons',
        atoms: [
            { symbol: 'C', x: 230, y: 100 },
            { symbol: 'C', x: 290, y: 100 },
            { symbol: 'C', x: 320, y: 155 },
            { symbol: 'C', x: 290, y: 210 },
            { symbol: 'C', x: 230, y: 210 },
            { symbol: 'C', x: 200, y: 155 },
            { symbol: 'H', x: 210, y: 55 },
            { symbol: 'H', x: 310, y: 55 },
            { symbol: 'H', x: 365, y: 155 },
            { symbol: 'H', x: 310, y: 255 },
            { symbol: 'H', x: 210, y: 255 },
            { symbol: 'H', x: 155, y: 155 },
        ],
        bonds: [
            [0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1],
            [0, 6, 1], [1, 7, 1], [2, 8, 1], [3, 9, 1], [4, 10, 1], [5, 11, 1]
        ],
    },
    {
        name: 'Formaldehyde',
        formula: 'CH₂O',
        description: 'Planar carbonyl compound with C=O double bond',
        atoms: [
            { symbol: 'C', x: 260, y: 160 },
            { symbol: 'O', x: 260, y: 80 },
            { symbol: 'H', x: 190, y: 210 },
            { symbol: 'H', x: 330, y: 210 },
        ],
        bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1]],
    },
    {
        name: 'Acetylene',
        formula: 'C₂H₂',
        description: 'Linear alkyne with a carbon-carbon triple bond',
        atoms: [
            { symbol: 'C', x: 220, y: 160 },
            { symbol: 'C', x: 300, y: 160 },
            { symbol: 'H', x: 140, y: 160 },
            { symbol: 'H', x: 380, y: 160 },
        ],
        bonds: [[0, 1, 3], [0, 2, 1], [1, 3, 1]],
    },
    {
        name: 'Hydrogen Peroxide',
        formula: 'H₂O₂',
        description: 'Non-planar peroxide with single O-O covalent link',
        atoms: [
            { symbol: 'O', x: 220, y: 160 },
            { symbol: 'O', x: 300, y: 160 },
            { symbol: 'H', x: 170, y: 210 },
            { symbol: 'H', x: 350, y: 110 },
        ],
        bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 1]],
    },
    {
        name: 'Propane',
        formula: 'C₃H₈',
        description: 'Three-carbon alkane fuel gas',
        atoms: [
            { symbol: 'C', x: 180, y: 160 },
            { symbol: 'C', x: 260, y: 160 },
            { symbol: 'C', x: 340, y: 160 },
            { symbol: 'H', x: 120, y: 160 },
            { symbol: 'H', x: 180, y: 100 },
            { symbol: 'H', x: 180, y: 220 },
            { symbol: 'H', x: 260, y: 100 },
            { symbol: 'H', x: 260, y: 220 },
            { symbol: 'H', x: 340, y: 100 },
            { symbol: 'H', x: 340, y: 220 },
            { symbol: 'H', x: 400, y: 160 },
        ],
        bonds: [
            [0, 1, 1], [1, 2, 1],
            [0, 3, 1], [0, 4, 1], [0, 5, 1],
            [1, 6, 1], [1, 7, 1],
            [2, 8, 1], [2, 9, 1], [2, 10, 1]
        ],
    },
];

function CameraZoomHandler({ zoomAction }: { zoomAction: { type: 'in' | 'out' | 'reset'; ts: number } | null }) {
    const { camera } = useThree();
    const controlsRef = useRef<OrbitControlsImpl>(null);

    useEffect(() => {
        if (!zoomAction) return;
        if (zoomAction.type === 'in') {
            camera.position.multiplyScalar(0.82);
        } else if (zoomAction.type === 'out') {
            camera.position.multiplyScalar(1.22);
        } else if (zoomAction.type === 'reset') {
            camera.position.set(0, 0, 8.5);
            controlsRef.current?.reset();
        }
    }, [camera, zoomAction]);

    return (
        <OrbitControls
            ref={controlsRef}
            enableZoom={true}
            enablePan={true}
            minDistance={2}
            maxDistance={18}
            autoRotate
            autoRotateSpeed={1.4}
        />
    );
}

// Live 3D Viewport of Synthesized Molecule
const LiveMolecule3D = memo(function LiveMolecule3D({
    atoms,
    bonds,
}: {
    atoms: PlacedAtom[];
    bonds: Bond[];
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [zoomAction, setZoomAction] = useState<{ type: 'in' | 'out' | 'reset'; ts: number } | null>(null);

    return (
        <div className={cn(
            "w-full rounded-lg bg-slate-900/[0.03] border border-slate-200/80 overflow-hidden relative select-none transition-all shadow-xs",
            isExpanded ? "h-80" : "h-52"
        )}>
            <Canvas camera={{ position: [0, 0, 8.5], fov: 42 }}>
                <ambientLight intensity={0.9} color="#f8fafc" />
                <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
                <directionalLight position={[-10, -10, -10]} intensity={0.7} color="#38bdf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.5} color="#f59e0b" />

                {/* 3D Atoms */}
                {atoms.map((atom, idx) => {
                    const cx = (atom.x - 260) * 0.022;
                    const cy = -(atom.y - 160) * 0.022;
                    const cz = (idx % 2 === 0 ? 0.3 : -0.3);
                    const color = ELEMENT_COLORS[atom.symbol] || '#0071e3';
                    const radius = atom.symbol === 'H' ? 0.28 : 0.46;

                    return (
                        <group key={atom.id} position={[cx, cy, cz]}>
                            <Sphere args={[radius, 24, 24]}>
                                <meshPhysicalMaterial
                                    color={color}
                                    emissive={color}
                                    emissiveIntensity={0.25}
                                    roughness={0.15}
                                    metalness={0.2}
                                    clearcoat={1.0}
                                />
                            </Sphere>
                            <Html center distanceFactor={4.5} occlude>
                                <div className="font-mono font-bold text-white text-[8.5px] pointer-events-none select-none drop-shadow-sm">
                                    {atom.symbol}
                                </div>
                            </Html>
                        </group>
                    );
                })}

                {/* 3D Bonds (Single, Double, Triple) */}
                {bonds.map((bond) => {
                    const a1 = atoms.find((a) => a.id === bond.from);
                    const a2 = atoms.find((a) => a.id === bond.to);
                    if (!a1 || !a2) return null;

                    const p1 = new THREE.Vector3((a1.x - 260) * 0.022, -(a1.y - 160) * 0.022, 0);
                    const p2 = new THREE.Vector3((a2.x - 260) * 0.022, -(a2.y - 160) * 0.022, 0);
                    const mid = p1.clone().add(p2).multiplyScalar(0.5);
                    const length = p1.distanceTo(p2);
                    const rotAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;

                    return (
                        <group key={bond.id} position={mid} rotation={[0, 0, rotAngle]}>
                            {bond.order === 1 && (
                                <Cylinder args={[0.06, 0.06, length, 16]}>
                                    <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                </Cylinder>
                            )}
                            {bond.order === 2 && (
                                <group>
                                    <Cylinder args={[0.045, 0.045, length, 16]} position={[-0.07, 0, 0]}>
                                        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.045, 0.045, length, 16]} position={[0.07, 0, 0]}>
                                        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                </group>
                            )}
                            {bond.order >= 3 && (
                                <group>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[-0.1, 0, 0]}>
                                        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[0, 0, 0]}>
                                        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[0.1, 0, 0]}>
                                        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                </group>
                            )}
                        </group>
                    );
                })}

                <CameraZoomHandler zoomAction={zoomAction} />
            </Canvas>

            {/* Top Left: 3D Studio HUD */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200/80 text-[10px] font-mono text-slate-800 font-bold backdrop-blur-md shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
                <span>3D Ball & Stick Preview</span>
            </div>

            {/* Top Right: Zoom & Navigation Controls */}
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/95 border border-slate-200/80 p-0.5 rounded-md backdrop-blur-md shadow-xs">
                <button
                    onClick={() => setZoomAction({ type: 'in', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'out', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Reset Camera View"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
                <div className="h-3 w-px bg-slate-200 mx-0.5" />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title={isExpanded ? "Collapse 3D Preview" : "Expand 3D Preview"}
                >
                    {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
            </div>
        </div>
    );
});

export const MoleculeBuilder = memo(function MoleculeBuilder({ onClose }: MoleculeBuilderProps) {
    const [atoms, setAtoms] = useState<PlacedAtom[]>([]);
    const [bonds, setBonds] = useState<Bond[]>([]);
    const [selectedPaletteAtom, setSelectedPaletteAtom] = useState<string>('C');
    const [selectedCanvasAtom, setSelectedCanvasAtom] = useState<string | null>(null);
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);

    // Molar Mass and Formula Computation
    const { chemicalFormula, molarMass, massBreakdown, totalAtomCount } = useMemo(() => {
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
            totalAtomCount: atoms.length,
            massBreakdown: keys.map((sym) => ({
                symbol: sym,
                mass: ((ATOMIC_MASSES[sym] || 12) * counts[sym]).toFixed(1),
                pct: totalMass > 0 ? (((ATOMIC_MASSES[sym] || 12) * counts[sym] / totalMass) * 100).toFixed(1) : '0',
            })),
        };
    }, [atoms]);

    // VSEPR Geometry Prediction
    const vseprGeometry = useMemo(() => {
        if (atoms.length < 2) return { shape: 'Atomic Monomer', angle: 'N/A', hybridization: 's', geometryType: 'Single Node' };
        if (atoms.length === 2) return { shape: 'Linear Diatomic', angle: '180°', hybridization: 'sp', geometryType: 'AX₁' };
        if (atoms.length === 3) {
            const hasBent = atoms.some(a => a.symbol === 'O' || a.symbol === 'S');
            return {
                shape: hasBent ? 'Bent (Angular)' : 'Linear Triatomic',
                angle: hasBent ? '104.5°' : '180°',
                hybridization: hasBent ? 'sp³' : 'sp',
                geometryType: hasBent ? 'AX₂E₂' : 'AX₂'
            };
        }
        if (atoms.length === 4) return { shape: 'Trigonal Pyramidal', angle: '107.0°', hybridization: 'sp³', geometryType: 'AX₃E' };
        if (atoms.length === 5) return { shape: 'Tetrahedral', angle: '109.5°', hybridization: 'sp³', geometryType: 'AX₄' };
        return { shape: 'Polyatomic Molecular Network', angle: 'Variable', hybridization: 'sp³ / sp²', geometryType: 'Complex' };
    }, [atoms]);

    // Valence satisfaction validator
    const validation = useMemo(() => {
        if (atoms.length === 0) return { isValid: false, message: 'Canvas is empty. Click canvas to deposit atoms.' };
        const unsatisfied = atoms.filter((a) => a.bonds < a.maxBonds);
        if (unsatisfied.length === 0) {
            return { isValid: true, message: 'All atom valences are fully satisfied (chemically stable molecule).' };
        }
        return {
            isValid: false,
            message: `${unsatisfied.length} atom(s) have unbonded open valence electrons.`,
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
            color: ELEMENT_COLORS[selectedPaletteAtom] || '#0071e3',
        };

        audioEngine.playClick(680);
        setAtoms((prev) => [...prev, newAtom]);
        setActiveTemplate(null);
    };

    // Form or toggle bond between atoms
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

        if (a1 && a2) {
            const existingIdx = bonds.findIndex(
                (b) => (b.from === a1.id && b.to === a2.id) || (b.from === a2.id && b.to === a1.id)
            );

            if (existingIdx >= 0) {
                // Cycle bond order: 1 -> 2 -> 3 -> delete
                const currentOrder = bonds[existingIdx].order;
                if (currentOrder < 3 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
                    setBonds((prev) => prev.map((b, i) => i === existingIdx ? { ...b, order: b.order + 1 } : b));
                    setAtoms((prev) => prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds + 1 } : a)));
                    audioEngine.playBondingChord();
                } else {
                    // Remove bond
                    setBonds((prev) => prev.filter((_, i) => i !== existingIdx));
                    setAtoms((prev) => prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds - currentOrder } : a)));
                    audioEngine.playClick(440);
                }
            } else if (a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
                // Create new bond
                setBonds((prev) => [...prev, { id: `bond-${Date.now()}`, from: a1.id, to: a2.id, order: 1 }]);
                setAtoms((prev) => prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds + 1 } : a)));
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

                if (dist < 120 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
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
    const loadTemplate = (tmpl: MoleculeTemplate) => {
        audioEngine.playBondingChord();
        setActiveTemplate(tmpl.name);
        const placed: PlacedAtom[] = tmpl.atoms.map((a, idx) => ({
            id: `tmpl-${idx}`,
            symbol: a.symbol,
            x: a.x,
            y: a.y,
            bonds: 0,
            maxBonds: VALENCE[a.symbol] || 1,
            color: ELEMENT_COLORS[a.symbol] || '#0071e3',
        }));

        const newBonds: Bond[] = tmpl.bonds.map(([fromIdx, toIdx, order = 1], bIdx) => {
            placed[fromIdx].bonds += order;
            placed[toIdx].bonds += order;
            return {
                id: `bond-${bIdx}`,
                from: placed[fromIdx].id,
                to: placed[toIdx].id,
                order,
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
        setActiveTemplate(null);
        audioEngine.playClick(440);
    };

    return (
        <div className="h-full flex flex-col p-4 gap-3 bg-[#fbfbfd] font-sans text-slate-900 select-none overflow-y-auto">
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
                        <Atom className="w-3.5 h-3.5 text-white" />
                        <span>MOLECULAR SYNTHESIZER & VSEPR STUDIO</span>
                    </div>
                    <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                        Interactive 2D/3D Covalent Geometry Lab
                    </span>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                        title="Close Synthesizer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Quick Templates & Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-lg bg-white border border-slate-200/80 text-xs shadow-xs relative z-30">
                {/* Left: Quick Templates + Full Catalog Dropdown */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold shrink-0">Templates:</span>

                    {/* Quick 4 Direct Access Chips */}
                    <div className="flex items-center gap-1">
                        {EXTENDED_TEMPLATES.slice(0, 4).map((tmpl) => (
                            <button
                                key={tmpl.name}
                                onClick={() => {
                                    loadTemplate(tmpl);
                                    setIsTemplatesOpen(false);
                                }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all border shrink-0",
                                    activeTemplate === tmpl.name
                                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700 hover:text-slate-900"
                                )}
                            >
                                {tmpl.name} <span className="text-[10px] opacity-70">({tmpl.formula})</span>
                            </button>
                        ))}
                    </div>

                    {/* Full Catalog Popover Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                            className={cn(
                                "h-7 px-2.5 rounded-md border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs",
                                isTemplatesOpen
                                    ? "bg-blue-50 border-[#0071e3] text-[#0071e3]"
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900"
                            )}
                        >
                            <span>+{EXTENDED_TEMPLATES.length - 4} More</span>
                            <span className="text-[9px]">▾</span>
                        </button>

                        {/* Elevated Dropdown Menu */}
                        {isTemplatesOpen && (
                            <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-white rounded-lg border border-slate-200 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100 space-y-1">
                                <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-100 mb-1">
                                    Molecular Template Library
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-0.5">
                                    {EXTENDED_TEMPLATES.map((tmpl) => (
                                        <button
                                            key={tmpl.name}
                                            onClick={() => {
                                                loadTemplate(tmpl);
                                                setIsTemplatesOpen(false);
                                            }}
                                            className={cn(
                                                "w-full px-2.5 py-1.5 rounded-md text-left transition-colors flex items-center justify-between text-xs",
                                                activeTemplate === tmpl.name
                                                    ? "bg-blue-50 text-[#0071e3] font-bold"
                                                    : "hover:bg-slate-50 text-slate-700"
                                            )}
                                        >
                                            <div>
                                                <div className="font-semibold text-xs">{tmpl.name}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{tmpl.description}</div>
                                            </div>
                                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                                                {tmpl.formula}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Buttons Group */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={handleAutoBond}
                        className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                        title="Compute and snap covalent bonds automatically"
                    >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Auto-Bond Solver</span>
                    </button>
                    <button
                        onClick={handleClear}
                        className="h-8 px-2.5 rounded-md bg-white hover:bg-rose-50/80 border border-slate-200/80 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                        title="Clear Workspace"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                        <span>Clear</span>
                    </button>
                </div>
            </div>

            {/* Main Stage Grid (Sidebar + 2D Interactive Canvas) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1 min-h-[480px]">
                {/* Left Sidebar: Element Palette + VSEPR Geometry + 3D Preview */}
                <div className="space-y-3 flex flex-col justify-between">
                    {/* Element Palette Matrix */}
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200/80 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 font-display">Element Palette</span>
                            <span className="text-[10px] font-mono text-slate-400">Valence Dots</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 font-mono">
                            {Object.keys(VALENCE).slice(0, 9).map((sym) => {
                                const isSelected = selectedPaletteAtom === sym;
                                const color = ELEMENT_COLORS[sym] || '#0071e3';
                                return (
                                    <button
                                        key={sym}
                                        onClick={() => setSelectedPaletteAtom(sym)}
                                        className={cn(
                                            "p-2 rounded-md flex flex-col items-center justify-center border transition-all text-center",
                                            isSelected
                                                ? "bg-blue-50 border-[#0071e3] ring-1 ring-[#0071e3]/40 shadow-xs"
                                                : "bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-700"
                                        )}
                                    >
                                        <span className="text-sm font-black" style={{ color: isSelected ? '#0071e3' : color }}>{sym}</span>
                                        <span className="text-[8px] text-slate-400 mt-0.5">v: {VALENCE[sym]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* VSEPR Geometry & Telemetry Matrix (Unified Card) */}
                    <div className="rounded-lg bg-white border border-slate-200/80 overflow-hidden shadow-xs text-xs font-mono">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                            <span className="font-bold text-slate-900 uppercase text-[10px]">VSEPR Geometry Analysis</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{vseprGeometry.geometryType}</span>
                        </div>

                        <div className="divide-y divide-slate-100">
                            <div className="p-2.5 flex items-center justify-between">
                                <span className="text-slate-500 text-[11px]">Molecular Shape:</span>
                                <strong className="text-slate-900 font-bold">{vseprGeometry.shape}</strong>
                            </div>
                            <div className="p-2.5 flex items-center justify-between">
                                <span className="text-slate-500 text-[11px]">Bond Angle (θ):</span>
                                <strong className="text-[#0071e3] font-bold">{vseprGeometry.angle}</strong>
                            </div>
                            <div className="p-2.5 flex items-center justify-between">
                                <span className="text-slate-500 text-[11px]">Hybridization:</span>
                                <strong className="text-purple-700 font-bold">{vseprGeometry.hybridization}</strong>
                            </div>
                            <div className="p-2.5 flex items-center justify-between bg-slate-50/50">
                                <span className="text-slate-500 text-[11px]">Molar Mass:</span>
                                <strong className="text-slate-900 font-bold">{molarMass} g/mol</strong>
                            </div>
                        </div>

                        {massBreakdown.length > 0 && (
                            <div className="p-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1">
                                {massBreakdown.map((m) => (
                                    <span key={m.symbol} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-mono text-slate-600">
                                        {m.symbol}: {m.pct}%
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live 3D Miniature Studio */}
                    <LiveMolecule3D atoms={atoms} bonds={bonds} />
                </div>

                {/* Synthesis 2D Interactive Workspace Canvas */}
                <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="lg:col-span-3 rounded-lg bg-white border border-slate-200/80 relative overflow-hidden cursor-crosshair min-h-[420px] shadow-xs flex flex-col justify-between select-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                >
                    {/* SVG Bonds Rendering */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {bonds.map((bond) => {
                            const a1 = atoms.find((a) => a.id === bond.from);
                            const a2 = atoms.find((a) => a.id === bond.to);
                            if (!a1 || !a2) return null;

                            const dx = a2.x - a1.x;
                            const dy = a2.y - a1.y;
                            const dist = Math.hypot(dx, dy) || 1;
                            const offset = 4;
                            const nx = -dy / dist * offset;
                            const ny = dx / dist * offset;

                            if (bond.order === 1) {
                                return (
                                    <line
                                        key={bond.id}
                                        x1={a1.x}
                                        y1={a1.y}
                                        x2={a2.x}
                                        y2={a2.y}
                                        stroke="#475569"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        opacity="0.9"
                                    />
                                );
                            }

                            if (bond.order === 2) {
                                return (
                                    <g key={bond.id}>
                                        <line
                                            x1={a1.x + nx}
                                            y1={a1.y + ny}
                                            x2={a2.x + nx}
                                            y2={a2.y + ny}
                                            stroke="#475569"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            opacity="0.9"
                                        />
                                        <line
                                            x1={a1.x - nx}
                                            y1={a1.y - ny}
                                            x2={a2.x - nx}
                                            y2={a2.y - ny}
                                            stroke="#475569"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            opacity="0.9"
                                        />
                                    </g>
                                );
                            }

                            return (
                                <g key={bond.id}>
                                    <line
                                        x1={a1.x}
                                        y1={a1.y}
                                        x2={a2.x}
                                        y2={a2.y}
                                        stroke="#475569"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        opacity="0.9"
                                    />
                                    <line
                                        x1={a1.x + nx * 1.5}
                                        y1={a1.y + ny * 1.5}
                                        x2={a2.x + nx * 1.5}
                                        y2={a2.y + ny * 1.5}
                                        stroke="#475569"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        opacity="0.9"
                                    />
                                    <line
                                        x1={a1.x - nx * 1.5}
                                        y1={a1.y - ny * 1.5}
                                        x2={a2.x - nx * 1.5}
                                        y2={a2.y - ny * 1.5}
                                        stroke="#475569"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        opacity="0.9"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Placed Atoms Tokens */}
                    {atoms.map((atom) => {
                        const isSelected = selectedCanvasAtom === atom.id;
                        const isSatisfied = atom.bonds === atom.maxBonds;
                        const isOverbonded = atom.bonds > atom.maxBonds;

                        return (
                            <div
                                key={atom.id}
                                onClick={(e) => handleAtomClick(atom.id, e)}
                                className={cn(
                                    "absolute w-11 h-11 -ml-5.5 -mt-5.5 rounded-full flex flex-col items-center justify-center font-extrabold cursor-pointer transition-transform shadow-sm border-2 select-none z-10",
                                    isSelected && "ring-4 ring-[#0071e3] scale-110",
                                    isSatisfied
                                        ? "border-emerald-500"
                                        : isOverbonded
                                        ? "border-rose-500"
                                        : "border-amber-400"
                                )}
                                style={{
                                    left: atom.x,
                                    top: atom.y,
                                    backgroundColor: atom.color,
                                    color: ['H', 'S', 'F', 'Na'].includes(atom.symbol) ? '#0f172a' : '#ffffff',
                                }}
                            >
                                <span className="text-xs font-black leading-none font-mono">{atom.symbol}</span>
                                <span className="text-[7.5px] font-mono leading-none mt-0.5 opacity-80">
                                    {atom.bonds}/{atom.maxBonds}
                                </span>
                            </div>
                        );
                    })}

                    {/* Top Canvas Instruction Guide */}
                    <div className="p-3 text-[11px] font-mono text-slate-400 pointer-events-none flex items-center justify-between">
                        <span>Click empty canvas to deposit atom • Click two atoms sequentially to form/cycle covalent bond</span>
                        <span className="hidden sm:inline text-[10px] text-slate-400">Total Atoms: {totalAtomCount}</span>
                    </div>

                    {/* Bottom Status Deck */}
                    <div className="m-3 p-3 rounded-lg bg-white/95 border border-slate-200/80 backdrop-blur-md text-xs shadow-sm flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 font-mono">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Molecular Formula:</span>
                            <span className="font-bold text-slate-900 text-sm font-mono">{chemicalFormula}</span>
                            <span className="text-slate-400 text-xs font-mono">({molarMass} g/mol)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {validation.isValid ? (
                                <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] font-mono">
                                    <Check className="w-3.5 h-3.5" />
                                    {validation.message}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-700 font-bold text-[11px] font-mono">
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
