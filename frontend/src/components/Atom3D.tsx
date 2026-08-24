import { useRef, useMemo, memo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html, Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { createFresnelMaterial } from '@/shaders/fresnelShader';
import { createVolumetricOrbitalMaterial } from '@/shaders/orbitalShader';
import { disposeHierarchy } from '@/lib/threeDisposal';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

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

const ORBIT_POINTS = 80;

// Scientific Laboratory Glowing Core with Optical Glass Transmission and Chromatic Fresnel Refraction
const GlowingSphere = memo(function GlowingSphere({
    color, size, position, glowColor = '#38bdf8'
}: { color: string; size: number; position?: [number, number, number]; glowColor?: string; emissiveIntensity?: number }) {
    const fresnelMat = useMemo(() => createFresnelMaterial(color, glowColor, 2.2), [color, glowColor]);

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
            {/* High-Refraction Optical Quartz Core */}
            <Sphere args={[size * 0.96, 32, 32]}>
                <meshPhysicalMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.65}
                    metalness={0.12}
                    roughness={0.08}
                    clearcoat={1.0}
                    clearcoatRoughness={0.04}
                    reflectivity={0.95}
                    transmission={0.65}
                    ior={1.65}
                    thickness={1.2}
                    depthWrite={true}
                    depthTest={true}
                />
            </Sphere>
            {/* Delicate Spectral Fresnel Atmosphere */}
            <Sphere args={[size * 1.04, 32, 32]} material={fresnelMat} />
        </group>
    );
});

// Volumetric S orbital (spherical quantum harmonic)
const SOrbital = memo(function SOrbital({ radius, color }: { radius: number; color: string }) {
    const material = useMemo(() => createVolumetricOrbitalMaterial(color, 0.22, '#ffffff', 0), [color]);

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
        <Sphere args={[radius, 32, 32]} material={material} />
    );
});

// Volumetric P orbital
const POrbital = memo(function POrbital({ radius, color, axis }: { radius: number; color: string; axis: 'x' | 'y' | 'z' }) {
    const rotation: [number, number, number] =
        axis === 'x' ? [0, 0, Math.PI / 2] :
            axis === 'y' ? [0, 0, 0] :
                [Math.PI / 2, 0, 0];

    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.18, '#ffffff', 1), [color]);

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
            <Sphere args={[radius * 0.55, 24, 24]} position={[0, radius * 0.75, 0]} material={mat} />
            <Sphere args={[radius * 0.55, 24, 24]} position={[0, -radius * 0.75, 0]} material={mat} />
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
    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.16, '#ffffff', 2), [color]);

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
            <Sphere args={[lobeSize, 20, 20]} position={[lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 20, 20]} position={[-lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 20, 20]} position={[lobeOffset, -lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 20, 20]} position={[-lobeOffset, -lobeOffset, 0]} material={mat} />
        </group>
    );
});

// Volumetric F orbital (8-lobed quantum octupole harmonic)
const FOrbital = memo(function FOrbital({ radius, color, rotation = [0, 0, 0] }: { radius: number; color: string; rotation?: [number, number, number] }) {
    const lobeSize = radius * 0.32;
    const offset = radius * 0.52;
    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.14, '#ffffff', 3), [color]);

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
            <Sphere args={[lobeSize, 16, 16]} position={[offset, offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[-offset, offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[offset, -offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[-offset, -offset, offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[offset, offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[-offset, offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[offset, -offset, -offset]} material={mat} />
            <Sphere args={[lobeSize, 16, 16]} position={[-offset, -offset, -offset]} material={mat} />
        </group>
    );
});

// Orbital clouds
const OrbitalClouds = memo(function OrbitalClouds({ electrons }: { electrons: number[]; elementColor?: string }) {
    const sColor = '#0284c7';
    const pColor = '#be185d';
    const dColor = '#d97706';
    const fColor = '#7c3aed';

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

// High-fidelity Nucleus with Ruby & Sapphire subatomic gemstones and optical depth
const Nucleus = memo(function Nucleus({ protons, neutrons, color, symbol, showParticles }: {
    protons: number;
    neutrons: number;
    color: string;
    symbol: string;
    showParticles: boolean;
}) {
    const nucleusRef = useRef<THREE.Group>(null);
    const particleMeshesRef = useRef<(THREE.Mesh | null)[]>([]);
    const total = Math.min(protons + neutrons, 48);

    const particles = useMemo(() => {
        const pts: { pos: [number, number, number]; isProton: boolean; phase: number }[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio phyllotaxis angle

        for (let i = 0; i < total; i++) {
            const y = 1 - (i / (total - 1 || 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const scale = 0.56;

            pts.push({
                pos: [
                    Math.cos(theta) * radius * scale,
                    y * scale,
                    Math.sin(theta) * radius * scale
                ],
                isProton: i < (protons / (protons + neutrons || 1)) * total,
                phase: i * 1.37
            });
        }
        return pts;
    }, [protons, neutrons, total]);

    useFrame(({ clock }, delta) => {
        const t = clock.getElapsedTime();
        if (nucleusRef.current) {
            nucleusRef.current.rotation.y += delta * 0.22;
            nucleusRef.current.rotation.x += delta * 0.11;

            // Micro-pulsating strong nuclear force breathing
            const pulse = 1.0 + 0.025 * Math.sin(t * 3.5);
            nucleusRef.current.scale.set(pulse, pulse, pulse);
        }

        // Subatomic thermal jiggle
        if (showParticles) {
            particles.forEach((p, i) => {
                const mesh = particleMeshesRef.current[i];
                if (mesh) {
                    const jx = Math.sin(t * 5.0 + p.phase) * 0.015;
                    const jy = Math.cos(t * 4.5 + p.phase) * 0.015;
                    const jz = Math.sin(t * 5.8 + p.phase) * 0.015;
                    mesh.position.set(p.pos[0] + jx, p.pos[1] + jy, p.pos[2] + jz);
                }
            });
        }
    });

    return (
        <group ref={nucleusRef}>
            {/* Subtle Strong Force Gluon Aura */}
            <mesh scale={showParticles ? 1.35 : 1.1}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} />
            </mesh>

            {showParticles ? (
                <group>
                    {particles.map((p, i) => (
                        <Sphere
                            key={i}
                            ref={(el) => { particleMeshesRef.current[i] = el; }}
                            args={[0.13, 24, 24]}
                            position={p.pos}
                        >
                            {/* Rich Optical Gemstone Materials (Ruby for p+, Sapphire for n0) */}
                            <meshPhysicalMaterial
                                color={p.isProton ? '#991b1b' : '#0369a1'}
                                emissive={p.isProton ? '#be123c' : '#0284c7'}
                                emissiveIntensity={0.35}
                                metalness={0.15}
                                roughness={0.06}
                                transmission={0.65}
                                ior={1.72}
                                thickness={0.8}
                                clearcoat={1.0}
                                clearcoatRoughness={0.03}
                                reflectivity={0.95}
                                depthWrite={true}
                                depthTest={true}
                            />
                        </Sphere>
                    ))}
                    {/* Scientific Telemetry Badge */}
                    <Html center distanceFactor={5} position={[0, -1.0, 0]} occlude>
                        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 border border-black/[0.08] text-[10px] font-mono pointer-events-none backdrop-blur-md whitespace-nowrap shadow-xs font-semibold text-slate-700">
                            <span className="text-rose-700 font-bold">{protons}p⁺</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-sky-700 font-bold">{neutrons}n⁰</span>
                        </div>
                    </Html>
                </group>
            ) : (
                <>
                    <GlowingSphere size={0.7} color={color} glowColor={color} position={[0, 0, 0]} />
                    <Html center distanceFactor={4} occlude>
                        <div
                            className="font-bold pointer-events-none select-none tracking-tight leading-none font-mono"
                            style={{
                                fontSize: symbol.length > 2 ? '20px' : '26px',
                                color: '#ffffff',
                                textShadow: `0 1px 8px rgba(0,0,0,0.6)`,
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

// Interactive Orbital Shell guide rings with hairline precision, telemetry, and electrons locked on the path
interface OrbitalShellProps {
    radius: number;
    electronCount: number;
    shellIndex: number;
    color: string;
    tiltX: number;
    tiltZ: number;
    isValence?: boolean;
    isFocused?: boolean;
    isPaused?: boolean;
    speedMultiplier?: number;
    onHover?: (index: number | null) => void;
}

const OrbitalShell = memo(function OrbitalShell({
    radius,
    electronCount,
    shellIndex,
    color,
    tiltX,
    tiltZ,
    isValence = false,
    isFocused = false,
    isPaused = false,
    speedMultiplier = 1,
    onHover,
}: OrbitalShellProps) {
    const groupRef = useRef<THREE.Group>(null);
    const electronGroupRef = useRef<THREE.Group>(null);
    const shellName = SHELL_NAMES[shellIndex] || `n=${shellIndex + 1}`;

    const orbitPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= ORBIT_POINTS; i++) {
            const angle = (i / ORBIT_POINTS) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        return points;
    }, [radius]);

    const displayCount = Math.min(electronCount, 16);
    const speed = 1.2 / Math.sqrt(shellIndex + 1);

    // Orbiting rotation of electrons along the track
    useFrame((_, delta) => {
        if (!isPaused && electronGroupRef.current) {
            electronGroupRef.current.rotation.y += delta * speed * speedMultiplier;
        }
    });

    const electronAngles = useMemo(() => {
        return Array.from({ length: displayCount }, (_, i) => (i / Math.max(displayCount, 1)) * Math.PI * 2);
    }, [displayCount]);

    const valenceColor = '#f59e0b';

    return (
        <group ref={groupRef} rotation={[tiltX, 0, tiltZ]}>
            {/* Razor-Sharp Hairline Crystalline Orbital Path */}
            <Line
                points={orbitPoints}
                color={isFocused ? '#ffffff' : isValence ? valenceColor : color}
                lineWidth={isFocused ? 2.2 : 1.2}
                transparent
                opacity={isFocused ? 0.95 : 0.38}
            />

            {/* Rotating Electrons Locked Exactly on the Orbital Track */}
            <group ref={electronGroupRef}>
                {electronAngles.map((angle, idx) => (
                    <group
                        key={idx}
                        position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                    >
                        <Sphere args={[isFocused ? 0.11 : isValence ? 0.088 : 0.076, 24, 24]}>
                            <meshPhysicalMaterial
                                color={isFocused ? '#ffffff' : isValence ? valenceColor : color}
                                emissive={isFocused ? '#ffffff' : isValence ? '#d97706' : color}
                                emissiveIntensity={isFocused ? 1.4 : isValence ? 0.95 : 0.75}
                                roughness={0.04}
                                metalness={0.18}
                                transmission={0.65}
                                ior={2.1}
                                thickness={0.7}
                                clearcoat={1.0}
                                clearcoatRoughness={0.02}
                                reflectivity={0.95}
                            />
                        </Sphere>
                    </group>
                ))}
            </group>

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
                    className={cn(
                        "cursor-pointer select-none px-2 py-0.5 rounded-full border text-[9px] font-mono transition-all backdrop-blur-md shadow-xs font-semibold",
                        isFocused
                            ? "bg-[#16a875] text-white border-[#16a875] scale-105 shadow-sm"
                            : "bg-white/90 border-slate-200/80 text-slate-600 hover:border-[#16a875] hover:text-[#16a875]"
                    )}
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

    const { pointer } = useThree();

    useFrame((_, delta) => {
        if (!groupRef.current || isPaused) return;
        // Ambient smooth axial spin
        groupRef.current.rotation.y += 0.003 * animationSpeed;

        // Interactive magnetic cursor-hand parallax tilt
        const targetTiltX = -pointer.y * 0.25;
        const targetTiltZ = pointer.x * 0.25;
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetTiltX, 3.5, delta);
        groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetTiltZ, 3.5, delta);
    });

    // Clean unmount memory disposal
    useEffect(() => {
        const node = groupRef.current;
        return () => {
            disposeHierarchy(node);
        };
    }, []);

    return (
        <Float speed={1.0} rotationIntensity={0.04} floatIntensity={0.08}>
            <group ref={groupRef} scale={0}>
                {/* Laboratory Core Luminescence */}
                <pointLight position={[0, 0, 0]} intensity={2.0} color={color} distance={20} decay={1.8} />
                <pointLight position={[0, 4, 3]} intensity={0.9} color="#ffffff" distance={15} decay={2} />
                <pointLight position={[0, -3, -4]} intensity={1.0} color={color} distance={15} decay={2} />

                {showOrbitals && <OrbitalClouds electrons={electrons} elementColor={color} />}

                <Nucleus
                    protons={protons}
                    neutrons={neutrons}
                    color={color}
                    symbol={symbol}
                    showParticles={showParticles}
                />

                {!showOrbitals && electrons.map((count, i) => (
                    <OrbitalShell
                        key={i}
                        radius={1.1 + i * 0.58}
                        electronCount={count}
                        shellIndex={i}
                        color={color}
                        tiltX={orbitalTilts[i % orbitalTilts.length]?.x || Math.PI / 4}
                        tiltZ={orbitalTilts[i % orbitalTilts.length]?.z || 0}
                        isValence={i === electrons.length - 1}
                        isFocused={focusedShell === i}
                        isPaused={isPaused}
                        speedMultiplier={animationSpeed}
                        onHover={setFocusedShell}
                    />
                ))}
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
        <div className="w-full h-full min-h-[380px] relative select-none bg-transparent cursor-grab active:cursor-grabbing">
            <Canvas
                camera={{ position: [0, 0, 12], fov: 48, near: 0.1, far: 150 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.05
                }}
                style={{ background: 'transparent' }}
                dpr={[1, 2]}
            >
                <CameraPresetController preset={cameraPreset} />
                
                {/* Subtle Sub-Micron Quantum Studio Energy Motes */}
                <Sparkles count={35} scale={14} size={1.8} speed={0.25} opacity={0.3} color={color} />
                
                {/* Professional Multi-Point Studio Lighting Rig */}
                {/* 1. Studio Ambient Base */}
                <ambientLight intensity={0.9} color="#f8fafc" />
                {/* 2. Omnidirectional Hemisphere Light */}
                <hemisphereLight skyColor="#f8fafc" groundColor="#1e293b" intensity={0.85} />
                {/* 3. Key Directional Light for crisp specular highlights */}
                <directionalLight position={[8, 12, 10]} intensity={1.6} color="#ffffff" />
                {/* 4. Cool Cyan Fill Light */}
                <directionalLight position={[-10, -6, -8]} intensity={0.8} color="#38bdf8" />
                {/* 5. Warm Amber Fill Light */}
                <directionalLight position={[8, -8, -6]} intensity={0.65} color="#f59e0b" />
                {/* 6. Dynamic Rim / Backlight */}
                <directionalLight position={[0, 8, -12]} intensity={1.6} color="#818cf8" />
                {/* 7. Bottom Rim Bounce Light */}
                <directionalLight position={[0, -10, 4]} intensity={0.6} color="#06b6d4" />

                {/* Ground Stage Halo Pedestal */}
                <mesh position={[0, -5.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.5, 7.5, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} />
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
                    enableDamping={true}
                    dampingFactor={0.06}
                    rotateSpeed={1.0}
                    panSpeed={0.8}
                    minDistance={3.0}
                    maxDistance={32}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.2}
                />

                {/* Photometric Bloom & Subtle Vignette */}
                {enableBloom && (
                    <EffectComposer multisampling={0} disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.75}
                            luminanceSmoothing={0.3}
                            intensity={0.45}
                            mipmapBlur
                        />
                        <Vignette eskil={false} offset={0.12} darkness={0.06} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
