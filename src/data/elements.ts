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

export interface ChemicalElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  category: ElementCategory;
  electronConfiguration?: string;
  shells: number[];
  summary?: string;
}

export const elements: ChemicalElement[] = [
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal' },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: 4.003, category: 'noble-gas' },
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: 6.941, category: 'alkali-metal' },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: 9.012, category: 'alkaline-earth' },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: 10.81, category: 'metalloid' },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: 12.01, category: 'nonmetal' },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: 14.01, category: 'nonmetal' },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: 16.00, category: 'nonmetal' },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: 19.00, category: 'halogen' },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: 20.18, category: 'noble-gas' },
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: 22.99, category: 'alkali-metal' },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: 24.31, category: 'alkaline-earth' },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminum', atomicMass: 26.98, category: 'post-transition' },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: 28.09, category: 'metalloid' },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: 30.97, category: 'nonmetal' },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: 32.07, category: 'nonmetal' },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: 35.45, category: 'halogen' },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: 39.95, category: 'noble-gas' },
  { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicMass: 39.10, category: 'alkali-metal' },
  { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicMass: 40.08, category: 'alkaline-earth' },
  { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicMass: 44.96, category: 'transition-metal' },
  { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicMass: 47.87, category: 'transition-metal' },
  { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicMass: 50.94, category: 'transition-metal' },
  { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicMass: 52.00, category: 'transition-metal' },
  { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicMass: 54.94, category: 'transition-metal' },
  { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicMass: 55.85, category: 'transition-metal' },
  { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicMass: 58.93, category: 'transition-metal' },
  { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicMass: 58.69, category: 'transition-metal' },
  { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicMass: 63.55, category: 'transition-metal' },
  { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicMass: 65.38, category: 'transition-metal' },
  { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicMass: 69.72, category: 'post-transition' },
  { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicMass: 72.63, category: 'metalloid' },
  { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicMass: 74.92, category: 'metalloid' },
  { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicMass: 78.97, category: 'nonmetal' },
  { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicMass: 79.90, category: 'halogen' },
  { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicMass: 83.80, category: 'noble-gas' },
];

export const categoryLabels: Record<ElementCategory, string> = {
  'alkali-metal': 'Alkali Metals',
  'alkaline-earth': 'Alkaline Earth Metals',
  'transition-metal': 'Transition Metals',
  'post-transition': 'Post-Transition Metals',
  'metalloid': 'Metalloids',
  'nonmetal': 'Nonmetals',
  'halogen': 'Halogens',
  'noble-gas': 'Noble Gases',
  'lanthanide': 'Lanthanides',
  'actinide': 'Actinides',
};

export const categoryColors: Record<ElementCategory, string> = {
  'alkali-metal': 'element-alkali',
  'alkaline-earth': 'element-alkaline',
  'transition-metal': 'element-transition',
  'post-transition': 'element-post',
  'metalloid': 'element-metalloid',
  'nonmetal': 'element-nonmetal',
  'halogen': 'element-halogen',
  'noble-gas': 'element-noble',
  'lanthanide': 'element-lanthanide',
  'actinide': 'element-actinide',
};
