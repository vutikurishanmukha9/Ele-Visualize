import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface Atom3DProps {
    protons: number;
    neutrons: number;
    electrons: number[];
    color: string;
    symbol: string;
    handRotationX?: number;
    handRotationY?: number;
    isHandControlled?: boolean;
    zoom?: number;
    showOrbitals?: boolean;
    isFrozen?: boolean; // Fist freeze - stops auto-rotation
}

// Glowing sphere material
function GlowingSphere({ color, size, emissiveIntensity = 0.5, position }: any) {
    return (
        <Sphere args={[size, 32, 32]} position={position}>
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
                metalness={0.2}
                roughness={0.5}
            />
        </Sphere>
    );
}

// S orbital - spherical cloud
function SOrbital({ radius, color }: { radius: number; color: string }) {
    return (
        <Sphere args={[radius, 32, 32]}>
            <meshStandardMaterial
                color={color}
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </Sphere>
    );
}

// P orbital - dumbbell/lobe shape (two spheres on axis)
function POrbital({
    radius,
    color,
    axis
}: {
    radius: number;
    color: string;
    axis: 'x' | 'y' | 'z';
}) {
    const rotation: [number, number, number] =
        axis === 'x' ? [0, 0, Math.PI / 2] :
            axis === 'y' ? [0, 0, 0] :
                [Math.PI / 2, 0, 0];

    return (
        <group rotation={rotation}>
            {/* Positive lobe */}
            <Sphere args={[radius * 0.6, 24, 24]} position={[0, radius * 0.8, 0]}>
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.12}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </Sphere>
            {/* Negative lobe */}
            <Sphere args={[radius * 0.6, 24, 24]} position={[0, -radius * 0.8, 0]}>
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.12}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </Sphere>
        </group>
    );
}

// D orbital - clover/four-lobe shape
function DOrbital({ radius, color, type }: { radius: number; color: string; type: 'xy' | 'xz' | 'yz' }) {
    const rotation: [number, number, number] =
        type === 'xy' ? [0, 0, 0] :
            type === 'xz' ? [Math.PI / 2, 0, 0] :
                [0, Math.PI / 2, 0];

    const lobeSize = radius * 0.45;
    const lobeOffset = radius * 0.65;

    return (
        <group rotation={rotation}>
            {/* Four lobes in a clover pattern */}
            <Sphere args={[lobeSize, 16, 16]} position={[lobeOffset, lobeOffset, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
            </Sphere>
            <Sphere args={[lobeSize, 16, 16]} position={[-lobeOffset, lobeOffset, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
            </Sphere>
            <Sphere args={[lobeSize, 16, 16]} position={[lobeOffset, -lobeOffset, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
            </Sphere>
            <Sphere args={[lobeSize, 16, 16]} position={[-lobeOffset, -lobeOffset, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
            </Sphere>
        </group>
    );
}

// Orbital clouds based on electron configuration
function OrbitalClouds({ electrons, color }: { electrons: number[]; color: string }) {
    // Orbital colors
    const sColor = '#ff6b6b';  // Red for s
    const pColor = '#4ecdc4';  // Cyan for p
    const dColor = '#ffe66d';  // Yellow for d

    const totalElectrons = electrons.reduce((a, b) => a + b, 0);

    return (
        <group>
            {/* 1s orbital - always present */}
            {totalElectrons >= 1 && <SOrbital radius={0.8} color={sColor} />}

            {/* 2s orbital */}
            {totalElectrons >= 3 && <SOrbital radius={1.3} color={sColor} />}

            {/* 2p orbitals (px, py, pz) - electrons 5-10 */}
            {totalElectrons >= 5 && <POrbital radius={1.5} color={pColor} axis="x" />}
            {totalElectrons >= 6 && <POrbital radius={1.5} color={pColor} axis="y" />}
            {totalElectrons >= 7 && <POrbital radius={1.5} color={pColor} axis="z" />}

            {/* 3s orbital */}
            {totalElectrons >= 11 && <SOrbital radius={1.9} color={sColor} />}

            {/* 3p orbitals - electrons 13-18 */}
            {totalElectrons >= 13 && <POrbital radius={2.1} color={pColor} axis="x" />}
            {totalElectrons >= 14 && <POrbital radius={2.1} color={pColor} axis="y" />}
            {totalElectrons >= 15 && <POrbital radius={2.1} color={pColor} axis="z" />}

            {/* 3d orbitals - electrons 21-30 (after 4s) */}
            {totalElectrons >= 21 && <DOrbital radius={1.8} color={dColor} type="xy" />}
            {totalElectrons >= 22 && <DOrbital radius={1.8} color={dColor} type="xz" />}
            {totalElectrons >= 23 && <DOrbital radius={1.8} color={dColor} type="yz" />}
        </group>
    );
}

// Nucleus with protons and neutrons
function Nucleus({ protons, neutrons, color, symbol, showParticles }: {
    protons: number;
    neutrons: number;
    color: string;
    symbol: string;
    showParticles: boolean;
}) {
    const nucleusRef = useRef<THREE.Group>(null);
    const total = Math.min(protons + neutrons, 30);

    const particles = useMemo(() => {
        const pts: { pos: [number, number, number]; isProton: boolean }[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < total; i++) {
            const y = 1 - (i / (total - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const scale = 0.5;

            pts.push({
                pos: [
                    Math.cos(theta) * radius * scale,
                    y * scale,
                    Math.sin(theta) * radius * scale
                ],
                isProton: i < (protons / (protons + neutrons)) * total
            });
        }
        return pts;
    }, [protons, neutrons, total]);

    useFrame((_, delta) => {
        if (nucleusRef.current) {
            nucleusRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
            <group ref={nucleusRef}>
                {showParticles ? (
                    particles.map((p, i) => (
                        <GlowingSphere
                            key={i}
                            size={0.1}
                            position={p.pos}
                            color={p.isProton ? '#ff4444' : '#888888'}
                            emissiveIntensity={p.isProton ? 0.6 : 0.2}
                        />
                    ))
                ) : (
                    <>
                        <GlowingSphere size={0.6} color={color} emissiveIntensity={0.5} position={[0, 0, 0]} />
                        <Html center distanceFactor={4}>
                            <div className="text-white text-2xl font-bold pointer-events-none select-none"
                                style={{ textShadow: `0 0 15px ${color}` }}>
                                {symbol}
                            </div>
                        </Html>
                    </>
                )}
            </group>
        </Float>
    );
}

// Electron orbiting on a shell
function Electron({ radius, startAngle, speed, color }: {
    radius: number;
    startAngle: number;
    speed: number;
    color: string;
}) {
    const ref = useRef<THREE.Mesh>(null);
    const angleRef = useRef(startAngle);

    useFrame((_, delta) => {
        angleRef.current += delta * speed;
        if (ref.current) {
            ref.current.position.x = Math.cos(angleRef.current) * radius;
            ref.current.position.z = Math.sin(angleRef.current) * radius;
        }
    });

    return (
        <Sphere ref={ref} args={[0.08, 16, 16]} position={[radius, 0, 0]}>
            <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1} />
        </Sphere>
    );
}

// Orbital ring with electrons
function OrbitalShell({ radius, electronCount, shellIndex, color, tiltX, tiltZ }: {
    radius: number;
    electronCount: number;
    shellIndex: number;
    color: string;
    tiltX: number;
    tiltZ: number;
}) {
    const displayElectrons = Math.min(electronCount, 8);
    const speed = 1.2 - shellIndex * 0.15;

    const orbitPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        return points;
    }, [radius]);

    return (
        <group rotation={[tiltX, 0, tiltZ]}>
            <Line points={orbitPoints} color={color} lineWidth={1.5} transparent opacity={0.4} />
            {Array.from({ length: displayElectrons }).map((_, i) => (
                <Electron key={i} radius={radius} startAngle={(i / displayElectrons) * Math.PI * 2} speed={speed} color={color} />
            ))}
        </group>
    );
}

// Main 3D Scene
function AtomScene({
    protons, neutrons, electrons, color, symbol,
    handRotationX = 0.5, handRotationY = 0.5, isHandControlled = false, zoom = 1, showOrbitals = false, isFrozen = false
}: Atom3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const showParticles = zoom > 1.5;

    const orbitalTilts = [
        { x: Math.PI / 2.2, z: 0 },
        { x: Math.PI / 4, z: Math.PI / 3 },
        { x: Math.PI / 6, z: Math.PI / 2 },
        { x: Math.PI / 3, z: Math.PI / 5 },
        { x: Math.PI / 2.5, z: Math.PI / 4 },
    ];

    useFrame(() => {
        if (groupRef.current) {
            // Skip rotation when frozen (fist gesture)
            if (isFrozen) return;

            if (isHandControlled) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (handRotationY - 0.5) * Math.PI * 3, 0.1);
                groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (handRotationX - 0.5) * Math.PI, 0.1);
            } else {
                groupRef.current.rotation.y += 0.004;
            }
        }
    });

    return (
        <group ref={groupRef} scale={zoom * 0.85}>
            <pointLight position={[0, 0, 0]} intensity={1.5} color={color} distance={10} />

            {/* Orbital clouds when enabled */}
            {showOrbitals && <OrbitalClouds electrons={electrons} color={color} />}

            <Nucleus protons={protons} neutrons={neutrons} color={color} symbol={symbol} showParticles={showParticles} />

            {/* Regular orbital paths (shown when orbitals are off) */}
            {!showOrbitals && electrons.slice(0, 5).map((count, i) => (
                <OrbitalShell
                    key={i}
                    radius={1 + i * 0.6}
                    electronCount={count}
                    shellIndex={i}
                    color={color}
                    tiltX={orbitalTilts[i]?.x || Math.PI / 4}
                    tiltZ={orbitalTilts[i]?.z || 0}
                />
            ))}
        </group>
    );
}

// Exported component
export function Atom3D({
    protons, neutrons, electrons, color, symbol,
    handRotationX = 0.5, handRotationY = 0.5, isHandControlled = false, zoom = 1, showOrbitals = false, isFrozen = false
}: Atom3DProps) {
    return (
        <div style={{ width: '100%', height: '350px', background: 'transparent' }}>
            <Canvas
                camera={{ position: [0, 0, 12], fov: 50, near: 0.1, far: 100 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <Stars radius={60} depth={40} count={500} factor={3} saturation={0} fade speed={0.3} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6688ff" />

                <AtomScene
                    protons={protons}
                    neutrons={neutrons}
                    electrons={electrons}
                    color={color}
                    symbol={symbol}
                    handRotationX={handRotationX}
                    handRotationY={handRotationY}
                    isHandControlled={isHandControlled}
                    zoom={zoom}
                    showOrbitals={showOrbitals}
                    isFrozen={isFrozen}
                />

                {!isHandControlled && <OrbitControls enablePan={false} enableZoom={true} minDistance={5} maxDistance={20} />}
            </Canvas>
        </div>
    );
}
