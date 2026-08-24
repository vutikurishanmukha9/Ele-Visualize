import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

/**
 * AR Placement Reticle & Anchor System
 * Shows a translucent ring on detected surfaces.
 * When the user taps/pinches, it anchors the current 3D atom at that position.
 */

interface ARPlacementProps {
    /** Called when user confirms a placement position */
    onPlace?: (position: THREE.Vector3) => void;
    /** Whether placement mode is active */
    active?: boolean;
}

export function ARPlacement({ onPlace: _onPlace, active = true }: ARPlacementProps) {
    const reticleRef = useRef<THREE.Group>(null);
    const pulseRef = useRef(0);

    useFrame((state, delta) => {
        if (!reticleRef.current || !active) return;

        // Pulse animation for the reticle
        pulseRef.current += delta * 3;
        const scale = 1 + Math.sin(pulseRef.current) * 0.1;
        reticleRef.current.scale.setScalar(scale);

        // Rotate slowly for visual appeal
        reticleRef.current.rotation.y += delta * 0.5;
    });

    if (!active) return null;

    return (
        <group ref={reticleRef} position={[0, -1, -2]}>
            {/* Outer ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.14, 0.16, 32]} />
                <meshBasicMaterial
                    color="#8b5cf6"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Inner ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.04, 0.06, 32]} />
                <meshBasicMaterial
                    color="#a78bfa"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Center dot */}
            <Sphere args={[0.01, 8, 8]}>
                <meshBasicMaterial color="#c4b5fd" />
            </Sphere>

            {/* Cross-hair lines */}
            {[0, Math.PI / 2].map((rotation, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, rotation]}>
                    <planeGeometry args={[0.3, 0.005]} />
                    <meshBasicMaterial
                        color="#8b5cf6"
                        transparent
                        opacity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
}
