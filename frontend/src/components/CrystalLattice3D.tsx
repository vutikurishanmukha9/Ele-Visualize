import { useState, useMemo, useRef, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Layers, Box, X } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

export type LatticeType = 'sc' | 'bcc' | 'fcc' | 'diamond' | 'hcp' | 'nacl';

interface LatticePreset {
  id: LatticeType;
  name: string;
  category: string;
  coordinationNumber: number;
  atomsPerCell: number;
  packingEfficiency: number; // APF
  formula: string;
  description: string;
  defaultElement1: { symbol: string; color: string; radius: number };
  defaultElement2?: { symbol: string; color: string; radius: number };
}

const LATTICE_PRESETS: LatticePreset[] = [
  {
    id: 'fcc',
    name: 'Face-Centered Cubic (FCC)',
    category: 'Cubic',
    coordinationNumber: 12,
    atomsPerCell: 4,
    packingEfficiency: 0.74,
    formula: 'Cu, Al, Au, Ag, Pt, Pb, Ni',
    description: 'Closest packing arrangement with ABCABC stacking. Highest atomic packing factor among cubic lattices.',
    defaultElement1: { symbol: 'Au', color: '#fbbf24', radius: 0.28 },
  },
  {
    id: 'bcc',
    name: 'Body-Centered Cubic (BCC)',
    category: 'Cubic',
    coordinationNumber: 8,
    atomsPerCell: 2,
    packingEfficiency: 0.68,
    formula: 'Fe (α), Cr, W, Mo, Na, K',
    description: 'Features an atom situated at the geometric center of the unit cube surrounded by eight corner atoms.',
    defaultElement1: { symbol: 'Fe', color: '#f97316', radius: 0.28 },
  },
  {
    id: 'sc',
    name: 'Simple Cubic (SC)',
    category: 'Cubic',
    coordinationNumber: 6,
    atomsPerCell: 1,
    packingEfficiency: 0.52,
    formula: 'Po (Polonium)',
    description: 'Primitive cubic lattice with atoms strictly located at the eight cube vertices.',
    defaultElement1: { symbol: 'Po', color: '#06b6d4', radius: 0.28 },
  },
  {
    id: 'diamond',
    name: 'Diamond Cubic',
    category: 'Tetrahedral',
    coordinationNumber: 4,
    atomsPerCell: 8,
    packingEfficiency: 0.34,
    formula: 'C (Diamond), Si, Ge, α-Sn',
    description: 'Two interpenetrating FCC lattices displaced by a/4 along the body diagonal with sp³ hybridization.',
    defaultElement1: { symbol: 'C', color: '#64748b', radius: 0.24 },
  },
  {
    id: 'nacl',
    name: 'Rock Salt (NaCl)',
    category: 'Ionic Binary',
    coordinationNumber: 6,
    atomsPerCell: 8,
    packingEfficiency: 0.67,
    formula: 'NaCl, MgO, CaO, FeO, KBr',
    description: 'Face-centered cubic array of anions with cations filling all octahedral interstitial sites.',
    defaultElement1: { symbol: 'Cl⁻', color: '#10b981', radius: 0.30 },
    defaultElement2: { symbol: 'Na⁺', color: '#8b5cf6', radius: 0.20 },
  },
  {
    id: 'hcp',
    name: 'Hexagonal Close-Packed (HCP)',
    category: 'Hexagonal',
    coordinationNumber: 12,
    atomsPerCell: 6,
    packingEfficiency: 0.74,
    formula: 'Ti, Mg, Zn, Co, Zr, Be',
    description: 'Hexagonal unit cell with ABABAB close packing yielding maximum space filling ratio (c/a ≈ 1.633).',
    defaultElement1: { symbol: 'Ti', color: '#38bdf8', radius: 0.28 },
  },
];

interface AtomSite {
  pos: [number, number, number];
  type: 1 | 2;
  symbol: string;
  color: string;
}

// Generate atomic coordinate sites based on lattice symmetry and unit repeats
function generateLatticeSites(
  type: LatticeType,
  repeat: number,
  preset: LatticePreset
): { atoms: AtomSite[]; bonds: [THREE.Vector3, THREE.Vector3][] } {
  const atoms: AtomSite[] = [];
  const bonds: [THREE.Vector3, THREE.Vector3][] = [];
  const a = 1.6; // Lattice spacing unit

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
          // 8 corners
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            if (rx === 0 || x === 1) if (ry === 0 || y === 1) if (rz === 0 || z === 1) {
              addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
            }
          })));
        } else if (type === 'bcc') {
          // Corners + Center
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, 0, 1);
        } else if (type === 'fcc') {
          // Corners + 6 Face centers
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
          // FCC base
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          // 4 interior tetrahedral sites
          addAtom(-0.25, -0.25, -0.25, 1);
          addAtom(0.25, 0.25, -0.25, 1);
          addAtom(-0.25, 0.25, 0.25, 1);
          addAtom(0.25, -0.25, 0.25, 1);
        } else if (type === 'nacl') {
          // Cl- on FCC, Na+ on Octahedral
          [0, 1].forEach((x) => [0, 1].forEach((y) => [0, 1].forEach((z) => {
            addAtom(x - 0.5, y - 0.5, z - 0.5, 1);
          })));
          addAtom(0, 0, -0.5, 1);
          addAtom(0, 0, 0.5, 1);
          addAtom(0, -0.5, 0, 1);
          addAtom(0, 0.5, 0, 1);
          addAtom(-0.5, 0, 0, 1);
          addAtom(0.5, 0, 0, 1);
          // Na+ sites (edges + center)
          addAtom(0, 0, 0, 2);
          addAtom(0.5, 0.5, 0, 2);
          addAtom(-0.5, 0.5, 0, 2);
          addAtom(0.5, -0.5, 0, 2);
          addAtom(-0.5, -0.5, 0, 2);
          addAtom(0, 0.5, 0.5, 2);
          addAtom(0, -0.5, 0.5, 2);
          addAtom(0.5, 0, 0.5, 2);
          addAtom(-0.5, 0, 0.5, 2);
        } else if (type === 'hcp') {
          // Hexagonal prisms
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const hx = Math.cos(angle) * 0.7;
            const hz = Math.sin(angle) * 0.7;
            addAtom(hx, -0.6, hz, 1);
            addAtom(hx, 0.6, hz, 1);
          }
          addAtom(0, -0.6, 0, 1);
          addAtom(0, 0.6, 0, 1);
          // Mid-plane 3 atoms
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
            addAtom(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4, 1);
          }
        }
      }
    }
  }

  // Generate nearest-neighbor strut bonds
  const threshold = a * 0.75;
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const p1 = new THREE.Vector3(...atoms[i].pos);
      const p2 = new THREE.Vector3(...atoms[j].pos);
      const dist = p1.distanceTo(p2);
      if (dist > 0.05 && dist <= threshold) {
        bonds.push([p1, p2]);
      }
    }
  }

  return { atoms, bonds };
}

// 3D Bond Strut Component
const BondStrut = memo(function BondStrut({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const pos = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { position: pos, quaternion: quat, length: len };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.024, 0.024, length, 12]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} transparent opacity={0.65} />
    </mesh>
  );
});

// Inner 3D Lattice Scene
function LatticeScene({
  type,
  repeat,
  preset,
  sphereScale,
  showBonds,
  showUnitCellBox,
}: {
  type: LatticeType;
  repeat: number;
  preset: LatticePreset;
  sphereScale: number;
  showBonds: boolean;
  showUnitCellBox: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { atoms, bonds } = useMemo(() => generateLatticeSites(type, repeat, preset), [type, repeat, preset]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Unit Cell Bounding Wireframe Box */}
      {showUnitCellBox && (
        <mesh>
          <boxGeometry args={[1.6 * repeat, 1.6 * repeat, 1.6 * repeat]} />
          <meshBasicMaterial color="#16a875" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      {/* Interatomic Strut Bonds */}
      {showBonds &&
        bonds.map(([start, end], idx) => <BondStrut key={idx} start={start} end={end} />)}

      {/* Crystal Lattice Atoms */}
      {atoms.map((atom, idx) => {
        const radius =
          (atom.type === 1 ? preset.defaultElement1.radius : (preset.defaultElement2?.radius || 0.25)) *
          sphereScale;

        return (
          <group key={idx} position={atom.pos}>
            <Sphere args={[radius, 24, 24]}>
              <meshPhysicalMaterial
                color={atom.color}
                emissive={atom.color}
                emissiveIntensity={0.35}
                roughness={0.06}
                metalness={0.25}
                transmission={0.65}
                ior={1.75}
                thickness={0.8}
                clearcoat={1.0}
              />
            </Sphere>
          </group>
        );
      })}
    </group>
  );
}

export function CrystalLattice3D({ onClose }: { onClose?: () => void } = {}) {
  const [selectedType, setSelectedType] = useState<LatticeType>('fcc');
  const [repeat, setRepeat] = useState<number>(1);
  const [sphereScale, setSphereScale] = useState<number>(1.0);
  const [showBonds, setShowBonds] = useState<boolean>(true);
  const [showUnitCellBox, setShowUnitCellBox] = useState<boolean>(true);

  const activePreset = useMemo(
    () => LATTICE_PRESETS.find((p) => p.id === selectedType) || LATTICE_PRESETS[0],
    [selectedType]
  );

  const handleSelectType = (type: LatticeType) => {
    audioEngine.playClick(840);
    setSelectedType(type);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#f8faf8] overflow-hidden">
      {/* 3D Canvas Stage */}
      <div className="flex-1 relative h-[50vh] md:h-full min-h-[360px] bg-slate-900/5 cursor-grab active:cursor-grabbing border-b md:border-b-0 md:border-r border-slate-200">
        <Canvas
          camera={{ position: [3.5, 3.2, 4.5], fov: 45, near: 0.1, far: 50 }}
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
          <directionalLight position={[0, -8, 4]} intensity={0.6} color="#f59e0b" />

          <LatticeScene
            type={selectedType}
            repeat={repeat}
            preset={activePreset}
            sphereScale={sphereScale}
            showBonds={showBonds}
            showUnitCellBox={showUnitCellBox}
          />

          <OrbitControls enableDamping dampingFactor={0.06} minDistance={2} maxDistance={20} />
        </Canvas>

        {/* Floating Canvas Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-black/[0.06] backdrop-blur-md shadow-card">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
              <Box className="w-3.5 h-3.5 text-[#16a875]" /> {activePreset.name}
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              APF: <strong className="text-[#087f5b]">{(activePreset.packingEfficiency * 100).toFixed(1)}%</strong> • CN:{' '}
              <strong className="text-slate-800">{activePreset.coordinationNumber}</strong> • Atoms/Cell:{' '}
              <strong className="text-slate-800">{activePreset.atomsPerCell}</strong>
            </p>
          </div>
        </div>

        {/* Quick View Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            onClick={() => setShowBonds(!showBonds)}
            className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold border transition-all ${
              showBonds ? 'bg-[#e6f6ef] border-[#bce8d5] text-[#087f5b]' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            Strut Bonds: {showBonds ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowUnitCellBox(!showUnitCellBox)}
            className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold border transition-all ${
              showUnitCellBox ? 'bg-[#e6f6ef] border-[#bce8d5] text-[#087f5b]' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            Unit Cell Box: {showUnitCellBox ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Right Control & Science Dashboard */}
      <div className="w-full md:w-88 p-5 flex flex-col gap-4 overflow-y-auto bg-white/90 backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#087f5b] uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4 text-[#16a875]" /> Crystal Lattice & Unit Cells
            </div>
            <h1 className="text-lg font-serif font-bold text-slate-900">Solid State Physics Lab</h1>
            <p className="text-xs text-slate-500 mt-0.5">Explore 3D Bravais lattice unit cells and packing fractions.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lattice Type Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">Lattice Symmetries</label>
          <div className="grid grid-cols-2 gap-1.5">
            {LATTICE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectType(p.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedType === p.id
                    ? 'bg-[#e6f6ef] border-[#16a875] text-[#087f5b] shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold truncate">{p.name.split(' ')[0]}</div>
                <div className="text-[10px] font-mono text-slate-500">{p.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 font-mono text-xs">
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Supercell Repeat (NxNxN)</span>
              <span className="text-[#087f5b]">{repeat}x{repeat}x{repeat}</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={repeat}
              onChange={(e) => setRepeat(Number(e.target.value))}
              className="w-full accent-[#16a875] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Atom Radius Scale</span>
              <span className="text-[#087f5b]">{(sphereScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.6"
              step="0.05"
              value={sphereScale}
              onChange={(e) => setSphereScale(Number(e.target.value))}
              className="w-full accent-[#16a875] cursor-pointer"
            />
          </div>
        </div>

        {/* Quantitative Metrics */}
        <div className="p-4 rounded-2xl border border-black/[0.06] bg-white shadow-card space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Packing Efficiency (APF)</span>
            <strong className="text-[#087f5b]">{(activePreset.packingEfficiency * 100).toFixed(1)}%</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Coordination Number</span>
            <strong className="text-slate-900">{activePreset.coordinationNumber}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Atoms per Unit Cell</span>
            <strong className="text-slate-900">{activePreset.atomsPerCell}</strong>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Real-World Examples</span>
            <strong className="text-slate-900 text-right truncate max-w-[140px]">{activePreset.formula}</strong>
          </div>
        </div>

        {/* Physics Note */}
        <div className="p-3 rounded-xl bg-[#e6f6ef] border border-[#bce8d5] text-[11px] text-slate-700 leading-relaxed">
          <strong className="text-[#087f5b]">Lattice Physics:</strong> {activePreset.description}
        </div>
      </div>
    </div>
  );
}
