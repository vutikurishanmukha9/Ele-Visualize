import { useRef, useMemo, useEffect, MutableRefObject, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { Molecule, Atom, Bond } from '@/data/molecules';

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

// Single atom sphere with interactive hover
function AtomSphere({ atom, spaceFilling = false }: { atom: Atom; spaceFilling?: boolean }) {
    const [hovered, setHovered] = useState(false);
    const radius = spaceFilling ? atom.radius * 1.8 : atom.radius;

    return (
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
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
                        emissiveIntensity={hovered ? 0.8 : 0.3}
                        metalness={0.4}
                        roughness={0.15}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        iridescence={0.5}
                        iridescenceIOR={1.3}
                    />
                </Sphere>
                <Html center distanceFactor={6}>
                    <div
                        className="text-xs font-bold pointer-events-none select-none px-1.5 py-0.5 rounded backdrop-blur-md transition-transform"
                        style={{
                            color: atom.color,
                            textShadow: '0 0 5px rgba(0,0,0,0.8)',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            border: `1px solid ${hovered ? atom.color : 'rgba(255,255,255,0.1)'}`,
                            transform: hovered ? 'scale(1.15)' : 'scale(1.0)'
                        }}
                    >
                        {atom.symbol}
                    </div>
                </Html>
            </group>
        </Float>
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
                    <Cylinder args={[bondRadius, bondRadius, length * 0.7, 12]}>
                        <meshPhysicalMaterial
                            color="#475569"
                            emissive="#334155"
                            emissiveIntensity={0.2}
                            metalness={0.9}
                            roughness={0.3}
                            clearcoat={1}
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
        <group ref={groupRef} scale={zoom}>
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

            {/* Center glow */}
            <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" distance={8} />
        </group>
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
                {/* Deep field stars & ambient sparks */}
                <Stars radius={70} depth={40} count={600} factor={3.5} saturation={0} fade speed={0.4} />
                <Sparkles count={40} scale={10} size={2} speed={0.4} opacity={0.5} color="#38bdf8" />

                {/* Lighting */}
                <ambientLight intensity={0.7} />
                <directionalLight position={[6, 8, 6]} intensity={1.0} color="#ffffff" />
                <directionalLight position={[-6, -4, -6]} intensity={0.5} color="#38bdf8" />
                <pointLight position={[0, 4, 2]} intensity={0.6} color="#ffffff" />

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
                            luminanceThreshold={0.25}
                            luminanceSmoothing={0.9}
                            intensity={1.0}
                            mipmapBlur
                        />
                        <Vignette eskil={false} offset={0.2} darkness={0.6} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
