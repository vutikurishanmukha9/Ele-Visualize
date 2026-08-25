import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { findReaction, getReactiveElements, calculateGibbsFreeEnergy, calculateMolecularVelocity, reactions as ALL_REACTIONS, Reaction } from '@/data/reactions';
import { elements, getCategoryColor } from '@/data/elements';
import { Zap, X, Activity, Thermometer, Flame, Scale } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, Line } from '@react-three/drei';
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

// Interactive 3D Kinetic Collision Chamber Scene
const REACTANT_PARTICLE_COLORS: Record<string, string> = {
    H: '#38bdf8',
    O: '#ef4444',
    C: '#334155',
    Na: '#eab308',
    Cl: '#10b981',
    N: '#8b5cf6',
    Fe: '#f97316',
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
    const boxSize = 2.4;

    // Initialize 14 bouncing reactant particles in 3D Euclidean space
    const particles = useRef<Particle3D[]>([]);
    const [bonds, setBonds] = useState<[THREE.Vector3, THREE.Vector3][]>([]);

    useEffect(() => {
        const count = 14;
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
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5
                ),
                color: REACTANT_PARTICLE_COLORS[sym] || '#0284c7',
                symbol: sym,
                radius: 0.16,
            });
        }
        particles.current = pts;
    }, [reactants]);

    useFrame((_, delta) => {
        const speedMultiplier = Math.sqrt(temperatureK / 298);
        const bound = boxSize * 0.9;
        const currentBonds: [THREE.Vector3, THREE.Vector3][] = [];

        particles.current.forEach((p, idx) => {
            p.pos.addScaledVector(p.vel, delta * speedMultiplier * 1.2);

            // Bounding box reflections
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

            // Proximity interaction bonds
            for (let j = idx + 1; j < particles.current.length; j++) {
                const p2 = particles.current[j];
                const dist = p.pos.distanceTo(p2.pos);
                if (dist < (isReacting ? 1.2 : 0.65)) {
                    currentBonds.push([p.pos.clone(), p2.pos.clone()]);
                }
            }
        });

        setBonds(currentBonds.slice(0, 12));
    });

    return (
        <group>
            {/* 3D Containment Chamber Wireframe */}
            <mesh>
                <boxGeometry args={[boxSize * 2, boxSize * 2, boxSize * 2]} />
                <meshBasicMaterial color={isReacting ? '#f59e0b' : '#38bdf8'} wireframe transparent opacity={0.35} />
            </mesh>

            {/* Reactive Collision Snap Lines */}
            {bonds.map(([start, end], idx) => (
                <Line
                    key={idx}
                    points={[start, end]}
                    color={isReacting ? '#f59e0b' : '#38bdf8'}
                    lineWidth={isReacting ? 2.2 : 1.0}
                    transparent
                    opacity={isReacting ? 0.9 : 0.4}
                />
            ))}

            {/* Reactant Gemstone Spheres */}
            {particles.current.map((p) => (
                <group key={p.id} position={p.pos}>
                    <Sphere args={[p.radius, 20, 20]}>
                        <meshPhysicalMaterial
                            color={p.color}
                            emissive={p.color}
                            emissiveIntensity={isReacting ? 0.9 : 0.45}
                            roughness={0.06}
                            metalness={0.2}
                            transmission={0.65}
                            ior={1.75}
                            thickness={0.8}
                            clearcoat={1.0}
                        />
                    </Sphere>
                    <Html center distanceFactor={4} occlude>
                        <div className="font-mono font-bold text-white text-[9px] pointer-events-none select-none drop-shadow-sm">
                            {p.symbol}
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}

const CollisionChamber = memo(function CollisionChamber({
    reactants,
    temperatureK,
    isReacting,
}: {
    reactants: string[];
    temperatureK: number;
    isReacting: boolean;
}) {
    return (
        <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative select-none bg-slate-900/5 cursor-grab active:cursor-grabbing">
            <Canvas
                camera={{ position: [0, 2.2, 5.2], fov: 45, near: 0.1, far: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.05,
                }}
                dpr={[1.5, 2.5]}
            >
                <ambientLight intensity={0.9} color="#f8fafc" />
                <directionalLight position={[6, 10, 8]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.8} color="#38bdf8" />
                <directionalLight position={[0, -8, 4]} intensity={0.6} color="#f59e0b" />

                <CollisionScene3D
                    reactants={reactants}
                    temperatureK={temperatureK}
                    isReacting={isReacting}
                />

                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.5} />
            </Canvas>

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[10px] font-mono text-slate-800 font-bold backdrop-blur-xs shadow-2xs">
                3D Kinetic Chamber • v_rms: {calculateMolecularVelocity(18, temperatureK)} m/s
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
        // Approximation: 10g reactant produces theoretical product
        const moles = reactantMassGrams / 18.0;
        const theoreticalProductGrams = (moles * 18.0).toFixed(2);
        return {
            moles: moles.toFixed(3),
            theoreticalProductGrams,
        };
    }, [currentReaction, reactantMassGrams]);

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
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-50 font-mono text-slate-900 select-none overflow-y-auto matrix-grid-bg">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase text-amber-700">
                        THERMOCHEMICAL KINETIC REACTOR & COLLISION CHAMBER
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Reactant Chamber Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left: Reactant Matrix Selection */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="uppercase font-bold text-slate-900">Select Reactants (1-3)</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{selectedElements.length} / 3 Active</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        {reactiveElements.map((symbol) => {
                            const isSelected = selectedElements.includes(symbol);
                            const el = elements.find((e) => e.symbol === symbol);
                            const color = el ? getCategoryColor(el.category) : '#0284c7';

                            return (
                                <button
                                    key={symbol}
                                    onClick={() => toggleElement(symbol)}
                                    className={`p-2 rounded-lg flex flex-col items-center justify-center border transition-all ${
                                        isSelected
                                            ? 'bg-amber-100 border-amber-500 shadow-sm scale-105'
                                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                    }`}
                                >
                                    <span className="text-xs font-extrabold" style={{ color: isSelected ? '#b45309' : color }}>
                                        {symbol}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-mono">
                                        {el?.atomicNumber ?? ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Temperature Controller */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1 text-slate-600">
                                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                                Chamber Temperature:
                            </span>
                            <span className="font-bold text-amber-700">
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
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>100 K (Cryo)</span>
                            <span>298 K (STP)</span>
                            <span>3000 K (Plasma)</span>
                        </div>
                    </div>

                    {/* Quick Preset Library */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Classic Reaction Presets:</span>
                        <div className="flex gap-1 flex-wrap">
                            {ALL_REACTIONS.slice(0, 6).map((rxn) => (
                                <button
                                    key={rxn.id}
                                    onClick={() => handleLoadPreset(rxn)}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-50 border border-slate-200 text-[9px] font-bold text-slate-700"
                                >
                                    {rxn.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center & Right: Reaction Kinetics Diagram & Synthesis Chamber */}
                <div className="lg:col-span-2 p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-sm">
                    {/* Live Particle Collision Chamber */}
                    <CollisionChamber
                        reactants={selectedElements}
                        temperatureK={reactionTempK}
                        isReacting={isReacting}
                    />

                    {currentReaction && thermo ? (
                        <div className="space-y-3">
                            {/* Equation Banner */}
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-center space-y-1">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] text-amber-700 uppercase font-bold tracking-widest">
                                        {currentReaction.name} • {currentReaction.type.toUpperCase()}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${thermo.isSpontaneous ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                                        {thermo.isSpontaneous ? 'Spontaneous (ΔG < 0)' : 'Non-spontaneous (ΔG > 0)'}
                                    </span>
                                </div>
                                <div className="text-xl font-black text-slate-900 tracking-wide">
                                    {currentReaction.equation}
                                </div>
                            </div>

                            {/* Thermodynamic State Functions Matrix */}
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                                    <span className="text-[9px] text-slate-500 uppercase block">Enthalpy (ΔH°)</span>
                                    <strong className={thermo.deltaH < 0 ? 'text-amber-600' : 'text-sky-600'}>
                                        {thermo.deltaH > 0 ? `+${thermo.deltaH}` : thermo.deltaH} kJ/mol
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                                    <span className="text-[9px] text-slate-500 uppercase block">Entropy (ΔS°)</span>
                                    <strong className="text-purple-700">
                                        {thermo.deltaS > 0 ? `+${thermo.deltaS}` : thermo.deltaS} J/K
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                                    <span className="text-[9px] text-slate-500 uppercase block">Gibbs (ΔG°)</span>
                                    <strong className={thermo.deltaG < 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                        {thermo.deltaG.toFixed(1)} kJ/mol
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                                    <span className="text-[9px] text-slate-500 uppercase block">Rate Mult</span>
                                    <strong className="text-sky-700">
                                        {thermo.rateMultiplier.toFixed(2)}x
                                    </strong>
                                </div>
                            </div>

                            {/* Stoichiometric Yield Calculator */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-slate-500" />
                                    <span>Reactant Input:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={reactantMassGrams}
                                        onChange={(e) => setReactantMassGrams(Number(e.target.value))}
                                        className="w-16 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs font-bold text-slate-800"
                                    />
                                    <span>grams</span>
                                </div>
                                <div>
                                    <span>Theoretical Product: </span>
                                    <strong className="text-emerald-700">{yieldStats?.theoreticalProductGrams} g</strong>
                                </div>
                            </div>

                            {/* Action Trigger Button */}
                            <button
                                onClick={handleTriggerReaction}
                                disabled={isReacting}
                                className={`w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md ${
                                    isReacting
                                        ? 'bg-amber-600 text-white animate-pulse'
                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                }`}
                            >
                                <Flame className={`w-4 h-4 ${isReacting ? 'animate-bounce' : ''}`} />
                                {isReacting ? 'Simulating High-Enthalpy Reaction...' : 'Initiate Thermochemical Reaction'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                            <Activity className="w-8 h-8 text-slate-300 animate-pulse" />
                            <p className="text-xs text-slate-600">No known thermochemical reaction between selected reactants.</p>
                            <p className="text-[10px] text-slate-400">Try combining Hydrogen (H) + Oxygen (O) or Sodium (Na) + Chlorine (Cl).</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
