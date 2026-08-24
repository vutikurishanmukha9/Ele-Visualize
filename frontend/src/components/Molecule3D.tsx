import { useRef, useMemo, useEffect, MutableRefObject, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { Molecule, Atom } from '@/data/molecules';
import { disposeHierarchy } from '@/lib/threeDisposal';

interface Molecule3DProps {
    molecule: Molecule;
    handRotationXRef?: MutableRefObject<number>;
    handRotationYRef?: MutableRefObject<number>;
    isHandControlledRef?: MutableRefObject<boolean>;
    zoom?: number;
    autoRotate?: boolean;
    enableBloom?: boolean;
    spaceFilling?: boolean;
}

// Single atom sphere with interactive hover and depth occlusion
function AtomSphere({ atom, spaceFilling = false }: { atom: Atom; spaceFilling?: boolean }) {
    const [hovered, setHovered] = useState(false);
    const radius = spaceFilling ? atom.radius * 1.8 : atom.radius;

    return (
        <group position={atom.position}>
            <Sphere
                args={[radius, 32, 32]}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                }}
                onPointerOut={() => setHovered(false)}
            >
                <meshPhysicalMaterial
                    color={atom.color}
                    emissive={atom.color}
                    emissiveIntensity={hovered ? 1.4 : 0.6}
                    metalness={0.25}
                    roughness={0.1}
                    clearcoat={1}
                    clearcoatRoughness={0.06}
                    iridescence={0.6}
                    iridescenceIOR={1.4}
                    reflectivity={0.95}
                    depthWrite={true}
                    depthTest={true}
                />
            </Sphere>
            <Html center distanceFactor={6} occlude>
                <div
                    className="text-xs font-bold pointer-events-none select-none px-2 py-0.5 rounded-md backdrop-blur-md transition-transform"
                    style={{
                        color: atom.color,
                        textShadow: `0 0 10px ${atom.color}, 0 0 20px rgba(0,0,0,0.9)`,
                        backgroundColor: 'rgba(2, 6, 23, 0.85)',
                        border: `1px solid ${hovered ? atom.color : 'rgba(255,255,255,0.2)'}`,
                        transform: hovered ? 'scale(1.15)' : 'scale(1.0)'
                    }}
                >
                    {atom.symbol}
                </div>
            </Html>
        </group>
    );
}

// Chemical bond cylinder(s)
function BondCylinder({
    from,
    to,
    order
}: {
    from: [number, number, number];
    to: [number, number, number];
    order: 1 | 2 | 3;
}) {
    const midpoint = useMemo(() => new THREE.Vector3(
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2,
        (from[2] + to[2]) / 2
    ), [from, to]);

    const direction = useMemo(() => {
        const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
        return dir;
    }, [from, to]);

    const length = useMemo(() => direction.length(), [direction]);

    // Calculate rotation to align cylinder with bond direction
    const rotation = useMemo(() => {
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
        return new THREE.Euler().setFromQuaternion(quaternion);
    }, [direction]);

    // Create multiple cylinders for double/triple bonds
    const offsets = useMemo(() => {
        if (order === 1) return [[0, 0]];
        if (order === 2) return [[-0.08, 0], [0.08, 0]];
        return [[-0.1, 0], [0, 0], [0.1, 0]];
    }, [order]);

    const bondRadius = order === 1 ? 0.06 : 0.04;

    return (
        <>
            {offsets.map(([offsetX, offsetZ], i) => (
                <group key={i} position={[midpoint.x + offsetX, midpoint.y, midpoint.z + offsetZ]} rotation={rotation}>
                    <Cylinder args={[bondRadius, bondRadius, length * 0.7, 16]}>
                        <meshPhysicalMaterial
                            color="#94a3b8"
                            emissive="#38bdf8"
                            emissiveIntensity={0.35}
                            metalness={0.6}
                            roughness={0.12}
                            clearcoat={1}
                            clearcoatRoughness={0.08}
                        />
                    </Cylinder>
                </group>
            ))}
        </>
    );
}

// Molecule scene
function MoleculeScene({
    molecule,
    handRotationXRef,
    handRotationYRef,
    isHandControlledRef,
    zoom = 1,
    spaceFilling = false
}: Molecule3DProps) {
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if (groupRef.current) {
            gsap.fromTo(
                groupRef.current.scale,
                { x: 0.1, y: 0.1, z: 0.1 },
                { x: zoom, y: zoom, z: zoom, duration: 0.9, ease: 'back.out(1.3)', overwrite: true }
            );
        }
        const node = groupRef.current;
        return () => {
            disposeHierarchy(node);
        };
    }, [molecule, zoom]);

    // Hand-controlled or auto rotation
    useFrame(() => {
        if (!groupRef.current) return;
        const handControlled = isHandControlledRef?.current ?? false;

        if (handControlled) {
            const rotX = handRotationXRef?.current ?? 0.5;
            const rotY = handRotationYRef?.current ?? 0.5;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                (rotY - 0.5) * Math.PI * 3,
                0.1
            );
            groupRef.current.rotation.x = THREE.MathUtils.lerp(
                groupRef.current.rotation.x,
                (rotX - 0.5) * Math.PI,
                0.1
            );
        }
    });

    return (
        <Float speed={1.2} rotationIntensity={0.06} floatIntensity={0.1}>
            <group ref={groupRef} scale={zoom}>
                {/* Radiant Center Luminescence */}
                <pointLight position={[0, 0, 0]} intensity={2.5} color="#38bdf8" distance={12} decay={1.8} />
                <pointLight position={[0, 3, 2]} intensity={1.0} color="#ffffff" distance={10} decay={2} />

                {/* Render bonds when not in full space-filling mode */}
                {!spaceFilling && molecule.bonds.map((bond, i) => (
                    <BondCylinder
                        key={i}
                        from={molecule.atoms[bond.from].position}
                        to={molecule.atoms[bond.to].position}
                        order={bond.order}
                    />
                ))}

                {/* Render atoms */}
                {molecule.atoms.map((atom, i) => (
                    <AtomSphere key={i} atom={atom} spaceFilling={spaceFilling} />
                ))}
            </group>
        </Float>
    );
}

// Exported component
export function Molecule3D({
    molecule,
    handRotationXRef,
    handRotationYRef,
    isHandControlledRef,
    zoom = 1,
    autoRotate = false,
    enableBloom = true,
    spaceFilling = false
}: Molecule3DProps) {
    const handControlled = isHandControlledRef?.current ?? false;
    return (
        <div className="w-full h-full min-h-[380px] relative select-none bg-transparent">
            <Canvas
                camera={{ position: [0, 0, 6], fov: 48, near: 0.1, far: 100 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    depth: true
                }}
                style={{ background: 'transparent' }}
                dpr={[1, 2]}
            >
                {/* Deep field stars & ambient cosmic dust sparks */}
                <Stars radius={80} depth={50} count={700} factor={3.8} saturation={0.5} fade speed={0.4} />
                <Sparkles count={60} scale={12} size={3.0} speed={0.5} opacity={0.6} color="#38bdf8" />
                <Sparkles count={30} scale={18} size={4.5} speed={0.3} opacity={0.4} color="#818cf8" />

                {/* Professional Multi-Point Studio Lighting Rig */}
                <ambientLight intensity={0.8} color="#f8fafc" />
                <hemisphereLight skyColor="#f8fafc" groundColor="#1e1b4b" intensity={0.9} />
                <directionalLight position={[8, 12, 10]} intensity={1.8} color="#ffffff" />
                <directionalLight position={[-10, -6, -8]} intensity={1.1} color="#38bdf8" />
                <directionalLight position={[8, -8, -6]} intensity={0.9} color="#f59e0b" />
                <directionalLight position={[0, 8, -12]} intensity={2.2} color="#818cf8" />
                <directionalLight position={[0, -10, 4]} intensity={0.8} color="#06b6d4" />

                {/* Ground Radial Energy Halo Stage Pedestal */}
                <mesh position={[0, -3.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.0, 5.5, 64]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} side={THREE.DoubleSide} />
                </mesh>

                <MoleculeScene
                    molecule={molecule}
                    handRotationXRef={handRotationXRef}
                    handRotationYRef={handRotationYRef}
                    isHandControlledRef={isHandControlledRef}
                    zoom={zoom}
                    spaceFilling={spaceFilling}
                />

                {!handControlled && (
                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        minDistance={2.5}
                        maxDistance={18}
                        dampingFactor={0.08}
                        autoRotate={autoRotate}
                        autoRotateSpeed={1.0}
                    />
                )}

                {/* Post-Processing Bloom & Vignette */}
                {enableBloom && (
                    <EffectComposer multisampling={0} disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.85}
                            intensity={1.2}
                            mipmapBlur
                        />
                        <Vignette eskil={false} offset={0.15} darkness={0.45} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
