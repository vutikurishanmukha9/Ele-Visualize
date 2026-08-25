import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Radio, Activity, Shield, Play, Pause } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

export type DecayMode = 'alpha' | 'beta-minus' | 'beta-plus' | 'gamma';

interface IsotopeDecayData {
  id: string;
  name: string;
  parentNuclide: string;
  daughterNuclide: string;
  decayMode: DecayMode;
  halfLife: string;
  energyMeV: number;
  decayConstant: number; // scaled for simulation
  description: string;
  shieldingRequired: 'Paper' | 'Aluminum (few mm)' | 'Lead (dense cm)';
}

const ISOTOPE_PRESETS: IsotopeDecayData[] = [
  {
    id: 'U-238',
    name: 'Uranium-238',
    parentNuclide: '²³⁸₉₂U',
    daughterNuclide: '²³⁴₉₀Th + ⁴₂α',
    decayMode: 'alpha',
    halfLife: '4.468 Billion Years',
    energyMeV: 4.27,
    decayConstant: 0.25,
    description: 'Alpha decay emitting a high-energy Helium-4 nucleus (2p + 2n). Easily stopped by paper or skin.',
    shieldingRequired: 'Paper',
  },
  {
    id: 'C-14',
    name: 'Carbon-14',
    parentNuclide: '¹⁴₆C',
    daughterNuclide: '¹⁴₇N + e⁻ + ν̄ₑ',
    decayMode: 'beta-minus',
    halfLife: '5,730 Years (Radiocarbon Dating)',
    energyMeV: 0.156,
    decayConstant: 0.45,
    description: 'Beta-minus decay converting a neutron into a proton, emitting an electron and electron antineutrino.',
    shieldingRequired: 'Aluminum (few mm)',
  },
  {
    id: 'Co-60',
    name: 'Cobalt-60',
    parentNuclide: '⁶⁰₂₇Co',
    daughterNuclide: '⁶⁰₂₈Ni* + e⁻ → Ni + 2γ',
    decayMode: 'gamma',
    halfLife: '5.27 Years',
    energyMeV: 2.50,
    decayConstant: 0.65,
    description: 'High-energy gamma photon cascade accompanying beta decay, requiring heavy lead shielding.',
    shieldingRequired: 'Lead (dense cm)',
  },
  {
    id: 'F-18',
    name: 'Fluorine-18 (PET Scan Tracer)',
    parentNuclide: '¹⁸₉F',
    daughterNuclide: '¹⁸₈O + e⁺ + νₑ',
    decayMode: 'beta-plus',
    halfLife: '109.7 Minutes',
    energyMeV: 0.633,
    decayConstant: 0.8,
    description: 'Positron emission (β+) annihilating with ambient electrons to produce dual 511 keV coincidence gamma rays.',
    shieldingRequired: 'Aluminum (few mm)',
  },
];

interface EmittedParticle {
  id: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  type: DecayMode;
  life: number;
}

// 3D Radioactivity Scene
function DecayScene({
  isotope,
  isPlaying,
  geigerCountRef,
}: {
  isotope: IsotopeDecayData;
  isPlaying: boolean;
  geigerCountRef: React.MutableRefObject<number>;
}) {
  const nucleusRef = useRef<THREE.Group>(null);
  const [particles, setParticles] = useState<EmittedParticle[]>([]);
  const lastEmitTime = useRef(0);

  useFrame((state, delta) => {
    if (!isPlaying) return;

    // Nucleus quantum vibration
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.5;
      nucleusRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }

    // Random stochastic quantum decay emissions
    const now = state.clock.elapsedTime;
    if (now - lastEmitTime.current > 1.2 / isotope.decayConstant && Math.random() < 0.35) {
      lastEmitTime.current = now;
      audioEngine.playGeigerClick();
      geigerCountRef.current += 1;

      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = (Math.random() - 0.5) * Math.PI;
      const speed = 2.8;
      const dir = new THREE.Vector3(
        Math.cos(angleTheta) * Math.cos(anglePhi),
        Math.sin(anglePhi),
        Math.sin(angleTheta) * Math.cos(anglePhi)
      ).normalize();

      setParticles((prev) => [
        ...prev.slice(-12),
        {
          id: Math.random(),
          pos: new THREE.Vector3(0, 0, 0),
          vel: dir.multiplyScalar(speed),
          type: isotope.decayMode,
          life: 1.0,
        },
      ]);
    }

    // Update particle positions
    setParticles((prev) =>
      prev
        .map((p) => ({
          ...p,
          pos: p.pos.clone().add(p.vel.clone().multiplyScalar(delta)),
          life: p.life - delta * 0.4,
        }))
        .filter((p) => p.life > 0)
    );
  });

  return (
    <group>
      {/* Central Unstable Nucleus */}
      <group ref={nucleusRef}>
        <Sphere args={[0.75, 32, 32]}>
          <meshPhysicalMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.55}
            roughness={0.06}
            metalness={0.2}
            transmission={0.65}
            ior={1.8}
            thickness={1.0}
            clearcoat={1.0}
          />
        </Sphere>

        {/* Laser Monospace Parent Label */}
        <Html center distanceFactor={4} occlude>
          <div className="font-mono font-extrabold text-white text-sm tracking-tight leading-none pointer-events-none select-none drop-shadow-md">
            {isotope.parentNuclide}
          </div>
        </Html>
      </group>

      {/* Radiation Hazard Radial Shells */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.25, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Emitted Radiation Particles */}
      {particles.map((p) => {
        const isAlpha = p.type === 'alpha';
        const isGamma = p.type === 'gamma';
        const isBeta = p.type === 'beta-minus' || p.type === 'beta-plus';

        return (
          <group key={p.id} position={[p.pos.x, p.pos.y, p.pos.z]}>
            {isAlpha && (
              // Alpha particle (cluster of 4 nucleons)
              <group scale={p.life}>
                <Sphere args={[0.12, 16, 16]}>
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
                </Sphere>
              </group>
            )}
            {isBeta && (
              // High-speed Beta electron/positron
              <group scale={p.life}>
                <Sphere args={[0.07, 16, 16]}>
                  <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.0} />
                </Sphere>
              </group>
            )}
            {isGamma && (
              // High energy Gamma photon
              <group scale={p.life}>
                <Sphere args={[0.09, 16, 16]}>
                  <meshStandardMaterial color="#a855f7" emissive="#9333ea" emissiveIntensity={2.5} />
                </Sphere>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function NuclearDecayLab() {
  const [selectedIsotope, setSelectedIsotope] = useState<string>('U-238');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [elapsedHalfLives, setElapsedHalfLives] = useState<number>(1.0);
  const [cpm, setCpm] = useState<number>(38);
  const geigerCountRef = useRef<number>(0);

  const activeIsotope = useMemo(
    () => ISOTOPE_PRESETS.find((i) => i.id === selectedIsotope) || ISOTOPE_PRESETS[0],
    [selectedIsotope]
  );

  // Live Geiger counter CPM calculation
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setCpm(Math.round(geigerCountRef.current * 18 + 12 + Math.random() * 8));
        geigerCountRef.current = 0;
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const remainingPercent = useMemo(
    () => Math.pow(0.5, elapsedHalfLives) * 100,
    [elapsedHalfLives]
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#f8faf8] overflow-hidden">
      {/* 3D Canvas Nuclear Chamber */}
      <div className="flex-1 relative h-[50vh] md:h-full min-h-[360px] bg-slate-900/5 cursor-grab active:cursor-grabbing border-b md:border-b-0 md:border-r border-slate-200">
        <Canvas
          camera={{ position: [0, 2.5, 5.5], fov: 45, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          dpr={[1.5, 2.5]}
        >
          <ambientLight intensity={0.9} color="#f8fafc" />
          <directionalLight position={[6, 12, 8]} intensity={1.6} color="#ffffff" />
          <directionalLight position={[-6, -4, -6]} intensity={0.8} color="#38bdf8" />
          <directionalLight position={[0, -8, 4]} intensity={0.6} color="#ef4444" />

          <DecayScene
            isotope={activeIsotope}
            isPlaying={isPlaying}
            geigerCountRef={geigerCountRef}
          />

          <OrbitControls enableDamping dampingFactor={0.06} minDistance={2} maxDistance={15} />
        </Canvas>

        {/* Geiger Counter HUD Widget */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-3 py-2 rounded-xl bg-white/90 border border-black/[0.06] backdrop-blur-md shadow-card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Radiation Geiger Readout</div>
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {cpm} <span className="text-[10px] text-slate-500 font-normal">CPM (Counts / Min)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Play/Pause & Reset Bar */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5 shadow-xs hover:bg-slate-50"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-[#16a875]" />}
            {isPlaying ? 'Pause Reaction' : 'Resume Decay'}
          </button>
        </div>
      </div>

      {/* Right Control & Physics Inspector */}
      <div className="w-full md:w-88 p-5 flex flex-col gap-4 overflow-y-auto bg-white/90 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#087f5b] uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-[#16a875]" /> Nuclear Physics & Radiation
          </div>
          <h1 className="text-lg font-serif font-bold text-slate-900">Radioactivity & Decay Chains</h1>
          <p className="text-xs text-slate-500 mt-0.5">Explore Alpha, Beta, and Gamma quantum emissions and exponential half-life laws.</p>
        </div>

        {/* Isotope Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">Unstable Nuclides</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ISOTOPE_PRESETS.map((iso) => (
              <button
                key={iso.id}
                onClick={() => {
                  audioEngine.playClick(720);
                  setSelectedIsotope(iso.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedIsotope === iso.id
                    ? 'bg-[#e6f6ef] border-[#16a875] text-[#087f5b] shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold truncate">{iso.name}</div>
                <div className="text-[10px] font-mono text-slate-500 capitalize">{iso.decayMode} Decay</div>
              </button>
            ))}
          </div>
        </div>

        {/* Half-Life Scrubber */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-[11px] font-bold text-slate-600">
            <span>Elapsed Half-Lives (t / t½)</span>
            <span className="text-[#087f5b]">{elapsedHalfLives.toFixed(1)} t½</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={elapsedHalfLives}
            onChange={(e) => setElapsedHalfLives(Number(e.target.value))}
            className="w-full accent-[#16a875] cursor-pointer"
          />

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-slate-500">Remaining Parent Nuclei:</span>
            <strong className="text-slate-900">{remainingPercent.toFixed(1)}%</strong>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#16a875] transition-all duration-200" style={{ width: `${remainingPercent}%` }} />
          </div>
        </div>

        {/* Nuclear Reaction Equation Card */}
        <div className="p-4 rounded-2xl border border-black/[0.06] bg-white shadow-card space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Decay Transformation</span>
            <strong className="text-slate-900">{activeIsotope.daughterNuclide}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Half-Life Duration</span>
            <strong className="text-[#087f5b]">{activeIsotope.halfLife}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Q-Value Emission Energy</span>
            <strong className="text-slate-900">{activeIsotope.energyMeV} MeV</strong>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-600" /> Required Shielding
            </span>
            <strong className="text-amber-700 text-right">{activeIsotope.shieldingRequired}</strong>
          </div>
        </div>

        {/* Physics Note */}
        <div className="p-3 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] text-[11px] text-slate-700 leading-relaxed">
          <strong className="text-[#087f5b]">Nuclear Decay Law:</strong> {activeIsotope.description}
        </div>
      </div>
    </div>
  );
}
