import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Molecule, Atom } from '@/data/molecules';
import { disposeHierarchy } from '@/lib/threeDisposal';

interface Molecule3DProps {
    molecule: Molecule;
    zoom?: number;
    autoRotate?: boolean;
    enableBloom?: boolean;
    spaceFilling?: boolean;
}

// Single atom sphere with interactive hover, physical quartz/gemstone materials, and thermal vibration
function AtomSphere({
    atom,
    index,
    spaceFilling = false
}: {
    atom: Atom;
    index: number;
    spaceFilling?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Group>(null);
    const radius = spaceFilling ? atom.radius * 1.8 : atom.radius;

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        // Molecular thermal micro-vibration (Raman / IR modes)
        const vx = Math.sin(t * 4.2 + index * 1.3) * 0.015;
        const vy = Math.cos(t * 3.8 + index * 1.7) * 0.015;
        const vz = Math.sin(t * 5.1 + index * 2.1) * 0.015;
        meshRef.current.position.set(atom.position[0] + vx, atom.position[1] + vy, atom.position[2] + vz);
    });

    return (
        <group ref={meshRef} position={atom.position}>
            <Sphere
                args={[radius, 32, 32]}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                }}
                onPointerOut={() => setHovered(false)}
            >
                {/* High-Refractive Scientific CPK Gemstone */}
                <meshPhysicalMaterial
                    color={atom.color}
                    emissive={atom.color}
                    emissiveIntensity={hovered ? 0.8 : 0.3}
                    metalness={0.15}
                    roughness={0.06}
                    transmission={0.62}
                    ior={1.68}
                    thickness={0.9}
                    clearcoat={1.0}
                    clearcoatRoughness={0.03}
                    reflectivity={0.95}
                />
            </Sphere>
            {hovered && (
                <Html distanceFactor={8} position={[0, radius + 0.45, 0]} center>
                    <div className="bg-slate-900/95 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-sky-400/40 shadow-xs pointer-events-none whitespace-nowrap">
                        {atom.element}
                    </div>
                </Html>
            )}
        </group>
    );
}

// Render bonds as precision brushed titanium cylinders
function BondCylinder({
    from,
    to,
    order = 1,
    index = 0
}: {
    from: [number, number, number];
    to: [number, number, number];
    order?: number;
    index?: number;
}) {
    const start = useMemo(() => new THREE.Vector3(...from), [from]);
    const end = useMemo(() => new THREE.Vector3(...to), [to]);
    const mid = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [start, end]);
    const length = useMemo(() => start.distanceTo(end), [start, end]);
    const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

    const orientation = useMemo(() => {
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return quat;
    }, [start, end]);

    const offsets = useMemo(() => {
        if (order === 1) return [0];
        if (order === 2) return [-0.08, 0.08];
        return [-0.14, 0, 0.14];
    }, [order]);

    useFrame(({ clock }) => {
        if (matRef.current) {
            const t = clock.getElapsedTime();
            matRef.current.emissiveIntensity = 0.2 + 0.12 * Math.sin(t * 3.0 + index * 1.5);
        }
    });

    return (
        <group position={mid} quaternion={orientation}>
            {offsets.map((offset, idx) => (
                <Cylinder
                    key={idx}
                    args={[0.052, 0.052, length, 24]}
                    position={[offset, 0, 0]}
                >
                    <meshPhysicalMaterial
                        ref={idx === 0 ? matRef : undefined}
                        color="#cbd5e1"
                        emissive="#94a3b8"
                        emissiveIntensity={0.2}
                        roughness={0.12}
                        metalness={0.85}
                        clearcoat={0.9}
                        clearcoatRoughness={0.05}
                    />
                </Cylinder>
            ))}
        </group>
    );
}

// Molecule scene
function MoleculeScene({
    molecule,
    zoom = 1,
    spaceFilling = false
}: Molecule3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { pointer } = useThree();

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

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        // Interactive magnetic cursor-hand parallax tilt
        const targetTiltX = -pointer.y * 0.25;
        const targetTiltZ = pointer.x * 0.25;
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetTiltX, 3.5, delta);
        groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetTiltZ, 3.5, delta);
    });

    return (
        <Float speed={1.0} rotationIntensity={0.04} floatIntensity={0.08}>
            <group ref={groupRef} scale={zoom}>
                {/* Laboratory Core Luminescence */}
                <pointLight position={[0, 0, 0]} intensity={2.0} color="#38bdf8" distance={15} decay={1.8} />
                <pointLight position={[0, 4, 3]} intensity={1.0} color="#ffffff" distance={12} decay={2} />

                {/* Render bonds when not in full space-filling mode */}
                {!spaceFilling && molecule.bonds.map((bond, i) => (
                    <BondCylinder
                        key={i}
                        index={i}
                        from={molecule.atoms[bond.from].position}
                        to={molecule.atoms[bond.to].position}
                        order={bond.order}
                    />
                ))}

                {/* Render atoms */}
                {molecule.atoms.map((atom, i) => (
                    <AtomSphere key={i} index={i} atom={atom} spaceFilling={spaceFilling} />
                ))}
            </group>
        </Float>
    );
}

// Exported component
export function Molecule3D({
    molecule,
    zoom = 1,
    autoRotate = false,
    enableBloom: _enableBloom = true,
    spaceFilling = false
}: Molecule3DProps) {
    return (
        <div className="w-full h-full min-h-[260px] sm:min-h-[360px] relative select-none bg-transparent cursor-grab active:cursor-grabbing touch-none">
            <Canvas
                camera={{ position: [0, 0, 6], fov: 48, near: 0.1, far: 100 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    depth: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.05
                }}
                style={{ background: 'transparent' }}
                dpr={[1, 2]}
            >
                {/* Subtle Sub-Micron Quantum Studio Energy Motes */}
                <Sparkles count={30} scale={10} size={1.6} speed={0.25} opacity={0.25} color="#38bdf8" />

                {/* Professional Multi-Point Studio Lighting Rig */}
                <ambientLight intensity={0.9} color="#f8fafc" />
                <hemisphereLight skyColor="#f8fafc" groundColor="#1e293b" intensity={0.85} />
                <directionalLight position={[8, 12, 10]} intensity={1.6} color="#ffffff" />
                <directionalLight position={[-10, -6, -8]} intensity={0.8} color="#38bdf8" />
                <directionalLight position={[8, -8, -6]} intensity={0.65} color="#f59e0b" />
                <directionalLight position={[0, 8, -12]} intensity={1.6} color="#818cf8" />
                <directionalLight position={[0, -10, 4]} intensity={0.6} color="#06b6d4" />

                {/* Ground Stage Halo Pedestal */}
                <mesh position={[0, -3.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.0, 5.5, 64]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} side={THREE.DoubleSide} />
                </mesh>

                <MoleculeScene
                    molecule={molecule}
                    zoom={zoom}
                    spaceFilling={spaceFilling}
                />

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableDamping={true}
                    dampingFactor={0.06}
                    rotateSpeed={1.0}
                    panSpeed={0.8}
                    minDistance={2.5}
                    maxDistance={22}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.0}
                />
            </Canvas>
        </div>
    );
}
