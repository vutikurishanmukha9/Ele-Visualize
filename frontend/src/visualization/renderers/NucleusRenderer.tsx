import { useRef, useMemo, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { NuclearStructureState } from '@/scientific/models/ScientificState';
import { createStrongForceMaterial } from '@/shaders/strongForceFieldShader';

interface NucleusRendererProps {
  nucleus: NuclearStructureState;
  elementColor?: string;
  zoomScale?: number;
  showQuarkDetail?: boolean;
}

export const NucleusRenderer = memo(function NucleusRenderer({
  nucleus,
  elementColor = '#e11d48',
  zoomScale = 1.0,
  showQuarkDetail = false,
}: NucleusRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const strongForceMat = useMemo(() => createStrongForceMaterial('#e11d48', '#0284c7', 0.85), []);

  useEffect(() => {
    return () => {
      strongForceMat.dispose();
    };
  }, [strongForceMat]);

  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0.3, y: 0.3, z: 0.3 },
        { x: 1, y: 1, z: 1, duration: 0.75, ease: 'back.out(1.4)', overwrite: true }
      );
    }
  }, [nucleus.protons, nucleus.neutrons]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
      groupRef.current.rotation.x += delta * 0.09;

      // Independent quantum motion pulsation
      const pulse = 1.0 + 0.02 * Math.sin(t * 3.2);
      groupRef.current.scale.set(pulse, pulse, pulse);
    }

    if (strongForceMat.uniforms?.uTime) {
      strongForceMat.uniforms.uTime.value = t;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Strong Nuclear Interaction Field Conceptual Aura */}
      <mesh scale={1.3}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <primitive object={strongForceMat} attach="material" />
      </mesh>

      {/* 2. Deterministic Close-Packing Nucleon Cluster */}
      {nucleus.nucleons.map((nuc) => {
        const isProton = nuc.type === 'proton';
        return (
          <group key={nuc.id} position={nuc.position}>
            {/* Nucleon Gemstone Sphere */}
            <Sphere args={[0.13, 24, 24]}>
              <meshPhysicalMaterial
                color={isProton ? '#991b1b' : '#0369a1'}
                emissive={isProton ? '#be123c' : '#0284c7'}
                emissiveIntensity={0.35}
                roughness={0.06}
                metalness={0.12}
                transmission={0.72}
                ior={1.85}
                thickness={1.0}
                attenuationColor={isProton ? '#e11d48' : '#38bdf8'}
                attenuationDistance={0.5}
                clearcoat={1.0}
                reflectivity={0.98}
              />
            </Sphere>

            {/* Subatomic Valence Quarks Inspection (when zoomed into femtometer scale) */}
            {showQuarkDetail && (
              <group scale={0.45}>
                {nuc.valenceQuarks.map((q, qIdx) => {
                  const qAngle = (qIdx / 3) * Math.PI * 2;
                  const qRad = 0.075;
                  const qColor = q.colorCharge === 'red' ? '#ef4444' : q.colorCharge === 'green' ? '#10b981' : '#3b82f6';
                  return (
                    <Sphere
                      key={qIdx}
                      args={[0.026, 16, 16]}
                      position={[Math.cos(qAngle) * qRad, Math.sin(qAngle) * qRad, 0]}
                    >
                      <meshBasicMaterial color={qColor} />
                    </Sphere>
                  );
                })}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
});
