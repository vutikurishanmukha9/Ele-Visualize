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
    <div className={`p-3 rounded-xl bg-white border border-slate-200 font-mono select-none shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] mb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider">
          <Thermometer className="w-3.5 h-3.5" style={{ color: tempColor }} />
          <span>Thermal Core Simulation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: tempColor }}>
            {temperatureK} K
          </span>
          <span className="text-[10px] text-slate-500">
            ({celsius}°C / {fahrenheit}°F)
          </span>
        </div>
      </div>

      {/* Hardware Slider Track */}
      <div className="relative mb-2.5">
        <input
          type="range"
          min="0"
          max="6000"
          step="10"
          value={temperatureK}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 border border-slate-300"
          style={{
            backgroundImage: `linear-gradient(90deg, #38bdf8 0%, #0284c7 20%, #d97706 50%, #ea580c 75%, #e11d48 100%)`,
          }}
        />
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1">
        {THERMAL_PRESETS.map((preset) => {
          const isActive = Math.abs(temperatureK - preset.value) < 15;
          return (
            <button
              key={preset.value}
              onClick={() => onTemperatureChange(preset.value)}
              className={`px-2 py-1 rounded text-[9px] transition-all border ${
                isActive
                  ? 'bg-sky-50 text-sky-700 border-sky-400 font-bold shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
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
