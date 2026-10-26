export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export type ElementBlock = 's' | 'p' | 'd' | 'f';

export interface ChemicalElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  category: ElementCategory;
  shells: number[];
  block?: ElementBlock;
}

export const categoryColors: Record<ElementCategory, string> = {
  'alkali-metal': '#f43f5e',      // Alkali Metals: Radiant Carmine Flame Red
  'alkaline-earth': '#fb923c',    // Alkaline Earth: Luminous Solar Orange
  'transition-metal': '#eab308',  // Transition Metals: Aurum Amber / Metallic Sheen
  'post-transition': '#10b981',   // Post-Transition: Crystalline Emerald
  'metalloid': '#06b6d4',         // Metalloids: Electric Cyan / Semiconductor
  'nonmetal': '#3b82f6',          // Reactive Nonmetals: Vibrant Cobalt Azure
  'halogen': '#8b5cf6',           // Halogens: Energetic Halide Violet
  'noble-gas': '#d946ef',         // Noble Gases: High-Voltage Plasma Magenta
  'lanthanide': '#ec4899',        // Lanthanides: Rare Earth Orchid Pink
  'actinide': '#f43f5e',          // Actinides: Heavy Actinide Crimson
};

export const categoryGlows: Record<ElementCategory, string> = {
  'alkali-metal': 'rgba(244, 63, 94, 0.45)',
  'alkaline-earth': 'rgba(251, 146, 60, 0.45)',
  'transition-metal': 'rgba(234, 179, 8, 0.40)',
  'post-transition': 'rgba(16, 185, 129, 0.40)',
  'metalloid': 'rgba(6, 182, 212, 0.45)',
  'nonmetal': 'rgba(59, 130, 246, 0.45)',
  'halogen': 'rgba(139, 92, 246, 0.45)',
  'noble-gas': 'rgba(217, 70, 239, 0.50)',
  'lanthanide': 'rgba(236, 72, 153, 0.45)',
  'actinide': 'rgba(244, 63, 94, 0.45)',
};

export const getElementBlock = (atomicNumber: number): ElementBlock => {
  if (atomicNumber === 1 || atomicNumber === 2) return 's';
  if ((atomicNumber >= 3 && atomicNumber <= 4) || (atomicNumber >= 11 && atomicNumber <= 12) ||
      (atomicNumber >= 19 && atomicNumber <= 20) || (atomicNumber >= 37 && atomicNumber <= 38) ||
      (atomicNumber >= 55 && atomicNumber <= 56) || (atomicNumber >= 87 && atomicNumber <= 88)) {
    return 's';
  }
  if ((atomicNumber >= 57 && atomicNumber <= 71) || (atomicNumber >= 89 && atomicNumber <= 103)) {
    return 'f';
  }
  if ((atomicNumber >= 21 && atomicNumber <= 30) || (atomicNumber >= 39 && atomicNumber <= 48) ||
      (atomicNumber >= 72 && atomicNumber <= 80) || (atomicNumber >= 104 && atomicNumber <= 112)) {
    return 'd';
  }
  return 'p';
};

export const getCategoryColor = (category: ElementCategory): string => {
  return categoryColors[category] || '#38bdf8';
};

export const getCategoryGlow = (category: ElementCategory): string => {
  return categoryGlows[category] || 'rgba(56, 189, 248, 0.4)';
};

export interface ElementPalette {
  primary: string;       // Authentic CPK / spectroscopic base color
  secondary: string;     // Shaded volume / ambient occlusion tone
  highlight: string;     // Specular reflection highlight
  glow: string;          // Luminous emission / halo tint
  border: string;        // Vector hairline contour
  text: string;          // High-contrast label color ('#ffffff' or '#090d16')
}

// Master scientific IUPAC / CPK / Spectroscopic physical palettes
export const ELEMENT_PALETTES: Record<string, ElementPalette> = {
  // Biogenic & Common Nonmetals
  H: { primary: '#f8fafc', secondary: '#94a3b8', highlight: '#ffffff', glow: 'rgba(56, 189, 248, 0.45)', border: '#38bdf8', text: '#090d16' },
  C: { primary: '#334155', secondary: '#0f172a', highlight: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)', border: '#64748b', text: '#ffffff' },
  N: { primary: '#3b82f6', secondary: '#1d4ed8', highlight: '#93c5fd', glow: 'rgba(59, 130, 246, 0.5)', border: '#60a5fa', text: '#ffffff' },
  O: { primary: '#ef4444', secondary: '#b91c1c', highlight: '#fca5a5', glow: 'rgba(239, 68, 68, 0.5)', border: '#f87171', text: '#ffffff' },
  P: { primary: '#f97316', secondary: '#c2410c', highlight: '#fdba74', glow: 'rgba(249, 115, 22, 0.5)', border: '#fb923c', text: '#ffffff' },
  S: { primary: '#eab308', secondary: '#a16207', highlight: '#fef08a', glow: 'rgba(234, 179, 8, 0.5)', border: '#facc15', text: '#090d16' },
  
  // Halogens
  F: { primary: '#10b981', secondary: '#047857', highlight: '#6ee7b7', glow: 'rgba(16, 185, 129, 0.5)', border: '#34d399', text: '#090d16' },
  Cl: { primary: '#22c55e', secondary: '#15803d', highlight: '#86efac', glow: 'rgba(34, 197, 94, 0.5)', border: '#4ade80', text: '#090d16' },
  Br: { primary: '#b91c1c', secondary: '#7f1d1d', highlight: '#fca5a5', glow: 'rgba(185, 28, 28, 0.5)', border: '#ef4444', text: '#ffffff' },
  I: { primary: '#9333ea', secondary: '#581c87', highlight: '#d8b4fe', glow: 'rgba(147, 51, 234, 0.5)', border: '#a855f7', text: '#ffffff' },
  At: { primary: '#701a75', secondary: '#4a044e', highlight: '#f0abfc', glow: 'rgba(112, 26, 117, 0.45)', border: '#c026d3', text: '#ffffff' },

  // Noble Gases (Gas Discharge Spectra)
  He: { primary: '#fde047', secondary: '#ca8a04', highlight: '#fef9c3', glow: 'rgba(250, 204, 21, 0.5)', border: '#facc15', text: '#090d16' },
  Ne: { primary: '#ff5722', secondary: '#c2410c', highlight: '#fdba74', glow: 'rgba(255, 87, 34, 0.55)', border: '#fb923c', text: '#ffffff' },
  Ar: { primary: '#c084fc', secondary: '#7e22ce', highlight: '#f3e8ff', glow: 'rgba(192, 132, 252, 0.5)', border: '#d8b4fe', text: '#090d16' },
  Kr: { primary: '#38bdf8', secondary: '#0284c7', highlight: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.5)', border: '#7dd3fc', text: '#090d16' },
  Xe: { primary: '#0284c7', secondary: '#0369a1', highlight: '#bae6fd', glow: 'rgba(2, 132, 199, 0.55)', border: '#38bdf8', text: '#ffffff' },
  Rn: { primary: '#f43f5e', secondary: '#9f1239', highlight: '#fecdd3', glow: 'rgba(244, 63, 94, 0.5)', border: '#fb7185', text: '#ffffff' },

  // Alkali Metals (Flame Emission Spectra)
  Li: { primary: '#f43f5e', secondary: '#be123c', highlight: '#fda4af', glow: 'rgba(244, 63, 94, 0.5)', border: '#fb7185', text: '#ffffff' },
  Na: { primary: '#f59e0b', secondary: '#b45309', highlight: '#fef08a', glow: 'rgba(245, 158, 11, 0.5)', border: '#fbbf24', text: '#090d16' },
  K: { primary: '#a855f7', secondary: '#6b21a8', highlight: '#e9d5ff', glow: 'rgba(168, 85, 247, 0.5)', border: '#c084fc', text: '#ffffff' },
  Rb: { primary: '#e11d48', secondary: '#881337', highlight: '#fecdd3', glow: 'rgba(225, 29, 72, 0.5)', border: '#fb7185', text: '#ffffff' },
  Cs: { primary: '#0284c7', secondary: '#075985', highlight: '#bae6fd', glow: 'rgba(2, 132, 199, 0.5)', border: '#38bdf8', text: '#ffffff' },

  // Alkaline Earth Metals
  Be: { primary: '#10b981', secondary: '#047857', highlight: '#a7f3d0', glow: 'rgba(16, 185, 129, 0.45)', border: '#34d399', text: '#090d16' },
  Mg: { primary: '#cbd5e1', secondary: '#64748b', highlight: '#f8fafc', glow: 'rgba(203, 213, 225, 0.45)', border: '#e2e8f0', text: '#090d16' },
  Ca: { primary: '#fb923c', secondary: '#c2410c', highlight: '#fed7aa', glow: 'rgba(251, 146, 60, 0.5)', border: '#f97316', text: '#090d16' },
  Sr: { primary: '#ef4444', secondary: '#b91c1c', highlight: '#fca5a5', glow: 'rgba(239, 68, 68, 0.5)', border: '#f87171', text: '#ffffff' },
  Ba: { primary: '#84cc16', secondary: '#4d7c0f', highlight: '#d9f99d', glow: 'rgba(132, 204, 22, 0.5)', border: '#a3e635', text: '#090d16' },

  // Transition & Metallics
  Ti: { primary: '#94a3b8', secondary: '#475569', highlight: '#f1f5f9', glow: 'rgba(148, 163, 184, 0.45)', border: '#cbd5e1', text: '#090d16' },
  V: { primary: '#8b5cf6', secondary: '#5b21b6', highlight: '#ddd6fe', glow: 'rgba(139, 92, 246, 0.45)', border: '#a78bfa', text: '#ffffff' },
  Cr: { primary: '#38bdf8', secondary: '#0284c7', highlight: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.45)', border: '#7dd3fc', text: '#090d16' },
  Mn: { primary: '#ec4899', secondary: '#9d174d', highlight: '#fce7f3', glow: 'rgba(236, 72, 153, 0.45)', border: '#f472b6', text: '#ffffff' },
  Fe: { primary: '#e2e8f0', secondary: '#475569', highlight: '#ffffff', glow: 'rgba(226, 232, 240, 0.5)', border: '#94a3b8', text: '#090d16' },
  Co: { primary: '#2563eb', secondary: '#1e3a8a', highlight: '#bfdbfe', glow: 'rgba(37, 99, 235, 0.5)', border: '#60a5fa', text: '#ffffff' },
  Ni: { primary: '#6ee7b7', secondary: '#059669', highlight: '#d1fae5', glow: 'rgba(110, 231, 183, 0.5)', border: '#34d399', text: '#090d16' },
  Cu: { primary: '#ea580c', secondary: '#9a3412', highlight: '#ffedd5', glow: 'rgba(234, 88, 12, 0.55)', border: '#f97316', text: '#ffffff' },
  Zn: { primary: '#94a3b8', secondary: '#475569', highlight: '#f1f5f9', glow: 'rgba(148, 163, 184, 0.45)', border: '#cbd5e1', text: '#090d16' },
  Ag: { primary: '#f8fafc', secondary: '#94a3b8', highlight: '#ffffff', glow: 'rgba(248, 250, 252, 0.6)', border: '#e2e8f0', text: '#090d16' },
  Au: { primary: '#f59e0b', secondary: '#b45309', highlight: '#fef9c3', glow: 'rgba(245, 158, 11, 0.6)', border: '#fbbf24', text: '#090d16' },
  Pt: { primary: '#e2e8f0', secondary: '#64748b', highlight: '#ffffff', glow: 'rgba(226, 232, 240, 0.55)', border: '#cbd5e1', text: '#090d16' },
  Hg: { primary: '#cbd5e1', secondary: '#475569', highlight: '#ffffff', glow: 'rgba(203, 213, 225, 0.5)', border: '#94a3b8', text: '#090d16' },

  // Metalloids & Post-transition
  B: { primary: '#38bdf8', secondary: '#0369a1', highlight: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.45)', border: '#7dd3fc', text: '#090d16' },
  Al: { primary: '#cbd5e1', secondary: '#64748b', highlight: '#f8fafc', glow: 'rgba(203, 213, 225, 0.45)', border: '#e2e8f0', text: '#090d16' },
  Si: { primary: '#0ea5e9', secondary: '#0369a1', highlight: '#bae6fd', glow: 'rgba(14, 165, 233, 0.45)', border: '#38bdf8', text: '#ffffff' },
  Ga: { primary: '#10b981', secondary: '#047857', highlight: '#a7f3d0', glow: 'rgba(16, 185, 129, 0.45)', border: '#34d399', text: '#090d16' },
  Ge: { primary: '#06b6d4', secondary: '#0e7490', highlight: '#cffafe', glow: 'rgba(6, 182, 212, 0.45)', border: '#22d3ee', text: '#090d16' },
  As: { primary: '#eab308', secondary: '#854d0e', highlight: '#fef08a', glow: 'rgba(234, 179, 8, 0.45)', border: '#facc15', text: '#090d16' },
  Sn: { primary: '#94a3b8', secondary: '#475569', highlight: '#f1f5f9', glow: 'rgba(148, 163, 184, 0.45)', border: '#cbd5e1', text: '#090d16' },
  Pb: { primary: '#64748b', secondary: '#334155', highlight: '#cbd5e1', glow: 'rgba(100, 116, 139, 0.45)', border: '#94a3b8', text: '#ffffff' },
  Bi: { primary: '#ec4899', secondary: '#9d174d', highlight: '#fce7f3', glow: 'rgba(236, 72, 153, 0.45)', border: '#f472b6', text: '#ffffff' },
  U: { primary: '#10b981', secondary: '#047857', highlight: '#d1fae5', glow: 'rgba(16, 185, 129, 0.6)', border: '#34d399', text: '#090d16' },
};

export const getElementPalette = (elementOrSymbol: ChemicalElement | string): ElementPalette => {
  const symbol = typeof elementOrSymbol === 'string' ? elementOrSymbol : elementOrSymbol.symbol;
  if (ELEMENT_PALETTES[symbol]) {
    return ELEMENT_PALETTES[symbol];
  }

  // Fallback to category-based rich gradient palette
  const category = typeof elementOrSymbol === 'string' 
    ? (elements.find(e => e.symbol === symbol)?.category || 'nonmetal')
    : elementOrSymbol.category;

  const base = categoryColors[category] || '#38bdf8';
  const glow = categoryGlows[category] || 'rgba(56, 189, 248, 0.45)';
  return {
    primary: base,
    secondary: '#0f172a',
    highlight: '#ffffff',
    glow,
    border: base,
    text: '#ffffff',
  };
};

export const getElementColor = (element: ChemicalElement): string => {
  return getElementPalette(element).primary;
};

export const elements: ChemicalElement[] = [
  // Period 1
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal', shells: [1] },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: 4.003, category: 'noble-gas', shells: [2] },
  // Period 2
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: 6.941, category: 'alkali-metal', shells: [2, 1] },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: 9.012, category: 'alkaline-earth', shells: [2, 2] },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: 10.81, category: 'metalloid', shells: [2, 3] },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: 12.01, category: 'nonmetal', shells: [2, 4] },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: 14.01, category: 'nonmetal', shells: [2, 5] },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: 16.00, category: 'nonmetal', shells: [2, 6] },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: 19.00, category: 'halogen', shells: [2, 7] },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: 20.18, category: 'noble-gas', shells: [2, 8] },
  // Period 3
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: 22.99, category: 'alkali-metal', shells: [2, 8, 1] },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: 24.31, category: 'alkaline-earth', shells: [2, 8, 2] },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminum', atomicMass: 26.98, category: 'post-transition', shells: [2, 8, 3] },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: 28.09, category: 'metalloid', shells: [2, 8, 4] },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: 30.97, category: 'nonmetal', shells: [2, 8, 5] },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: 32.07, category: 'nonmetal', shells: [2, 8, 6] },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: 35.45, category: 'halogen', shells: [2, 8, 7] },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: 39.95, category: 'noble-gas', shells: [2, 8, 8] },
  // Period 4
  { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicMass: 39.10, category: 'alkali-metal', shells: [2, 8, 8, 1] },
  { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicMass: 40.08, category: 'alkaline-earth', shells: [2, 8, 8, 2] },
  { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicMass: 44.96, category: 'transition-metal', shells: [2, 8, 9, 2] },
  { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicMass: 47.87, category: 'transition-metal', shells: [2, 8, 10, 2] },
  { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicMass: 50.94, category: 'transition-metal', shells: [2, 8, 11, 2] },
  { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicMass: 52.00, category: 'transition-metal', shells: [2, 8, 13, 1] },
  { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicMass: 54.94, category: 'transition-metal', shells: [2, 8, 13, 2] },
  { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicMass: 55.85, category: 'transition-metal', shells: [2, 8, 14, 2] },
  { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicMass: 58.93, category: 'transition-metal', shells: [2, 8, 15, 2] },
  { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicMass: 58.69, category: 'transition-metal', shells: [2, 8, 16, 2] },
  { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicMass: 63.55, category: 'transition-metal', shells: [2, 8, 18, 1] },
  { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicMass: 65.38, category: 'transition-metal', shells: [2, 8, 18, 2] },
  { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicMass: 69.72, category: 'post-transition', shells: [2, 8, 18, 3] },
  { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicMass: 72.63, category: 'metalloid', shells: [2, 8, 18, 4] },
  { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicMass: 74.92, category: 'metalloid', shells: [2, 8, 18, 5] },
  { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicMass: 78.97, category: 'nonmetal', shells: [2, 8, 18, 6] },
  { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicMass: 79.90, category: 'halogen', shells: [2, 8, 18, 7] },
  { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicMass: 83.80, category: 'noble-gas', shells: [2, 8, 18, 8] },
  // Period 5
  { atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: 85.47, category: 'alkali-metal', shells: [2, 8, 18, 8, 1] },
  { atomicNumber: 38, symbol: 'Sr', name: 'Strontium', atomicMass: 87.62, category: 'alkaline-earth', shells: [2, 8, 18, 8, 2] },
  { atomicNumber: 39, symbol: 'Y', name: 'Yttrium', atomicMass: 88.91, category: 'transition-metal', shells: [2, 8, 18, 9, 2] },
  { atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', atomicMass: 91.22, category: 'transition-metal', shells: [2, 8, 18, 10, 2] },
  { atomicNumber: 41, symbol: 'Nb', name: 'Niobium', atomicMass: 92.91, category: 'transition-metal', shells: [2, 8, 18, 12, 1] },
  { atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', atomicMass: 95.95, category: 'transition-metal', shells: [2, 8, 18, 13, 1] },
  { atomicNumber: 43, symbol: 'Tc', name: 'Technetium', atomicMass: 98.00, category: 'transition-metal', shells: [2, 8, 18, 13, 2] },
  { atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', atomicMass: 101.07, category: 'transition-metal', shells: [2, 8, 18, 15, 1] },
  { atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', atomicMass: 102.91, category: 'transition-metal', shells: [2, 8, 18, 16, 1] },
  { atomicNumber: 46, symbol: 'Pd', name: 'Palladium', atomicMass: 106.42, category: 'transition-metal', shells: [2, 8, 18, 18] },
  { atomicNumber: 47, symbol: 'Ag', name: 'Silver', atomicMass: 107.87, category: 'transition-metal', shells: [2, 8, 18, 18, 1] },
  { atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', atomicMass: 112.41, category: 'transition-metal', shells: [2, 8, 18, 18, 2] },
  { atomicNumber: 49, symbol: 'In', name: 'Indium', atomicMass: 114.82, category: 'post-transition', shells: [2, 8, 18, 18, 3] },
  { atomicNumber: 50, symbol: 'Sn', name: 'Tin', atomicMass: 118.71, category: 'post-transition', shells: [2, 8, 18, 18, 4] },
  { atomicNumber: 51, symbol: 'Sb', name: 'Antimony', atomicMass: 121.76, category: 'metalloid', shells: [2, 8, 18, 18, 5] },
  { atomicNumber: 52, symbol: 'Te', name: 'Tellurium', atomicMass: 127.60, category: 'metalloid', shells: [2, 8, 18, 18, 6] },
  { atomicNumber: 53, symbol: 'I', name: 'Iodine', atomicMass: 126.90, category: 'halogen', shells: [2, 8, 18, 18, 7] },
  { atomicNumber: 54, symbol: 'Xe', name: 'Xenon', atomicMass: 131.29, category: 'noble-gas', shells: [2, 8, 18, 18, 8] },
  // Period 6
  { atomicNumber: 55, symbol: 'Cs', name: 'Cesium', atomicMass: 132.91, category: 'alkali-metal', shells: [2, 8, 18, 18, 8, 1] },
  { atomicNumber: 56, symbol: 'Ba', name: 'Barium', atomicMass: 137.33, category: 'alkaline-earth', shells: [2, 8, 18, 18, 8, 2] },
  // Lanthanides (57-71)
  { atomicNumber: 57, symbol: 'La', name: 'Lanthanum', atomicMass: 138.91, category: 'lanthanide', shells: [2, 8, 18, 18, 9, 2] },
  { atomicNumber: 58, symbol: 'Ce', name: 'Cerium', atomicMass: 140.12, category: 'lanthanide', shells: [2, 8, 18, 19, 9, 2] },
  { atomicNumber: 59, symbol: 'Pr', name: 'Praseodymium', atomicMass: 140.91, category: 'lanthanide', shells: [2, 8, 18, 21, 8, 2] },
  { atomicNumber: 60, symbol: 'Nd', name: 'Neodymium', atomicMass: 144.24, category: 'lanthanide', shells: [2, 8, 18, 22, 8, 2] },
  { atomicNumber: 61, symbol: 'Pm', name: 'Promethium', atomicMass: 145.00, category: 'lanthanide', shells: [2, 8, 18, 23, 8, 2] },
  { atomicNumber: 62, symbol: 'Sm', name: 'Samarium', atomicMass: 150.36, category: 'lanthanide', shells: [2, 8, 18, 24, 8, 2] },
  { atomicNumber: 63, symbol: 'Eu', name: 'Europium', atomicMass: 151.96, category: 'lanthanide', shells: [2, 8, 18, 25, 8, 2] },
  { atomicNumber: 64, symbol: 'Gd', name: 'Gadolinium', atomicMass: 157.25, category: 'lanthanide', shells: [2, 8, 18, 25, 9, 2] },
  { atomicNumber: 65, symbol: 'Tb', name: 'Terbium', atomicMass: 158.93, category: 'lanthanide', shells: [2, 8, 18, 27, 8, 2] },
  { atomicNumber: 66, symbol: 'Dy', name: 'Dysprosium', atomicMass: 162.50, category: 'lanthanide', shells: [2, 8, 18, 28, 8, 2] },
  { atomicNumber: 67, symbol: 'Ho', name: 'Holmium', atomicMass: 164.93, category: 'lanthanide', shells: [2, 8, 18, 29, 8, 2] },
  { atomicNumber: 68, symbol: 'Er', name: 'Erbium', atomicMass: 167.26, category: 'lanthanide', shells: [2, 8, 18, 30, 8, 2] },
  { atomicNumber: 69, symbol: 'Tm', name: 'Thulium', atomicMass: 168.93, category: 'lanthanide', shells: [2, 8, 18, 31, 8, 2] },
  { atomicNumber: 70, symbol: 'Yb', name: 'Ytterbium', atomicMass: 173.05, category: 'lanthanide', shells: [2, 8, 18, 32, 8, 2] },
  { atomicNumber: 71, symbol: 'Lu', name: 'Lutetium', atomicMass: 174.97, category: 'lanthanide', shells: [2, 8, 18, 32, 9, 2] },
  // Continue Period 6
  { atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', atomicMass: 178.49, category: 'transition-metal', shells: [2, 8, 18, 32, 10, 2] },
  { atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', atomicMass: 180.95, category: 'transition-metal', shells: [2, 8, 18, 32, 11, 2] },
  { atomicNumber: 74, symbol: 'W', name: 'Tungsten', atomicMass: 183.84, category: 'transition-metal', shells: [2, 8, 18, 32, 12, 2] },
  { atomicNumber: 75, symbol: 'Re', name: 'Rhenium', atomicMass: 186.21, category: 'transition-metal', shells: [2, 8, 18, 32, 13, 2] },
  { atomicNumber: 76, symbol: 'Os', name: 'Osmium', atomicMass: 190.23, category: 'transition-metal', shells: [2, 8, 18, 32, 14, 2] },
  { atomicNumber: 77, symbol: 'Ir', name: 'Iridium', atomicMass: 192.22, category: 'transition-metal', shells: [2, 8, 18, 32, 15, 2] },
  { atomicNumber: 78, symbol: 'Pt', name: 'Platinum', atomicMass: 195.08, category: 'transition-metal', shells: [2, 8, 18, 32, 17, 1] },
  { atomicNumber: 79, symbol: 'Au', name: 'Gold', atomicMass: 196.97, category: 'transition-metal', shells: [2, 8, 18, 32, 18, 1] },
  { atomicNumber: 80, symbol: 'Hg', name: 'Mercury', atomicMass: 200.59, category: 'transition-metal', shells: [2, 8, 18, 32, 18, 2] },
  { atomicNumber: 81, symbol: 'Tl', name: 'Thallium', atomicMass: 204.38, category: 'post-transition', shells: [2, 8, 18, 32, 18, 3] },
  { atomicNumber: 82, symbol: 'Pb', name: 'Lead', atomicMass: 207.20, category: 'post-transition', shells: [2, 8, 18, 32, 18, 4] },
  { atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', atomicMass: 208.98, category: 'post-transition', shells: [2, 8, 18, 32, 18, 5] },
  { atomicNumber: 84, symbol: 'Po', name: 'Polonium', atomicMass: 209.00, category: 'metalloid', shells: [2, 8, 18, 32, 18, 6] },
  { atomicNumber: 85, symbol: 'At', name: 'Astatine', atomicMass: 210.00, category: 'halogen', shells: [2, 8, 18, 32, 18, 7] },
  { atomicNumber: 86, symbol: 'Rn', name: 'Radon', atomicMass: 222.00, category: 'noble-gas', shells: [2, 8, 18, 32, 18, 8] },
  // Period 7
  { atomicNumber: 87, symbol: 'Fr', name: 'Francium', atomicMass: 223.00, category: 'alkali-metal', shells: [2, 8, 18, 32, 18, 8, 1] },
  { atomicNumber: 88, symbol: 'Ra', name: 'Radium', atomicMass: 226.00, category: 'alkaline-earth', shells: [2, 8, 18, 32, 18, 8, 2] },
  // Actinides (89-103)
  { atomicNumber: 89, symbol: 'Ac', name: 'Actinium', atomicMass: 227.00, category: 'actinide', shells: [2, 8, 18, 32, 18, 9, 2] },
  { atomicNumber: 90, symbol: 'Th', name: 'Thorium', atomicMass: 232.04, category: 'actinide', shells: [2, 8, 18, 32, 18, 10, 2] },
  { atomicNumber: 91, symbol: 'Pa', name: 'Protactinium', atomicMass: 231.04, category: 'actinide', shells: [2, 8, 18, 32, 20, 9, 2] },
  { atomicNumber: 92, symbol: 'U', name: 'Uranium', atomicMass: 238.03, category: 'actinide', shells: [2, 8, 18, 32, 21, 9, 2] },
  { atomicNumber: 93, symbol: 'Np', name: 'Neptunium', atomicMass: 237.00, category: 'actinide', shells: [2, 8, 18, 32, 22, 9, 2] },
  { atomicNumber: 94, symbol: 'Pu', name: 'Plutonium', atomicMass: 244.00, category: 'actinide', shells: [2, 8, 18, 32, 24, 8, 2] },
  { atomicNumber: 95, symbol: 'Am', name: 'Americium', atomicMass: 243.00, category: 'actinide', shells: [2, 8, 18, 32, 25, 8, 2] },
  { atomicNumber: 96, symbol: 'Cm', name: 'Curium', atomicMass: 247.00, category: 'actinide', shells: [2, 8, 18, 32, 25, 9, 2] },
  { atomicNumber: 97, symbol: 'Bk', name: 'Berkelium', atomicMass: 247.00, category: 'actinide', shells: [2, 8, 18, 32, 27, 8, 2] },
  { atomicNumber: 98, symbol: 'Cf', name: 'Californium', atomicMass: 251.00, category: 'actinide', shells: [2, 8, 18, 32, 28, 8, 2] },
  { atomicNumber: 99, symbol: 'Es', name: 'Einsteinium', atomicMass: 252.00, category: 'actinide', shells: [2, 8, 18, 32, 29, 8, 2] },
  { atomicNumber: 100, symbol: 'Fm', name: 'Fermium', atomicMass: 257.00, category: 'actinide', shells: [2, 8, 18, 32, 30, 8, 2] },
  { atomicNumber: 101, symbol: 'Md', name: 'Mendelevium', atomicMass: 258.00, category: 'actinide', shells: [2, 8, 18, 32, 31, 8, 2] },
  { atomicNumber: 102, symbol: 'No', name: 'Nobelium', atomicMass: 259.00, category: 'actinide', shells: [2, 8, 18, 32, 32, 8, 2] },
  { atomicNumber: 103, symbol: 'Lr', name: 'Lawrencium', atomicMass: 266.00, category: 'actinide', shells: [2, 8, 18, 32, 32, 8, 3] },
  // Continue Period 7
  { atomicNumber: 104, symbol: 'Rf', name: 'Rutherfordium', atomicMass: 267.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 10, 2] },
  { atomicNumber: 105, symbol: 'Db', name: 'Dubnium', atomicMass: 268.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 11, 2] },
  { atomicNumber: 106, symbol: 'Sg', name: 'Seaborgium', atomicMass: 269.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 12, 2] },
  { atomicNumber: 107, symbol: 'Bh', name: 'Bohrium', atomicMass: 270.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 13, 2] },
  { atomicNumber: 108, symbol: 'Hs', name: 'Hassium', atomicMass: 277.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 14, 2] },
  { atomicNumber: 109, symbol: 'Mt', name: 'Meitnerium', atomicMass: 278.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 15, 2] },
  { atomicNumber: 110, symbol: 'Ds', name: 'Darmstadtium', atomicMass: 281.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 16, 2] },
  { atomicNumber: 111, symbol: 'Rg', name: 'Roentgenium', atomicMass: 282.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 17, 2] },
  { atomicNumber: 112, symbol: 'Cn', name: 'Copernicium', atomicMass: 285.00, category: 'transition-metal', shells: [2, 8, 18, 32, 32, 18, 2] },
  { atomicNumber: 113, symbol: 'Nh', name: 'Nihonium', atomicMass: 286.00, category: 'post-transition', shells: [2, 8, 18, 32, 32, 18, 3] },
  { atomicNumber: 114, symbol: 'Fl', name: 'Flerovium', atomicMass: 289.00, category: 'post-transition', shells: [2, 8, 18, 32, 32, 18, 4] },
  { atomicNumber: 115, symbol: 'Mc', name: 'Moscovium', atomicMass: 290.00, category: 'post-transition', shells: [2, 8, 18, 32, 32, 18, 5] },
  { atomicNumber: 116, symbol: 'Lv', name: 'Livermorium', atomicMass: 293.00, category: 'post-transition', shells: [2, 8, 18, 32, 32, 18, 6] },
  { atomicNumber: 117, symbol: 'Ts', name: 'Tennessine', atomicMass: 294.00, category: 'halogen', shells: [2, 8, 18, 32, 32, 18, 7] },
  { atomicNumber: 118, symbol: 'Og', name: 'Oganesson', atomicMass: 294.00, category: 'noble-gas', shells: [2, 8, 18, 32, 32, 18, 8] },
];

export const categoryLabels: Record<ElementCategory, string> = {
  'alkali-metal': 'Alkali Metals',
  'alkaline-earth': 'Alkaline Earth',
  'transition-metal': 'Transition Metals',
  'post-transition': 'Post-Transition',
  'metalloid': 'Metalloids',
  'nonmetal': 'Nonmetals',
  'halogen': 'Halogens',
  'noble-gas': 'Noble Gases',
  'lanthanide': 'Lanthanides',
  'actinide': 'Actinides',
};
