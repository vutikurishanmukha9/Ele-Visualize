import { memo } from 'react';
import { Thermometer, Zap } from 'lucide-react';

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

  // Dynamic heat glow color
  const getTempColor = (t: number) => {
    if (t < 100) return '#00f0ff';
    if (t < 300) return '#38bdf8';
    if (t < 1000) return '#ffaa00';
    if (t < 3000) return '#ff4400';
    return '#ff0055';
  };

  const tempColor = getTempColor(temperatureK);

  return (
    <div className={`p-2.5 rounded-lg bg-black/85 border border-white/10 font-mono select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] mb-2">
        <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
          <Thermometer className="w-3.5 h-3.5" style={{ color: tempColor }} />
          <span>Thermal Core Simulation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: tempColor }}>
            {temperatureK} K
          </span>
          <span className="text-[10px] text-slate-400">
            ({celsius}°C / {fahrenheit}°F)
          </span>
        </div>
      </div>

      {/* Hardware Slider Track */}
      <div className="relative mb-2">
        <input
          type="range"
          min="0"
          max="6000"
          step="10"
          value={temperatureK}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
          style={{
            backgroundImage: `linear-gradient(90deg, #00f0ff 0%, #38bdf8 15%, #ffaa00 45%, #ff4400 75%, #ff0055 100%)`,
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
              className={`px-1.5 py-0.5 rounded text-[9px] transition-all border ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
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
