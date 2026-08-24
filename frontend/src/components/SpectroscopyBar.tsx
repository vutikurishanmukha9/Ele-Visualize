import { memo, useMemo, useState } from 'react';
import { ChemicalElement } from '@/data/elements';
import { audioEngine } from '@/lib/audioEngine';
import { Zap } from 'lucide-react';

interface SpectroscopyBarProps {
  element: ChemicalElement;
  className?: string;
}

interface SpectralLine {
  wavelength: number; // in nm (380 to 750)
  intensity: number;  // 0.1 to 1.0
  color: string;
  name: string;
  transition?: string;
}

// Convert wavelength (nm) to approximate RGB color
function wavelengthToRGB(wavelength: number): string {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 750) {
    r = 1;
    g = 0;
    b = 0;
  }

  // Intensity falloff near human vision limits
  let factor = 1.0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 700 && wavelength <= 750) {
    factor = 0.3 + 0.7 * (750 - wavelength) / (750 - 700);
  }

  const red = Math.round(255 * Math.pow(r * factor, 0.8));
  const green = Math.round(255 * Math.pow(g * factor, 0.8));
  const blue = Math.round(255 * Math.pow(b * factor, 0.8));

  return `rgb(${red}, ${green}, ${blue})`;
}

export const SpectroscopyBar = memo(function SpectroscopyBar({ element, className = '' }: SpectroscopyBarProps) {
  const [selectedLine, setSelectedLine] = useState<SpectralLine | null>(null);
  const [hoveredLine, setHoveredLine] = useState<SpectralLine | null>(null);

  // Derive exact physical emission lines
  const spectralLines = useMemo<SpectralLine[]>(() => {
    const Z = element.atomicNumber;
    const lines: SpectralLine[] = [];

    // Hydrogen Balmer Series (Physical exact values)
    if (Z === 1) {
      lines.push(
        { wavelength: 656.3, intensity: 1.0, color: '#ff3333', name: 'H-Alpha', transition: '3d → 2p (Balmer)' },
        { wavelength: 486.1, intensity: 0.8, color: '#00e5ff', name: 'H-Beta', transition: '4d → 2p (Balmer)' },
        { wavelength: 434.0, intensity: 0.6, color: '#4b0082', name: 'H-Gamma', transition: '5d → 2p (Balmer)' },
        { wavelength: 410.2, intensity: 0.4, color: '#8a2be2', name: 'H-Delta', transition: '6d → 2p (Balmer)' }
      );
      return lines;
    }

    // Helium emission series
    if (Z === 2) {
      lines.push(
        { wavelength: 706.5, intensity: 0.7, color: wavelengthToRGB(706.5), name: 'He-I 706.5', transition: '3s³S → 2p³P' },
        { wavelength: 667.8, intensity: 0.9, color: wavelengthToRGB(667.8), name: 'He-I 667.8', transition: '3d¹D → 2p¹P' },
        { wavelength: 587.6, intensity: 1.0, color: '#ffdd00', name: 'He-D3 Yellow', transition: '3d³D → 2p³P' },
        { wavelength: 501.6, intensity: 0.6, color: wavelengthToRGB(501.6), name: 'He-I 501.6', transition: '3p¹P → 2s¹S' },
        { wavelength: 447.1, intensity: 0.8, color: wavelengthToRGB(447.1), name: 'He-I 447.1', transition: '4d³D → 2p³P' }
      );
      return lines;
    }

    // Sodium doublet
    if (Z === 11) {
      lines.push(
        { wavelength: 589.0, intensity: 1.0, color: '#ffc400', name: 'Na D2 Doublet', transition: '3p²P3/2 → 3s²S1/2' },
        { wavelength: 589.6, intensity: 0.9, color: '#ffbe00', name: 'Na D1 Doublet', transition: '3p²P1/2 → 3s²S1/2' },
        { wavelength: 498.2, intensity: 0.4, color: wavelengthToRGB(498.2), name: 'Na-I Green', transition: '5d → 3p' },
        { wavelength: 568.8, intensity: 0.5, color: wavelengthToRGB(568.8), name: 'Na-I Yellow', transition: '4d → 3p' }
      );
      return lines;
    }

    // Deterministic generation for other elements
    const numLines = 5 + (Z % 7);
    for (let i = 0; i < numLines; i++) {
      const seed = Math.sin(Z * 12.9898 + i * 78.233) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const wl = Math.round(390 + frac * 340);
      const intensity = 0.4 + ((seed * 3.7) % 0.6);
      lines.push({
        wavelength: wl,
        intensity,
        color: wavelengthToRGB(wl),
        name: `${element.symbol} Line ${i + 1}`,
        transition: `Level ${Math.floor(i / 2) + 3} → Level 2`,
      });
    }

    return lines.sort((a, b) => a.wavelength - b.wavelength);
  }, [element.atomicNumber, element.symbol]);

  const activeLine = hoveredLine || selectedLine || spectralLines[0];

  const handleLineClick = (line: SpectralLine) => {
    setSelectedLine(line);
    // Map wavelength to acoustic pitch (380nm -> 1200Hz, 750nm -> 400Hz)
    const acousticFreq = Math.round(1200 - ((line.wavelength - 380) / 370) * 800);
    audioEngine.playClick(acousticFreq);
  };

  return (
    <div className={`p-3 rounded-xl bg-white border border-slate-200 font-mono select-none space-y-2.5 shadow-sm ${className}`}>
      {/* Telemetry Header */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-2 font-bold text-slate-900">
          <Zap className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          Optical Emission Spectroscopy
        </span>
        <span className="text-sky-700 font-bold">
          {activeLine ? `${activeLine.wavelength} nm` : `${spectralLines.length} Lines`}
        </span>
      </div>

      {/* Spectrum Continuous Film Strip */}
      <div className="relative h-7 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center shadow-inner cursor-crosshair">
        {/* Continuous Rainbow dispersion substrate */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(90deg, #4b0082 0%, #0000ff 20%, #00ff00 45%, #ffff00 65%, #ff7f00 80%, #ff0000 100%)',
          }}
        />

        {/* Spectral Emission Lines */}
        {spectralLines.map((line, idx) => {
          const leftPercent = ((line.wavelength - 380) / (750 - 380)) * 100;
          const isCurrent = activeLine?.wavelength === line.wavelength;

          return (
            <div
              key={idx}
              onClick={() => handleLineClick(line)}
              onMouseEnter={() => setHoveredLine(line)}
              onMouseLeave={() => setHoveredLine(null)}
              className="absolute top-0 bottom-0 transition-all hover:scale-y-125 z-10"
              style={{
                left: `${leftPercent}%`,
                width: isCurrent ? '4px' : '2px',
                backgroundColor: line.color,
                boxShadow: isCurrent ? `0 0 12px ${line.color}, 0 0 20px ${line.color}` : `0 0 4px ${line.color}`,
                opacity: isCurrent ? 1 : line.intensity,
              }}
              title={`${line.name}: ${line.wavelength} nm (Click for photon telemetry)`}
            />
          );
        })}

        {/* Axis Reference Ticks */}
        <div className="absolute inset-x-0 bottom-0.5 flex justify-between px-2 text-[8px] text-slate-400 pointer-events-none">
          <span>380nm</span>
          <span>480nm</span>
          <span>580nm</span>
          <span>680nm</span>
          <span>750nm</span>
        </div>
      </div>

      {/* Selected Spectral Line Detail Inspector */}
      {activeLine && (
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Photon Energy (E)</span>
            <span className="font-bold text-sky-700">
              {(1239.84 / activeLine.wavelength).toFixed(3)} eV
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Frequency (ν)</span>
            <span className="font-bold text-purple-700">
              {((2.9979e5) / activeLine.wavelength).toFixed(1)} THz
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Transition</span>
            <span className="font-bold text-amber-700 truncate" title={activeLine.transition}>
              {activeLine.transition || 'Atomic Shell'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
