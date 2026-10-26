import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { findReaction, getReactiveElements, calculateGibbsFreeEnergy, calculateMolecularVelocity, reactions as ALL_REACTIONS, Reaction } from '@/data/reactions';
import { elements, getElementPalette } from '@/data/elements';
import { FlaskConical, X, Activity, Thermometer, Flame, Scale, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Atom } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

interface ReactionSimulatorProps {
    onClose?: () => void;
}

interface Particle3D {
    id: number;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    color: string;
    symbol: string;
    radius: number;
}

function CollisionScene3D({
    reactants,
    temperatureK,
    isReacting,
}: {
    reactants: string[];
    temperatureK: number;
    isReacting: boolean;
}) {
    const boxSize = 2.5;

    // Initialize 18 bouncing reactant particles in 3D Euclidean space
    const particles = useRef<Particle3D[]>([]);
    const [bonds, setBonds] = useState<[THREE.Vector3, THREE.Vector3][]>([]);

    useEffect(() => {
        const count = 18;
        const pts: Particle3D[] = [];

        for (let i = 0; i < count; i++) {
            const sym = reactants[i % (reactants.length || 1)] || 'H';
            pts.push({
                id: i,
                pos: new THREE.Vector3(
                    (Math.random() - 0.5) * (boxSize * 1.6),
                    (Math.random() - 0.5) * (boxSize * 1.6),
                    (Math.random() - 0.5) * (boxSize * 1.6)
                ),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.6,
                    (Math.random() - 0.5) * 1.6,
                    (Math.random() - 0.5) * 1.6
                ),
                color: getElementPalette(sym).primary,
                symbol: sym,
                radius: 0.16,
            });
        }
        particles.current = pts;
    }, [reactants]);

    useFrame((_, delta) => {
        const speedMultiplier = Math.sqrt(temperatureK / 298);
        const bound = boxSize * 0.92;
        const currentBonds: [THREE.Vector3, THREE.Vector3][] = [];

        particles.current.forEach((p, idx) => {
            p.pos.addScaledVector(p.vel, delta * speedMultiplier * 1.3);

            // Bounding box reflections with physical elasticity
            if (p.pos.x < -bound || p.pos.x > bound) {
                p.vel.x *= -1;
                p.pos.x = Math.max(-bound, Math.min(bound, p.pos.x));
            }
            if (p.pos.y < -bound || p.pos.y > bound) {
                p.vel.y *= -1;
                p.pos.y = Math.max(-bound, Math.min(bound, p.pos.y));
            }
            if (p.pos.z < -bound || p.pos.z > bound) {
                p.vel.z *= -1;
                p.pos.z = Math.max(-bound, Math.min(bound, p.pos.z));
            }

            // Proximity interaction bonding lines
            for (let j = idx + 1; j < particles.current.length; j++) {
                const p2 = particles.current[j];
                const dist = p.pos.distanceTo(p2.pos);
                if (dist < (isReacting ? 1.4 : 0.75)) {
                    currentBonds.push([p.pos.clone(), p2.pos.clone()]);
                }
            }
        });

        setBonds(currentBonds.slice(0, 16));
    });

    return (
        <group>
            {/* 3D Containment Chamber Box Wireframe */}
            <mesh>
                <boxGeometry args={[boxSize * 2, boxSize * 2, boxSize * 2]} />
                <meshBasicMaterial color={isReacting ? '#f59e0b' : '#334155'} wireframe transparent opacity={0.35} />
            </mesh>

            {/* Stage Floor Calibration Grid */}
            <gridHelper args={[boxSize * 2, 8, '#334155', '#1e293b']} position={[0, -boxSize, 0]} />

            {/* Reactive Collision Snap Lines */}
            {bonds.map(([start, end], idx) => (
                <Line
                    key={idx}
                    points={[start, end]}
                    color={isReacting ? '#f59e0b' : '#5e6ad2'}
                    lineWidth={isReacting ? 2.4 : 1.2}
                    transparent
                    opacity={isReacting ? 0.85 : 0.4}
                />
            ))}

            {/* Reactant Spheres */}
            {particles.current.map((p) => (
                <group key={p.id} position={p.pos}>
                    <Sphere args={[p.radius, 24, 24]}>
                        <meshPhysicalMaterial
                            color={p.color}
                            emissive={p.color}
                            emissiveIntensity={isReacting ? 0.9 : 0.35}
                            roughness={0.1}
                            metalness={0.15}
                            clearcoat={1.0}
                        />
                    </Sphere>
                    <Html center distanceFactor={4.5} occlude>
                        <div className="font-mono font-bold text-white text-[9px] pointer-events-none select-none drop-shadow-sm">
                            {p.symbol}
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}

function CameraZoomHandler({ zoomAction }: { zoomAction: { type: 'in' | 'out' | 'reset'; ts: number } | null }) {
    const { camera } = useThree();
    const controlsRef = useRef<OrbitControlsImpl>(null);

    useEffect(() => {
        if (!zoomAction) return;
        if (zoomAction.type === 'in') {
            camera.position.multiplyScalar(0.85);
        } else if (zoomAction.type === 'out') {
            camera.position.multiplyScalar(1.18);
        } else if (zoomAction.type === 'reset') {
            camera.position.set(0, 2.4, 5.8);
            controlsRef.current?.reset();
        }
    }, [camera, zoomAction]);

    return (
        <OrbitControls
            ref={controlsRef}
            enableZoom={true}
            enablePan={true}
            minDistance={2}
            maxDistance={14}
            autoRotate
            autoRotateSpeed={1.2}
        />
    );
}

const CollisionChamber = memo(function CollisionChamber({
    reactants,
    temperatureK,
    isReacting,
    isExothermic = true,
}: {
    reactants: string[];
    temperatureK: number;
    isReacting: boolean;
    isExothermic?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [zoomAction, setZoomAction] = useState<{ type: 'in' | 'out' | 'reset'; ts: number } | null>(null);

    return (
        <div className={cn(
            "w-full rounded-lg overflow-hidden border border-[var(--color-hairline)] relative select-none bg-[#0a0c12] transition-all",
            isExpanded ? "h-96" : "h-64 sm:h-72"
        )}>
            <Canvas
                camera={{ position: [0, 2.4, 5.8], fov: 42, near: 0.1, far: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.15,
                }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.7} color="#ffffff" />
                <directionalLight position={[6, 10, 8]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.8} color="#818cf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.5} color="#f59e0b" />
                {isReacting && (
                    <pointLight
                        position={[0, 0, 0]}
                        intensity={isExothermic ? 4.5 : 3.0}
                        color={isExothermic ? '#f59e0b' : '#5e6ad2'}
                        distance={8}
                    />
                )}

                <CollisionScene3D
                    reactants={reactants}
                    temperatureK={temperatureK}
                    isReacting={isReacting}
                />

                <CameraZoomHandler zoomAction={zoomAction} />
            </Canvas>

            {/* Top Left: Kinetic Chamber Telemetry HUD */}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-[var(--color-surface-1)]/90 border border-[var(--color-hairline)] text-[10px] font-mono text-[var(--color-ink)] font-bold backdrop-blur-md flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                <span>3D Kinetic Chamber</span>
                <span className="text-[var(--color-ink-muted)]">•</span>
                <span className="text-[var(--color-ink-muted)] tnum">v_rms: {calculateMolecularVelocity(18, temperatureK)} m/s</span>
            </div>

            {/* Top Right: Chamber Navigation & Zoom Deck */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[var(--color-surface-1)]/90 border border-[var(--color-hairline)] p-0.5 rounded backdrop-blur-md">
                <button
                    onClick={() => setZoomAction({ type: 'in', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'out', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title="Reset Camera Angle"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="h-3.5 w-px bg-[var(--color-hairline)] mx-0.5" />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                    title={isExpanded ? "Collapse Viewport" : "Expand Viewport"}
                >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
});

export const ReactionSimulator = memo(function ReactionSimulator({ onClose }: ReactionSimulatorProps) {
    const [selectedElements, setSelectedElements] = useState<string[]>(['H', 'O']);
    const [isReacting, setIsReacting] = useState(false);
    const [reactionTempK, setReactionTempK] = useState(298);
    const [reactantMassGrams, setReactantMassGrams] = useState<number>(10);

    const reactiveElements = useMemo(() => getReactiveElements(), []);

    const toggleElement = useCallback((symbol: string) => {
        audioEngine.playClick(780);
        setSelectedElements((prev) => {
            if (prev.includes(symbol)) {
                return prev.filter((s) => s !== symbol);
            }
            if (prev.length >= 3) {
                return [...prev.slice(1), symbol];
            }
            return [...prev, symbol];
        });
    }, []);

    const currentReaction = useMemo(() => {
        return findReaction(selectedElements);
    }, [selectedElements]);

    // Thermodynamic Calculations (ΔH, ΔS, ΔG, Spontaneity, K_eq)
    const thermo = useMemo(() => {
        if (!currentReaction) return null;
        return calculateGibbsFreeEnergy(currentReaction, reactionTempK);
    }, [currentReaction, reactionTempK]);

    // Stoichiometric Theoretical Yield Calculation
    const yieldStats = useMemo(() => {
        if (!currentReaction) return null;
        const moles = reactantMassGrams / 18.0;
        const theoreticalProductGrams = (moles * 18.0).toFixed(2);
        return {
            moles: moles.toFixed(3),
            theoreticalProductGrams,
        };
    }, [currentReaction, reactantMassGrams]);

    const [presetSearch, setPresetSearch] = useState('');
    const [presetFilter, setPresetFilter] = useState<'all' | 'binary' | '3-element' | 'exothermic' | 'endothermic'>('all');

    const filteredPresets = useMemo(() => {
        return ALL_REACTIONS.filter((rxn) => {
            const matchesSearch = rxn.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                rxn.equation.toLowerCase().includes(presetSearch.toLowerCase()) ||
                rxn.reactants.some(r => r.toLowerCase().includes(presetSearch.toLowerCase()));
            if (!matchesSearch) return false;

            if (presetFilter === 'binary') return rxn.reactants.length === 2;
            if (presetFilter === '3-element') return rxn.reactants.length >= 3;
            if (presetFilter === 'exothermic') return rxn.type === 'exothermic';
            if (presetFilter === 'endothermic') return rxn.type === 'endothermic';
            return true;
        });
    }, [presetSearch, presetFilter]);

    const handleTriggerReaction = () => {
        if (!currentReaction) return;
        setIsReacting(true);
        audioEngine.playBondingChord();
        setTimeout(() => setIsReacting(false), 2400);
    };

    const handleTempChange = (newTemp: number) => {
        setReactionTempK(newTemp);
        audioEngine.updateThermalHum(newTemp);
    };

    const handleLoadPreset = (rxn: Reaction) => {
        audioEngine.playClick(880);
        setSelectedElements(rxn.reactants);
    };

    return (
        <div className="h-full flex flex-col p-4 gap-3.5 bg-[var(--color-canvas)] font-sans text-[var(--color-ink)] select-none overflow-y-auto">
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)]">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] text-[var(--color-ink)] text-xs font-semibold border border-[var(--color-hairline)] shadow-2xs">
                        <FlaskConical className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>Kinetic Reaction Simulator</span>
                    </div>
                    <span className="hidden sm:inline text-xs text-[var(--color-ink-muted)]">
                        Collision Chamber & Thermochemical Reactor
                    </span>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-7 h-7 rounded hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                        title="Close Simulator"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Reactant Chamber Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* Left: Reactant Matrix Selection */}
                <div className="p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-xs text-[var(--color-ink)] font-display tracking-tight">Select Reactants (1–3)</span>
                        <span className="bg-[var(--color-surface-2)] px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[var(--color-ink-muted)] border border-[var(--color-hairline)] tnum">
                            {selectedElements.length} / 3 Active
                        </span>
                    </div>

                    {/* Reactant Elements Tile Matrix */}
                    <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-[var(--color-surface-2)] rounded-md border border-[var(--color-hairline)]">
                        {reactiveElements.map((symbol) => {
                            const isSelected = selectedElements.includes(symbol);
                            const el = elements.find((e) => e.symbol === symbol);
                            const pal = el ? getElementPalette(el) : null;
                            const color = pal?.primary || '#5e6ad2';

                            return (
                                <button
                                    key={symbol}
                                    onClick={() => toggleElement(symbol)}
                                    className={cn(
                                        "p-1.5 rounded-md flex flex-col items-center justify-center border transition-all text-center cursor-pointer active:scale-95",
                                        isSelected
                                            ? 'bg-[var(--color-surface-3)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50 shadow-2xs'
                                            : 'bg-[var(--color-surface-1)] border-[var(--color-hairline)] hover:border-[var(--color-surface-4)] text-[var(--color-ink)]'
                                    )}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-xs font-bold" style={{ color: isSelected ? '#818cf8' : color }}>
                                            {symbol}
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-[var(--color-ink-muted)] font-mono leading-none mt-0.5 tnum font-medium">
                                        {el?.atomicNumber ?? ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Temperature Controller */}
                    <div className="p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-hairline)] space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-[var(--color-ink-muted)] font-medium text-xs">
                                <Thermometer className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                                Chamber Temperature:
                            </span>
                            <span className="font-semibold text-indigo-400 font-mono tnum">
                                {reactionTempK} K ({(reactionTempK - 273.15).toFixed(0)}°C)
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="3000"
                            step="25"
                            value={reactionTempK}
                            onChange={(e) => handleTempChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-[var(--color-surface-4)] rounded appearance-none cursor-pointer accent-[var(--color-accent)]"
                        />
                        <div className="grid grid-cols-4 gap-1 pt-1 font-mono">
                            {[100, 298, 1200, 3000].map((tVal) => (
                                <button
                                    key={tVal}
                                    onClick={() => handleTempChange(tVal)}
                                    className={cn(
                                        "px-1 py-0.5 rounded text-[10px] font-medium transition-all border cursor-pointer active:scale-95",
                                        Math.abs(reactionTempK - tVal) < 10
                                            ? "bg-[var(--color-surface-3)] text-indigo-300 border-[var(--color-accent)] shadow-2xs font-semibold"
                                            : "bg-[var(--color-surface-1)] text-[var(--color-ink-muted)] border-[var(--color-hairline)] hover:bg-[var(--color-surface-3)]"
                                    )}
                                >
                                    {tVal === 100 ? '100K' : tVal === 298 ? '298K' : tVal === 1200 ? '1200K' : '3000K'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Extended Preset Library (35+ Reactions) */}
                    <div className="space-y-2 font-sans pt-1 border-t border-[var(--color-hairline)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-mono font-bold tracking-wider">Classic Presets ({filteredPresets.length})</span>
                            <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                                {(['all', 'binary', '3-element'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setPresetFilter(cat)}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded uppercase transition-colors border",
                                            presetFilter === cat
                                                ? "bg-[var(--color-surface-3)] text-[var(--color-ink)] border-[var(--color-hairline)] font-bold"
                                                : "text-[var(--color-ink-muted)] border-transparent hover:text-[var(--color-ink)]"
                                        )}
                                    >
                                        {cat === 'all' ? 'All' : cat === 'binary' ? '2-Elem' : '3-Elem'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-52 overflow-y-auto p-1 bg-[var(--color-surface-2)] rounded border border-[var(--color-hairline)]">
                            {filteredPresets.map((rxn) => {
                                const isMatch = selectedElements.length === rxn.reactants.length && rxn.reactants.every(r => selectedElements.includes(r));
                                return (
                                    <button
                                        key={rxn.id}
                                        onClick={() => handleLoadPreset(rxn)}
                                        className={cn(
                                            "p-1.5 rounded text-[10.5px] transition-all border text-left flex flex-col gap-0.5",
                                            isMatch
                                                ? "bg-[var(--color-surface-3)] border-[var(--color-accent)] text-indigo-300 font-bold"
                                                : "bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-3)]/80 border-[var(--color-hairline)] text-[var(--color-ink)]"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold truncate text-[10px]">{rxn.name}</span>
                                            <span className={cn(
                                                "text-[8.5px] font-mono px-1 rounded tnum",
                                                (rxn.enthalpy ?? rxn.energyChange) < 0 ? "text-amber-400 bg-amber-950/40" : "text-sky-400 bg-sky-950/40"
                                            )}>
                                                {rxn.enthalpy ?? rxn.energyChange} kJ
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-ink-muted)]">
                                            <span className="truncate">{rxn.equation}</span>
                                            <span className="shrink-0 font-bold">[{rxn.reactants.join('+')}]</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Center & Right: Reaction Kinetics Diagram & 3D Synthesis Chamber */}
                <div className="lg:col-span-2 p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] flex flex-col justify-between space-y-3.5">
                    {/* Live Particle Collision Chamber with Zoom and Resize Controls */}
                    <CollisionChamber
                        reactants={selectedElements}
                        temperatureK={reactionTempK}
                        isReacting={isReacting}
                        isExothermic={thermo ? thermo.deltaH < 0 : true}
                    />

                    {currentReaction && thermo ? (
                        <div className="space-y-3 font-sans">
                            {/* Balanced Equation Banner */}
                            <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-center space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs text-[var(--color-ink-muted)] font-medium">
                                        {currentReaction.name} • {currentReaction.type}
                                    </span>
                                    <span className={cn(
                                        "text-[11px] font-mono font-medium px-2 py-0.5 rounded border",
                                        thermo.isSpontaneous ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60" : "bg-rose-950/60 text-rose-400 border-rose-800/60"
                                    )}>
                                        {thermo.isSpontaneous ? 'Spontaneous (ΔG < 0)' : 'Non-spontaneous (ΔG > 0)'}
                                    </span>
                                </div>
                                <div className="text-lg font-bold text-[var(--color-ink-primary)] font-mono py-1">
                                    {currentReaction.equation}
                                </div>
                            </div>

                            {/* Thermodynamic State Functions Matrix (Single Unified Card) */}
                            <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] overflow-hidden text-xs">
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-hairline)] text-center">
                                    <div className="p-2.5">
                                        <span className="text-[11px] text-[var(--color-ink-muted)] block font-medium">Enthalpy (ΔH°)</span>
                                        <strong className={cn("text-xs font-semibold mt-0.5 block font-mono tnum", thermo.deltaH < 0 ? 'text-amber-400' : 'text-sky-400')}>
                                             {thermo.deltaH > 0 ? `+${thermo.deltaH}` : thermo.deltaH} kJ/mol
                                        </strong>
                                    </div>
                                    <div className="p-2.5">
                                        <span className="text-[11px] text-[var(--color-ink-muted)] block font-medium">Entropy (ΔS°)</span>
                                        <strong className="text-xs font-semibold mt-0.5 block text-purple-400 font-mono tnum">
                                             {thermo.deltaS > 0 ? `+${thermo.deltaS}` : thermo.deltaS} J/K
                                        </strong>
                                    </div>
                                    <div className="p-2.5">
                                        <span className="text-[11px] text-[var(--color-ink-muted)] block font-medium">Gibbs (ΔG°)</span>
                                        <strong className={cn("text-xs font-semibold mt-0.5 block font-mono tnum", thermo.deltaG < 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                            {thermo.deltaG.toFixed(1)} kJ/mol
                                        </strong>
                                    </div>
                                    <div className="p-2.5">
                                        <span className="text-[11px] text-[var(--color-ink-muted)] block font-medium">Rate Mult</span>
                                        <strong className="text-xs font-semibold mt-0.5 block text-indigo-400 font-mono tnum">
                                            {thermo.rateMultiplier.toFixed(2)}x
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Stoichiometric Yield Calculator */}
                            <div className="p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] flex flex-wrap items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2">
                                    <Scale className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                                    <span className="text-[var(--color-ink-muted)]">Reactant Mass:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={reactantMassGrams}
                                        onChange={(e) => setReactantMassGrams(Number(e.target.value))}
                                        className="w-16 px-2 py-0.5 rounded border border-[var(--color-hairline)] bg-[var(--color-surface-1)] text-xs font-semibold text-[var(--color-ink-primary)] font-mono tnum"
                                    />
                                    <span className="text-[var(--color-ink-muted)]">g</span>
                                </div>
                                <div className="text-[var(--color-ink-muted)]">
                                    <span>Theoretical Yield: </span>
                                    <strong className="text-[var(--color-ink-primary)] font-semibold font-mono tnum">{yieldStats?.theoreticalProductGrams} g</strong>
                                </div>
                            </div>

                            {/* Action Trigger Button */}
                            <button
                                onClick={handleTriggerReaction}
                                disabled={isReacting}
                                className={cn(
                                    "w-full h-11 rounded-lg font-medium text-xs tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] shadow-md",
                                    isReacting
                                        ? "bg-gradient-to-b from-amber-600 to-amber-700 text-white cursor-wait animate-pulse"
                                        : "bg-gradient-to-b from-[#6875e5] to-[#4d58ba] hover:from-[#7683f2] hover:to-[#5762c7] text-white hover:shadow-[0_0_16px_rgba(94,106,210,0.45)] hover:-translate-y-[0.5px]"
                                )}
                                style={{
                                    boxShadow: isReacting
                                        ? '0 0 16px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                                        : '0 2px 8px rgba(0,0,0,0.25), 0 0 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.25)'
                                }}
                            >
                                <Flame className="w-4 h-4 text-amber-300" />
                                <span>{isReacting ? 'Simulating Thermochemical Reaction...' : 'Initiate Thermochemical Reaction'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-ink-muted)] space-y-2">
                            <Activity className="w-7 h-7 text-[var(--color-ink-muted)]/50" />
                            <p className="text-xs text-[var(--color-ink)] font-semibold">No known thermochemical reaction between selected reactants.</p>
                            <p className="text-[10px] text-[var(--color-ink-muted)]">Try combining Hydrogen (H) + Oxygen (O) or Sodium (Na) + Chlorine (Cl).</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
