import { memo, useState, useMemo } from 'react';
import { ChemicalElement, getElementPalette, getElementBlock } from '@/data/elements';
import { cn } from '@/lib/utils';

interface AtomSvgDiagramProps {
  element: ChemicalElement;
  size?: number | 'sm' | 'md' | 'lg';
  animated?: boolean;
  interactive?: boolean;
  showLabels?: boolean;
  className?: string;
  onSelectShell?: (shellIndex: number, electronCount: number) => void;
}

const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

export const AtomSvgDiagram = memo(function AtomSvgDiagram({
  element,
  size = 'md',
  animated = true,
  interactive = true,
  showLabels = true,
  className,
  onSelectShell,
}: AtomSvgDiagramProps) {
  const [hoveredShell, setHoveredShell] = useState<number | null>(null);
  const [hoveredElectron, setHoveredElectron] = useState<{ shell: number; index: number } | null>(null);

  const dimension = useMemo(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 120;
      case 'lg': return 380;
      case 'md':
      default: return 220;
    }
  }, [size]);

  const palette = useMemo(() => getElementPalette(element), [element]);
  const shells = element.shells || [element.atomicNumber];
  const totalShells = shells.length;

  // Viewbox coordinate space
  const viewBoxSize = 400;
  const center = viewBoxSize / 2;
  const nucleusRadius = Math.max(26, 42 - totalShells * 2.2);
  const maxRadius = viewBoxSize / 2 - (showLabels ? 28 : 16);
  const radiusStep = totalShells > 1 
    ? (maxRadius - nucleusRadius - 12) / (totalShells - 1)
    : 0;

  // Shell geometric calculations
  const shellRings = useMemo(() => {
    return shells.map((electronCount, idx) => {
      const radius = totalShells === 1 
        ? nucleusRadius + 36 
        : nucleusRadius + 16 + idx * radiusStep;
      
      const isValence = idx === totalShells - 1;
      const isHovered = hoveredShell === idx;
      
      // Calculate electron coordinates around the ring
      // Stagger initial phase to give realistic quantum orbital distribution
      const phaseOffset = (idx * 0.45 * Math.PI);
      const electrons = Array.from({ length: electronCount }, (_, eIdx) => {
        const angle = phaseOffset + (eIdx / electronCount) * Math.PI * 2;
        return {
          index: eIdx,
          angle,
          cx: center + Math.cos(angle) * radius,
          cy: center + Math.sin(angle) * radius,
        };
      });

      return {
        index: idx,
        principalN: idx + 1,
        letter: SHELL_LETTERS[idx] || `S${idx + 1}`,
        radius,
        electronCount,
        isValence,
        isHovered,
        electrons,
        orbitalCapacity: 2 * Math.pow(idx + 1, 2),
      };
    });
  }, [shells, totalShells, nucleusRadius, radiusStep, center, hoveredShell]);

  // Nucleon count (Protons & Neutrons approximation)
  const protons = element.atomicNumber;
  const neutrons = Math.round(element.atomicMass - element.atomicNumber);
  const totalElectrons = shells.reduce((acc, c) => acc + c, 0);

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none", className)}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={dimension}
        height={dimension}
        className="overflow-visible"
        style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}
      >
        <defs>
          {/* High-Refraction Nucleus Spherical 3D Volume Gradient */}
          <radialGradient
            id={`nucleus-grad-${element.symbol}`}
            cx="35%"
            cy="30%"
            r="65%"
            fx="30%"
            fy="25%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="25%" stopColor={palette.highlight} stopOpacity="0.85" />
            <stop offset="55%" stopColor={palette.primary} stopOpacity="1" />
            <stop offset="85%" stopColor={palette.secondary} stopOpacity="1" />
            <stop offset="100%" stopColor="#050811" stopOpacity="1" />
          </radialGradient>

          {/* Core Quantum Electron Particle Radial Gradient */}
          <radialGradient id="electron-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>

          {/* Energetic Valence Electron Particle Radial Gradient */}
          <radialGradient id="electron-valence-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#fde047" />
            <stop offset="85%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Subatomic Glow Filter */}
          <filter id="atom-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Valence Ring Luminous Filter */}
          <filter id="valence-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Quantum Field Atmosphere */}
        <circle
          cx={center}
          cy={center}
          r={viewBoxSize / 2 - 12}
          fill="none"
          stroke={palette.primary}
          strokeWidth="1"
          strokeOpacity="0.08"
          strokeDasharray="3 6"
        />

        {/* Concentric Bohr Quantum Orbital Shells */}
        {shellRings.map((ring) => {
          const isSelected = hoveredShell === ring.index;
          return (
            <g
              key={ring.index}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => {
                if (interactive) setHoveredShell(ring.index);
              }}
              onMouseLeave={() => {
                if (interactive) setHoveredShell(null);
              }}
              onClick={() => {
                if (interactive && onSelectShell) {
                  onSelectShell(ring.index, ring.electronCount);
                }
              }}
            >
              {/* Shell Orbital Hairline Track */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.isValence ? '#f59e0b' : isSelected ? palette.highlight : palette.border}
                strokeWidth={ring.isValence ? (isSelected ? 2.5 : 1.8) : isSelected ? 2 : 1}
                strokeDasharray={ring.isValence ? 'none' : '4 4'}
                strokeOpacity={ring.isValence ? 0.85 : isSelected ? 0.75 : 0.28}
                filter={ring.isValence ? 'url(#valence-glow)' : undefined}
                className={cn(animated && "transition-all duration-300")}
              />

              {/* Hover Interactive Target Zone */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke="transparent"
                strokeWidth="16"
              />

              {/* Quantum Shell Letter Label (K, L, M, ...) */}
              {showLabels && (
                <g opacity={isSelected || ring.isValence ? 0.95 : 0.45}>
                  <rect
                    x={center + ring.radius - 11}
                    y={center - 8}
                    width="22"
                    height="16"
                    rx="4"
                    fill="#0a0c14"
                    stroke={ring.isValence ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
                    strokeWidth="1"
                  />
                  <text
                    x={center + ring.radius}
                    y={center + 3}
                    textAnchor="middle"
                    fill={ring.isValence ? '#fde047' : '#94a3b8'}
                    fontSize="9.5"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
                    fontWeight="700"
                  >
                    {ring.letter}
                  </text>
                </g>
              )}

              {/* Shell Population Count Badge on Top Axis */}
              {showLabels && isSelected && (
                <text
                  x={center}
                  y={center - ring.radius - 6}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
                  fontWeight="700"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  n={ring.principalN} · {ring.electronCount}e⁻ (max {ring.orbitalCapacity})
                </text>
              )}

              {/* Animated Rotating Subshell Electrons Container */}
              <g
                style={{
                  transformOrigin: `${center}px ${center}px`,
                  animation: animated
                    ? `spin ${18 / Math.sqrt(ring.index + 1)}s linear infinite ${ring.index % 2 === 1 ? 'reverse' : 'normal'}`
                    : 'none',
                }}
              >
                {ring.electrons.map((electron) => {
                  const isElectronHovered =
                    hoveredElectron?.shell === ring.index &&
                    hoveredElectron?.index === electron.index;

                  return (
                    <g
                      key={electron.index}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        if (interactive) setHoveredElectron({ shell: ring.index, index: electron.index });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        if (interactive) setHoveredElectron(null);
                      }}
                    >
                      {/* Photon Emission Halo */}
                      <circle
                        cx={electron.cx}
                        cy={electron.cy}
                        r={ring.isValence ? 7.5 : 5.5}
                        fill={ring.isValence ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.25)'}
                        filter="url(#atom-glow)"
                      />

                      {/* Solid Spherical Electron Bead */}
                      <circle
                        cx={electron.cx}
                        cy={electron.cy}
                        r={ring.isValence ? 4.2 : 3.4}
                        fill={ring.isValence ? 'url(#electron-valence-grad)' : 'url(#electron-grad)'}
                        stroke={ring.isValence ? '#fef08a' : '#bfdbfe'}
                        strokeWidth={isElectronHovered ? 1.6 : 0.8}
                        className={cn(isElectronHovered && "scale-125")}
                      />

                      {/* Electron Specular Glint */}
                      <circle
                        cx={electron.cx - 1.2}
                        cy={electron.cy - 1.2}
                        r={1}
                        fill="#ffffff"
                        opacity="0.9"
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}

        {/* Central Atomic Nucleus (High-Refraction Optical Quartz Sphere) */}
        <g className="cursor-default">
          {/* Luminous Nuclear Core Ambient Glow */}
          <circle
            cx={center}
            cy={center}
            r={nucleusRadius + 6}
            fill="none"
            stroke={palette.primary}
            strokeWidth="3"
            strokeOpacity="0.25"
            filter="url(#atom-glow)"
          />

          {/* High-Precision Quartz Nucleus Body */}
          <circle
            cx={center}
            cy={center}
            r={nucleusRadius}
            fill={`url(#nucleus-grad-${element.symbol})`}
            stroke={palette.border}
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {/* Optical Specular Glint Crescent (Top-Left 3D Lighting) */}
          <ellipse
            cx={center - nucleusRadius * 0.32}
            cy={center - nucleusRadius * 0.35}
            rx={nucleusRadius * 0.38}
            ry={nucleusRadius * 0.22}
            transform={`rotate(-28 ${center - nucleusRadius * 0.32} ${center - nucleusRadius * 0.35})`}
            fill="#ffffff"
            opacity="0.55"
          />

          {/* Laser-Etched Element Symbol */}
          <text
            x={center}
            y={center - 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.text}
            fontSize={Math.max(13, nucleusRadius * 0.72)}
            fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            letterSpacing="-0.03em"
            style={{
              textShadow: palette.text === '#ffffff'
                ? '0 1px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.6)'
                : '0 1px 3px rgba(255,255,255,0.8)',
            }}
          >
            {element.symbol}
          </text>

          {/* Atomic Number Subtitle */}
          <text
            x={center}
            y={center + nucleusRadius * 0.52}
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.text}
            opacity="0.8"
            fontSize={Math.max(8.5, nucleusRadius * 0.32)}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
            fontWeight="700"
          >
            Z={element.atomicNumber}
          </text>
        </g>
      </svg>

      {/* Interactive Telemetry Footprint (Below Diagram when interactive) */}
      {interactive && showLabels && (
        <div className="mt-2 w-full flex items-center justify-between text-[10px] font-mono text-[var(--color-ink-muted)] px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
            <span>P: {protons} · N: {neutrons}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Valence: {shells[shells.length - 1]}e⁻</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-ink-primary)] font-bold">{totalElectrons}e⁻ total</span>
          </div>
        </div>
      )}
    </div>
  );
});
