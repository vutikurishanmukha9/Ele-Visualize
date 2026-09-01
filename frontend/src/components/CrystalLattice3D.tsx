import { useState, useMemo, useRef, memo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Layers, Box, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

export type LatticeType = 'sc' | 'bcc' | 'fcc' | 'diamond' | 'hcp' | 'nacl' | 'zns' | 'caf2';

interface LatticePreset {
  id: LatticeType;
  name: string;
  shortName: string;
  category: 'Cubic' | 'Close-Packed' | 'Ionic/Binary' | 'Tetrahedral';
  spaceGroup: string;
  coordinationNumber: number;
  atomsPerCell: number;
  packingEfficiency: number; // APF
  formula: string;
  millerIndices: string;
  description: string;
  defaultElement1: { symbol: string; color: string; radius: number };
  defaultElement2?: { symbol: string; color: string; radius: number };
}

const LATTICE_PRESETS: LatticePreset[] = [
  {
    id: 'fcc',
    name: 'Face-Centered Cubic (FCC)',
    shortName: 'FCC',
    category: 'Close-Packed',
    spaceGroup: 'Fm-3m (225)',
    coordinationNumber: 12,
    atomsPerCell: 4,
    packingEfficiency: 0.74,
    formula: 'Cu, Al, Au, Ag, Pt, Pb, Ni',
    millerIndices: '{111} close-packed planes',
    description: 'Closest cubic packing arrangement with ABCABC stacking. Yields maximum atomic packing factor (74.0%) with 12 nearest neighbors.',
    defaultElement1: { symbol: 'Au', color: '#f59e0b', radius: 0.28 },
  },
  {
    id: 'bcc',
    name: 'Body-Centered Cubic (BCC)',
    shortName: 'BCC',
    category: 'Cubic',
    spaceGroup: 'Im-3m (229)',
    coordinationNumber: 8,
    atomsPerCell: 2,
    packingEfficiency: 0.68,
    formula: 'Fe (α), Cr, W, Mo, Na, K, Ba',
    millerIndices: '{110} slip planes',
    description: 'Features a central body atom surrounded by eight corner atoms. Common in high-strength transition metals at standard temperature.',
    defaultElement1: { symbol: 'Fe', color: '#ea580c', radius: 0.28 },
  },
  {
    id: 'sc',
    name: 'Simple Cubic (SC)',
    shortName: 'Simple Cubic',
    category: 'Cubic',
    spaceGroup: 'Pm-3m (221)',
    coordinationNumber: 6,
    atomsPerCell: 1,
    packingEfficiency: 0.52,
    formula: 'α-Po (Polonium)',
    millerIndices: '{100} cubic faces',
    description: 'Primitive cubic lattice with atoms strictly located at the 8 cube vertices. Rare in elements due to low packing efficiency.',
    defaultElement1: { symbol: 'Po', color: '#06b6d4', radius: 0.28 },
  },
  {
    id: 'diamond',
    name: 'Diamond Cubic',
    shortName: 'Diamond',
    category: 'Tetrahedral',
    spaceGroup: 'Fd-3m (227)',
    coordinationNumber: 4,
    atomsPerCell: 8,
    packingEfficiency: 0.34,
    formula: 'C (Diamond), Si, Ge, α-Sn',
    millerIndices: '{111} cleavage planes',
    description: 'Two interpenetrating FCC lattices displaced by a/4 along the body diagonal with covalent sp³ tetrahedral bonding.',
    defaultElement1: { symbol: 'C', color: '#64748b', radius: 0.24 },
  },
  {
    id: 'nacl',
    name: 'Rock Salt (NaCl)',
    shortName: 'Rock Salt (NaCl)',
    category: 'Ionic/Binary',
    spaceGroup: 'Fm-3m (225)',
    coordinationNumber: 6,
    atomsPerCell: 8,
    packingEfficiency: 0.67,
    formula: 'NaCl, MgO, CaO, FeO, KBr',
    millerIndices: '{100} cleavage planes',
    description: 'Face-centered cubic array of anions with cations filling all octahedral interstitial holes with 6:6 octahedral coordination.',
    defaultElement1: { symbol: 'Cl⁻', color: '#10b981', radius: 0.30 },
    defaultElement2: { symbol: 'Na⁺', color: '#8b5cf6', radius: 0.20 },
  },
  {
    id: 'zns',
    name: 'Zincblende (Sphalerite)',
    shortName: 'Zincblende',
    category: 'Ionic/Binary',
    spaceGroup: 'F-43m (216)',
    coordinationNumber: 4,
    atomsPerCell: 8,
    packingEfficiency: 0.34,
    formula: 'ZnS, GaAs, InP, CdTe',
    millerIndices: '{110} non-polar cleavage',
    description: 'FCC array of sulfur anions with zinc cations occupying half of the tetrahedral interstitial voids with 4:4 coordination.',
    defaultElement1: { symbol: 'S²⁻', color: '#eab308', radius: 0.28 },
    defaultElement2: { symbol: 'Zn²⁺', color: '#0071e3', radius: 0.20 },
  },
  {
    id: 'caf2',
    name: 'Fluorite (CaF₂)',
    shortName: 'Fluorite',
    category: 'Ionic/Binary',
    spaceGroup: 'Fm-3m (225)',
    coordinationNumber: 8,
    atomsPerCell: 12,
    packingEfficiency: 0.62,
    formula: 'CaF₂, UO₂, ThO₂, CeO₂',
    millerIndices: '{111} cleavage planes',
    description: 'FCC calcium cations with fluorine anions filling all 8 tetrahedral voids, creating 8-fold cubic Ca and 4-fold tetrahedral F.',
    defaultElement1: { symbol: 'Ca²⁺', color: '#059669', radius: 0.28 },
    defaultElement2: { symbol: 'F⁻', color: '#06b6d4', radius: 0.18 },
  },
  {
    id: 'hcp',
    name: 'Hexagonal Close-Packed (HCP)',
    shortName: 'HCP',
    category: 'Close-Packed',
    spaceGroup: 'P6_3/mmc (194)',
    coordinationNumber: 12,
    atomsPerCell: 6,
    packingEfficiency: 0.74,
    formula: 'Ti, Mg, Zn, Co, Zr, Be',
    millerIndices: '{0001} basal planes',
    description: 'Hexagonal unit cell with ABABAB close packing yielding maximum space filling ratio (c/a ≈ 1.633) with 12-fold coordination.',
    defaultElement1: { symbol: 'Ti', color: '#0071e3', radius: 0.28 },
  },
];

interface AtomSite {
  pos: [number, number, number];
  type: 1 | 2;
  symbol: string;
  color: string;
}

function generateLatticeSites(
  type: LatticeType,
  repeat: number,
  preset: LatticePreset
): { atoms: AtomSite[]; bonds: [THREE.Vector3, THREE.Vector3][] } {
  const atoms: AtomSite[] = [];
  const bonds: [THREE.Vector3, THREE.Vector3][] = [];
  const a = 1.6;

  for (let rx = 0; rx < repeat; rx++) {
    for (let ry = 0; ry < repeat; ry++) {
      for (let rz = 0; rz < repeat; rz++) {
        const ox = (rx - (repeat - 1) / 2) * a;
        const oy = (ry - (repeat - 1) / 2) * a;
        const oz = (rz - (repeat - 1) / 2) * a;

        const addAtom = (dx: number, dy: number, dz: number, kind: 1 | 2 = 1) => {
          const el = kind === 1 ? preset.defaultElement1 : (preset.defaultElement2 || preset.defaultElement1);
          atoms.push({
            pos: [ox + dx * a, oy + dy * a, oz + dz * a],
            type: kind,
            symbol: el.symbol,
            color: el.color,
          });
        };

        if (type === 'sc') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            if (rx === 0 || x === 1) if (ry === 0 || y === 1) if (rz === 0 || z === 1) {
              addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
            }
          })));
        } else if (type === 'bcc') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, 0, 1);
        } else if (type === 'fcc') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
        } else if (type === 'diamond') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          addAtom(-0.25, -0.25, -0.25, 1);
          addAtom(0.25, 0.25, -0.25, 1);
          addAtom(-0.25, 0.25, 0.25, 1);
          addAtom(0.25, -0.25, 0.25, 1);
        } else if (type === 'nacl') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          addAtom(0, 0, 0, 2);
          addAtom(0.5, 0.5, 0, 2);
          addAtom(-0.5, 0.5, 0, 2);
          addAtom(0.5, -0.5, 0, 2);
          addAtom(-0.5, -0.5, 0, 2);
          addAtom(0, 0.5, 0.5, 2);
          addAtom(0, -0.5, 0.5, 2);
          addAtom(0, 0.5, -0.5, 2);
          addAtom(0, -0.5, -0.5, 2);
          addAtom(0.5, 0, 0.5, 2);
          addAtom(-0.5, 0, 0.5, 2);
          addAtom(0.5, 0, -0.5, 2);
          addAtom(-0.5, 0, -0.5, 2);
        } else if (type === 'zns') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          addAtom(-0.25, -0.25, -0.25, 2);
          addAtom(0.25, 0.25, -0.25, 2);
          addAtom(-0.25, 0.25, 0.25, 2);
          addAtom(0.25, -0.25, 0.25, 2);
        } else if (type === 'caf2') {
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          [-0.25, 0.25].forEach((tx) =>
            [-0.25, 0.25].forEach((ty) =>
              [-0.25, 0.25].forEach((tz) => {
                addAtom(tx, ty, tz, 2);
              })
            )
          );
        } else if (type === 'hcp') {
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const hx = Math.cos(angle) * 0.5;
            const hz = Math.sin(angle) * 0.5;
            addAtom(hx, -0.5, hz, 1);
            addAtom(hx, 0.5, hz, 1);
          }
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(0.28, 0, 0, 1);
          addAtom(-0.14, 0, 0.24, 1);
          addAtom(-0.14, 0, -0.24, 1);
        }
      }
    }
  }

  const cutoff = type === 'diamond' || type === 'zns' ? 0.75 : type === 'hcp' ? 0.95 : 1.2;
  const maxBondDist = a * cutoff;

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const p1 = new THREE.Vector3(...atoms[i].pos);
      const p2 = new THREE.Vector3(...atoms[j].pos);
      const dist = p1.distanceTo(p2);
      if (dist > 0.1 && dist <= maxBondDist) {
        bonds.push([p1, p2]);
      }
    }
  }

  return { atoms, bonds };
}

const BondStrut = memo(function BondStrut({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const { pos, rot, len } = useMemo(() => {
    const p = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const orientation = new THREE.Quaternion();
    orientation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const euler = new THREE.Euler().setFromQuaternion(orientation);
    return { pos: p, rot: euler, len: length };
  }, [start, end]);

  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[0.02, 0.02, len, 8]} />
      <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
    </mesh>
  );
});

const UnitCellWireframe = memo(function UnitCellWireframe({ repeat }: { repeat: number }) {
  const size = 1.6 * repeat;
  return (
    <mesh>
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial color="#0071e3" wireframe transparent opacity={0.35} />
    </mesh>
  );
});

const MillerPlane111 = memo(function MillerPlane111() {
  const geom = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([0.8, -0.8, -0.8, -0.8, 0.8, -0.8, -0.8, -0.8, 0.8]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#0071e3" transparent opacity={0.3} side={THREE.DoubleSide} roughness={0.2} />
    </mesh>
  );
});

function LatticeScene({ type, repeat, preset, sphereScale, showBonds, showUnitCellBox, showMillerPlane }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { atoms, bonds } = useMemo(() => generateLatticeSites(type, repeat, preset), [type, repeat, preset]);
  useFrame((_, delta) => { if (groupRef.current) groupRef.current.rotation.y += delta * 0.12; });
  return (
    <group ref={groupRef}>
      {showUnitCellBox && <UnitCellWireframe repeat={repeat} />}
      {showMillerPlane && <MillerPlane111 />}
      {showBonds && bonds.map(([start, end], idx) => <BondStrut key={idx} start={start} end={end} />)}
      {atoms.map((atom, idx) => {
        const radius = (atom.type === 1 ? preset.defaultElement1.radius : (preset.defaultElement2?.radius || 0.25)) * sphereScale;
        return (
          <group key={idx} position={atom.pos}>
            <Sphere args={[radius, 24, 24]}>
              <meshPhysicalMaterial color={atom.color} emissive={atom.color} emissiveIntensity={0.25} roughness={0.12} metalness={0.3} clearcoat={1.0} />
            </Sphere>
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
    if (zoomAction.type === 'in') camera.position.multiplyScalar(0.82);
    else if (zoomAction.type === 'out') camera.position.multiplyScalar(1.22);
    else if (zoomAction.type === 'reset') { camera.position.set(3.5, 3.2, 4.5); controlsRef.current?.reset(); }
  }, [camera, zoomAction]);
  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.06} minDistance={2} maxDistance={22} />;
}

export function CrystalLattice3D({ onClose }: { onClose?: () => void } = {}) {
  const [selectedType, setSelectedType] = useState<LatticeType>('fcc');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Cubic' | 'Close-Packed' | 'Ionic/Binary'>('All');
  const [repeat, setRepeat] = useState<number>(1);
  const [sphereScale, setSphereScale] = useState<number>(1.0);
  const [showBonds, setShowBonds] = useState<boolean>(true);
  const [showUnitCellBox, setShowUnitCellBox] = useState<boolean>(true);
  const [showMillerPlane, setShowMillerPlane] = useState<boolean>(false);
  const [zoomAction, setZoomAction] = useState<{ type: 'in' | 'out' | 'reset'; ts: number } | null>(null);

  const activePreset = useMemo(() => LATTICE_PRESETS.find((p) => p.id === selectedType) || LATTICE_PRESETS[0], [selectedType]);
  const filteredPresets = useMemo(() => filterCategory === 'All' ? LATTICE_PRESETS : LATTICE_PRESETS.filter((p) => p.category === filterCategory), [filterCategory]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#fbfbfd] text-slate-900 font-sans select-none overflow-hidden">
      {/* Left 3D Stage Viewport */}
      <div className="h-64 sm:h-80 lg:h-full flex-1 min-w-0 min-h-0 relative bg-slate-900/[0.03] cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [3.5, 3.2, 4.5], fov: 42, near: 0.1, far: 50 }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[6, 12, 8]} intensity={1.5} />
          <LatticeScene type={selectedType} repeat={repeat} preset={activePreset} sphereScale={sphereScale} showBonds={showBonds} showUnitCellBox={showUnitCellBox} showMillerPlane={showMillerPlane} />
          <CameraZoomHandler zoomAction={zoomAction} />
        </Canvas>

        {/* Top-Left: High-Precision Crystallography HUD */}
        <div className="absolute top-3 left-3 p-3 rounded-lg bg-white/95 border border-slate-200/80 backdrop-blur-md shadow-xs min-w-[220px] font-mono pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
              <Box className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Unit Cell Telemetry</span>
            </div>
            <span className="text-[10px] font-bold text-[#0071e3]">{activePreset.spaceGroup}</span>
          </div>
          <div className="text-xs font-bold pt-1.5 text-slate-900">{activePreset.name}</div>
          <div className="grid grid-cols-3 gap-1 pt-2 text-[10px]">
            <div>
              <span className="text-slate-400 block text-[9px]">APF</span>
              <strong className="text-[#0071e3] font-bold">{(activePreset.packingEfficiency * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">Coord #</span>
              <strong className="text-slate-900 font-bold">{activePreset.coordinationNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">Atoms/Cell</span>
              <strong className="text-slate-900 font-bold">{activePreset.atomsPerCell}</strong>
            </div>
          </div>
        </div>

        {/* Top-Right: Camera Navigation Deck */}
        <div className="absolute top-3 right-3 flex items-center gap-0.5 bg-white/95 border border-slate-200/80 p-0.5 rounded-md backdrop-blur-md shadow-xs">
          <button onClick={() => setZoomAction({ type: 'in', ts: Date.now() })} className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900" title="Zoom In">
            <ZoomIn className="w-3 h-3" />
          </button>
          <button onClick={() => setZoomAction({ type: 'out', ts: Date.now() })} className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900" title="Zoom Out">
            <ZoomOut className="w-3 h-3" />
          </button>
          <button onClick={() => setZoomAction({ type: 'reset', ts: Date.now() })} className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900" title="Reset View">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom-Left: Visual Layer Toggles */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowBonds(!showBonds)}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shadow-2xs",
              showBonds ? "bg-slate-900 text-white border-slate-800" : "bg-white/95 hover:bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            <span>Bonds: {showBonds ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setShowUnitCellBox(!showUnitCellBox)}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shadow-2xs",
              showUnitCellBox ? "bg-slate-900 text-white border-slate-800" : "bg-white/95 hover:bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            <span>Unit Box: {showUnitCellBox ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setShowMillerPlane(!showMillerPlane)}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shadow-2xs",
              showMillerPlane ? "bg-[#0071e3] text-white border-[#0071e3]" : "bg-white/95 hover:bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            <span>Plane: {showMillerPlane ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Right Control & Science Dashboard */}
      <div className="w-full lg:w-96 shrink-0 h-auto lg:h-full p-4 flex flex-col gap-3.5 overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 shadow-xs z-10">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold w-fit mb-1.5 shadow-xs">
              <Layers className="w-3 h-3 text-[#0071e3]" />
              <span>SOLID STATE LAB</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 font-display">Crystal Lattice & Bravais Unit Cells</h1>
            <p className="text-xs text-slate-500 mt-0.5">Explore 3D atomic packing factors and Miller planes.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              title="Close Lab"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filters & Lattice Symmetries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Lattice Symmetries</label>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md text-[10px] font-mono font-bold">
              {(['All', 'Cubic', 'Close-Packed', 'Ionic/Binary'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-1.5 py-0.5 rounded transition-colors",
                    filterCategory === cat ? "bg-white text-[#0071e3] shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {cat === 'All' ? 'All' : cat === 'Ionic/Binary' ? 'Ionic' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-md border border-slate-200/70">
            {filteredPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  audioEngine.playClick(840);
                  setSelectedType(p.id);
                }}
                className={cn(
                  "p-2 rounded-md border text-left transition-all flex flex-col justify-between",
                  selectedType === p.id
                    ? "bg-blue-50 border-[#0071e3] ring-1 ring-[#0071e3]/40 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold truncate text-slate-900 font-mono">{p.shortName}</div>
                  <span className="text-[8.5px] font-mono uppercase font-bold px-1 rounded text-[#0071e3] bg-blue-50">
                    {(p.packingEfficiency * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[9.5px] font-mono text-slate-400 truncate mt-0.5">{p.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50 space-y-2.5 font-mono text-xs shadow-xs">
          <div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              <span className="text-slate-600">Repeat (NxNxN):</span>
              <span className="text-[#0071e3]">{repeat}x{repeat}x{repeat}</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={repeat}
              onChange={(e) => setRepeat(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-[#0071e3]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              <span className="text-slate-600">Radius Scale:</span>
              <span className="text-[#0071e3]">{(sphereScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.5"
              step="0.05"
              value={sphereScale}
              onChange={(e) => setSphereScale(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-[#0071e3]"
            />
          </div>
        </div>

        {/* Unified Properties Card */}
        <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-xs text-xs font-mono">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase text-[10px]">Crystallographic Properties</span>
            <span className="text-[10px] font-bold text-[#0071e3]">{activePreset.spaceGroup}</span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Packing Efficiency:</span>
              <strong className="text-[#0071e3] font-bold">{(activePreset.packingEfficiency * 100).toFixed(1)}%</strong>
            </div>
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Coordination:</span>
              <strong className="text-slate-900 font-bold">{activePreset.coordinationNumber} nearest neighbors</strong>
            </div>
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Atoms/Cell (Z):</span>
              <strong className="text-slate-900 font-bold">{activePreset.atomsPerCell}</strong>
            </div>
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Miller Cleavage:</span>
              <strong className="text-slate-900 font-bold text-xs">{activePreset.millerIndices}</strong>
            </div>
            <div className="p-2.5 flex items-center justify-between bg-slate-50/50">
              <span className="text-slate-500 text-[11px]">Examples:</span>
              <strong className="text-slate-900 font-bold text-right truncate max-w-[150px]">{activePreset.formula}</strong>
            </div>
          </div>
        </div>

        {/* Physics Note */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed font-sans shadow-2xs">
          <strong className="text-slate-900 font-semibold font-mono">Lattice Physics: </strong>
          {activePreset.description}
        </div>
      </div>
    </div>
  );
}
