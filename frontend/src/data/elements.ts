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
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal', shells: [1] },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: 4.003, category: 'noble-gas', shells: [2] },
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: 6.941, category: 'alkali-metal', shells: [2, 1] },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: 9.012, category: 'alkaline-earth', shells: [2, 2] },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: 10.81, category: 'metalloid', shells: [2, 3] },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: 12.01, category: 'nonmetal', shells: [2, 4] },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: 14.01, category: 'nonmetal', shells: [2, 5] },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: 16.00, category: 'nonmetal', shells: [2, 6] },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: 19.00, category: 'halogen', shells: [2, 7] },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: 20.18, category: 'noble-gas', shells: [2, 8] },
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: 22.99, category: 'alkali-metal', shells: [2, 8, 1] },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: 24.31, category: 'alkaline-earth', shells: [2, 8, 2] },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminum', atomicMass: 26.98, category: 'post-transition', shells: [2, 8, 3] },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: 28.09, category: 'metalloid', shells: [2, 8, 4] },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: 30.97, category: 'nonmetal', shells: [2, 8, 5] },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: 32.07, category: 'nonmetal', shells: [2, 8, 6] },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: 35.45, category: 'halogen', shells: [2, 8, 7] },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: 39.95, category: 'noble-gas', shells: [2, 8, 8] },
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
