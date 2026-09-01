import { useRef, useState, useMemo, memo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScientificState } from '@/scientific/models/ScientificState';
import { getElementColor } from '@/data/elements';
import { QuantumShellRenderer } from '../renderers/QuantumShellRenderer';
import { OrbitalCloudRenderer } from '../renderers/OrbitalCloudRenderer';
import { NucleusRenderer } from '../renderers/NucleusRenderer';
import { SpectroscopyDetectorRenderer } from '../renderers/SpectroscopyDetectorRenderer';
import { SemanticScaleDomain } from '../continuum/SemanticScaleController';
import { QuantumTelemetryHUD } from '../telemetry/QuantumTelemetryHUD';
import { PlainLanguageExplainDrawer } from '../telemetry/PlainLanguageExplainDrawer';
import { qualityGovernor } from './qualityManager';

export type QuantumVisualizationMode = 'SHELLS' | 'ORBITALS' | 'NUCLEUS' | 'SPECTRUM';

interface AtomStageProps {
  scientificState: ScientificState;
  activeMode?: QuantumVisualizationMode;
  isPaused?: boolean;
  autoRotate?: boolean;
  animationSpeed?: number;
  onSelectMode?: (mode: QuantumVisualizationMode) => void;
}

function CameraChoreographer({ mode, domain }: { mode: QuantumVisualizationMode; domain: SemanticScaleDomain }) {
  const { camera } = useThree();

  useEffect(() => {
    let targetPos = { x: 0, y: 0, z: 9.5 };

    if (mode === 'NUCLEUS' || domain === 'NUCLEAR' || domain === 'SUBATOMIC') {
      targetPos = { x: 0, y: 0.2, z: 2.8 };
    } else if (mode === 'ORBITALS' || domain === 'ORBITAL') {
      targetPos = { x: 3.5, y: 2.5, z: 7.0 };
    } else if (mode === 'SPECTRUM') {
      targetPos = { x: 1.5, y: 0, z: 8.5 };
    }

    gsap.to(camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.1,
      ease: 'power3.out',
    });
  }, [mode, domain, camera]);

  useFrame((_, delta) => {
    qualityGovernor.reportFrameTime(delta * 1000);
  });

  return null;
}

export const AtomStage = memo(function AtomStage({
  scientificState,
  activeMode = 'SHELLS',
  isPaused = false,
  autoRotate = false,
  animationSpeed = 1,
  onSelectMode,
}: AtomStageProps) {
  const [semanticDomain, setSemanticDomain] = useState<SemanticScaleDomain>('ATOMIC');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [focusedShellIndex, setFocusedShellIndex] = useState<number | null>(null);

  // Sync mode changes with semantic scale domains
  useEffect(() => {
    if (activeMode === 'SHELLS') setSemanticDomain('ATOMIC');
    else if (activeMode === 'ORBITALS') setSemanticDomain('ORBITAL');
    else if (activeMode === 'NUCLEUS') setSemanticDomain('NUCLEAR');
    else if (activeMode === 'SPECTRUM') setSemanticDomain('ATOMIC');
  }, [activeMode]);

  const handleSelectDomain = (domain: SemanticScaleDomain) => {
    setSemanticDomain(domain);
    if (domain === 'ATOMIC' && onSelectMode) onSelectMode('SHELLS');
    else if (domain === 'ORBITAL' && onSelectMode) onSelectMode('ORBITALS');
    else if ((domain === 'NUCLEAR' || domain === 'SUBATOMIC') && onSelectMode) onSelectMode('NUCLEUS');
  };

  const elementColor = getElementColor(scientificState.element) || '#38bdf8';

  return (
    <div className="w-full h-full relative select-none bg-transparent overflow-hidden">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 0, 9.5], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2.5]}
      >
        <CameraChoreographer mode={activeMode} domain={semanticDomain} />

        {/* Multi-Point Studio Lighting Rig */}
        <ambientLight intensity={0.95} color="#ffffff" />
        <directionalLight position={[8, 12, 10]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-10, -6, -8]} intensity={0.85} color="#38bdf8" />
        <directionalLight position={[8, -8, -6]} intensity={0.7} color="#f59e0b" />
        <directionalLight position={[0, 8, -12]} intensity={1.5} color="#818cf8" />

        {/* Studio Ground Pedestal Laser Halo */}
        <mesh position={[0, -5.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 7.5, 64]} />
          <meshBasicMaterial color={elementColor} transparent opacity={0.05} side={THREE.DoubleSide} />
        </mesh>

        <Float speed={1.0} rotationIntensity={0.03} floatIntensity={0.06}>
          <group>
            {/* Core Nucleus (Always visible at center) */}
            <NucleusRenderer
              nucleus={scientificState.nucleus}
              elementColor={elementColor}
              showQuarkDetail={semanticDomain === 'SUBATOMIC'}
            />

            {/* Mode 01: Quantum Shells */}
            {activeMode === 'SHELLS' && (
              <QuantumShellRenderer
                shells={scientificState.shells}
                elementColor={elementColor}
                isPaused={isPaused}
                speedMultiplier={animationSpeed}
                focusedShellIndex={focusedShellIndex}
                onHoverShell={setFocusedShellIndex}
              />
            )}

            {/* Mode 02: Wave Orbitals */}
            {activeMode === 'ORBITALS' && (
              <OrbitalCloudRenderer
                orbitals={scientificState.orbitals}
                elementColor={elementColor}
                isPaused={isPaused}
              />
            )}

            {/* Mode 04: Transition & Spectroscopy Laboratory */}
            {activeMode === 'SPECTRUM' && (
              <SpectroscopyDetectorRenderer
                energy={scientificState.energy}
                spectroscopy={scientificState.spectroscopy}
              />
            )}
          </group>
        </Float>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          minDistance={1.2}
          maxDistance={30}
        />
      </Canvas>

      {/* High-Density Precision Telemetry HUD */}
      <QuantumTelemetryHUD
        scientificState={scientificState}
        activeDomain={semanticDomain}
        onSelectDomain={handleSelectDomain}
        onOpenExplain={() => setIsExplainOpen(true)}
      />

      {/* Plain Language Explain Drawer */}
      <PlainLanguageExplainDrawer
        scientificState={scientificState}
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
      />
    </div>
  );
});
