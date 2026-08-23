import { useRef, useMemo, memo, MutableRefObject, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html, Float, Stars, Trail, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { createFresnelMaterial } from '@/shaders/fresnelShader';
import { createVolumetricOrbitalMaterial } from '@/shaders/orbitalShader';

export type CameraPreset = '3d' | 'top' | 'side' | 'iso' | 'reset';

interface Atom3DProps {
    protons: number;
    neutrons: number;
    electrons: number[];
    color: string;
    symbol: string;
    handRotationXRef?: MutableRefObject<number>;
    handRotationYRef?: MutableRefObject<number>;
    isHandControlledRef?: MutableRefObject<boolean>;
    zoom?: number;
    showOrbitals?: boolean;
    showNucleusDetail?: boolean;
    isFrozenRef?: MutableRefObject<boolean>;
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

// Glowing sphere using custom GLSL Fresnel Shader Material
const GlowingSphere = memo(function GlowingSphere({
    color, size, position, glowColor = '#38bdf8', emissiveIntensity = 0.8
}: { color: string; size: number; position?: [number, number, number]; glowColor?: string; emissiveIntensity?: number }) {
    const material = useMemo(() => createFresnelMaterial(color, glowColor), [color, glowColor]);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (meshRef.current && (meshRef.current.material as THREE.ShaderMaterial).uniforms?.uTime) {
            (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value += delta;
        }
    });

    return (
        <Sphere ref={meshRef} args={[size, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} position={position} material={material} />
    );
});

// Volumetric S orbital using custom Volumetric GLSL Shader Material
const SOrbital = memo(function SOrbital({ radius, color }: { radius: number; color: string }) {
    const material = useMemo(() => createVolumetricOrbitalMaterial(color, 0.28), [color]);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (meshRef.current && (meshRef.current.material as THREE.ShaderMaterial).uniforms?.uTime) {
            (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value += delta;
        }
    });

    return (
        <Sphere ref={meshRef} args={[radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} material={material} />
    );
});

// Volumetric P orbital
const POrbital = memo(function POrbital({ radius, color, axis }: { radius: number; color: string; axis: 'x' | 'y' | 'z' }) {
    const rotation: [number, number, number] =
        axis === 'x' ? [0, 0, Math.PI / 2] :
            axis === 'y' ? [0, 0, 0] :
                [Math.PI / 2, 0, 0];

    const mat1 = useMemo(() => createVolumetricOrbitalMaterial(color, 0.22), [color]);
    const mat2 = useMemo(() => createVolumetricOrbitalMaterial(color, 0.22), [color]);

    const m1Ref = useRef<THREE.Mesh>(null);
    const m2Ref = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (m1Ref.current && (m1Ref.current.material as THREE.ShaderMaterial).uniforms?.uTime) {
            (m1Ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value += delta;
        }
        if (m2Ref.current && (m2Ref.current.material as THREE.ShaderMaterial).uniforms?.uTime) {
            (m2Ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value += delta;
        }
    });

    return (
        <group rotation={rotation}>
            <Sphere ref={m1Ref} args={[radius * 0.55, 18, 18]} position={[0, radius * 0.75, 0]} material={mat1} />
            <Sphere ref={m2Ref} args={[radius * 0.55, 18, 18]} position={[0, -radius * 0.75, 0]} material={mat2} />
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
    const mat = useMemo(() => createVolumetricOrbitalMaterial(color, 0.18), [color]);

    return (
        <group rotation={rotation}>
            <Sphere args={[lobeSize, 14, 14]} position={[lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[-lobeOffset, lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[lobeOffset, -lobeOffset, 0]} material={mat} />
            <Sphere args={[lobeSize, 14, 14]} position={[-lobeOffset, -lobeOffset, 0]} material={mat} />
        </group>
    );
});

// Orbital clouds
const OrbitalClouds = memo(function OrbitalClouds({ electrons, elementColor }: { electrons: number[]; elementColor: string }) {
    const sColor = '#38bdf8';
    const pColor = '#ec4899';
    const dColor = '#eab308';

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
        </group>
    );
});

// High-fidelity Nucleus with dual-mode representation
const Nucleus = memo(function Nucleus({ protons, neutrons, color, symbol, showParticles }: {
    protons: number;
    neutrons: number;
    color: string;
    symbol: string;
    showParticles: boolean;
}) {
    const nucleusRef = useRef<THREE.Group>(null);
    const total = Math.min(protons + neutrons, 36);

    const particles = useMemo(() => {
        const pts: { pos: [number, number, number]; isProton: boolean }[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle

        for (let i = 0; i < total; i++) {
            const y = 1 - (i / (total - 1 || 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const scale = 0.55;

            // Introduce slight jitter for organic packing
            const jitter = 0.05 * Math.sin(i * 3.7);

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

    useFrame((_, delta) => {
        if (nucleusRef.current) {
            nucleusRef.current.rotation.y += delta * 0.25;
            nucleusRef.current.rotation.x += delta * 0.12;
        }
    });

    return (
        <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.15}>
            <group ref={nucleusRef}>
                {showParticles ? (
                    <group>
                        {particles.map((p, i) => (
                            <Sphere
                                key={i}
                                args={[0.13, 16, 16]}
                                position={p.pos}
                            >
                                <meshPhysicalMaterial
                                    color={p.isProton ? '#ef4444' : '#38bdf8'}
                                    emissive={p.isProton ? '#b91c1c' : '#0284c7'}
                                    emissiveIntensity={0.7}
                                    metalness={0.6}
                                    roughness={0.2}
                                    clearcoat={0.8}
                                />
                            </Sphere>
                        ))}
                        {/* Proton / Neutron counter badge */}
                        <Html center distanceFactor={5} position={[0, -0.9, 0]}>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 border border-white/15 text-[10px] font-mono pointer-events-none backdrop-blur-md whitespace-nowrap shadow-xl">
                                <span className="text-red-400 font-semibold">{protons}p⁺</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-sky-400 font-semibold">{neutrons}n⁰</span>
                            </div>
                        </Html>
                    </group>
                ) : (
                    <>
                        <GlowingSphere size={0.68} color={color} glowColor={color} emissiveIntensity={0.9} position={[0, 0, 0]} />
                        <Html center distanceFactor={4}>
                            <div
                                className="font-bold pointer-events-none select-none tracking-tight leading-none"
                                style={{
                                    fontSize: symbol.length > 2 ? '20px' : '26px',
                                    color: '#ffffff',
                                    textShadow: `0 0 12px ${color}, 0 0 24px rgba(0,0,0,0.9)`,
                                }}
                            >
                                {symbol}
                            </div>
                        </Html>
                    </>
                )}
            </group>
        </Float>
    );
});

// Optimized electron with glowing trail
const Electron = memo(function Electron({ radius, startAngle, speed, color, isPaused = false, speedMultiplier = 1, isHighlighted = false }: {
    radius: number;
    startAngle: number;
    speed: number;
    color: string;
    isPaused?: boolean;
    speedMultiplier?: number;
    isHighlighted?: boolean;
}) {
    const ref = useRef<THREE.Group>(null);
    const angleRef = useRef(startAngle);

    useFrame((_, delta) => {
        if (isPaused) return;
        angleRef.current += delta * speed * speedMultiplier;
        if (ref.current) {
            ref.current.position.x = Math.cos(angleRef.current) * radius;
            ref.current.position.z = Math.sin(angleRef.current) * radius;
        }
    });

    const electronScale = isHighlighted ? 1.4 : 1.0;

    return (
        <group ref={ref}>
            <Trail
                width={isHighlighted ? 0.8 : 0.45}
                length={10}
                color={color}
                attenuation={(t) => t * t}
            >
                <Sphere args={[0.08 * electronScale, 12, 12]} position={[0, 0, 0]}>
                    <meshPhysicalMaterial
                        color="#ffffff"
                        emissive={color}
                        emissiveIntensity={isHighlighted ? 2.2 : 1.4}
                        metalness={0.9}
                        roughness={0.1}
                        clearcoat={1}
                    />
                </Sphere>
            </Trail>
        </group>
    );
});

// Interactive Orbital Shell with realistic tilts and labels
const OrbitalShell = memo(function OrbitalShell({
    radius,
    electronCount,
    shellIndex,
    color,
    tiltX,
    tiltZ,
    isPaused = false,
    speedMultiplier = 1,
    isFocused = false,
    onHover,
}: {
    radius: number;
    electronCount: number;
    shellIndex: number;
    color: string;
    tiltX: number;
    tiltZ: number;
    isPaused?: boolean;
    speedMultiplier?: number;
    isFocused?: boolean;
    onHover?: (index: number | null) => void;
}) {
    // Show up to actual count or maximum display capacity
    const displayElectrons = Math.min(electronCount, 12);
    // Angular velocity scales with 1 / sqrt(n) for Bohr model realism
    const speed = (1.4 / Math.sqrt(shellIndex + 1));
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
                lineWidth={isFocused ? 2.5 : 1.4}
                transparent
                opacity={isFocused ? 0.9 : 0.35}
            />

            {Array.from({ length: displayElectrons }).map((_, i) => (
                <Electron
                    key={i}
                    radius={radius}
                    startAngle={(i / displayElectrons) * Math.PI * 2}
                    speed={speed}
                    color={color}
                    isPaused={isPaused}
                    speedMultiplier={speedMultiplier}
                    isHighlighted={isFocused}
                />
            ))}

            {/* Subtle Shell Marker on ring edge */}
            <Html
                position={[radius, 0, 0]}
                center
                distanceFactor={7}
            >
                <div
                    onMouseEnter={() => onHover && onHover(shellIndex)}
                    onMouseLeave={() => onHover && onHover(null)}
                    className="cursor-pointer select-none px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 hover:border-primary/50 text-[9px] font-mono text-muted-foreground hover:text-white transition-all backdrop-blur-sm shadow-md"
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
    handRotationXRef, handRotationYRef, isHandControlledRef, zoom = 1,
    showOrbitals = false, showNucleusDetail = false, isFrozenRef, animationSpeed = 1, isPaused = false,
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
        const frozen = isFrozenRef?.current ?? false;
        const handControlled = isHandControlledRef?.current ?? false;
        if (frozen) return;

        if (handControlled) {
            const rotX = handRotationXRef?.current ?? 0.5;
            const rotY = handRotationYRef?.current ?? 0.5;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (rotY - 0.5) * Math.PI * 3, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (rotX - 0.5) * Math.PI, 0.1);
        } else {
            groupRef.current.rotation.y += 0.003 * animationSpeed;
        }
    });

    return (
        <group ref={groupRef} scale={0}>
            {/* Dynamic Core Lights */}
            <pointLight position={[0, 0, 0]} intensity={2.0} color={color} distance={15} decay={2} />
            <pointLight position={[0, 3, 3]} intensity={0.8} color="#ffffff" distance={10} />

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
                    isPaused={isPaused}
                    speedMultiplier={animationSpeed}
                    isFocused={focusedShell === i}
                    onHover={setFocusedShell}
                />
            ))}
        </group>
    );
});

// Exported component with full-stage viewport and studio lighting
export function Atom3D({
    protons, neutrons, electrons, color, symbol,
    handRotationXRef, handRotationYRef, isHandControlledRef, zoom = 1,
    showOrbitals = false, showNucleusDetail = false, isFrozenRef, animationSpeed = 1, isPaused = false,
    autoRotate = false, enableBloom = true,
    cameraPreset = '3d', onSelectShell
}: Atom3DProps) {
    const handControlled = isHandControlledRef?.current ?? false;
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
                
                {/* Deep Quantum Field Stars & Ambient Energy Sparks */}
                <Stars radius={90} depth={50} count={600} factor={4} saturation={0} fade speed={0.4} />
                <Sparkles count={50} scale={14} size={2.5} speed={0.5} opacity={0.6} color={color} />
                
                {/* 3-Point Studio Lighting */}
                <ambientLight intensity={0.7} />
                <directionalLight position={[6, 8, 6]} intensity={1.0} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.6} color={color} />
                <directionalLight position={[0, -8, 0]} intensity={0.3} color="#38bdf8" />
                <pointLight position={[0, 0, 0]} intensity={1.5} color={color} distance={10} />

                <AtomScene
                    protons={protons}
                    neutrons={neutrons}
                    electrons={electrons}
                    color={color}
                    symbol={symbol}
                    handRotationXRef={handRotationXRef}
                    handRotationYRef={handRotationYRef}
                    isHandControlledRef={isHandControlledRef}
                    zoom={zoom}
                    showOrbitals={showOrbitals}
                    showNucleusDetail={showNucleusDetail}
                    isFrozenRef={isFrozenRef}
                    animationSpeed={animationSpeed}
                    isPaused={isPaused}
                    focusedShell={focusedShell}
                    setFocusedShell={handleHoverShell}
                />

                {!handControlled && (
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
                )}

                {/* Post-Processing Cinematic Bloom & Vignette */}
                {enableBloom && (
                    <EffectComposer multisampling={0} disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.9}
                            intensity={1.1}
                            mipmapBlur
                        />
                        <Vignette eskil={false} offset={0.2} darkness={0.6} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
