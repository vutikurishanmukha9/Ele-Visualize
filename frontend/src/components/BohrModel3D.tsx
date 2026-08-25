import { memo, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface BohrModel3DProps {
  shells: number[];
  color: string;
  symbol: string;
  name?: string;
  size?: number; // Canvas height in px (e.g. 160 or 180)
}

const ORBIT_STEPS = 96;

// Inner 3D scene for the mini Bohr model
const MiniBohrScene = memo(function MiniBohrScene({
  shells,
  color,
  symbol,
}: {
  shells: number[];
  color: string;
  symbol: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const electronGroupsRef = useRef<(THREE.Group | null)[]>([]);

  // Orbit ring points for each shell
  const shellData = useMemo(() => {
    return shells.map((count, idx) => {
      const radius = 0.85 + idx * 0.46;
      const speed = 1.1 / Math.sqrt(idx + 1);
      const displayCount = Math.min(count, 12);

      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= ORBIT_STEPS; i++) {
        const angle = (i / ORBIT_STEPS) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      }

      const electronAngles = Array.from(
        { length: displayCount },
        (_, eIdx) => (eIdx / Math.max(displayCount, 1)) * Math.PI * 2
      );

      const isValence = idx === shells.length - 1;

      return {
        radius,
        speed,
        points,
        electronAngles,
        isValence,
        count,
      };
    });
  }, [shells]);

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      // Gentle ambient tilt and spin
      groupRef.current.rotation.y += delta * 0.25;
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.6) * 0.12;
    }

    shellData.forEach((s, idx) => {
      const elGroup = electronGroupsRef.current[idx];
      if (elGroup) {
        elGroup.rotation.y += delta * s.speed;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* High-Refraction Optical Quartz Core */}
      <Sphere args={[0.42, 32, 32]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.65}
          roughness={0.06}
          metalness={0.15}
          transmission={0.65}
          ior={1.65}
          thickness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.02}
          reflectivity={0.95}
        />
      </Sphere>

      {/* Laser-Etched Symbol Inset */}
      <Html center distanceFactor={4} occlude>
        <div
          className="font-mono font-bold text-white text-[13px] pointer-events-none select-none tracking-tight leading-none"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
        >
          {symbol}
        </div>
      </Html>

      {/* Concentric Precision Crystalline Bohr Shells */}
      {shellData.map((s, idx) => (
        <group key={idx}>
          {/* Hairline Orbital Line Track */}
          <Line
            points={s.points}
            color={s.isValence ? '#f59e0b' : color}
            lineWidth={1.2}
            transparent
            opacity={s.isValence ? 0.85 : 0.35}
          />

          {/* Rotating Photon Electron Beads */}
          <group ref={(el) => { electronGroupsRef.current[idx] = el; }}>
            {s.electronAngles.map((angle, eIdx) => (
              <group
                key={eIdx}
                position={[Math.cos(angle) * s.radius, 0, Math.sin(angle) * s.radius]}
              >
                <Sphere args={[s.isValence ? 0.055 : 0.046, 24, 24]}>
                  <meshPhysicalMaterial
                    color={s.isValence ? '#f59e0b' : color}
                    emissive={s.isValence ? '#d97706' : color}
                    emissiveIntensity={0.85}
                    roughness={0.04}
                    metalness={0.16}
                    transmission={0.65}
                    ior={2.0}
                    clearcoat={1.0}
                  />
                </Sphere>
              </group>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
});

export const BohrModel3D = memo(function BohrModel3D({
  shells,
  color,
  symbol,
  size = 150,
}: BohrModel3DProps) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white/90 rounded-2xl border border-black/[0.06] relative overflow-hidden select-none shadow-card">
      <div
        className="w-full relative cursor-grab active:cursor-grabbing"
        style={{ height: `${size}px` }}
      >
        <Canvas
          camera={{ position: [0, 2.4, 4.2], fov: 42, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          style={{ background: 'transparent' }}
          dpr={[1.5, 3]}
        >
          <ambientLight intensity={0.9} color="#f8fafc" />
          <directionalLight position={[5, 8, 6]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-5, -4, -5]} intensity={0.7} color="#38bdf8" />
          <directionalLight position={[0, -6, 2]} intensity={0.5} color="#f59e0b" />

          <MiniBohrScene shells={shells} color={color} symbol={symbol} />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1.5}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
          />
        </Canvas>
      </div>

      <div className="text-[11px] font-mono text-slate-500 mt-1 text-center">
        Bohr Shells:{' '}
        <span className="text-[#087f5b] font-bold bg-[#e6f6ef] px-2 py-0.5 rounded-md border border-[#bce8d5]">
          {shells.join(' • ')}
        </span>
      </div>
    </div>
  );
});
