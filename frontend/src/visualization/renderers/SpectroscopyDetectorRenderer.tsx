import { useRef, memo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { AtomicEnergyState, TransitionSpectroscopyState } from '@/scientific/models/ScientificState';
import { AtomicTransition } from '@/scientific/models/QuantumTypes';
import { audioEngine } from '@/lib/audioEngine';

interface SpectroscopyDetectorRendererProps {
  energy: AtomicEnergyState;
  spectroscopy: TransitionSpectroscopyState;
  onSelectTransition?: (transition: AtomicTransition) => void;
}

export const SpectroscopyDetectorRenderer = memo(function SpectroscopyDetectorRenderer({
  energy,
  spectroscopy,
  onSelectTransition,
}: SpectroscopyDetectorRendererProps) {
  const [activeTrans, setActiveTrans] = useState<AtomicTransition | null>(
    spectroscopy.activeTransition || spectroscopy.availableTransitions[0] || null
  );

  const photonRef = useRef<THREE.Group>(null);
  const [isFiring, setIsFiring] = useState(false);

  const triggerTransition = (trans: AtomicTransition) => {
    setActiveTrans(trans);
    setIsFiring(true);
    audioEngine.playSpectralEmission(trans.wavelengthNm);
    if (onSelectTransition) onSelectTransition(trans);

    if (photonRef.current) {
      photonRef.current.position.set(0, (trans.initialLevel - 1) * 0.7 - 2, 0);
      gsap.to(photonRef.current.position, {
        x: 4.5,
        y: 0,
        z: 0,
        duration: 0.85,
        ease: 'power2.out',
        onComplete: () => setIsFiring(false),
      });
    }
  };

  useEffect(() => {
    if (spectroscopy.activeTransition) {
      triggerTransition(spectroscopy.activeTransition);
    }
  }, [spectroscopy.activeTransition?.id]);

  const levels = energy.energyLevels.slice(0, 6);

  return (
    <group position={[-1.5, 0, 0]}>
      {/* 1. Vertical Energy Ladder Plates */}
      {levels.map((lvl) => {
        const yPos = (lvl.n - 1) * 0.7 - 2.0;
        const isInitial = activeTrans?.initialLevel === lvl.n;
        const isFinal = activeTrans?.finalLevel === lvl.n;

        return (
          <group key={lvl.n} position={[0, yPos, 0]}>
            {/* Energy Level Horizontal Guide Line */}
            <Line
              points={[new THREE.Vector3(-1.8, 0, 0), new THREE.Vector3(1.8, 0, 0)]}
              color={isInitial ? '#38bdf8' : isFinal ? '#e11d48' : '#94a3b8'}
              lineWidth={isInitial || isFinal ? 2.5 : 1.2}
              transparent
              opacity={0.8}
            />

            {/* Level Selector Touchpoint */}
            <mesh
              position={[0, 0, 0]}
              onClick={() => {
                const target = spectroscopy.availableTransitions.find((t) => t.initialLevel === lvl.n);
                if (target) triggerTransition(target);
              }}
              className="cursor-pointer"
            >
              <boxGeometry args={[3.6, 0.2, 0.4]} />
              <meshBasicMaterial transparent opacity={0.01} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Emitted Photon Wavepacket Beam (Firing to Spectrometer) */}
      <group ref={photonRef} position={[0, 0, 0]}>
        <Sphere args={[0.08, 16, 16]}>
          <meshBasicMaterial color={activeTrans?.colorHex || '#38bdf8'} />
        </Sphere>
      </group>

      {/* 3. Spectrometer Target Detector */}
      <group position={[4.5, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 3.2, 0.8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {activeTrans && (
          <mesh position={[-0.12, 0, 0]}>
            <planeGeometry args={[0.04, 2.8]} />
            <meshBasicMaterial color={activeTrans.colorHex} />
          </mesh>
        )}
      </group>
    </group>
  );
});
