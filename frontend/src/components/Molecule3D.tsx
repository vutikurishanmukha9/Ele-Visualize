import { useRef, useMemo, MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Molecule, Atom, Bond } from '@/data/molecules';

interface Molecule3DProps {
    molecule: Molecule;
    handRotationXRef?: MutableRefObject<number>;
    handRotationYRef?: MutableRefObject<number>;
    isHandControlledRef?: MutableRefObject<boolean>;
    zoom?: number;
}

// Single atom sphere
function AtomSphere({ atom }: { atom: Atom }) {
    return (
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
            <group position={atom.position}>
                <Sphere args={[atom.radius, 32, 32]}>
                    <meshPhysicalMaterial
                        color={atom.color}
                        emissive={atom.color}
                        emissiveIntensity={0.3}
                        metalness={0.4}
                        roughness={0.2}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        iridescence={0.5}
                        iridescenceIOR={1.3}
                    />
                </Sphere>
                <Html center distanceFactor={5}>
                    <div
                        className="text-xs font-bold pointer-events-none select-none px-1 rounded"
                        style={{
                            color: atom.color,
                            textShadow: '0 0 5px rgba(0,0,0,0.8)',
                            backgroundColor: 'rgba(0,0,0,0.5)'
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
                            color="#222222"
                            emissive="#000000"
                            emissiveIntensity={0}
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
    zoom = 1
}: Molecule3DProps) {
    const groupRef = useRef<THREE.Group>(null);

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
        } else {
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group ref={groupRef} scale={zoom}>
            {/* Render bonds first (behind atoms) */}
            {molecule.bonds.map((bond, i) => (
                <BondCylinder
                    key={i}
                    from={molecule.atoms[bond.from].position}
                    to={molecule.atoms[bond.to].position}
                    order={bond.order}
                />
            ))}

            {/* Render atoms */}
            {molecule.atoms.map((atom, i) => (
                <AtomSphere key={i} atom={atom} />
            ))}

            {/* Center glow */}
            <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" distance={5} />
        </group>
    );
}

// Exported component
export function Molecule3D({
    molecule,
    handRotationXRef,
    handRotationYRef,
    isHandControlledRef,
    zoom = 1
}: Molecule3DProps) {
    const handControlled = isHandControlledRef?.current ?? false;
    return (
        <div style={{ width: '100%', height: '350px', background: 'transparent' }}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                {/* Stars background */}
                <Stars radius={50} depth={40} count={400} factor={3} saturation={0} fade speed={0.3} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6688ff" />

                <MoleculeScene
                    molecule={molecule}
                    handRotationXRef={handRotationXRef}
                    handRotationYRef={handRotationYRef}
                    isHandControlledRef={isHandControlledRef}
                    zoom={zoom}
                />

                {!handControlled && (
                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={3}
                        maxDistance={15}
                    />
                )}
            </Canvas>
        </div>
    );
}
