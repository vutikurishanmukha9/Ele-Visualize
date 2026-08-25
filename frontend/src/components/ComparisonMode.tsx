import { memo, useMemo } from 'react';
import { ChemicalElement, elements, categoryColors } from '../data/elements';
import { elementProperties } from '../data/elementProperties';
import { X, Scale, Zap, Atom, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { audioEngine } from '@/lib/audioEngine';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ComparisonModeProps {
    element1: ChemicalElement | null;
    element2: ChemicalElement | null;
    onRemoveElement: (slot: 1 | 2) => void;
}

const QUICK_PICKS = ['H', 'C', 'N', 'O', 'Na', 'Cl', 'Fe', 'Cu', 'Au', 'U'];

// High-clarity 3D atom stage for side-by-side comparison in React Three Fiber
const MiniAtomStage = memo(function MiniAtomStage({ element }: { element: ChemicalElement }) {
    const color = categoryColors[element.category] || '#0284c7';

    const shellData = useMemo(() => {
        return element.shells.map((count, idx) => {
            const radius = 0.95 + idx * 0.48;
            const speed = 1.0 / Math.sqrt(idx + 1);
            const displayCount = Math.min(count, 12);

            const points: THREE.Vector3[] = [];
            const steps = 80;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
            }

            const electronAngles = Array.from(
                { length: displayCount },
                (_, eIdx) => (eIdx / Math.max(displayCount, 1)) * Math.PI * 2
            );

            const isValence = idx === element.shells.length - 1;

            return {
                radius,
                speed,
                points,
                electronAngles,
                isValence,
                tiltX: (idx * Math.PI) / 4.5,
                tiltZ: (idx * Math.PI) / 6,
            };
        });
    }, [element.shells]);

    return (
        <div className="w-full h-44 rounded-xl bg-slate-100/90 border border-slate-200 overflow-hidden relative shadow-inner select-none cursor-grab active:cursor-grabbing">
            <Canvas
                camera={{ position: [0, 2.0, 5.2], fov: 42, near: 0.1, far: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.05,
                }}
                dpr={[1.5, 3]}
            >
                <ambientLight intensity={0.9} color="#f8fafc" />
                <directionalLight position={[6, 10, 8]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.8} color="#38bdf8" />
                <directionalLight position={[0, -8, 3]} intensity={0.6} color="#f59e0b" />

                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.8} />

                {/* Optical Quartz Nucleus */}
                <Sphere args={[0.45, 32, 32]}>
                    <meshPhysicalMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.65}
                        roughness={0.06}
                        metalness={0.15}
                        transmission={0.68}
                        ior={1.68}
                        thickness={0.9}
                        clearcoat={1.0}
                        reflectivity={0.95}
                    />
                </Sphere>

                {/* Laser-Etched Symbol Inset */}
                <Html center distanceFactor={4} occlude>
                    <div
                        className="font-mono font-bold text-white text-[13px] pointer-events-none select-none tracking-tight leading-none"
                        style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
                    >
                        {element.symbol}
                    </div>
                </Html>

                {/* Crystalline Bohr Shells */}
                {shellData.map((s, idx) => (
                    <group key={idx} rotation={[s.tiltX, 0, s.tiltZ]}>
                        <Line
                            points={s.points}
                            color={s.isValence ? '#f59e0b' : color}
                            lineWidth={1.2}
                            transparent
                            opacity={s.isValence ? 0.9 : 0.35}
                        />

                        {s.electronAngles.map((angle, eIdx) => (
                            <group
                                key={eIdx}
                                position={[Math.cos(angle) * s.radius, 0, Math.sin(angle) * s.radius]}
                            >
                                <Sphere args={[s.isValence ? 0.06 : 0.048, 20, 20]}>
                                    <meshPhysicalMaterial
                                        color={s.isValence ? '#f59e0b' : color}
                                        emissive={s.isValence ? '#d97706' : color}
                                        emissiveIntensity={0.8}
                                        roughness={0.04}
                                        metalness={0.18}
                                        transmission={0.65}
                                        ior={2.0}
                                        clearcoat={1.0}
                                    />
                                </Sphere>
                            </group>
                        ))}
                    </group>
                ))}
            </Canvas>

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-[10px] font-mono font-bold text-slate-800 backdrop-blur-xs shadow-2xs">
                {element.symbol} · {element.shells.length} shells · {element.atomicNumber}e⁻
            </div>
        </div>
    );
});

const TelemetryDeltaRow = memo(function TelemetryDeltaRow({
    label,
    val1,
    val2,
    max,
    unit = '',
}: {
    label: string;
    val1: number | null;
    val2: number | null;
    max: number;
    unit?: string;
}) {
    const p1 = val1 ? Math.min((val1 / max) * 100, 100) : 0;
    const p2 = val2 ? Math.min((val2 / max) * 100, 100) : 0;
    const diff = val1 !== null && val2 !== null ? val1 - val2 : null;
    const percentDiff = val1 !== null && val2 !== null && val2 !== 0 ? ((val1 - val2) / val2) * 100 : null;

    return (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span className="uppercase font-semibold">{label}</span>
                {diff !== null && (
                    <span className={diff > 0 ? 'text-[#087f5b] font-bold' : diff < 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                        Δ {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {unit}
                        {percentDiff !== null && Math.abs(percentDiff) < 1000 && (
                            <span className="ml-1 opacity-80">({percentDiff > 0 ? `+${percentDiff.toFixed(1)}%` : `${percentDiff.toFixed(1)}%`})</span>
                        )}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
                {/* Left Element Bar */}
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] font-bold text-sky-700">{val1 ?? 'N/A'}{unit}</span>
                    <div className="w-28 h-2 bg-slate-200 rounded overflow-hidden flex justify-end">
                        <div className="h-full bg-sky-600 transition-all duration-300" style={{ width: `${p1}%` }} />
                    </div>
                </div>

                {/* Right Element Bar */}
                <div className="flex items-center gap-2">
                    <div className="w-28 h-2 bg-slate-200 rounded overflow-hidden">
                        <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${p2}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-amber-700">{val2 ?? 'N/A'}{unit}</span>
                </div>
            </div>
        </div>
    );
});

export const ComparisonMode = memo(function ComparisonMode({
    element1,
    element2,
    onRemoveElement,
}: ComparisonModeProps) {
    const { setComparisonSlot, setCompareElement1, setCompareElement2 } = useAppStore();

    const props1 = element1 ? elementProperties[element1.atomicNumber] : null;
    const props2 = element2 ? elementProperties[element2.atomicNumber] : null;

    // Calculate Electronegativity Difference & Pauling Ionic Character
    const bondAnalysis = useMemo(() => {
        if (!props1?.electronegativity || !props2?.electronegativity) return null;
        const deltaEN = Math.abs(props1.electronegativity - props2.electronegativity);
        // Pauling Equation: % Ionic Character = 100 * (1 - exp(-0.25 * (deltaEN)^2))
        const percentIonic = Math.round(100 * (1 - Math.exp(-0.25 * Math.pow(deltaEN, 2))));
        const percentCovalent = 100 - percentIonic;

        let bondType = 'Non-polar Covalent';
        let dipoleEstimate = '0.0 D (Non-polar)';
        if (deltaEN > 2.0) {
            bondType = 'Predominantly Ionic Bond';
            dipoleEstimate = '> 6.0 D (Strong Charge Separation)';
        } else if (deltaEN > 0.5) {
            bondType = 'Polar Covalent Bond';
            dipoleEstimate = `${(deltaEN * 1.6).toFixed(2)} D (Polar Dipole)`;
        }

        // Possible Binary Formula heuristic
        let binaryFormula = '';
        if (element1 && element2) {
            const v1 = element1.shells[element1.shells.length - 1];
            const v2 = element2.shells[element2.shells.length - 1];
            binaryFormula = `${element1.symbol}${v2 > 1 && v2 < 7 ? v2 : ''}${element2.symbol}${v1 > 1 && v1 < 7 ? v1 : ''}`;
        }

        return { deltaEN, percentIonic, percentCovalent, bondType, dipoleEstimate, binaryFormula };
    }, [element1, element2, props1, props2]);

    const handleSelectQuick = (sym: string, slot: 1 | 2) => {
        audioEngine.playClick(820);
        const el = elements.find((e) => e.symbol === sym);
        if (el) setComparisonSlot(slot, el);
    };

    const handleSwapSlots = () => {
        audioEngine.playClick(940);
        const temp = element1;
        setCompareElement1(element2);
        setCompareElement2(temp);
    };

    return (
        <div className="h-full flex flex-col p-3 gap-3 bg-slate-50 font-mono text-slate-900 select-none overflow-y-auto matrix-grid-bg">
            {/* Header Title */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-sky-600 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase text-sky-700">
                        DUAL-ELEMENT 3D DIFFERENTIAL COMPARISON CONSOLE
                    </span>
                </div>
                {element1 && element2 && (
                    <button
                        onClick={handleSwapSlots}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-1 font-bold transition-colors"
                        title="Swap Slots A and B"
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Swap
                    </button>
                )}
            </div>

            {/* Element Selection & Live 3D Stages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Slot 1 */}
                <div className="p-3 rounded-xl bg-white border border-sky-300 space-y-2.5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-sky-700 font-bold uppercase flex items-center gap-1">
                                <Atom className="w-3 h-3 text-sky-600" /> Element Target A
                            </span>
                            {element1 && (
                                <button onClick={() => onRemoveElement(1)} className="text-slate-400 hover:text-slate-700">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {element1 ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black text-lg border"
                                        style={{ backgroundColor: `${categoryColors[element1.category]}18`, borderColor: categoryColors[element1.category], color: categoryColors[element1.category] }}
                                    >
                                        {element1.symbol}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{element1.name}</div>
                                        <div className="text-[10px] text-slate-500">Atomic #{element1.atomicNumber} • {element1.atomicMass.toFixed(2)} u</div>
                                    </div>
                                </div>
                                <MiniAtomStage element={element1} />
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                                Select Element A from Quick Picks below
                            </div>
                        )}
                    </div>

                    {/* Quick picks */}
                    <div className="flex gap-1 flex-wrap pt-1 border-t border-slate-100">
                        {QUICK_PICKS.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSelectQuick(s, 1)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-sky-100 border border-slate-200 text-[9px] text-slate-700 font-medium"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Slot 2 */}
                <div className="p-3 rounded-xl bg-white border border-amber-300 space-y-2.5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-1">
                                <Atom className="w-3 h-3 text-amber-600" /> Element Target B
                            </span>
                            {element2 && (
                                <button onClick={() => onRemoveElement(2)} className="text-slate-400 hover:text-slate-700">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {element2 ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black text-lg border"
                                        style={{ backgroundColor: `${categoryColors[element2.category]}18`, borderColor: categoryColors[element2.category], color: categoryColors[element2.category] }}
                                    >
                                        {element2.symbol}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{element2.name}</div>
                                        <div className="text-[10px] text-slate-500">Atomic #{element2.atomicNumber} • {element2.atomicMass.toFixed(2)} u</div>
                                    </div>
                                </div>
                                <MiniAtomStage element={element2} />
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                                Select Element B from Quick Picks below
                            </div>
                        )}
                    </div>

                    {/* Quick picks */}
                    <div className="flex gap-1 flex-wrap pt-1 border-t border-slate-100">
                        {QUICK_PICKS.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSelectQuick(s, 2)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 border border-slate-200 text-[9px] text-slate-700 font-medium"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pauling Chemical Bond Synthesizer Card */}
            {bondAnalysis && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center text-xs flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 text-slate-900 font-bold uppercase">
                            <Zap className="w-3.5 h-3.5 text-sky-600" />
                            Pauling Chemical Bonding & Dipole Synthesis
                        </span>
                        <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {bondAnalysis.bondType} (Δχ = {bondAnalysis.deltaEN.toFixed(2)})
                        </span>
                    </div>

                    {/* Progress Bar of Character */}
                    <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                        <div
                            className="bg-sky-600 flex items-center justify-center text-[8px] font-bold text-white transition-all duration-500"
                            style={{ width: `${bondAnalysis.percentCovalent}%` }}
                        >
                            {bondAnalysis.percentCovalent > 15 ? `${bondAnalysis.percentCovalent}% Covalent` : ''}
                        </div>
                        <div
                            className="bg-amber-500 flex items-center justify-center text-[8px] font-bold text-white transition-all duration-500"
                            style={{ width: `${bondAnalysis.percentIonic}%` }}
                        >
                            {bondAnalysis.percentIonic > 15 ? `${bondAnalysis.percentIonic}% Ionic` : ''}
                        </div>
                    </div>

                    {/* Dipole and Compound Telemetry */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Dipole Moment Vector (μ):</span>
                            <span className="font-bold text-sky-700">{bondAnalysis.dipoleEstimate}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Binary Compound Complex:</span>
                            <span className="font-bold text-emerald-700">{bondAnalysis.binaryFormula || 'Solid Solution'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Differential Telemetry Metrics */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Physical & Quantum Differential Comparison</span>
                <div className="space-y-1.5">
                    <TelemetryDeltaRow
                        label="Electronegativity (Pauling)"
                        val1={props1?.electronegativity ?? null}
                        val2={props2?.electronegativity ?? null}
                        max={4.0}
                    />
                    <TelemetryDeltaRow
                        label="1st Ionization Energy"
                        val1={props1?.ionizationEnergy ?? null}
                        val2={props2?.ionizationEnergy ?? null}
                        max={2400}
                        unit=" kJ/mol"
                    />
                    <TelemetryDeltaRow
                        label="Atomic Radius (Calculated)"
                        val1={props1?.atomicRadius ?? null}
                        val2={props2?.atomicRadius ?? null}
                        max={300}
                        unit=" pm"
                    />
                    <TelemetryDeltaRow
                        label="Melting Point"
                        val1={props1?.meltingPoint ?? null}
                        val2={props2?.meltingPoint ?? null}
                        max={4000}
                        unit=" K"
                    />
                    <TelemetryDeltaRow
                        label="Boiling Point"
                        val1={props1?.boilingPoint ?? null}
                        val2={props2?.boilingPoint ?? null}
                        max={6000}
                        unit=" K"
                    />
                    <TelemetryDeltaRow
                        label="Density @ STP"
                        val1={props1?.density ?? null}
                        val2={props2?.density ?? null}
                        max={25}
                        unit=" g/cm³"
                    />
                </div>
            </div>
        </div>
    );
});
