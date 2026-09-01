import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { findReaction, getReactiveElements, calculateGibbsFreeEnergy, calculateMolecularVelocity, reactions as ALL_REACTIONS, Reaction } from '@/data/reactions';
import { elements, getCategoryColor } from '@/data/elements';
import { Zap, X, Activity, Thermometer, Flame, Scale, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Atom } from 'lucide-react';
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

// Particle colors by reactant symbol
const REACTANT_PARTICLE_COLORS: Record<string, string> = {
    H: '#38bdf8',
    O: '#ef4444',
    C: '#334155',
    Na: '#eab308',
    Cl: '#10b981',
    N: '#8b5cf6',
    Fe: '#f97316',
    Mg: '#14b8a6',
    Al: '#64748b',
    Ca: '#f59e0b',
    K: '#a855f7',
    Cu: '#d97706',
    S: '#eab308',
};

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
                color: REACTANT_PARTICLE_COLORS[sym] || '#0071e3',
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
                <meshBasicMaterial color={isReacting ? '#f59e0b' : '#94a3b8'} wireframe transparent opacity={0.3} />
            </mesh>

            {/* Stage Floor Calibration Grid */}
            <gridHelper args={[boxSize * 2, 8, '#cbd5e1', '#e2e8f0']} position={[0, -boxSize, 0]} />

            {/* Reactive Collision Snap Lines */}
            {bonds.map(([start, end], idx) => (
                <Line
                    key={idx}
                    points={[start, end]}
                    color={isReacting ? '#f59e0b' : '#0071e3'}
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
            "w-full rounded-lg overflow-hidden border border-slate-200/80 relative select-none bg-slate-900/[0.03] transition-all",
            isExpanded ? "h-96" : "h-64 sm:h-72"
        )}>
            <Canvas
                camera={{ position: [0, 2.4, 5.8], fov: 42, near: 0.1, far: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.05,
                }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.9} color="#f8fafc" />
                <directionalLight position={[6, 10, 8]} intensity={1.5} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.7} color="#38bdf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.5} color="#f59e0b" />
                {isReacting && (
                    <pointLight
                        position={[0, 0, 0]}
                        intensity={isExothermic ? 4.5 : 3.0}
                        color={isExothermic ? '#f59e0b' : '#0071e3'}
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
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-white/95 border border-slate-200/80 text-[10px] font-mono text-slate-800 font-bold backdrop-blur-md shadow-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
                <span>3D Kinetic Chamber</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">v_rms: {calculateMolecularVelocity(18, temperatureK)} m/s</span>
            </div>

            {/* Top Right: Chamber Navigation & Zoom Deck */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 border border-slate-200/80 p-0.5 rounded-md backdrop-blur-md shadow-xs">
                <button
                    onClick={() => setZoomAction({ type: 'in', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'out', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Reset Camera Angle"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="h-3.5 w-px bg-slate-200 mx-0.5" />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
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
        <div className="h-full flex flex-col p-4 gap-3.5 bg-[#fbfbfd] font-sans text-slate-900 select-none overflow-y-auto">
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>KINETIC REACTION SIMULATOR</span>
                    </div>
                    <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                        Collision Chamber & Thermochemical Reactor
                    </span>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                        title="Close Simulator"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Reactant Chamber Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* Left: Reactant Matrix Selection */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200/80 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 font-display">Select Reactants (1–3)</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-600 border border-slate-200/70">
                            {selectedElements.length} / 3 Active
                        </span>
                    </div>

                    {/* Reactant Elements Tile Matrix */}
                    <div className="grid grid-cols-5 gap-1 max-h-44 overflow-y-auto p-1 bg-slate-50 rounded-md border border-slate-200/70 font-mono">
                        {reactiveElements.map((symbol) => {
                            const isSelected = selectedElements.includes(symbol);
                            const el = elements.find((e) => e.symbol === symbol);
                            const color = el ? getCategoryColor(el.category) : '#0071e3';

                            return (
                                <button
                                    key={symbol}
                                    onClick={() => toggleElement(symbol)}
                                    className={cn(
                                        "p-1.5 rounded-md flex flex-col items-center justify-center border transition-all text-center",
                                        isSelected
                                            ? 'bg-blue-50 border-[#0071e3] ring-1 ring-[#0071e3]/40 shadow-xs'
                                            : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700'
                                    )}
                                >
                                    <span className="text-xs font-black" style={{ color: isSelected ? '#0071e3' : color }}>
                                        {symbol}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-mono leading-none mt-0.5">
                                        {el?.atomicNumber ?? ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Temperature Controller */}
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200/70 space-y-2 font-mono">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                                <Thermometer className="w-3.5 h-3.5 text-slate-500" />
                                Chamber Temperature:
                            </span>
                            <span className="font-bold text-[#0071e3]">
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
                            className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-[#0071e3]"
                        />
                        <div className="grid grid-cols-4 gap-1 pt-1">
                            {[100, 298, 1200, 3000].map((tVal) => (
                                <button
                                    key={tVal}
                                    onClick={() => handleTempChange(tVal)}
                                    className={cn(
                                        "px-1 py-0.5 rounded text-[10px] font-mono font-bold transition-all border",
                                        Math.abs(reactionTempK - tVal) < 10
                                            ? "bg-white text-[#0071e3] border-blue-300 shadow-xs"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                    )}
                                >
                                    {tVal === 100 ? '100K' : tVal === 298 ? '298K' : tVal === 1200 ? '1200K' : '3000K'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Extended Preset Library (35+ Reactions) */}
                    <div className="space-y-2 font-sans pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Classic Presets ({filteredPresets.length})</span>
                            <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                                {(['all', 'binary', '3-element'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setPresetFilter(cat)}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded uppercase transition-colors",
                                            presetFilter === cat ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                        )}
                                    >
                                        {cat === 'all' ? 'All' : cat === 'binary' ? '2-Elem' : '3-Elem'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-52 overflow-y-auto p-1 bg-slate-50 rounded-md border border-slate-200/70">
                            {filteredPresets.map((rxn) => {
                                const isMatch = selectedElements.length === rxn.reactants.length && rxn.reactants.every(r => selectedElements.includes(r));
                                return (
                                    <button
                                        key={rxn.id}
                                        onClick={() => handleLoadPreset(rxn)}
                                        className={cn(
                                            "p-1.5 rounded-md text-[10.5px] transition-all border text-left flex flex-col gap-0.5",
                                            isMatch
                                                ? "bg-blue-50 border-[#0071e3] text-[#0071e3] font-bold shadow-2xs"
                                                : "bg-white hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:text-slate-900"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold truncate text-[10px]">{rxn.name}</span>
                                            <span className={cn(
                                                "text-[8.5px] font-mono px-1 rounded",
                                                (rxn.enthalpy ?? rxn.energyChange) < 0 ? "text-amber-700 bg-amber-50" : "text-sky-700 bg-sky-50"
                                            )}>
                                                {rxn.enthalpy ?? rxn.energyChange} kJ
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
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
                <div className="lg:col-span-2 p-3.5 rounded-lg bg-white border border-slate-200/80 flex flex-col justify-between space-y-3.5 shadow-xs">
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
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">
                                        {currentReaction.name} • {currentReaction.type.toUpperCase()}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                                        thermo.isSpontaneous ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-rose-50 text-rose-700 border-rose-300"
                                    )}>
                                        {thermo.isSpontaneous ? 'Spontaneous (ΔG < 0)' : 'Non-spontaneous (ΔG > 0)'}
                                    </span>
                                </div>
                                <div className="text-xl font-black text-slate-900 tracking-wide font-mono py-1">
                                    {currentReaction.equation}
                                </div>
                            </div>

                            {/* Thermodynamic State Functions Matrix (Single Unified Card) */}
                            <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden text-xs font-mono">
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 text-center">
                                    <div className="p-2">
                                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Enthalpy (ΔH°)</span>
                                        <strong className={cn("text-xs font-bold mt-0.5 block", thermo.deltaH < 0 ? 'text-amber-600' : 'text-sky-600')}>
                                            {thermo.deltaH > 0 ? `+${thermo.deltaH}` : thermo.deltaH} kJ/mol
                                        </strong>
                                    </div>
                                    <div className="p-2">
                                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Entropy (ΔS°)</span>
                                        <strong className="text-xs font-bold mt-0.5 block text-purple-700">
                                            {thermo.deltaS > 0 ? `+${thermo.deltaS}` : thermo.deltaS} J/K
                                        </strong>
                                    </div>
                                    <div className="p-2">
                                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Gibbs (ΔG°)</span>
                                        <strong className={cn("text-xs font-bold mt-0.5 block", thermo.deltaG < 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                            {thermo.deltaG.toFixed(1)} kJ/mol
                                        </strong>
                                    </div>
                                    <div className="p-2">
                                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Rate Mult</span>
                                        <strong className="text-xs font-bold mt-0.5 block text-[#0071e3]">
                                            {thermo.rateMultiplier.toFixed(2)}x
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Stoichiometric Yield Calculator */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                                <div className="flex items-center gap-2">
                                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-600">Reactant Mass:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={reactantMassGrams}
                                        onChange={(e) => setReactantMassGrams(Number(e.target.value))}
                                        className="w-16 px-2 py-0.5 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900"
                                    />
                                    <span className="text-slate-500">g</span>
                                </div>
                                <div className="text-slate-700">
                                    <span>Theoretical Yield: </span>
                                    <strong className="text-slate-900 font-bold">{yieldStats?.theoreticalProductGrams} g</strong>
                                </div>
                            </div>

                            {/* Action Trigger Button */}
                            <button
                                onClick={handleTriggerReaction}
                                disabled={isReacting}
                                className={cn(
                                    "w-full h-10 rounded-md font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]",
                                    isReacting
                                        ? "bg-amber-600 text-white cursor-wait"
                                        : "bg-slate-900 hover:bg-slate-800 text-white"
                                )}
                            >
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isReacting ? 'Simulating Thermochemical Reaction...' : 'Initiate Thermochemical Reaction'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                            <Activity className="w-7 h-7 text-slate-300" />
                            <p className="text-xs text-slate-600 font-semibold">No known thermochemical reaction between selected reactants.</p>
                            <p className="text-[10px] text-slate-400">Try combining Hydrogen (H) + Oxygen (O) or Sodium (Na) + Chlorine (Cl).</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
