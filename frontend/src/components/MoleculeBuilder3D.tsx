/**
 * MoleculeBuilder3D — Physics-based 3D Molecule Construction Sandbox
 *
 * Atoms are rigid bodies (Rapier physics). Users can:
 * - Click to spawn atoms of the selected element
 * - Drag atoms to reposition them
 * - When two compatible atoms are within bonding distance, a snap-bond forms
 * - Visual feedback: proximity glow, bond lines, particle effects
 */

import { useState, useRef, useMemo, useCallback, memo, MutableRefObject, Suspense } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Cylinder, Float, Html, Text, Environment, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Plus, Trash2, RotateCcw, Atom } from 'lucide-react';

// ============== DATA ==============

interface AtomData {
    id: string;
    symbol: string;
    name: string;
    color: string;
    radius: number;
    maxBonds: number;  // valence
    position: [number, number, number];
    currentBonds: number;
}

interface BondData {
    id: string;
    from: string; // atom id
    to: string;   // atom id
    type: 'single' | 'double' | 'triple';
}

const ELEMENT_PALETTE = [
    { symbol: 'H', name: 'Hydrogen', color: '#FFFFFF', radius: 0.3, maxBonds: 1 },
    { symbol: 'C', name: 'Carbon', color: '#4A4A4A', radius: 0.5, maxBonds: 4 },
    { symbol: 'N', name: 'Nitrogen', color: '#3050F8', radius: 0.45, maxBonds: 3 },
    { symbol: 'O', name: 'Oxygen', color: '#FF2020', radius: 0.42, maxBonds: 2 },
    { symbol: 'S', name: 'Sulfur', color: '#FFFF30', radius: 0.55, maxBonds: 2 },
    { symbol: 'P', name: 'Phosphorus', color: '#FF8000', radius: 0.52, maxBonds: 3 },
    { symbol: 'F', name: 'Fluorine', color: '#90E050', radius: 0.35, maxBonds: 1 },
    { symbol: 'Cl', name: 'Chlorine', color: '#1FF01F', radius: 0.48, maxBonds: 1 },
] as const;

const BOND_DISTANCE_THRESHOLD = 1.8; // Units within which atoms can bond

// ============== 3D ATOM COMPONENT ==============

interface PhysicsAtomProps {
    atom: AtomData;
    isSelected: boolean;
    canBond: boolean;
    onSelect: (id: string) => void;
    positionRef: MutableRefObject<Map<string, THREE.Vector3>>;
}

function PhysicsAtom({ atom, isSelected, canBond, onSelect, positionRef }: PhysicsAtomProps) {
    const bodyRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const glowIntensity = useRef(0);

    useFrame((_, delta) => {
        // Update position tracking
        if (bodyRef.current) {
            const pos = bodyRef.current.translation();
            positionRef.current.set(atom.id, new THREE.Vector3(pos.x, pos.y, pos.z));
        }

        // Animate glow for bondable atoms
        const targetGlow = canBond ? 0.8 : isSelected ? 0.5 : 0;
        glowIntensity.current = THREE.MathUtils.lerp(glowIntensity.current, targetGlow, delta * 5);

        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
            mat.emissiveIntensity = glowIntensity.current;
        }
    });

    return (
        <RigidBody
            ref={bodyRef}
            position={atom.position}
            type="dynamic"
            colliders="ball"
            linearDamping={4}
            angularDamping={4}
            gravityScale={0.2}
        >
            <Sphere
                ref={meshRef}
                args={[atom.radius, 16, 16]}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation();
                    onSelect(atom.id);
                }}
            >
                <meshPhysicalMaterial
                    color={atom.color}
                    emissive={canBond ? '#00ff88' : atom.color}
                    emissiveIntensity={0}
                    transmission={0.9}
                    opacity={1}
                    metalness={0.2}
                    roughness={0.1}
                    ior={1.5}
                    thickness={2}
                    clearcoat={1}
                    iridescence={0.5}
                    iridescenceIOR={1.3}
                />
            </Sphere>

            {/* Symbol label */}
            <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
                <div className="text-xs font-bold text-white bg-black/50 px-1 rounded select-none">
                    {atom.symbol}
                </div>
            </Html>

            {/* Selection ring */}
            {isSelected && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[atom.radius + 0.1, atom.radius + 0.15, 32]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Proximity glow sphere */}
            {canBond && (
                <Sphere args={[atom.radius + 0.2, 16, 16]}>
                    <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
                </Sphere>
            )}
        </RigidBody>
    );
}

// ============== BOND LINE COMPONENT ==============

function BondLine({ from, to, type }: { from: THREE.Vector3; to: THREE.Vector3; type: string }) {
    const midpoint = useMemo(() => {
        return new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    }, [from.x, from.y, from.z, to.x, to.y, to.z]);

    const direction = useMemo(() => {
        return new THREE.Vector3().subVectors(to, from);
    }, [from.x, from.y, from.z, to.x, to.y, to.z]);

    const length = direction.length();
    const quaternion = useMemo(() => {
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        return q;
    }, [direction]);

    const bondCount = type === 'double' ? 2 : type === 'triple' ? 3 : 1;
    const offsets = bondCount === 1 ? [0] : bondCount === 2 ? [-0.06, 0.06] : [-0.1, 0, 0.1];

    return (
        <group position={midpoint} quaternion={quaternion}>
            {offsets.map((offset, i) => (
                <Cylinder key={i} args={[0.04, 0.04, length, 8]} position={[offset, 0, 0]}>
                    <meshPhysicalMaterial
                        color="#222222"
                        emissive="#000000"
                        emissiveIntensity={0}
                        metalness={0.9}
                        roughness={0.3}
                        clearcoat={1}
                    />
                </Cylinder>
            ))}
        </group>
    );
}

// ============== SCENE COMPONENT ==============

interface BuilderSceneProps {
    atoms: AtomData[];
    bonds: BondData[];
    selectedAtomId: string | null;
    particleBursts: { id: string, pos: THREE.Vector3 }[];
    onSelectAtom: (id: string) => void;
    positionRef: MutableRefObject<Map<string, THREE.Vector3>>;
}

function BuilderScene({ atoms, bonds, selectedAtomId, particleBursts, onSelectAtom, positionRef }: BuilderSceneProps) {
    // Determine which atoms can bond (within proximity of another atom with available valence)
    const bondableAtoms = useMemo(() => {
        const set = new Set<string>();
        for (let i = 0; i < atoms.length; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                const a = atoms[i], b = atoms[j];
                if (a.currentBonds >= a.maxBonds || b.currentBonds >= b.maxBonds) continue;

                const posA = positionRef.current.get(a.id);
                const posB = positionRef.current.get(b.id);
                if (posA && posB && posA.distanceTo(posB) < BOND_DISTANCE_THRESHOLD) {
                    set.add(a.id);
                    set.add(b.id);
                }
            }
        }
        return set;
    }, [atoms, bonds]);

    return (
        <>
            <ambientLight intensity={0.3} />
            <Environment preset="city" />
            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.3} far={20} position={[0, -4.9, 0]} />
            <directionalLight position={[5, 8, 5]} intensity={0.4} />
            <directionalLight position={[-3, -2, -5]} intensity={0.2} color="#4488ff" />
            <Stars radius={50} depth={30} count={300} factor={3} saturation={0} fade speed={0.3} />

            <Physics gravity={[0, -2, 0]}>
                {/* Ground plane — invisible collision */}
                <RigidBody type="fixed" position={[0, -4, 0]} colliders="cuboid">
                    <mesh>
                        <boxGeometry args={[20, 0.1, 20]} />
                        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
                    </mesh>
                </RigidBody>

                {/* Atoms */}
                {atoms.map(atom => (
                    <PhysicsAtom
                        key={atom.id}
                        atom={atom}
                        isSelected={selectedAtomId === atom.id}
                        canBond={bondableAtoms.has(atom.id)}
                        onSelect={onSelectAtom}
                        positionRef={positionRef}
                    />
                ))}
            </Physics>

            {/* Bond lines (rendered outside physics) */}
            {bonds.map(bond => {
                const fromPos = positionRef.current.get(bond.from);
                const toPos = positionRef.current.get(bond.to);
                if (!fromPos || !toPos) return null;
                return <BondLine key={bond.id} from={fromPos} to={toPos} type={bond.type} />;
            })}

            {/* Particle bursts */}
            {particleBursts.map(burst => (
                <ParticleBurst key={burst.id} position={burst.pos} />
            ))}

            <OrbitControls enablePan enableZoom minDistance={3} maxDistance={20} />
        </>
    );
}

const ParticleBurst = ({ position }: { position: THREE.Vector3 }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach(child => {
                child.position.add((child.userData.velocity as THREE.Vector3).clone().multiplyScalar(delta));
                const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
                mat.opacity = Math.max(0, mat.opacity - delta * 2);
                if (child.scale.x > 0.01) child.scale.subScalar(delta * 2);
            });
        }
    });

    const particles = useMemo(() => Array.from({ length: 15 }).map(() => ({
        pos: new THREE.Vector3(0, 0, 0),
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)
    })), []);

    return (
        <group ref={groupRef} position={position}>
            {particles.map((p, i) => (
                <mesh key={i} userData={{ velocity: p.vel }}>
                    <sphereGeometry args={[0.08, 4, 4]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={1} />
                </mesh>
            ))}
        </group>
    );
};

// ============== MAIN COMPONENT ==============

interface MoleculeBuilder3DProps {
    className?: string;
}

export function MoleculeBuilder3D({ className }: MoleculeBuilder3DProps) {
    const [atoms, setAtoms] = useState<AtomData[]>([]);
    const [bonds, setBonds] = useState<BondData[]>([]);
    const [selectedElement, setSelectedElement] = useState<typeof ELEMENT_PALETTE[number]>(ELEMENT_PALETTE[1]); // Carbon default
    const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
    const [particleBursts, setParticleBursts] = useState<{ id: string, pos: THREE.Vector3 }[]>([]);
    const positionRef = useRef(new Map<string, THREE.Vector3>());
    const nextIdRef = useRef(0);

    const addAtom = useCallback(() => {
        const id = `atom_${nextIdRef.current++}`;
        const spread = 2;
        const newAtom: AtomData = {
            id,
            symbol: selectedElement.symbol,
            name: selectedElement.name,
            color: selectedElement.color,
            radius: selectedElement.radius,
            maxBonds: selectedElement.maxBonds,
            position: [
                (Math.random() - 0.5) * spread,
                2 + Math.random() * 2,
                (Math.random() - 0.5) * spread
            ],
            currentBonds: 0,
        };
        setAtoms(prev => [...prev, newAtom]);
    }, [selectedElement]);

    const removeSelected = useCallback(() => {
        if (!selectedAtomId) return;

        // Trigger particle burst
        const pos = positionRef.current.get(selectedAtomId);
        if (pos) {
            const burstId = `burst_${Date.now()}`;
            setParticleBursts(prev => [...prev, { id: burstId, pos: pos.clone() }]);
            setTimeout(() => {
                setParticleBursts(prev => prev.filter(b => b.id !== burstId));
            }, 1000);
        }

        setAtoms(prev => prev.filter(a => a.id !== selectedAtomId));
        setBonds(prev => prev.filter(b => b.from !== selectedAtomId && b.to !== selectedAtomId));
        positionRef.current.delete(selectedAtomId);
        setSelectedAtomId(null);
    }, [selectedAtomId]);

    const clearAll = useCallback(() => {
        setAtoms([]);
        setBonds([]);
        positionRef.current.clear();
        setSelectedAtomId(null);
        nextIdRef.current = 0;
    }, []);

    // Auto-bond check: run periodically
    const checkBonds = useCallback(() => {
        setAtoms(currentAtoms => {
            const newBonds: BondData[] = [];
            const atomMap = new Map(currentAtoms.map(a => [a.id, { ...a }]));

            for (let i = 0; i < currentAtoms.length; i++) {
                for (let j = i + 1; j < currentAtoms.length; j++) {
                    const a = atomMap.get(currentAtoms[i].id)!;
                    const b = atomMap.get(currentAtoms[j].id)!;

                    // Skip if already bonded or at capacity
                    if (a.currentBonds >= a.maxBonds || b.currentBonds >= b.maxBonds) continue;

                    const posA = positionRef.current.get(a.id);
                    const posB = positionRef.current.get(b.id);
                    if (!posA || !posB) continue;

                    const dist = posA.distanceTo(posB);
                    if (dist < BOND_DISTANCE_THRESHOLD) {
                        // Check if bond already exists
                        const existingBond = bonds.find(
                            b2 => (b2.from === a.id && b2.to === b.id) || (b2.from === b.id && b2.to === a.id)
                        );
                        if (!existingBond) {
                            newBonds.push({
                                id: `bond_${a.id}_${b.id}`,
                                from: a.id,
                                to: b.id,
                                type: 'single',
                            });
                            a.currentBonds++;
                            b.currentBonds++;
                        }
                    }
                }
            }

            if (newBonds.length > 0) {
                setBonds(prev => [...prev, ...newBonds]);
                return Array.from(atomMap.values());
            }
            return currentAtoms;
        });
    }, [bonds]);

    // Run bond check every 500ms
    const bondCheckRef = useRef<ReturnType<typeof setInterval>>();
    if (!bondCheckRef.current) {
        bondCheckRef.current = setInterval(checkBonds, 500);
    }

    return (
        <div className={cn("w-full h-full flex flex-col", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-[var(--color-paper-2)] border-b border-[var(--color-rule)]">
                {/* Element palette */}
                <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {ELEMENT_PALETTE.map(el => (
                        <button
                            key={el.symbol}
                            onClick={() => setSelectedElement(el)}
                            className={cn(
                                "w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex-shrink-0",
                                selectedElement.symbol === el.symbol
                                    ? "border-primary scale-110 shadow-lg shadow-primary/20"
                                    : "border-white/10 hover:border-white/30"
                            )}
                            style={{ color: el.color }}
                            title={el.name}
                        >
                            {el.symbol}
                        </button>
                    ))}
                </div>

                <div className="hidden sm:block w-px h-8 bg-white/10 mx-1 flex-shrink-0" />

                {/* Actions */}
                <button
                    onClick={addAtom}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
                    title={`Add ${selectedElement.name}`}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add {selectedElement.symbol}</span>
                </button>

                {selectedAtomId && (
                    <button
                        onClick={removeSelected}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs sm:text-sm transition-colors flex-shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={clearAll}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs sm:text-sm transition-colors flex-shrink-0"
                    title="Clear all"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>

                {/* Stats */}
                <div className="ml-auto flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-white/40 flex-shrink-0">
                    <span className="flex items-center gap-1">
                        <Atom className="w-3.5 h-3.5" />
                        {atoms.length}
                    </span>
                    <span>{bonds.length} bond{bonds.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* 3D Canvas */}
            <div className="flex-1 relative grab-cursor-canvas">
                <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
                    <Suspense fallback={null}>
                        <BuilderScene
                            atoms={atoms}
                            bonds={bonds}
                            selectedAtomId={selectedAtomId}
                            particleBursts={particleBursts}
                            onSelectAtom={setSelectedAtomId}
                            positionRef={positionRef}
                        />
                    </Suspense>
                </Canvas>

                {/* Empty state */}
                <AnimatePresence>
                    {atoms.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                            <div className="text-center text-white/30">
                                <Atom className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                                <p className="text-sm sm:text-lg font-medium">3D Molecule Builder</p>
                                <p className="text-xs sm:text-sm mt-1">Select an element and click "Add" to start building</p>
                                <p className="text-[10px] sm:text-xs mt-2 opacity-50">
                                    Atoms bond automatically when within proximity
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
