import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Trail } from '@react-three/drei';
import * as THREE from 'three';

interface AtomProps {
    element: {
        symbol: string;
        shells: number[];
        category: string;
    };
}

const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
        'alkali-metal': '#FF3366',
        'alkaline-earth': '#FF9933',
        'transition-metal': '#FFCC33',
        'post-transition': '#33CC99',
        'metalloid': '#33CCCC',
        'nonmetal': '#3399FF',
        'halogen': '#9933FF',
        'noble-gas': '#CC33FF',
        'lanthanide': '#FF66CC',
        'actinide': '#FF3333',
    };
    return colors[category] || '#ffffff';
};

export function Atom({ element }: AtomProps) {
    const groupRef = useRef<THREE.Group>(null);
    const color = useMemo(() => getCategoryColor(element.category), [element.category]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001;
            groupRef.current.rotation.z += 0.0005;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nucleus */}
            <Sphere args={[0.5, 32, 32]}>
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                    toneMapped={false}
                />
            </Sphere>
            <pointLight position={[0, 0, 0]} intensity={5} color={color} distance={10} />

            {/* Electron Shells */}
            {element.shells.map((electronCount, shellIndex) => (
                <ElectronShell
                    key={shellIndex}
                    radius={2 + shellIndex * 1.5}
                    count={electronCount}
                    speed={0.5 - shellIndex * 0.05}
                    color={color}
                />
            ))}
        </group>
    );
}

function ElectronShell({ radius, count, speed, color }: { radius: number; count: number; speed: number; color: string }) {
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
                <meshBasicMaterial color={color} opacity={0.1} transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Electrons */}
            {electrons.map((electron, i) => (
                <Electron
                    key={i}
                    radius={radius}
                    initialAngle={electron.angle}
                    speed={speed}
                    color={color}
                />
            ))}
        </group>
    );
}

function Electron({ radius, initialAngle, speed, color }: { radius: number; initialAngle: number; speed: number; color: string }) {
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
        <Trail
            width={0.2}
            length={4}
            color={new THREE.Color(color)}
            attenuation={(t) => t * t}
        >
            <mesh ref={ref}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
        </Trail>
    );
}
