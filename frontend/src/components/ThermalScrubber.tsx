import { memo } from 'react';
import { Thermometer } from 'lucide-react';

interface ThermalScrubberProps {
  temperatureK: number;
  onTemperatureChange: (tempK: number) => void;
  className?: string;
}

const THERMAL_PRESETS = [
  { label: '0 K', value: 0, title: 'Absolute Zero' },
  { label: '77 K', value: 77, title: 'Liquid Nitrogen' },
  { label: '298 K', value: 298, title: 'Standard Room Temp (25°C)' },
  { label: '373 K', value: 373, title: 'Water Boiling Point' },
  { label: '1811 K', value: 1811, title: 'Iron Melting Point' },
  { label: '5778 K', value: 5778, title: 'Solar Photosphere' },
];

export const ThermalScrubber = memo(function ThermalScrubber({
  temperatureK,
  onTemperatureChange,
  className = '',
}: ThermalScrubberProps) {
  const celsius = Math.round(temperatureK - 273.15);
  const fahrenheit = Math.round((celsius * 9) / 5 + 32);

  // Dynamic heat color
  const getTempColor = (t: number) => {
    if (t < 100) return '#0284c7';
    if (t < 300) return '#0369a1';
    if (t < 1000) return '#d97706';
    if (t < 3000) return '#ea580c';
    return '#e11d48';
  };

  const tempColor = getTempColor(temperatureK);

  return (
    <div className={`p-4 rounded-2xl bg-white/90 border border-black/[0.06] font-sans select-none shadow-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          <Thermometer className="w-4 h-4" style={{ color: tempColor }} />
          <span>Thermal Core Simulation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono bg-[#e6f6ef] px-2 py-0.5 rounded-md border border-[#bce8d5]" style={{ color: tempColor }}>
            {temperatureK} K
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({celsius}°C / {fahrenheit}°F)
          </span>
        </div>
      </div>

      {/* Hardware Slider Track */}
      <div className="relative mb-3">
        <input
          type="range"
          min="0"
          max="6000"
          step="10"
          value={temperatureK}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16a875] border border-slate-300/60"
          style={{
            backgroundImage: `linear-gradient(90deg, #06b6d4 0%, #16a875 20%, #d97706 50%, #ea580c 75%, #e11d48 100%)`,
          }}
        />
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {THERMAL_PRESETS.map((preset) => {
          const isActive = Math.abs(temperatureK - preset.value) < 15;
          return (
            <button
              key={preset.value}
              onClick={() => onTemperatureChange(preset.value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                isActive
                  ? 'bg-[#e6f6ef] text-[#087f5b] border-[#16a875] font-bold shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
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
