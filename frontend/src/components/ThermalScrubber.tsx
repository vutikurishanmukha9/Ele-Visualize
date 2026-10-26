import { memo } from 'react';
import { Thermometer } from 'lucide-react';
import { elements } from '@/data/elements';
import { getElementStateAtTemp } from '@/data/elementProperties';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';

interface ThermalScrubberProps {
  temperatureK: number;
  onTemperatureChange: (tempK: number) => void;
  className?: string;
}

const THERMAL_PRESETS = [
  { label: '0 K', value: 0, title: 'Absolute Zero' },
  { label: '77 K', value: 77, title: 'Liquid Nitrogen (-196°C)' },
  { label: '298 K', value: 298, title: 'Room Temp (25°C)' },
  { label: '373 K', value: 373, title: 'Water Boiling (100°C)' },
  { label: '1811 K', value: 1811, title: 'Iron Melting Point' },
  { label: '5778 K', value: 5778, title: 'Solar Surface' },
];

export const ThermalScrubber = memo(function ThermalScrubber({
  temperatureK,
  onTemperatureChange,
  className = '',
}: ThermalScrubberProps) {
  const celsius = Math.round(temperatureK - 273.15);
  const fahrenheit = Math.round((celsius * 9) / 5 + 32);

  // Calculate live phase breakdown of 118 elements at current temperature
  const phaseCounts = elements.reduce(
    (acc, el) => {
      const state = getElementStateAtTemp(el.atomicNumber, temperatureK);
      if (state === 'solid') acc.solid += 1;
      else if (state === 'liquid') acc.liquid += 1;
      else if (state === 'gas') acc.gas += 1;
      else acc.other += 1;
      return acc;
    },
    { solid: 0, liquid: 0, gas: 0, other: 0 }
  );

  return (
    <div className={cn("p-3.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-hairline)] shadow-xs flex flex-col justify-between space-y-2.5 font-sans select-none", className)}>
      {/* Header & Live Temperature Telemetry */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink-primary)] text-xs">
          <Thermometer className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>Thermal Simulation</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded border border-[var(--color-hairline)]">
            {temperatureK} K
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)]">
            ({celsius}°C / {fahrenheit}°F)
          </span>
        </div>
      </div>

      {/* Hardware Slider Track */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="6000"
          step="10"
          value={temperatureK}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[var(--color-surface-3)] rounded appearance-none cursor-pointer accent-[var(--color-accent)]"
        />
      </div>

      {/* Live Phase Distribution Badges */}
      <div className="flex items-center justify-between text-[11px] bg-[var(--color-surface-2)] p-1.5 rounded-md border border-[var(--color-hairline)]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-[var(--color-ink-muted)]">Solid: <strong className="text-[var(--color-ink-primary)] font-mono font-medium">{phaseCounts.solid}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span className="text-[var(--color-ink-muted)]">Liquid: <strong className="text-[var(--color-ink-primary)] font-mono font-medium">{phaseCounts.liquid}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[var(--color-ink-muted)]">Gas: <strong className="text-[var(--color-ink-primary)] font-mono font-medium">{phaseCounts.gas}</strong></span>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-6 gap-1">
        {THERMAL_PRESETS.map((preset) => {
          const isActive = Math.abs(temperatureK - preset.value) < 15;
          return (
            <button
              key={preset.value}
              onClick={() => {
                audioEngine.playClick(780);
                onTemperatureChange(preset.value);
              }}
              className={cn(
                "py-1 rounded-md text-[10px] font-medium transition-all border text-center truncate cursor-pointer active:scale-[0.98]",
                isActive
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-2xs font-semibold"
                  : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] border-[var(--color-hairline)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-primary)]"
              )}
              title={preset.title}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});
