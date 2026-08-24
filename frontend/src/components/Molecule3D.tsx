import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Html, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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
                    roughness={0.15}
                    clearcoat={0.8}
                    clearcoatRoughness={0.1}
                />
            </Sphere>
            {hovered && (
                <Html distanceFactor={8} position={[0, radius + 0.4, 0]} center>
                    <div className="bg-slate-900/90 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-400/40 shadow-lg pointer-events-none whitespace-nowrap">
                        {atom.element}
                    </div>
                </Html>
            )}
        </group>
    );
}

// Render bonds as high-gloss metallic cylinders
function BondCylinder({ from, to, order = 1 }: { from: [number, number, number]; to: [number, number, number]; order?: number }) {
    const start = useMemo(() => new THREE.Vector3(...from), [from]);
    const end = useMemo(() => new THREE.Vector3(...to), [to]);
    const mid = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [start, end]);
    const length = useMemo(() => start.distanceTo(end), [start, end]);

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

    return (
        <group position={mid} quaternion={orientation}>
            {offsets.map((offset, idx) => (
                <Cylinder
                    key={idx}
                    args={[0.055, 0.055, length, 16]}
                    position={[offset, 0, 0]}
                >
                    <meshPhysicalMaterial
                        color="#cbd5e1"
                        emissive="#94a3b8"
                        emissiveIntensity={0.3}
                        roughness={0.2}
                        metalness={0.6}
                        clearcoat={0.5}
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
    zoom = 1,
    autoRotate = false,
    enableBloom = true,
    spaceFilling = false
}: Molecule3DProps) {
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
                    zoom={zoom}
                    spaceFilling={spaceFilling}
                />

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    minDistance={2.5}
                    maxDistance={18}
                    dampingFactor={0.08}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.0}
                />

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
