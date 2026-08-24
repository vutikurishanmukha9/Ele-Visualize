import { useRef, useMemo, memo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html, Float, Stars, Sparkles } from '@react-three/drei';
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

// High-fidelity Nucleus with dual-mode representation, gluon forcefield halo, golden spiral packing, and Brownian subatomic jiggle
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
            const scale = 0.58;

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
            nucleusRef.current.rotation.y += delta * 0.28;
            nucleusRef.current.rotation.x += delta * 0.14;

            // Micro-pulsating strong nuclear force breathing
            const pulse = 1.0 + 0.04 * Math.sin(t * 4.5);
            nucleusRef.current.scale.set(pulse, pulse, pulse);
        }

        // Subatomic Brownian jiggle
        if (showParticles) {
            particles.forEach((p, i) => {
                const mesh = particleMeshesRef.current[i];
                if (mesh) {
                    const jx = Math.sin(t * 6.0 + p.phase) * 0.022;
                    const jy = Math.cos(t * 5.2 + p.phase) * 0.022;
                    const jz = Math.sin(t * 7.1 + p.phase) * 0.022;
                    mesh.position.set(p.pos[0] + jx, p.pos[1] + jy, p.pos[2] + jz);
                }
            });
        }
    });

    return (
        <group ref={nucleusRef}>
            {/* Strong Nuclear Force Gluon Energy Corona */}
            <mesh scale={showParticles ? 1.45 : 1.15}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.16} side={THREE.BackSide} />
            </mesh>
            <mesh scale={showParticles ? 1.6 : 1.25}>
                <sphereGeometry args={[0.7, 24, 24]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.BackSide} />
            </mesh>

            {showParticles ? (
                <group>
                    {particles.map((p, i) => (
                        <Sphere
                            key={i}
                            ref={(el) => { particleMeshesRef.current[i] = el; }}
                            args={[0.135, 18, 18]}
                            position={p.pos}
                        >
                            <meshPhysicalMaterial
                                color={p.isProton ? '#ff2a6d' : '#00f0ff'}
                                emissive={p.isProton ? '#e11d48' : '#0284c7'}
                                emissiveIntensity={2.0}
                                metalness={0.4}
                                roughness={0.06}
                                clearcoat={1}
                                clearcoatRoughness={0.03}
                                depthWrite={true}
                                depthTest={true}
                            />
                        </Sphere>
                    ))}
                    {/* Proton / Neutron counter badge with occlusion */}
                    <Html center distanceFactor={5} position={[0, -1.05, 0]} occlude>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-slate-300/80 text-[10.5px] font-mono pointer-events-none backdrop-blur-md whitespace-nowrap shadow-card font-bold">
                            <span className="text-rose-600">{protons}p⁺</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-cyan-700">{neutrons}n⁰</span>
                        </div>
                    </Html>
                </group>
            ) : (
                <>
                    <GlowingSphere size={0.72} color={color} glowColor={color} emissiveIntensity={1.8} position={[0, 0, 0]} />
                    <Html center distanceFactor={4} occlude>
                        <div
                            className="font-bold pointer-events-none select-none tracking-tight leading-none"
                            style={{
                                fontSize: symbol.length > 2 ? '22px' : '28px',
                                color: '#ffffff',
                                textShadow: `0 0 20px ${color}, 0 0 40px rgba(0,0,0,0.9)`,
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

// High-Performance Instanced Electron Mesh with Quantum Wave Oscillation & Valence Glow
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
        const data: { shellIndex: number; radius: number; speed: number; phase: number; isValence: boolean; tiltX: number; tiltZ: number; harmonic: number }[] = [];
        const totalElectrons = shells.reduce((a, b) => a + b, 0);
        let counted = 0;

        shells.forEach((count, sIdx) => {
            const displayCount = Math.min(count, 16);
            const radius = 1.1 + sIdx * 0.58;
            const speed = 1.6 / Math.sqrt(sIdx + 1);
            const tilt = orbitalTilts[sIdx % orbitalTilts.length] || { x: Math.PI / 4, z: 0 };
            const harmonic = (sIdx + 2) * 2;

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
                    harmonic,
                });
                counted++;
            }
        });
        return data;
    }, [shells, valenceCount, orbitalTilts]);

    const defaultColor = useMemo(() => new THREE.Color(color || '#38bdf8'), [color]);
    const valenceColor = useMemo(() => new THREE.Color('#fbbf24'), []);
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

            // Quantum wave radial and vertical oscillation
            const waveR = el.radius * (1.0 + 0.028 * Math.sin(el.harmonic * angle + t * 2.0));
            const posX = Math.cos(angle) * waveR;
            const posY = Math.sin(angle) * Math.sin(el.tiltX) * waveR + 0.02 * Math.cos(el.harmonic * angle);
            const posZ = Math.sin(angle) * Math.cos(el.tiltZ) * waveR;

            dummy.position.set(posX, posY, posZ);

            // Pulsing electron scale
            const pulseScale = 1.0 + 0.12 * Math.sin(t * 6.0 + el.phase);
            dummy.scale.setScalar((isShellFocused ? 0.12 : el.isValence ? 0.095 : 0.08) * pulseScale);
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
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial
                roughness={0.08}
                metalness={0.9}
                emissive={color}
                emissiveIntensity={2.5}
            />
        </instancedMesh>
    );
});

// Interactive Orbital Shell guide rings with gyroscopic precession, double-layer glass tubes, and glow
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
    const groupRef = useRef<THREE.Group>(null);
    const shellName = SHELL_NAMES[shellIndex] || `n=${shellIndex + 1}`;

    const orbitPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= ORBIT_POINTS; i++) {
            const angle = (i / ORBIT_POINTS) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        return points;
    }, [radius]);

    // Gyroscopic precession
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const t = clock.getElapsedTime() * 0.3;
            groupRef.current.rotation.y = tiltZ + Math.sin(t + shellIndex) * 0.04;
            groupRef.current.rotation.x = tiltX + Math.cos(t + shellIndex) * 0.03;
        }
    });

    return (
        <group ref={groupRef} rotation={[tiltX, 0, tiltZ]}>
            {/* Primary Crystalline Fiber Ring */}
            <Line
                points={orbitPoints}
                color={isFocused ? '#ffffff' : color}
                lineWidth={isFocused ? 3.5 : 2.0}
                transparent
                opacity={isFocused ? 1.0 : 0.5}
            />

            {/* Outer Translucent Glow Aura Halo */}
            <Line
                points={orbitPoints}
                color={isFocused ? '#38bdf8' : color}
                lineWidth={isFocused ? 7.0 : 4.5}
                transparent
                opacity={isFocused ? 0.35 : 0.12}
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
                    className={cn(
                        "cursor-pointer select-none px-2.5 py-0.5 rounded-full border text-[9.5px] font-mono transition-all backdrop-blur-md shadow-xs font-bold",
                        isFocused ? "bg-[#16a875] text-white border-[#16a875] scale-110 shadow-md" : "bg-white/95 border-slate-200 text-slate-700 hover:border-[#16a875] hover:text-[#16a875]"
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

        // Interactive magnetic cursor-hand parallax tilt (fluid spring reaction to cursor movement)
        const targetTiltX = -pointer.y * 0.28;
        const targetTiltZ = pointer.x * 0.28;
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
        <div className="w-full h-full min-h-[380px] relative select-none bg-transparent cursor-grab active:cursor-grabbing">
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
                    enableDamping={true}
                    dampingFactor={0.06}
                    rotateSpeed={1.0}
                    panSpeed={0.8}
                    minDistance={3.0}
                    maxDistance={32}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.5}
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
