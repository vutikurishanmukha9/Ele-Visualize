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
    <div className={cn("p-3.5 rounded-lg bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2.5 font-mono select-none", className)}>
      {/* Header & Live Temperature Telemetry */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
          <Thermometer className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>Thermal Core Simulation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
            {temperatureK} K
          </span>
          <span className="text-[10px] text-slate-400">
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
          className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-[#0071e3]"
        />
      </div>

      {/* Live Phase Distribution Badges */}
      <div className="flex items-center justify-between text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200/60 font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-slate-600">Solid: <strong>{phaseCounts.solid}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-slate-600">Liquid: <strong>{phaseCounts.liquid}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-600">Gas: <strong>{phaseCounts.gas}</strong></span>
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
                "py-1 rounded text-[9.5px] font-bold transition-all border text-center truncate",
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
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
