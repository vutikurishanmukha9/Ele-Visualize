import { useRef, useMemo, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ShellConfiguration } from '@/scientific/models/QuantumTypes';
import { createStandingWaveMaterial } from '@/shaders/standingWaveShader';

interface QuantumShellRendererProps {
  shells: ShellConfiguration[];
  elementColor: string;
  isPaused?: boolean;
  speedMultiplier?: number;
  focusedShellIndex?: number | null;
  onHoverShell?: (shellIndex: number | null) => void;
}

const ORBIT_SEGMENTS = 140;

const SingleShell = memo(function SingleShell({
  shell,
  radius,
  tiltX,
  tiltZ,
  color,
  isValence,
  isFocused,
  isPaused,
  speedMultiplier = 1,
  onHover,
}: {
  shell: ShellConfiguration;
  radius: number;
  tiltX: number;
  tiltZ: number;
  color: string;
  isValence: boolean;
  isFocused: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  onHover?: (index: number | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const electronGroupRef = useRef<THREE.Group>(null);
  const waveMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const speed = 1.1 / Math.sqrt(shell.principalQuantumNumber);
  const displayCount = Math.min(shell.electronCount, 16);

  // Orbit path circle points
  const orbitPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  // Laser-etched subshell graduation ticks
  const graduationTicks = useMemo(() => {
    const ticks: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    const count = Math.max(8, shell.principalQuantumNumber * 4);
    const tickLen = 0.05;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ticks.push({
        start: new THREE.Vector3(cos * (radius - tickLen * 0.5), 0, sin * (radius - tickLen * 0.5)),
        end: new THREE.Vector3(cos * (radius + tickLen * 0.5), 0, sin * (radius + tickLen * 0.5)),
      });
    }
    return ticks;
  }, [radius, shell.principalQuantumNumber]);

  // Electron angular positions
  const electronAngles = useMemo(() => {
    return Array.from({ length: displayCount }, (_, i) => (i / Math.max(displayCount, 1)) * Math.PI * 2);
  }, [displayCount]);

  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0.2, y: 0.2, z: 0.2 },
        { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.2)', overwrite: true }
      );
    }
  }, [radius]);

  useFrame(({ clock }, delta) => {
    if (!isPaused && electronGroupRef.current) {
      electronGroupRef.current.rotation.y += delta * speed * speedMultiplier;
    }
    if (waveMatRef.current) {
      waveMatRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const activeColor = isFocused ? '#ffffff' : isValence ? '#f59e0b' : color;

  return (
    <group
      ref={groupRef}
      rotation={[tiltX, 0, tiltZ]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.(shell.shellIndex);
      }}
      onPointerOut={() => onHover?.(null)}
    >
      {/* 1. Primary Precision Orbital Track Line */}
      <Line
        points={orbitPoints}
        color={activeColor}
        lineWidth={isFocused ? 2.2 : 1.2}
        transparent
        opacity={isFocused ? 0.95 : 0.35}
      />

      {/* 2. Laser Graduation Ticks */}
      {graduationTicks.map((t, idx) => (
        <Line
          key={idx}
          points={[t.start, t.end]}
          color={activeColor}
          lineWidth={1.0}
          transparent
          opacity={isFocused ? 0.8 : 0.2}
        />
      ))}

      {/* 3. Orbiting Electron Wavepacket Probability Particles */}
      <group ref={electronGroupRef}>
        {electronAngles.map((angle, idx) => (
          <group
            key={idx}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
          >
            <Sphere args={[isValence ? 0.082 : 0.068, 24, 24]}>
              <meshPhysicalMaterial
                color={isFocused ? '#ffffff' : isValence ? '#fbbf24' : color}
                emissive={isFocused ? '#ffffff' : isValence ? '#d97706' : color}
                emissiveIntensity={isFocused ? 1.4 : isValence ? 0.9 : 0.65}
                roughness={0.06}
                metalness={0.15}
                transmission={0.65}
                ior={1.9}
                thickness={0.8}
                clearcoat={1.0}
                reflectivity={0.95}
              />
            </Sphere>
          </group>
        ))}
      </group>
    </group>
  );
});

export const QuantumShellRenderer = memo(function QuantumShellRenderer({
  shells,
  elementColor,
  isPaused = false,
  speedMultiplier = 1,
  focusedShellIndex,
  onHoverShell,
}: QuantumShellRendererProps) {
  // Harmonic Bohr-Sommerfeld spatial plane orientations
  const harmonicTilts = useMemo(() => [
    { x: Math.PI / 2.2, z: 0 },
    { x: Math.PI / 4, z: Math.PI / 3 },
    { x: Math.PI / 6, z: Math.PI / 2 },
    { x: Math.PI / 3, z: Math.PI / 5 },
    { x: Math.PI / 2.5, z: Math.PI / 4 },
    { x: Math.PI / 5, z: Math.PI / 1.5 },
    { x: Math.PI / 3.2, z: Math.PI / 2.8 },
  ], []);

  return (
    <group>
      {shells.map((shell, index) => {
        const radius = 1.15 + index * 0.58;
        const tilt = harmonicTilts[index % harmonicTilts.length];
        return (
          <SingleShell
            key={shell.shellIndex}
            shell={shell}
            radius={radius}
            tiltX={tilt.x}
            tiltZ={tilt.z}
            color={elementColor}
            isValence={shell.isValence}
            isFocused={focusedShellIndex === shell.shellIndex}
            isPaused={isPaused}
            speedMultiplier={speedMultiplier}
            onHover={onHoverShell}
          />
        );
      })}
    </group>
  );
});
