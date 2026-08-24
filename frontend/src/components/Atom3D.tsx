import { useRef, useMemo, memo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { createFresnelMaterial } from '@/shaders/fresnelShader';
import { createVolumetricOrbitalMaterial } from '@/shaders/orbitalShader';
import { disposeHierarchy } from '@/lib/threeDisposal';
import { audioEngine } from '@/lib/audioEngine';

export type CameraPreset = '3d' | 'top' | 'side' | 'iso' | 'reset';

interface Atom3DProps {
    protons: number;
    neutrons: number;
    electrons: number[];
    color: string;
    symbol: string;
    zoom?: number;
    showOrbitals?: boolean;
    showNucleusDetail?: boolean;
    animationSpeed?: number; // 0.1 to 3, default 1
    isPaused?: boolean; // Pause all animations
    autoRotate?: boolean; // Cinematic auto-orbit
    enableBloom?: boolean; // Post-processing bloom
    cameraPreset?: CameraPreset;
    onSelectShell?: (shellIndex: number | null) => void;
}

// Shell letter names according to Bohr quantum numbers n=1..7
const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

// Optimized segment resolution
const SPHERE_SEGMENTS = 24;
const ORBIT_POINTS = 80;

// Glowing sphere with an opaque physical core (depth-writing) and an outer luminous Fresnel rim
const GlowingSphere = memo(function GlowingSphere({
    color, size, position, glowColor = '#38bdf8', emissiveIntensity = 1.2
}: { color: string; size: number; position?: [number, number, number]; glowColor?: string; emissiveIntensity?: number }) {
    const fresnelMat = useMemo(() => createFresnelMaterial(color, glowColor, 1.8), [color, glowColor]);

    useEffect(() => {
        return () => {
            fresnelMat.dispose();
        };
    }, [fresnelMat]);

    useFrame((_, delta) => {
        if (fresnelMat.uniforms?.uTime) {
            fresnelMat.uniforms.uTime.value += delta;
        }
    });

    return (
        <group position={position}>
            {/* Solid inner core for authentic depth occlusion with radiant emission */}
            <Sphere args={[size * 0.95, SPHERE_SEGMENTS, SPHERE_SEGMENTS]}>
                <meshPhysicalMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={emissiveIntensity * 1.2}
                    metalness={0.3}
                    roughness={0.12}
                    clearcoat={1}
                    clearcoatRoughness={0.08}
                    reflectivity={0.9}
                    transmission={0.05}
                    ior={1.4}
                    depthWrite={true}
                    depthTest={true}
                />
            </Sphere>
            {/* Luminous outer Fresnel atmosphere */}
            <Sphere args={[size * 1.06, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} material={fresnelMat} />
        </group>
    );
});

// Volumetric S orbital (spherical quantum harmonic)
const SOrbital = memo(function SOrbital({ radius, color }: { radius: number; color: string }) {
    const material = useMemo(() => createVolumetricOrbitalMaterial(color, 0.32, '#ffffff', 0), [color]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    useFrame((_, delta) => {
        if (material.uniforms?.uTime) {
            material.uniforms.uTime.value += delta;
        }
    });

    return (
        <Sphere args={[radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} material={material} />
    );
});

// Volumetric P orbital
const POrbital = memo(function POrbital({ radius, color, axis }: { radius: number; color: string; axis: 'x' | 'y' | 'z' }) {
    const rotation: [number, number, number] =
        axis === 'x' ? [0, 0, Math.PI / 2] :
            axis === 'y' ? [0, 0, 0] :
                [Math.PI / 2, 0, 0];

    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.26, '#ffffff', 1), [color]);

    useEffect(() => {
        return () => {
            mat.dispose();
        };
    }, [mat]);

    useFrame((_, delta) => {
        if (mat.uniforms?.uTime) {
            mat.uniforms.uTime.value += delta;
        }
    });

    return (
        <group rotation={rotation}>
            <Sphere args={[radius * 0.55, 18, 18]} position={[0, radius * 0.75, 0]} material={mat} />
            <Sphere args={[radius * 0.55, 18, 18]} position={[0, -radius * 0.75, 0]} material={mat} />
        </group>
    );
});

// Volumetric D orbital
const DOrbital = memo(function DOrbital({ radius, color, type }: { radius: number; color: string; type: 'xy' | 'xz' | 'yz' }) {
    const rotation: [number, number, number] =
        type === 'xy' ? [0, 0, 0] :
            type === 'xz' ? [Math.PI / 2, 0, 0] :
                [0, Math.PI / 2, 0];

    const lobeSize = radius * 0.42;
    const lobeOffset = radius * 0.62;
    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.22, '#ffffff', 2), [color]);

    useEffect(() => {
        return () => {
            mat.dispose();
        };
    }, [mat]);

    useFrame((_, delta) => {
        if (mat.uniforms?.uTime) {
            mat.uniforms.uTime.value += delta;
        }
    });

    return (
        <group rotation={rotation}>
            <Sphere args={[lobeSize, 14, 14]} position={[lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[-lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[lobeOffset, -lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[-lobeOffset, -lobeOffset, 0]} material={mat} />
        </group>
    );
});

// Volumetric F orbital (8-lobed quantum octupole harmonic)
const FOrbital = memo(function FOrbital({ radius, color, rotation = [0, 0, 0] }: { radius: number; color: string; rotation?: [number, number, number] }) {
    const lobeSize = radius * 0.32;
    const offset = radius * 0.52;
    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.2, '#ffffff', 3), [color]);

    useEffect(() => {
        return () => {
            mat.dispose();
        };
    }, [mat]);

    useFrame((_, delta) => {
        if (mat.uniforms?.uTime) {
            mat.uniforms.uTime.value += delta;
        }
    });

    return (
        <group rotation={rotation}>
            <Sphere args={[lobeSize, 12, 12]} position={[offset, offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[-offset, offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[offset, -offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[-offset, -offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[offset, offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[-offset, offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[offset, -offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 12, 12]} position={[-offset, -offset, -offset]} material={mat} />
        </group>
    );
});

// Orbital clouds
const OrbitalClouds = memo(function OrbitalClouds({ electrons }: { electrons: number[]; elementColor?: string }) {
    const sColor = '#38bdf8';
    const pColor = '#ec4899';
    const dColor = '#eab308';
    const fColor = '#a855f7';

    const totalElectrons = electrons.reduce((a, b) => a + b, 0);

    return (
        <group>
            {totalElectrons >= 1 && <SOrbital radius={0.9} color={sColor} />}
            {totalElectrons >= 3 && <SOrbital radius={1.4} color={sColor} />}
            {totalElectrons >= 5 && <POrbital radius={1.7} color={pColor} axis="x" />}
            {totalElectrons >= 6 && <POrbital radius={1.7} color={pColor} axis="y" />}
            {totalElectrons >= 7 && <POrbital radius={1.7} color={pColor} axis="z" />}
            {totalElectrons >= 11 && <SOrbital radius={2.2} color={sColor} />}
            {totalElectrons >= 13 && <POrbital radius={2.5} color={pColor} axis="x" />}
            {totalElectrons >= 14 && <POrbital radius={2.5} color={pColor} axis="y" />}
            {totalElectrons >= 15 && <POrbital radius={2.5} color={pColor} axis="z" />}
            {totalElectrons >= 21 && <DOrbital radius={2.2} color={dColor} type="xy" />}
            {totalElectrons >= 22 && <DOrbital radius={2.2} color={dColor} type="xz" />}
            {totalElectrons >= 23 && <DOrbital radius={2.2} color={dColor} type="yz" />}
            {totalElectrons >= 57 && <FOrbital radius={3.0} color={fColor} rotation={[0, 0, 0]} />}
            {totalElectrons >= 58 && <FOrbital radius={3.0} color={fColor} rotation={[Math.PI / 4, Math.PI / 4, 0]} />}
            {totalElectrons >= 59 && <FOrbital radius={3.0} color={fColor} rotation={[0, Math.PI / 4, Math.PI / 4]} />}
        </group>
    );
});

// High-fidelity Nucleus with dual-mode representation, gluon forcefield halo, and golden spiral packing
const Nucleus = memo(function Nucleus({ protons, neutrons, color, symbol, showParticles }: {
    protons: number;
    neutrons: number;
    color: string;
    symbol: string;
    showParticles: boolean;
}) {
    const nucleusRef = useRef<THREE.Group>(null);
    const total = Math.min(protons + neutrons, 48);

    const particles = useMemo(() => {
        const pts: { pos: [number, number, number]; isProton: boolean }[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio phyllotaxis angle

        for (let i = 0; i < total; i++) {
            const y = 1 - (i / (total - 1 || 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const scale = 0.58;

            // Organic quantum packing jitter
            const jitter = 0.04 * Math.sin(i * 3.7);

            pts.push({
                pos: [
                    Math.cos(theta) * radius * (scale + jitter),
                    y * (scale + jitter),
                    Math.sin(theta) * radius * (scale + jitter)
                ],
                isProton: i < (protons / (protons + neutrons || 1)) * total
            });
        }
        return pts;
    }, [protons, neutrons, total]);

    useFrame(({ clock }, delta) => {
        if (nucleusRef.current) {
            nucleusRef.current.rotation.y += delta * 0.25;
            nucleusRef.current.rotation.x += delta * 0.12;

            // Micro-pulsating strong nuclear force breathing
            const pulse = 1.0 + 0.03 * Math.sin(clock.getElapsedTime() * 4.0);
            nucleusRef.current.scale.set(pulse, pulse, pulse);
        }
    });

    return (
        <group ref={nucleusRef}>
            {/* Strong Nuclear Force Gluon Energy Halo */}
            <mesh scale={showParticles ? 1.4 : 1.1}>
                <sphereGeometry args={[0.7, 24, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.BackSide} />
            </mesh>

            {showParticles ? (
                <group>
                    {particles.map((p, i) => (
                        <Sphere
                            key={i}
                            args={[0.13, 16, 16]}
                            position={p.pos}
                        >
                            <meshPhysicalMaterial
                                color={p.isProton ? '#ff3366' : '#38bdf8'}
                                emissive={p.isProton ? '#e11d48' : '#0284c7'}
                                emissiveIntensity={1.6}
                                metalness={0.35}
                                roughness={0.08}
                                clearcoat={1}
                                clearcoatRoughness={0.04}
                                depthWrite={true}
                                depthTest={true}
                            />
                        </Sphere>
                    ))}
                    {/* Proton / Neutron counter badge with occlusion */}
                    <Html center distanceFactor={5} position={[0, -0.95, 0]} occlude>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border border-slate-300 text-[10px] font-mono pointer-events-none backdrop-blur-md whitespace-nowrap shadow-md">
                            <span className="text-rose-600 font-bold">{protons}p⁺</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-sky-700 font-bold">{neutrons}n⁰</span>
                        </div>
                    </Html>
                </group>
            ) : (
                <>
                    <GlowingSphere size={0.68} color={color} glowColor={color} emissiveIntensity={1.4} position={[0, 0, 0]} />
                    <Html center distanceFactor={4} occlude>
                        <div
                            className="font-bold pointer-events-none select-none tracking-tight leading-none"
                            style={{
                                fontSize: symbol.length > 2 ? '20px' : '26px',
                                color: '#ffffff',
                                textShadow: `0 0 16px ${color}, 0 0 32px rgba(0,0,0,0.9)`,
                            }}
                        >
                            {symbol}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
});

// High-Performance Instanced Electron Mesh with Per-Instance Valence Colors & Real-Time Matrix Updates
interface InstancedElectronsProps {
    shells: number[];
    valenceCount: number;
    color: string;
    orbitalTilts: { x: number; z: number }[];
    isPaused?: boolean;
    speedMultiplier?: number;
    focusedShell?: number | null;
}

const InstancedElectrons = memo(function InstancedElectrons({
    shells,
    valenceCount,
    color,
    orbitalTilts,
    isPaused = false,
    speedMultiplier = 1,
    focusedShell = null,
}: InstancedElectronsProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Pre-calculate shell distributions and initial phase offsets
    const electronData = useMemo(() => {
        const data: { shellIndex: number; radius: number; speed: number; phase: number; isValence: boolean; tiltX: number; tiltZ: number }[] = [];
        const totalElectrons = shells.reduce((a, b) => a + b, 0);
        let counted = 0;

        shells.forEach((count, sIdx) => {
            const displayCount = Math.min(count, 14);
            const radius = 1.1 + sIdx * 0.58;
            const speed = 1.4 / Math.sqrt(sIdx + 1);
            const tilt = orbitalTilts[sIdx % orbitalTilts.length] || { x: Math.PI / 4, z: 0 };

            for (let i = 0; i < displayCount; i++) {
                const isValence = (totalElectrons - counted) <= valenceCount;
                data.push({
                    shellIndex: sIdx,
                    radius,
                    speed,
                    phase: (i / Math.max(displayCount, 1)) * Math.PI * 2,
                    isValence,
                    tiltX: tilt.x,
                    tiltZ: tilt.z,
                });
                counted++;
            }
        });
        return data;
    }, [shells, valenceCount, orbitalTilts]);

    const defaultColor = useMemo(() => new THREE.Color(color || '#38bdf8'), [color]);
    const valenceColor = useMemo(() => new THREE.Color('#f59e0b'), []);
    const focusColor = useMemo(() => new THREE.Color('#ffffff'), []);

    // Set per-instance colors once on data change or focus change
    useEffect(() => {
        if (!meshRef.current) return;
        electronData.forEach((el, i) => {
            const isShellFocused = focusedShell === el.shellIndex;
            const c = isShellFocused ? focusColor : el.isValence ? valenceColor : defaultColor;
            meshRef.current.setColorAt(i, c);
        });
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [electronData, defaultColor, valenceColor, focusColor, focusedShell]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = isPaused ? 0 : clock.getElapsedTime() * speedMultiplier;

        electronData.forEach((el, i) => {
            const angle = el.phase + t * el.speed;
            const isShellFocused = focusedShell === el.shellIndex;

            dummy.position.set(
                Math.cos(angle) * el.radius,
                Math.sin(angle) * Math.sin(el.tiltX) * el.radius,
                Math.sin(angle) * Math.cos(el.tiltZ) * el.radius
            );
            dummy.scale.setScalar(isShellFocused ? 0.11 : el.isValence ? 0.09 : 0.075);
            dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (electronData.length === 0) return null;

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, electronData.length]}
        >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
                roughness={0.15}
                metalness={0.85}
                emissive={color}
                emissiveIntensity={1.8}
            />
        </instancedMesh>
    );
});

// Interactive Orbital Shell guide rings with realistic tilts and labels
const OrbitalShell = memo(function OrbitalShell({
    radius,
    electronCount,
    shellIndex,
    color,
    tiltX,
    tiltZ,
    isFocused = false,
    onHover,
}: {
    radius: number;
    electronCount: number;
    shellIndex: number;
    color: string;
    tiltX: number;
    tiltZ: number;
    isFocused?: boolean;
    onHover?: (index: number | null) => void;
}) {
    const shellName = SHELL_NAMES[shellIndex] || `n=${shellIndex + 1}`;

    const orbitPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= ORBIT_POINTS; i++) {
            const angle = (i / ORBIT_POINTS) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        return points;
    }, [radius]);

    return (
        <group rotation={[tiltX, 0, tiltZ]}>
            <Line
                points={orbitPoints}
                color={isFocused ? '#ffffff' : color}
                lineWidth={isFocused ? 3.0 : 1.8}
                transparent
                opacity={isFocused ? 0.95 : 0.45}
            />

            {/* Subtle Shell Marker on ring edge with occlusion */}
            <Html
                position={[radius, 0, 0]}
                center
                distanceFactor={7}
                occlude
            >
                <div
                    onMouseEnter={() => onHover && onHover(shellIndex)}
                    onMouseLeave={() => onHover && onHover(null)}
                    className="cursor-pointer select-none px-2 py-0.5 rounded-md bg-white/95 border border-slate-300 hover:border-sky-500 text-[9px] font-mono text-slate-700 hover:text-sky-800 transition-all backdrop-blur-md shadow-md"
                    title={`Shell ${shellName} (n=${shellIndex + 1}): ${electronCount} electrons`}
                >
                    {shellName}:{electronCount}e⁻
                </div>
            </Html>
        </group>
    );
});

// Camera Controller for smooth preset angle transitions
function CameraPresetController({ preset = '3d' }: { preset?: CameraPreset }) {
    const { camera } = useThree();

    useEffect(() => {
        audioEngine.playClick(960);
        if (preset === 'top') {
            gsap.to(camera.position, { x: 0, y: 13, z: 0.01, duration: 1.0, ease: 'power2.out' });
        } else if (preset === 'side') {
            gsap.to(camera.position, { x: 13, y: 0, z: 0, duration: 1.0, ease: 'power2.out' });
        } else if (preset === 'iso') {
            gsap.to(camera.position, { x: 9, y: 8, z: 9, duration: 1.0, ease: 'power2.out' });
        } else if (preset === 'reset' || preset === '3d') {
            gsap.to(camera.position, { x: 0, y: 0, z: 12, duration: 1.0, ease: 'power2.out' });
        }
    }, [preset, camera]);

    return null;
}

// Main 3D Scene
const AtomScene = memo(function AtomScene({
    protons, neutrons, electrons, color, symbol,
    zoom = 1,
    showOrbitals = false, showNucleusDetail = false, animationSpeed = 1, isPaused = false,
    focusedShell, setFocusedShell
}: Atom3DProps & {
    focusedShell: number | null;
    setFocusedShell: (idx: number | null) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const showParticles = showNucleusDetail || zoom > 1.6;

    // Harmonically tilted Bohr planes
    const orbitalTilts = useMemo(() => [
        { x: Math.PI / 2.2, z: 0 },
        { x: Math.PI / 4, z: Math.PI / 3 },
        { x: Math.PI / 6, z: Math.PI / 2 },
        { x: Math.PI / 3, z: Math.PI / 5 },
        { x: Math.PI / 2.5, z: Math.PI / 4 },
        { x: Math.PI / 5, z: Math.PI / 1.5 },
        { x: Math.PI / 3.2, z: Math.PI / 2.8 },
    ], []);

    useEffect(() => {
        if (groupRef.current) {
            const targetScale = Math.min(zoom * 0.9, 2.2);
            gsap.fromTo(
                groupRef.current.scale,
                { x: 0.1, y: 0.1, z: 0.1 },
                { x: targetScale, y: targetScale, z: targetScale, duration: 0.8, ease: 'back.out(1.2)', overwrite: true }
            );
        }
    }, [protons, symbol, zoom]);

    useFrame(() => {
        if (!groupRef.current || isPaused) return;
        groupRef.current.rotation.y += 0.003 * animationSpeed;
    });

    // Clean unmount memory disposal
    useEffect(() => {
        const node = groupRef.current;
        return () => {
            disposeHierarchy(node);
        };
    }, []);

    const valenceElectrons = electrons[electrons.length - 1] || 1;

    return (
        <Float speed={1.2} rotationIntensity={0.06} floatIntensity={0.1}>
            <group ref={groupRef} scale={0}>
                {/* Radiant Core Luminescence & Dynamic Field Illumination */}
                <pointLight position={[0, 0, 0]} intensity={4.0} color={color} distance={25} decay={1.8} />
                <pointLight position={[0, 4, 3]} intensity={1.2} color="#ffffff" distance={15} decay={2} />
                <pointLight position={[0, -3, -4]} intensity={1.5} color={color} distance={15} decay={2} />

                {showOrbitals && <OrbitalClouds electrons={electrons} elementColor={color} />}

                <Nucleus
                    protons={protons}
                    neutrons={neutrons}
                    color={color}
                    symbol={symbol}
                    showParticles={showParticles}
                />

                {!showOrbitals && (
                    <>
                        <InstancedElectrons
                            shells={electrons}
                            valenceCount={valenceElectrons}
                            color={color}
                            orbitalTilts={orbitalTilts}
                            isPaused={isPaused}
                            speedMultiplier={animationSpeed}
                            focusedShell={focusedShell}
                        />

                        {electrons.map((count, i) => (
                            <OrbitalShell
                                key={i}
                                radius={1.1 + i * 0.58}
                                electronCount={count}
                                shellIndex={i}
                                color={color}
                                tiltX={orbitalTilts[i % orbitalTilts.length]?.x || Math.PI / 4}
                                tiltZ={orbitalTilts[i % orbitalTilts.length]?.z || 0}
                                isFocused={focusedShell === i}
                                onHover={setFocusedShell}
                            />
                        ))}
                    </>
                )}
            </group>
        </Float>
    );
});

// Exported component with full-stage viewport and studio lighting
export function Atom3D({
    protons, neutrons, electrons, color, symbol,
    zoom = 1,
    showOrbitals = false, showNucleusDetail = false, animationSpeed = 1, isPaused = false,
    autoRotate = false, enableBloom = true,
    cameraPreset = '3d', onSelectShell
}: Atom3DProps) {
    const [focusedShell, setFocusedShell] = useState<number | null>(null);

    const handleHoverShell = (idx: number | null) => {
        setFocusedShell(idx);
        if (onSelectShell) onSelectShell(idx);
    };

    return (
        <div className="w-full h-full min-h-[380px] relative select-none bg-transparent">
            <Canvas
                camera={{ position: [0, 0, 12], fov: 48, near: 0.1, far: 150 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true
                }}
                style={{ background: 'transparent' }}
                dpr={[1, 2]}
            >
                <CameraPresetController preset={cameraPreset} />
                
                {/* Deep Quantum Field Stars & Multi-Layer Ambient Energy Sparks */}
                <Stars radius={100} depth={60} count={800} factor={4} saturation={0.6} fade speed={0.4} />
                <Sparkles count={70} scale={16} size={3.0} speed={0.6} opacity={0.7} color={color} />
                <Sparkles count={40} scale={24} size={4.5} speed={0.3} opacity={0.4} color="#60a5fa" />
                
                {/* Professional Multi-Point Studio Lighting Rig */}
                {/* 1. Studio Ambient Base */}
                <ambientLight intensity={0.8} color="#f8fafc" />
                {/* 2. Omnidirectional Hemisphere Light (eliminates pitch-black dead zones from all 360° camera angles) */}
                <hemisphereLight skyColor="#f8fafc" groundColor="#1e1b4b" intensity={0.9} />
                {/* 3. Key Directional Light for crisp specular highlights and form definition */}
                <directionalLight position={[8, 12, 10]} intensity={1.8} color="#ffffff" />
                {/* 4. Cool Cyan Fill Light (diffuse bounce) */}
                <directionalLight position={[-10, -6, -8]} intensity={1.1} color="#38bdf8" />
                {/* 5. Warm Amber Fill Light (ground bounce) */}
                <directionalLight position={[8, -8, -6]} intensity={0.9} color="#f59e0b" />
                {/* 6. Dynamic Rim / Backlight (silhouette & orbital shell edge illumination) */}
                <directionalLight position={[0, 8, -12]} intensity={2.2} color="#818cf8" />
                {/* 7. Bottom Rim Bounce Light */}
                <directionalLight position={[0, -10, 4]} intensity={0.8} color="#06b6d4" />

                {/* Ground Radial Energy Halo Stage Pedestal */}
                <mesh position={[0, -5.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.5, 7.5, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
                </mesh>

                <AtomScene
                    protons={protons}
                    neutrons={neutrons}
                    electrons={electrons}
                    color={color}
                    symbol={symbol}
                    zoom={zoom}
                    showOrbitals={showOrbitals}
                    showNucleusDetail={showNucleusDetail}
                    animationSpeed={animationSpeed}
                    isPaused={isPaused}
                    focusedShell={focusedShell}
                    setFocusedShell={handleHoverShell}
                />

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    minDistance={3.5}
                    maxDistance={28}
                    dampingFactor={0.08}
                    rotateSpeed={0.8}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.2}
                />

                {/* Post-Processing Cinematic Bloom & Vignette */}
                {enableBloom && (
                    <EffectComposer multisampling={0} disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.85}
                            intensity={1.25}
                            mipmapBlur
                        />
                        <Vignette eskil={false} offset={0.1} darkness={0.08} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
