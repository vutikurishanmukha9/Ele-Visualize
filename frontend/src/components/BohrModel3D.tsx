import { memo, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ChemicalElement, elements } from '@/data/elements';
import { AtomSvgDiagram } from './AtomSvgDiagram';
import { Box, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';

interface BohrModel3DProps {
  shells: number[];
  color: string;
  symbol: string;
  name?: string;
  size?: number; // Canvas height in px (e.g. 160 or 180)
  element?: ChemicalElement;
  defaultMode?: '3d' | 'svg';
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
  size = 170,
  element,
  defaultMode = '3d',
}: BohrModel3DProps) {
  const [viewMode, setViewMode] = useState<'3d' | 'svg'>(defaultMode);

  const chemicalElement = useMemo(() => {
    if (element) return element;
    const found = elements.find((e) => e.symbol === symbol);
    if (found) return found;
    return {
      symbol,
      atomicNumber: shells.reduce((a, b) => a + b, 0),
      name: symbol,
      atomicMass: shells.reduce((a, b) => a + b, 0) * 2,
      category: 'nonmetal',
      shells,
    } as ChemicalElement;
  }, [element, symbol, shells]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-hairline)] relative overflow-hidden select-none">
      {/* Top Header Strip with Dual-Engine Switcher */}
      <div className="w-full flex items-center justify-between pb-2 mb-1 border-b border-[var(--color-hairline)] font-sans">
        <span className="text-xs font-semibold text-[var(--color-ink-primary)]">
          {viewMode === '3d' ? '3D Bohr Quantum Shells' : '2D Vector Schematic'}
        </span>
        <div className="flex items-center gap-0.5 bg-[var(--color-surface-3)] p-0.5 rounded-lg border border-[var(--color-hairline)] shadow-2xs">
          <button
            onClick={() => {
              audioEngine.playClick(840);
              setViewMode('3d');
            }}
            className={cn(
              "px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer select-none",
              viewMode === '3d'
                ? "bg-[var(--color-surface-1)] text-[var(--color-ink-primary)] border border-[var(--color-hairline)] shadow-2xs"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
            )}
          >
            <Box className="w-3 h-3 text-[var(--color-accent)]" />
            <span>3D</span>
          </button>
          <button
            onClick={() => {
              audioEngine.playClick(900);
              setViewMode('svg');
            }}
            className={cn(
              "px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer select-none",
              viewMode === 'svg'
                ? "bg-[var(--color-surface-1)] text-[var(--color-ink-primary)] border border-[var(--color-hairline)] shadow-2xs"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
            )}
          >
            <Layers className="w-3 h-3 text-[var(--color-accent)]" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      <div
        className="w-full relative flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ height: `${size}px` }}
      >
        {viewMode === '3d' ? (
          <Canvas
            camera={{ position: [0, 2.4, 4.2], fov: 42, near: 0.1, far: 50 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
            style={{ background: 'transparent' }}
            dpr={[1.5, 3]}
          >
            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight position={[5, 8, 6]} intensity={1.6} color="#ffffff" />
            <directionalLight position={[-5, -4, -5]} intensity={0.8} color="#818cf8" />
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
        ) : (
          <AtomSvgDiagram
            element={chemicalElement}
            size={size}
            animated={true}
            interactive={true}
            showLabels={true}
          />
        )}
      </div>

      <div className="text-xs text-[var(--color-ink-muted)] mt-2 text-center font-sans">
        Bohr Shell Distribution:{' '}
        <span className="text-[var(--color-accent)] font-semibold bg-[var(--color-accent)]/10 px-2 py-0.5 rounded border border-[var(--color-accent)]/20 font-mono tnum">
          {shells.join(' · ')}
        </span>
      </div>
    </div>
  );
});
