import { useState, useRef, useMemo, memo, useEffect } from 'react';
import { Atom, Trash2, Check, AlertTriangle, X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Plus, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { getElementPalette, ELEMENT_PALETTES } from '@/data/elements';

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

// Standard IUPAC / CPK Color Palette from Central Chemical Authority
const ELEMENT_COLORS: Record<string, string> = {
    H: '#f8fafc',
    C: '#334155',
    N: '#3b82f6',
    O: '#ef4444',
    F: '#10b981',
    P: '#f97316',
    S: '#eab308',
    Cl: '#22c55e',
    Br: '#b91c1c',
    I: '#9333ea',
    Na: '#f59e0b',
    Mg: '#cbd5e1',
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
            "w-full rounded-lg bg-[#0a0c12] border border-[var(--color-hairline)] overflow-hidden relative select-none transition-all",
            isExpanded ? "h-80" : "h-52"
        )}>
            <Canvas camera={{ position: [0, 0, 8.5], fov: 42 }}>
                <ambientLight intensity={0.7} color="#ffffff" />
                <directionalLight position={[10, 10, 10]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-10, -10, -10]} intensity={0.8} color="#818cf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.5} color="#f59e0b" />

                {/* 3D Atoms */}
                {atoms.map((atom, idx) => {
                    const cx = (atom.x - 260) * 0.022;
                    const cy = -(atom.y - 160) * 0.022;
                    const cz = (idx % 2 === 0 ? 0.3 : -0.3);
                    const color = ELEMENT_COLORS[atom.symbol] || '#5e6ad2';
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
                                    <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                </Cylinder>
                            )}
                            {bond.order === 2 && (
                                <group>
                                    <Cylinder args={[0.045, 0.045, length, 16]} position={[-0.07, 0, 0]}>
                                        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.045, 0.045, length, 16]} position={[0.07, 0, 0]}>
                                        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                </group>
                            )}
                            {bond.order >= 3 && (
                                <group>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[-0.1, 0, 0]}>
                                        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[0, 0, 0]}>
                                        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                    <Cylinder args={[0.04, 0.04, length, 16]} position={[0.1, 0, 0]}>
                                        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
                                    </Cylinder>
                                </group>
                            )}
                        </group>
                    );
                })}

                <CameraZoomHandler zoomAction={zoomAction} />
            </Canvas>

            {/* Top Left: 3D Studio HUD */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[var(--color-surface-1)]/90 border border-[var(--color-hairline)] text-[10px] font-mono text-[var(--color-ink)] font-bold backdrop-blur-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                <span>3D Ball & Stick Preview</span>
            </div>

            {/* Top Right: Zoom & Navigation Controls */}
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-[var(--color-surface-1)]/90 border border-[var(--color-hairline)] p-0.5 rounded backdrop-blur-md">
                <button
                    onClick={() => setZoomAction({ type: 'in', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'out', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Reset Camera View"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
                <div className="h-3 w-px bg-[var(--color-hairline)] mx-0.5" />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
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

    // Canvas Drag and Interactive States
    const [draggingAtomId, setDraggingAtomId] = useState<string | null>(null);
    const [hasDragged, setHasDragged] = useState(false);
    const dragOriginRef = useRef<{ clientX: number; clientY: number; atomX: number; atomY: number } | null>(null);
    const [hoveredBondId, setHoveredBondId] = useState<string | null>(null);

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
        const palette = getElementPalette(selectedPaletteAtom);

        const newAtom: PlacedAtom = {
            id: `atom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            symbol: selectedPaletteAtom,
            x,
            y,
            bonds: 0,
            maxBonds: VALENCE[selectedPaletteAtom] || 1,
            color: palette.primary,
        };

        audioEngine.playClick(680);
        setAtoms((prev) => [...prev, newAtom]);
        setActiveTemplate(null);
    };

    // Atom Drag and Selection Handling
    const handleAtomMouseDown = (atomId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const atom = atoms.find((a) => a.id === atomId);
        if (!atom) return;
        setDraggingAtomId(atomId);
        setHasDragged(false);
        dragOriginRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            atomX: atom.x,
            atomY: atom.y,
        };
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!draggingAtomId || !dragOriginRef.current || !canvasRef.current) return;
        const dx = e.clientX - dragOriginRef.current.clientX;
        const dy = e.clientY - dragOriginRef.current.clientY;
        if (Math.hypot(dx, dy) > 4) {
            setHasDragged(true);
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(30, Math.min(rect.width - 30, Math.round(dragOriginRef.current.atomX + dx)));
        const newY = Math.max(30, Math.min(rect.height - 30, Math.round(dragOriginRef.current.atomY + dy)));
        setAtoms((prev) => prev.map((a) => (a.id === draggingAtomId ? { ...a, x: newX, y: newY } : a)));
    };

    const handleCanvasMouseUp = () => {
        setDraggingAtomId(null);
        dragOriginRef.current = null;
    };

    const handleAtomMouseUp = (atomId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasDragged) {
            handleAtomClick(atomId, e);
        }
        setDraggingAtomId(null);
        dragOriginRef.current = null;
    };

    // Cycle bond order on direct bond click
    const handleBondClick = (bondId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const existingIdx = bonds.findIndex((b) => b.id === bondId);
        if (existingIdx === -1) return;
        const bond = bonds[existingIdx];
        const a1 = atoms.find((a) => a.id === bond.from);
        const a2 = atoms.find((a) => a.id === bond.to);
        if (!a1 || !a2) return;

        if (bond.order < 3 && a1.bonds < a1.maxBonds && a2.bonds < a2.maxBonds) {
            setBonds((prev) => prev.map((b, i) => i === existingIdx ? { ...b, order: b.order + 1 } : b));
            setAtoms((prev) => prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds + 1 } : a)));
            audioEngine.playBondingChord();
        } else {
            // Remove bond
            setBonds((prev) => prev.filter((_, i) => i !== existingIdx));
            setAtoms((prev) => prev.map((a) => (a.id === a1.id || a.id === a2.id ? { ...a, bonds: a.bonds - bond.order } : a)));
            audioEngine.playClick(440);
        }
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
            color: getElementPalette(a.symbol).primary,
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
        <div className="h-full flex flex-col p-4 gap-3 bg-[var(--color-canvas)] font-sans text-[var(--color-ink)] select-none overflow-y-auto">
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)]">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--color-surface-2)] text-[var(--color-ink)] text-xs font-semibold border border-[var(--color-hairline)] shadow-2xs">
                        <Atom className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>Molecular Synthesizer</span>
                        <span className="text-[10px] text-[var(--color-accent)] font-medium bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded border border-[var(--color-hairline)]">VSEPR Studio</span>
                    </div>
                    <span className="hidden sm:inline text-xs text-[var(--color-ink-muted)]">
                        Interactive 2D/3D Covalent Geometry Lab
                    </span>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-7 h-7 rounded hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                        title="Close Synthesizer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Quick Templates & Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] text-xs relative z-30">
                {/* Left: Quick Templates + Full Catalog Dropdown */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="section-label shrink-0">Templates:</span>

                    {/* Quick 4 Direct Access Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        {EXTENDED_TEMPLATES.slice(0, 4).map((tmpl) => (
                            <button
                                key={tmpl.name}
                                onClick={() => {
                                    audioEngine.playClick(840);
                                    loadTemplate(tmpl);
                                    setIsTemplatesOpen(false);
                                }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all border shrink-0 cursor-pointer select-none active:scale-[0.98]",
                                    activeTemplate === tmpl.name
                                        ? "bg-[#5e6ad2] text-white border-transparent shadow-2xs font-semibold"
                                        : "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border-[var(--color-hairline)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                                )}
                            >
                                {tmpl.name} <span className="text-[11px] font-mono opacity-70">({tmpl.formula})</span>
                            </button>
                        ))}
                    </div>

                    {/* Full Catalog Popover Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                audioEngine.playClick(780);
                                setIsTemplatesOpen(!isTemplatesOpen);
                            }}
                            className={cn(
                                "h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.98]",
                                isTemplatesOpen
                                    ? "bg-[var(--color-surface-3)] border-[var(--color-accent)] text-indigo-300 shadow-2xs"
                                    : "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border-[var(--color-hairline)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                            )}
                        >
                            <span>+{EXTENDED_TEMPLATES.length - 4} More</span>
                            <span className="text-[9px]">▾</span>
                        </button>

                        {/* Elevated Dropdown Menu */}
                        {isTemplatesOpen && (
                            <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-hairline)] shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100 space-y-1">
                                <div className="section-label px-2 py-1 border-b border-[var(--color-hairline)] mb-1">
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
                                                "w-full px-2.5 py-1.5 rounded text-left transition-colors flex items-center justify-between text-xs",
                                                activeTemplate === tmpl.name
                                                    ? "bg-[var(--color-surface-3)] text-indigo-300 font-semibold"
                                                    : "hover:bg-[var(--color-surface-3)]/80 text-[var(--color-ink)]"
                                            )}
                                        >
                                            <div>
                                                <div className="font-medium text-xs">{tmpl.name}</div>
                                                <div className="text-[11px] text-[var(--color-ink-muted)] truncate max-w-[170px]">{tmpl.description}</div>
                                            </div>
                                            <span className="font-mono text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-1)] text-[var(--color-ink-muted)] border border-[var(--color-hairline)]">
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
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleAutoBond}
                        className="btn-primary h-8 px-3.5 flex items-center gap-1.5 text-xs font-medium"
                        title="Compute and snap covalent bonds automatically"
                    >
                        <Atom className="w-3.5 h-3.5" />
                        <span>Auto-Bond Solver</span>
                    </button>
                    <button
                        onClick={handleClear}
                        className="btn-danger h-8 px-3 flex items-center gap-1.5 text-xs font-medium"
                        title="Clear Workspace"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                    </button>
                </div>
            </div>

            {/* Main Stage Grid (Sidebar + 2D Interactive Canvas) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1 min-h-[480px]">
                {/* Left Sidebar: Element Palette + VSEPR Geometry + 3D Preview */}
                <div className="space-y-3 flex flex-col justify-between">
                    {/* Element Palette Matrix */}
                    <div className="p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-xs text-[var(--color-ink)] font-display tracking-tight">Element Palette</span>
                            <span className="text-[11px] text-[var(--color-ink-muted)]">Valence Dots</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {Object.keys(VALENCE).map((sym) => {
                                const isSelected = selectedPaletteAtom === sym;
                                const pal = getElementPalette(sym);
                                return (
                                    <button
                                        key={sym}
                                        onClick={() => {
                                            audioEngine.playClick(900);
                                            setSelectedPaletteAtom(sym);
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-md flex flex-col items-center justify-center border transition-all text-center group cursor-pointer select-none active:scale-95 hover:brightness-105",
                                            isSelected
                                                ? "bg-[var(--color-surface-3)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50 shadow-2xs"
                                                : "bg-[var(--color-surface-2)] border-[var(--color-hairline)] hover:border-[var(--color-surface-4)] text-[var(--color-ink)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: pal.primary }} />
                                            <span className="text-xs font-bold" style={{ color: pal.primary }}>{sym}</span>
                                        </div>
                                        <span className="text-[9px] text-[var(--color-ink-muted)] mt-0.5 font-mono tnum font-medium">v:{VALENCE[sym]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* VSEPR Geometry & Telemetry Matrix (Unified Card) */}
                    <div className="rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] overflow-hidden text-xs">
                        <div className="px-3.5 py-2.5 bg-[var(--color-surface-2)] border-b border-[var(--color-hairline)] flex items-center justify-between">
                            <span className="font-semibold text-xs text-[var(--color-ink)]">VSEPR Geometry Analysis</span>
                            <span className="text-[11px] text-[var(--color-ink-muted)] font-medium font-mono">{vseprGeometry.geometryType}</span>
                        </div>

                        <div className="divide-y divide-[var(--color-hairline)]">
                            <div className="px-3 py-2 flex items-center justify-between">
                                <span className="text-[var(--color-ink-muted)] text-xs">Molecular Shape</span>
                                <strong className="text-[var(--color-ink)] font-semibold text-xs">{vseprGeometry.shape}</strong>
                            </div>
                            <div className="px-3 py-2 flex items-center justify-between">
                                <span className="text-[var(--color-ink-muted)] text-xs">Bond Angle (θ)</span>
                                <strong className="text-indigo-400 font-semibold text-xs font-mono tnum">{vseprGeometry.angle}</strong>
                            </div>
                            <div className="px-3 py-2 flex items-center justify-between">
                                <span className="text-[var(--color-ink-muted)] text-xs">Hybridization</span>
                                <strong className="text-purple-400 font-semibold text-xs font-mono">{vseprGeometry.hybridization}</strong>
                            </div>
                            <div className="px-3 py-2 flex items-center justify-between bg-[var(--color-surface-2)]/50">
                                <span className="text-[var(--color-ink-muted)] text-xs">Molar Mass</span>
                                <strong className="text-[var(--color-ink)] font-semibold text-xs font-mono tnum">{molarMass} g/mol</strong>
                            </div>
                        </div>

                        {massBreakdown.length > 0 && (
                            <div className="p-2 bg-[var(--color-surface-2)] border-t border-[var(--color-hairline)] flex flex-wrap gap-1">
                                {massBreakdown.map((m) => (
                                    <span key={m.symbol} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-hairline)] text-[10px] font-mono text-[var(--color-ink-muted)] tnum">
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
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="lg:col-span-3 rounded-lg bg-[#08090d] border border-[var(--color-hairline)] relative overflow-hidden cursor-crosshair min-h-[440px] flex flex-col justify-between select-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                >
                    {/* SVG Atoms & Precision Gradient Covalent Bonds Engine */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <defs>
                            {/* Reusable SVG Filters for Molecular Geometry */}
                            <filter id="atom-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.65)" />
                            </filter>
                            <filter id="bond-cloud-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="valence-pulse-filter" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" />
                            </filter>

                            {/* Dynamic Linear Gradients for Covalent Bonds */}
                            {bonds.map((bond) => {
                                const a1 = atoms.find((a) => a.id === bond.from);
                                const a2 = atoms.find((a) => a.id === bond.to);
                                if (!a1 || !a2) return null;
                                const p1 = getElementPalette(a1.symbol);
                                const p2 = getElementPalette(a2.symbol);
                                return (
                                    <linearGradient
                                        key={`grad-${bond.id}`}
                                        id={`mb-bond-${bond.id}`}
                                        x1={a1.x}
                                        y1={a1.y}
                                        x2={a2.x}
                                        y2={a2.y}
                                        gradientUnits="userSpaceOnUse"
                                    >
                                        <stop offset="0%" stopColor={p1.primary} />
                                        <stop offset="50%" stopColor={p1.primary === p2.primary ? p1.primary : '#818cf8'} stopOpacity="0.9" />
                                        <stop offset="100%" stopColor={p2.primary} />
                                    </linearGradient>
                                );
                            })}

                            {/* Dynamic 3D Spherical Radial Gradients for Placed Atoms */}
                            {atoms.map((atom) => {
                                const pal = getElementPalette(atom.symbol);
                                return (
                                    <radialGradient
                                        key={`atom-grad-${atom.id}`}
                                        id={`mb-atom-${atom.id}`}
                                        cx="35%"
                                        cy="30%"
                                        r="65%"
                                        fx="30%"
                                        fy="25%"
                                    >
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                                        <stop offset="28%" stopColor={pal.highlight} stopOpacity="0.85" />
                                        <stop offset="65%" stopColor={pal.primary} stopOpacity="1" />
                                        <stop offset="90%" stopColor={pal.secondary} stopOpacity="1" />
                                        <stop offset="100%" stopColor="#04060c" stopOpacity="1" />
                                    </radialGradient>
                                );
                            })}
                        </defs>

                        {/* Layer 1: Covalent Bonds */}
                        <g id="bonds-layer">
                            {bonds.map((bond) => {
                                const a1 = atoms.find((a) => a.id === bond.from);
                                const a2 = atoms.find((a) => a.id === bond.to);
                                if (!a1 || !a2) return null;

                                const dx = a2.x - a1.x;
                                const dy = a2.y - a1.y;
                                const dist = Math.hypot(dx, dy) || 1;
                                const offset = 4.5;
                                const nx = (-dy / dist) * offset;
                                const ny = (dx / dist) * offset;
                                const isHovered = hoveredBondId === bond.id;

                                return (
                                    <g
                                        key={bond.id}
                                        className="cursor-pointer pointer-events-auto group"
                                        onMouseEnter={() => setHoveredBondId(bond.id)}
                                        onMouseLeave={() => setHoveredBondId(null)}
                                        onClick={(e) => handleBondClick(bond.id, e)}
                                    >
                                        {/* Invisible Wide Hit Area */}
                                        <line
                                            x1={a1.x}
                                            y1={a1.y}
                                            x2={a2.x}
                                            y2={a2.y}
                                            stroke="transparent"
                                            strokeWidth="22"
                                            strokeLinecap="round"
                                        />

                                        {bond.order === 1 && (
                                            <>
                                                {/* Ambient Electron Cloud */}
                                                <line
                                                    x1={a1.x}
                                                    y1={a1.y}
                                                    x2={a2.x}
                                                    y2={a2.y}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth={isHovered ? 10 : 7}
                                                    strokeOpacity={isHovered ? 0.35 : 0.16}
                                                    strokeLinecap="round"
                                                />
                                                {/* Core Covalent Gradient Cylinder */}
                                                <line
                                                    x1={a1.x}
                                                    y1={a1.y}
                                                    x2={a2.x}
                                                    y2={a2.y}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="3.5"
                                                    strokeLinecap="round"
                                                />
                                                {/* Specular Hairline */}
                                                <line
                                                    x1={a1.x}
                                                    y1={a1.y}
                                                    x2={a2.x}
                                                    y2={a2.y}
                                                    stroke="#ffffff"
                                                    strokeWidth="1"
                                                    strokeOpacity="0.4"
                                                    strokeLinecap="round"
                                                />
                                            </>
                                        )}

                                        {bond.order === 2 && (
                                            <>
                                                {/* Shared Pi Orbital Cloud */}
                                                <line
                                                    x1={a1.x}
                                                    y1={a1.y}
                                                    x2={a2.x}
                                                    y2={a2.y}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="14"
                                                    strokeOpacity={isHovered ? 0.3 : 0.14}
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1={a1.x + nx}
                                                    y1={a1.y + ny}
                                                    x2={a2.x + nx}
                                                    y2={a2.y + ny}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1={a1.x - nx}
                                                    y1={a1.y - ny}
                                                    x2={a2.x - nx}
                                                    y2={a2.y - ny}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                />
                                            </>
                                        )}

                                        {bond.order === 3 && (
                                            <>
                                                {/* Delocalized Triple Bond Density */}
                                                <line
                                                    x1={a1.x}
                                                    y1={a1.y}
                                                    x2={a2.x}
                                                    y2={a2.y}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="18"
                                                    strokeOpacity={isHovered ? 0.35 : 0.16}
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1={a1.x + nx * 1.5}
                                                    y1={a1.y + ny * 1.5}
                                                    x2={a2.x + nx * 1.5}
                                                    y2={a2.y + ny * 1.5}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1={a1.x - nx * 1.5}
                                                    y1={a1.y - ny * 1.5}
                                                    x2={a2.x - nx * 1.5}
                                                    y2={a2.y - ny * 1.5}
                                                    stroke={`url(#mb-bond-${bond.id})`}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                />
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </g>

                        {/* Layer 2: 3D SVG Atoms Nodes */}
                        <g id="atoms-layer">
                            {atoms.map((atom) => {
                                const palette = getElementPalette(atom.symbol);
                                const isSelected = selectedCanvasAtom === atom.id;
                                const isSatisfied = atom.bonds === atom.maxBonds;
                                const isOverbonded = atom.bonds > atom.maxBonds;
                                const statusColor = isSatisfied ? '#10b981' : isOverbonded ? '#f43f5e' : '#f59e0b';
                                const atomRadius = 21;
                                const valenceOrbitRadius = 27;

                                // Generate valence dot coordinates around outer perimeter
                                const valenceDots = Array.from({ length: atom.maxBonds }, (_, i) => {
                                    const angle = (i / atom.maxBonds) * Math.PI * 2 - Math.PI / 2;
                                    return {
                                        cx: atom.x + Math.cos(angle) * valenceOrbitRadius,
                                        cy: atom.y + Math.sin(angle) * valenceOrbitRadius,
                                        isBonded: i < atom.bonds,
                                    };
                                });

                                return (
                                    <g
                                        key={atom.id}
                                        className="cursor-grab active:cursor-grabbing pointer-events-auto transition-transform"
                                        onMouseDown={(e) => handleAtomMouseDown(atom.id, e)}
                                        onMouseUp={(e) => handleAtomMouseUp(atom.id, e)}
                                    >
                                        {/* Outer Selection Highlight Aura */}
                                        {isSelected && (
                                            <circle
                                                cx={atom.x}
                                                cy={atom.y}
                                                r={atomRadius + 11}
                                                fill="none"
                                                stroke="var(--color-accent)"
                                                strokeWidth="2.5"
                                                strokeDasharray="4 3"
                                                className="animate-spin"
                                                style={{ animationDuration: '6s' }}
                                            />
                                        )}

                                        {/* Valence Status Perimeter Ring */}
                                        <circle
                                            cx={atom.x}
                                            cy={atom.y}
                                            r={valenceOrbitRadius}
                                            fill="none"
                                            stroke={statusColor}
                                            strokeWidth={isSatisfied ? 1.4 : 1.8}
                                            strokeDasharray={isSatisfied ? 'none' : '3 3'}
                                            strokeOpacity={isSatisfied ? 0.75 : 0.9}
                                        />

                                        {/* Valence Electron Satellite Markers */}
                                        {valenceDots.map((dot, dIdx) => (
                                            <circle
                                                key={dIdx}
                                                cx={dot.cx}
                                                cy={dot.cy}
                                                r={dot.isBonded ? 2.5 : 2}
                                                fill={dot.isBonded ? statusColor : 'transparent'}
                                                stroke={statusColor}
                                                strokeWidth="1"
                                                opacity={dot.isBonded ? 0.95 : 0.55}
                                            />
                                        ))}

                                        {/* 3D Spherical Volume Core */}
                                        <circle
                                            cx={atom.x}
                                            cy={atom.y}
                                            r={atomRadius}
                                            fill={`url(#mb-atom-${atom.id})`}
                                            stroke={isSelected ? '#ffffff' : palette.border}
                                            strokeWidth={isSelected ? 2 : 1.4}
                                            filter="url(#atom-3d-shadow)"
                                        />

                                        {/* Specular Lighting Glint Crescent (Top-Left Physical Highlight) */}
                                        <ellipse
                                            cx={atom.x - 6.5}
                                            cy={atom.y - 7}
                                            rx="6.5"
                                            ry="3.5"
                                            transform={`rotate(-28 ${atom.x - 6.5} ${atom.y - 7})`}
                                            fill="#ffffff"
                                            opacity="0.55"
                                        />

                                        {/* Laser-Etched Chemical Symbol Typography */}
                                        <text
                                            x={atom.x}
                                            y={atom.y - 1}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill={palette.text}
                                            fontSize="13"
                                            fontWeight="900"
                                            fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                                            style={{
                                                textShadow: palette.text === '#ffffff'
                                                    ? '0 1px 3px rgba(0,0,0,0.8)'
                                                    : '0 1px 2px rgba(255,255,255,0.7)',
                                            }}
                                        >
                                            {atom.symbol}
                                        </text>

                                        {/* Valence Ratio Micro Pill Badge */}
                                        <g>
                                            <rect
                                                x={atom.x - 12}
                                                y={atom.y + 7.5}
                                                width="24"
                                                height="11"
                                                rx="5.5"
                                                fill="rgba(8, 10, 15, 0.88)"
                                                stroke={statusColor}
                                                strokeWidth="0.8"
                                            />
                                            <text
                                                x={atom.x}
                                                y={atom.y + 13.5}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill="#ffffff"
                                                fontSize="7.5"
                                                fontWeight="700"
                                                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
                                                className="tnum"
                                            >
                                                {atom.bonds}/{atom.maxBonds}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>

                    {/* Top Canvas Instruction Guide */}
                    <div className="p-3 text-xs text-[var(--color-ink-muted)] pointer-events-none flex items-center justify-between">
                        <span>Click empty canvas to deposit atom • Click two atoms sequentially to form/cycle covalent bond</span>
                        <span className="hidden sm:inline text-xs font-mono text-[var(--color-ink-muted)] tnum">Total Atoms: {totalAtomCount}</span>
                    </div>

                    {/* Bottom Status Deck */}
                    <div className="m-3 p-3 rounded-lg bg-[var(--color-surface-1)]/90 border border-[var(--color-hairline)] backdrop-blur-md text-xs flex items-center justify-between flex-wrap gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs text-[var(--color-ink-muted)] font-medium">Molecular Formula:</span>
                            <span className="font-semibold text-sm text-[var(--color-ink-primary)] font-mono">{chemicalFormula}</span>
                            <span className="text-[var(--color-ink-muted)] text-xs font-mono tnum">({molarMass} g/mol)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {validation.isValid ? (
                                <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                                    <Check className="w-3.5 h-3.5" />
                                    {validation.message}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-amber-400 font-medium text-xs">
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
