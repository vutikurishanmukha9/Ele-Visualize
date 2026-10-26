import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, Ring } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Radio, Activity, Shield, Play, Pause, X, Volume2, VolumeX, ZoomIn, ZoomOut, RotateCcw, Atom, AlertTriangle, Layers } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

export type DecayMode = 'alpha' | 'beta-minus' | 'beta-plus' | 'gamma';

interface IsotopeDecayData {
  id: string;
  name: string;
  symbol: string;
  parentNuclide: string;
  daughterNuclide: string;
  decayMode: DecayMode;
  halfLife: string;
  halfLifeSeconds: number;
  energyMeV: number;
  decayConstant: number; // scaled for simulation
  description: string;
  shieldingRequired: 'Paper / Epidermis' | 'Aluminum (few mm)' | 'Dense Lead (5+ cm)';
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  particleColor: string;
}

const ISOTOPE_PRESETS: IsotopeDecayData[] = [
  {
    id: 'U-238',
    name: 'Uranium-238',
    symbol: 'U-238',
    parentNuclide: '²³⁸₉₂U',
    daughterNuclide: '²³⁴₉₀Th + ⁴₂α',
    decayMode: 'alpha',
    halfLife: '4.468 Billion Years',
    halfLifeSeconds: 1.41e17,
    energyMeV: 4.27,
    decayConstant: 0.25,
    description: 'Alpha decay emitting a high-energy Helium-4 nucleus (2p + 2n). High ionization power, stopped by paper or outer skin.',
    shieldingRequired: 'Paper / Epidermis',
    hazardLevel: 'Moderate',
    particleColor: '#f59e0b',
  },
  {
    id: 'Ra-226',
    name: 'Radium-226',
    symbol: 'Ra-226',
    parentNuclide: '²²⁶₈₈Ra',
    daughterNuclide: '²²²₈₆Rn + ⁴₂α + γ',
    decayMode: 'alpha',
    halfLife: '1,600 Years',
    halfLifeSeconds: 5.05e10,
    energyMeV: 4.87,
    decayConstant: 0.55,
    description: 'Discovered by Marie Curie; decays into radioactive Radon-222 gas accompanied by gamma rays.',
    shieldingRequired: 'Paper / Epidermis',
    hazardLevel: 'High',
    particleColor: '#f59e0b',
  },
  {
    id: 'Po-210',
    name: 'Polonium-210',
    symbol: 'Po-210',
    parentNuclide: '²¹⁰₈₄Po',
    daughterNuclide: '²⁰⁶₈₂Pb + ⁴₂α',
    decayMode: 'alpha',
    halfLife: '138.4 Days',
    halfLifeSeconds: 1.2e7,
    energyMeV: 5.30,
    decayConstant: 0.85,
    description: 'Intensely radioactive pure alpha emitter transforming directly into stable Lead-206.',
    shieldingRequired: 'Paper / Epidermis',
    hazardLevel: 'Severe',
    particleColor: '#f59e0b',
  },
  {
    id: 'C-14',
    name: 'Carbon-14',
    symbol: 'C-14',
    parentNuclide: '¹⁴₆C',
    daughterNuclide: '¹⁴₇N + e⁻ + ν̄ₑ',
    decayMode: 'beta-minus',
    halfLife: '5,730 Years (Dating)',
    halfLifeSeconds: 1.81e11,
    energyMeV: 0.156,
    decayConstant: 0.45,
    description: 'Beta-minus decay converting a neutron into a proton, emitting a fast electron and antineutrino.',
    shieldingRequired: 'Aluminum (few mm)',
    hazardLevel: 'Low',
    particleColor: '#0071e3',
  },
  {
    id: 'Cs-137',
    name: 'Cesium-137',
    symbol: 'Cs-137',
    parentNuclide: '¹³⁷₅₅Cs',
    daughterNuclide: '¹³⁷ᵐ₅₆Ba + e⁻ + ν̄ₑ',
    decayMode: 'beta-minus',
    halfLife: '30.17 Years',
    halfLifeSeconds: 9.52e8,
    energyMeV: 1.176,
    decayConstant: 0.60,
    description: 'Major nuclear fission byproduct with beta emissions followed by 662 keV gamma de-excitation.',
    shieldingRequired: 'Aluminum (few mm)',
    hazardLevel: 'High',
    particleColor: '#0071e3',
  },
  {
    id: 'I-131',
    name: 'Iodine-131',
    symbol: 'I-131',
    parentNuclide: '¹³¹₅₃I',
    daughterNuclide: '¹³¹₅₄Xe + e⁻ + γ',
    decayMode: 'beta-minus',
    halfLife: '8.02 Days',
    halfLifeSeconds: 6.93e5,
    energyMeV: 0.971,
    decayConstant: 0.90,
    description: 'Medical radioisotope used in targeted thyroid radiotherapy emitting both beta and gamma radiation.',
    shieldingRequired: 'Aluminum (few mm)',
    hazardLevel: 'Moderate',
    particleColor: '#0071e3',
  },
  {
    id: 'F-18',
    name: 'Fluorine-18 (PET Tracer)',
    symbol: 'F-18',
    parentNuclide: '¹⁸₉F',
    daughterNuclide: '¹⁸₈O + e⁺ + νₑ',
    decayMode: 'beta-plus',
    halfLife: '109.7 Minutes',
    halfLifeSeconds: 6582,
    energyMeV: 0.633,
    decayConstant: 0.95,
    description: 'Positron emission (β+) annihilating with ambient electrons to produce dual 511 keV coincidence gamma rays.',
    shieldingRequired: 'Aluminum (few mm)',
    hazardLevel: 'Moderate',
    particleColor: '#10b981',
  },
  {
    id: 'Co-60',
    name: 'Cobalt-60',
    symbol: 'Co-60',
    parentNuclide: '⁶⁰₂₇Co',
    daughterNuclide: '⁶⁰₂₈Ni* + e⁻ → Ni + 2γ',
    decayMode: 'gamma',
    halfLife: '5.27 Years',
    halfLifeSeconds: 1.66e8,
    energyMeV: 2.50,
    decayConstant: 0.70,
    description: 'Industrial and radiotherapy gamma source releasing intense penetrating 1.17 and 1.33 MeV photons.',
    shieldingRequired: 'Dense Lead (5+ cm)',
    hazardLevel: 'Severe',
    particleColor: '#8b5cf6',
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
  soundEnabled,
}: {
  isotope: IsotopeDecayData;
  isPlaying: boolean;
  geigerCountRef: React.MutableRefObject<number>;
  soundEnabled: boolean;
}) {
  const nucleusRef = useRef<THREE.Group>(null);
  const [particles, setParticles] = useState<EmittedParticle[]>([]);
  const lastEmitTime = useRef(0);

  useFrame((state, delta) => {
    if (!isPlaying) return;

    // Nucleus quantum vibration & precession
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.6;
      nucleusRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 5) * 0.08;
    }

    // Stochastic quantum decay emissions
    const now = state.clock.elapsedTime;
    if (now - lastEmitTime.current > 1.1 / isotope.decayConstant && Math.random() < 0.4) {
      lastEmitTime.current = now;
      if (soundEnabled) {
        audioEngine.playGeigerClick();
      }
      geigerCountRef.current += 1;

      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = (Math.random() - 0.5) * Math.PI;
      const speed = 3.2;
      const dir = new THREE.Vector3(
        Math.cos(angleTheta) * Math.cos(anglePhi),
        Math.sin(anglePhi),
        Math.sin(angleTheta) * Math.cos(anglePhi)
      ).normalize();

      setParticles((prev) => [
        ...prev.slice(-14),
        {
          id: Math.random(),
          pos: new THREE.Vector3(0, 0, 0),
          vel: dir.multiplyScalar(speed),
          type: isotope.decayMode,
          life: 1.0,
        },
      ]);
    }

    // Update particle positions with magnetic Lorentz deflection
    setParticles((prev) =>
      prev
        .map((p) => {
          const deflection =
            p.type === 'alpha'
              ? new THREE.Vector3(0, delta * 0.4, 0)
              : p.type === 'beta-minus'
              ? new THREE.Vector3(-delta * 2.0, 0, 0)
              : p.type === 'beta-plus'
              ? new THREE.Vector3(delta * 2.0, 0, 0)
              : new THREE.Vector3(0, 0, 0);

          const newVel = p.vel.clone().add(deflection);
          return {
            ...p,
            vel: newVel,
            pos: p.pos.clone().add(newVel.clone().multiplyScalar(delta)),
            life: p.life - delta * 0.38,
          };
        })
        .filter((p) => p.life > 0)
    );
  });

  return (
    <group>
      {/* Central Unstable Nucleus Cluster */}
      <group ref={nucleusRef}>
        <Sphere args={[0.72, 32, 32]}>
          <meshPhysicalMaterial
            color="#dc2626"
            emissive="#991b1b"
            emissiveIntensity={0.6}
            roughness={0.12}
            metalness={0.2}
            transmission={0.4}
            clearcoat={1.0}
          />
        </Sphere>

        {/* Laser Monospace Parent Label */}
        <Html center distanceFactor={4.5} occlude>
          <div className="font-mono font-black text-white text-xs tracking-tight pointer-events-none select-none drop-shadow-md">
            {isotope.parentNuclide}
          </div>
        </Html>
      </group>

      {/* Radiation Hazard Radial Shells */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.54, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.04, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      {/* Emitted Radiation Particles */}
      {particles.map((p) => {
        const isAlpha = p.type === 'alpha';
        const isGamma = p.type === 'gamma';
        const isBeta = p.type === 'beta-minus' || p.type === 'beta-plus';

        return (
          <group key={p.id} position={[p.pos.x, p.pos.y, p.pos.z]}>
            {isAlpha && (
              <group scale={p.life}>
                <Sphere args={[0.13, 16, 16]}>
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.8} />
                </Sphere>
              </group>
            )}
            {isBeta && (
              <group scale={p.life}>
                <Sphere args={[0.075, 16, 16]}>
                  <meshStandardMaterial
                    color={p.type === 'beta-minus' ? '#0071e3' : '#10b981'}
                    emissive={p.type === 'beta-minus' ? '#0071e3' : '#10b981'}
                    emissiveIntensity={2.2}
                  />
                </Sphere>
              </group>
            )}
            {isGamma && (
              <group scale={p.life}>
                <Sphere args={[0.095, 16, 16]}>
                  <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={2.8} />
                </Sphere>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

function CameraZoomHandler({ zoomAction }: { zoomAction: { type: 'in' | 'out' | 'reset'; ts: number } | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!zoomAction) return;
    if (zoomAction.type === 'in') {
      camera.position.multiplyScalar(0.82);
    } else if (zoomAction.type === 'out') {
      camera.position.multiplyScalar(1.22);
    } else if (zoomAction.type === 'reset') {
      camera.position.set(0, 2.5, 5.5);
      controlsRef.current?.reset();
    }
  }, [camera, zoomAction]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={2}
      maxDistance={16}
    />
  );
}

export function NuclearDecayLab({ onClose }: { onClose?: () => void } = {}) {
  const [selectedIsotope, setSelectedIsotope] = useState<string>('U-238');
  const [filterMode, setFilterMode] = useState<'all' | 'alpha' | 'beta' | 'gamma'>('all');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [elapsedHalfLives, setElapsedHalfLives] = useState<number>(1.0);
  const [cpm, setCpm] = useState<number>(42);
  const [zoomAction, setZoomAction] = useState<{ type: 'in' | 'out' | 'reset'; ts: number } | null>(null);
  const geigerCountRef = useRef<number>(0);

  const activeIsotope = useMemo(
    () => ISOTOPE_PRESETS.find((i) => i.id === selectedIsotope) || ISOTOPE_PRESETS[0],
    [selectedIsotope]
  );

  const filteredIsotopes = useMemo(() => {
    return ISOTOPE_PRESETS.filter((iso) => {
      if (filterMode === 'alpha') return iso.decayMode === 'alpha';
      if (filterMode === 'beta') return iso.decayMode.startsWith('beta');
      if (filterMode === 'gamma') return iso.decayMode === 'gamma';
      return true;
    });
  }, [filterMode]);

  // Live Geiger counter CPM calculation
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const counts = geigerCountRef.current;
        const newCpm = Math.round(counts * 22 + 16 + Math.random() * 10);
        setCpm(newCpm);
        geigerCountRef.current = 0;
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Exponential Decay Fraction N(t)/N_0 = (1/2)^(t/t_1/2)
  const remainingPercent = useMemo(
    () => Math.pow(0.5, elapsedHalfLives) * 100,
    [elapsedHalfLives]
  );

  // Micro-Sieverts dose conversion approx (1 CPM ≈ 0.0057 µSv/h for gamma/beta)
  const doseRateMicroSv = useMemo(() => {
    return (cpm * 0.0057).toFixed(2);
  }, [cpm]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[var(--color-canvas)] text-[var(--color-ink-primary)] font-sans select-none overflow-hidden">
      {/* Left 3D Decay Chamber Stage */}
      <div className="h-64 sm:h-80 lg:h-full flex-1 min-w-0 min-h-0 relative bg-[var(--color-canvas)] cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 2.5, 5.5], fov: 42, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.9} color="#f8fafc" />
          <directionalLight position={[6, 12, 8]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-6, -4, -6]} intensity={0.7} color="#38bdf8" />
          <directionalLight position={[0, -8, 4]} intensity={0.5} color="#ef4444" />

          <DecayScene
            isotope={activeIsotope}
            isPlaying={isPlaying}
            geigerCountRef={geigerCountRef}
            soundEnabled={soundEnabled}
          />

          <CameraZoomHandler zoomAction={zoomAction} />
        </Canvas>

        {/* High-Precision Geiger-Müller Dosimeter HUD */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-auto">
          <div className="p-3 rounded-lg bg-[var(--color-surface-1)]/95 border border-[var(--color-hairline)] backdrop-blur-md shadow-xs flex flex-col gap-2 min-w-[210px] font-sans">
            {/* Header & Status Indicator */}
            <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink-primary)]">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Geiger-Müller Dosimeter</span>
              </div>
              <span className={cn(
                "w-2 h-2 rounded-full",
                cpm > 120 ? "bg-rose-500 animate-ping" : cpm > 60 ? "bg-amber-400" : "bg-emerald-400"
              )} />
            </div>

            {/* Numerical Readouts */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-[var(--color-ink-muted)] font-medium">Activity Rate</div>
                <div className="text-base font-bold text-[var(--color-ink-primary)] leading-tight font-mono tnum">
                  {cpm} <span className="text-[10px] font-medium text-[var(--color-ink-muted)]">CPM</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--color-ink-muted)] font-medium">Dose Equiv</div>
                <div className="text-base font-bold text-[var(--color-accent)] leading-tight font-mono tnum">
                  {doseRateMicroSv} <span className="text-[10px] font-medium text-[var(--color-ink-muted)]">µSv/h</span>
                </div>
              </div>
            </div>

            {/* Radiation Field Severity Pill */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--color-hairline)] text-xs">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium border",
                cpm > 120
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : cpm > 60
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              )}>
                {cpm > 120 ? 'Critical Ionizing' : cpm > 60 ? 'Elevated Field' : 'Background Safe'}
              </span>

              {/* Sound Audio Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors cursor-pointer"
                title={soundEnabled ? "Mute Geiger Audio Clicks" : "Enable Geiger Audio Clicks"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--color-accent)]" /> : <VolumeX className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3D Viewport Navigation Deck */}
        <div className="absolute top-3 right-3 flex items-center gap-0.5 bg-[var(--color-surface-1)]/95 border border-[var(--color-hairline)] p-0.5 rounded-md backdrop-blur-md shadow-xs">
          <button
            onClick={() => setZoomAction({ type: 'in', ts: Date.now() })}
            className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoomAction({ type: 'out', ts: Date.now() })}
            className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })}
            className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom Play/Pause Controller */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <button
            onClick={() => {
              audioEngine.playClick(isPlaying ? 600 : 880);
              setIsPlaying(!isPlaying);
            }}
            className="btn-primary h-8 px-3.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            <span>{isPlaying ? 'Pause Simulation' : 'Resume Decay'}</span>
          </button>
        </div>
      </div>

      {/* Right Control & Physics Inspector Panel */}
      <div className="w-full lg:w-96 shrink-0 h-auto lg:h-full p-4 flex flex-col gap-3.5 overflow-y-auto bg-[var(--color-surface-1)] border-t lg:border-t-0 lg:border-l border-[var(--color-hairline)] shadow-xs z-10 font-sans">
        {/* Header Lockup */}
        <div className="flex items-start justify-between border-b border-[var(--color-hairline)] pb-3">
          <div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink-primary)] border border-[var(--color-hairline)] text-xs font-semibold w-fit shadow-2xs mb-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Nuclear Decay Lab</span>
            </div>
            <h1 className="text-base font-semibold text-[var(--color-ink-primary)] font-display">Radioactivity & Decay Series</h1>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Explore Alpha, Beta, and Gamma quantum emissions.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors"
              title="Close Lab"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nuclide Filter Tabs & Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="section-label">Unstable Nuclides</label>
            <div className="flex items-center gap-0.5 bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-hairline)] text-xs">
              {(['all', 'alpha', 'beta', 'gamma'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                    filterMode === m ? "bg-[var(--color-surface-3)] text-white shadow-2xs font-semibold border border-[var(--color-hairline)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
                  )}
                >
                  {m === 'all' ? 'All' : m === 'alpha' ? 'α Alpha' : m === 'beta' ? 'β Beta' : 'γ Gamma'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 bg-[var(--color-surface-2)] rounded-md border border-[var(--color-hairline)]">
            {filteredIsotopes.map((iso) => (
              <button
                key={iso.id}
                onClick={() => {
                  audioEngine.playClick(720);
                  setSelectedIsotope(iso.id);
                }}
                className={cn(
                  "p-2 rounded-md border text-left transition-all flex flex-col justify-between cursor-pointer active:scale-95",
                  selectedIsotope === iso.id
                    ? "bg-[var(--color-surface-3)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50 shadow-2xs"
                    : "bg-[var(--color-surface-1)] border-[var(--color-hairline)] hover:border-[var(--color-accent)]/40 text-[var(--color-ink-secondary)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold truncate text-[var(--color-ink-primary)] font-mono">{iso.symbol}</div>
                  <span className={cn(
                    "text-[9px] font-mono font-medium px-1.5 py-0.2 rounded",
                    iso.decayMode === 'alpha' ? "text-amber-400 bg-amber-500/15" : iso.decayMode === 'gamma' ? "text-purple-400 bg-purple-500/15" : "text-sky-400 bg-sky-500/15"
                  )}>
                    {iso.decayMode === 'alpha' ? 'α' : iso.decayMode === 'gamma' ? 'γ' : 'β'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--color-ink-muted)] truncate mt-0.5">{iso.halfLife}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Half-Life Exponential Scrubber */}
        <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] space-y-2 text-xs shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--color-ink-muted)] font-medium">Elapsed Half-Lives:</span>
            <span className="text-[var(--color-accent)] font-semibold font-mono">{elapsedHalfLives.toFixed(1)} t½</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={elapsedHalfLives}
            onChange={(e) => setElapsedHalfLives(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--color-surface-3)] rounded appearance-none cursor-pointer accent-[var(--color-accent)]"
          />

          <div className="flex justify-between items-center pt-1 text-xs">
            <span className="text-[var(--color-ink-muted)] font-medium">Remaining Parent Nuclei:</span>
            <strong className="text-[var(--color-ink-primary)] font-semibold font-mono tnum">{remainingPercent.toFixed(1)}%</strong>
          </div>
          <div className="w-full h-1.5 bg-[var(--color-surface-3)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-accent)] transition-all duration-150" style={{ width: `${remainingPercent}%` }} />
          </div>
        </div>

        {/* Unified Nuclear Transformation Matrix Card */}
        <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] overflow-hidden shadow-xs text-xs">
          <div className="px-3.5 py-2.5 bg-[var(--color-surface-3)]/40 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <span className="font-semibold text-xs text-[var(--color-ink-primary)]">Nuclear Reaction Properties</span>
            <span className="text-[11px] font-medium font-mono text-amber-400">{activeIsotope.decayMode.toUpperCase()} Decay</span>
          </div>

          <div className="divide-y divide-[var(--color-hairline)]">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[var(--color-ink-muted)] text-xs">Transformation</span>
              <strong className="text-[var(--color-ink-primary)] font-semibold text-xs font-mono">{activeIsotope.daughterNuclide}</strong>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[var(--color-ink-muted)] text-xs">Half-Life Duration</span>
              <strong className="text-[var(--color-accent)] font-semibold font-mono">{activeIsotope.halfLife}</strong>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[var(--color-ink-muted)] text-xs">Emission Q-Value</span>
              <strong className="text-[var(--color-ink-primary)] font-semibold font-mono tnum">{activeIsotope.energyMeV} MeV</strong>
            </div>
            <div className="px-3 py-2 flex items-center justify-between bg-[var(--color-surface-3)]/20">
              <span className="text-[var(--color-ink-muted)] text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Required Shielding</span>
              </span>
              <strong className="text-amber-400 font-semibold">{activeIsotope.shieldingRequired}</strong>
            </div>
          </div>
        </div>

        {/* Physics Note */}
        <div className="p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] text-xs text-[var(--color-ink-secondary)] leading-relaxed font-sans shadow-2xs">
          <strong className="text-[var(--color-ink-primary)] font-semibold">Decay Mechanism: </strong>
          {activeIsotope.description}
        </div>
      </div>
    </div>
  );
}
