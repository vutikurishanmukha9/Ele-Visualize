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
  shells: number[];
}

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
