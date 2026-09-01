import { useRef, useMemo, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ElectronOrbitalState } from '@/scientific/models/QuantumTypes';
import { createOrbitalVolumetricMaterial } from '@/shaders/orbitalVolumetricShader';

interface OrbitalCloudRendererProps {
  orbitals: ElectronOrbitalState[];
  selectedOrbitalId?: string | null;
  elementColor?: string;
  isPaused?: boolean;
}

// Map subshell & ml to shader orbital type index
function getShaderOrbitalType(subshell: string, ml: number): number {
  if (subshell === 's') return 0; // 1s / 2s spherical
  if (subshell === 'p') {
    if (ml === 0) return 1; // 2pz
    if (ml === 1) return 2; // 2px
    return 3; // 2py
  }
  if (subshell === 'd') {
    if (ml === 0) return 4; // 3dz2
    if (ml === -2) return 5; // 3dxy
    if (ml === 1) return 6; // 3dxz
    if (ml === -1) return 7; // 3dyz
    return 8; // 3dx2-y2
  }
  if (subshell === 'f') {
    return 9; // 4fz3 octupole
  }
  return 0;
}

const SingleOrbitalMesh = memo(function SingleOrbitalMesh({
  orbital,
  radius,
  isSelected,
  elementColor = '#38bdf8',
}: {
  orbital: ElectronOrbitalState;
  radius: number;
  isSelected: boolean;
  elementColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderType = getShaderOrbitalType(orbital.subshell, orbital.ml);

  // Phase Positive: Cyan / Sky Blue, Phase Negative: Crimson / Rose
  const material = useMemo(() => {
    return createOrbitalVolumetricMaterial(
      shaderType,
      '#38bdf8',
      '#f43f5e',
      isSelected ? 0.65 : 0.35,
      36
    );
  }, [shaderType, isSelected]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    if (meshRef.current) {
      gsap.fromTo(
        meshRef.current.scale,
        { x: 0.1, y: 0.1, z: 0.1 },
        { x: 1, y: 1, z: 1, duration: 0.7, ease: 'power2.out', overwrite: true }
      );
    }
  }, [orbital.id]);

  useFrame(({ clock }) => {
    if (material.uniforms?.uTime) {
      material.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[radius, 32, 32]} material={material} />
    </group>
  );
});

export const OrbitalCloudRenderer = memo(function OrbitalCloudRenderer({
  orbitals,
  selectedOrbitalId,
  elementColor = '#38bdf8',
}: OrbitalCloudRendererProps) {
  const activeOrbitals = useMemo(() => {
    if (selectedOrbitalId) {
      const found = orbitals.find((o) => o.id === selectedOrbitalId);
      return found ? [found] : orbitals.filter((o) => o.occupancy > 0);
    }
    // Default show occupied valence and penultimate orbitals
    return orbitals.filter((o) => o.occupancy > 0);
  }, [orbitals, selectedOrbitalId]);

  return (
    <group>
      {activeOrbitals.map((orb) => {
        const radius = 1.0 + (orb.n - 1) * 0.65;
        return (
          <SingleOrbitalMesh
            key={orb.id}
            orbital={orb}
            radius={radius}
            isSelected={orb.id === selectedOrbitalId}
            elementColor={elementColor}
          />
        );
      })}
    </group>
  );
});
