import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { getElementPalette, ChemicalElement } from '@/data/elements';

interface AtomProps {
    element: {
        symbol: string;
        shells: number[];
        category: string;
    };
}

export function Atom({ element }: AtomProps) {
    const groupRef = useRef<THREE.Group>(null);
    const palette = useMemo(() => getElementPalette(element.symbol), [element.symbol]);

    useFrame((_state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001;
            groupRef.current.rotation.z += 0.0005;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nucleus: High-Refraction Optical Quartz Spherical Core */}
            <Sphere args={[0.5, 32, 32]}>
                <meshPhysicalMaterial
                    color={palette.primary}
                    emissive={palette.primary}
                    emissiveIntensity={0.8}
                    metalness={0.18}
                    roughness={0.06}
                    transmission={0.65}
                    ior={1.68}
                    thickness={0.9}
                    clearcoat={1.0}
                    clearcoatRoughness={0.03}
                    reflectivity={0.96}
                />
            </Sphere>
            <pointLight position={[0, 0, 0]} intensity={4.5} color={palette.primary} distance={15} decay={1.8} />

            {/* Electron Shells */}
            {element.shells.map((electronCount, shellIndex) => {
                const isValence = shellIndex === element.shells.length - 1;
                return (
                    <ElectronShell
                        key={shellIndex}
                        radius={2 + shellIndex * 1.5}
                        count={electronCount}
                        speed={0.5 - shellIndex * 0.05}
                        color={isValence ? '#f59e0b' : palette.primary}
                        isValence={isValence}
                    />
                );
            })}
        </group>
    );
}

function ElectronShell({ radius, count, speed, color, isValence = false }: { radius: number; count: number; speed: number; color: string; isValence?: boolean }) {
    const electrons = useMemo(() => {
        return new Array(count).fill(0).map((_, i) => ({
            angle: (i / count) * Math.PI * 2,
            speed: speed * (Math.random() * 0.5 + 0.8), // Slight variance
            offset: Math.random() * Math.PI * 2
        }));
    }, [count, speed]);

    const shellRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (shellRef.current) {
            shellRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.5;
            shellRef.current.rotation.y += speed * 0.01;
        }
    });

    return (
        <group ref={shellRef}>
            {/* Orbital Path (Visual ring) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
                <meshBasicMaterial color={color} opacity={isValence ? 0.75 : 0.3} transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Electrons */}
            {electrons.map((electron, i) => (
                <Electron
                    key={i}
                    radius={radius}
                    initialAngle={electron.angle}
                    speed={speed}
                    color={color}
                    isValence={isValence}
                />
            ))}
        </group>
    );
}

function Electron({ radius, initialAngle, speed, color, isValence = false }: { radius: number; initialAngle: number; speed: number; color: string; isValence?: boolean }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime * speed;
            const angle = initialAngle + time;
            ref.current.position.x = Math.cos(angle) * radius;
            ref.current.position.z = Math.sin(angle) * radius;
        }
    });

    return (
        <mesh ref={ref}>
            <sphereGeometry args={[isValence ? 0.095 : 0.078, 16, 16]} />
            <meshPhysicalMaterial
                color={isValence ? '#fef08a' : '#ffffff'}
                emissive={color}
                emissiveIntensity={isValence ? 3.0 : 1.8}
                metalness={0.2}
                roughness={0.08}
                transmission={0.6}
                ior={1.8}
                clearcoat={1}
            />
        </mesh>
    );
}
