/**
 * Quantum State & Subatomic Type Definitions
 */

export type SubshellType = 's' | 'p' | 'd' | 'f' | 'g';

export interface QuantumNumbers {
  n: number; // Principal quantum number (1, 2, 3...)
  l: number; // Azimuthal quantum number (0 to n-1)
  ml: number; // Magnetic quantum number (-l to +l)
  ms: 0.5 | -0.5; // Spin projection (+1/2 or -1/2)
}

export interface ElectronOrbitalState {
  id: string;
  n: number;
  l: number;
  ml: number;
  subshell: SubshellType;
  orbitalLabel: string; // e.g. "1s", "2px", "3dz2", "4fz3"
  radialNodes: number; // n - l - 1
  angularNodes: number; // l
  occupancy: number; // 0, 1, or 2 electrons
  energyEv: number;
  isValence: boolean;
  electronCount: number;
}

export interface ShellConfiguration {
  shellIndex: number;
  shellLetter: 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q';
  principalQuantumNumber: number; // n = 1..7
  electronCount: number;
  maxCapacity: number; // 2n^2
  subshells: {
    type: SubshellType;
    electrons: number;
    capacity: number;
  }[];
  isValence: boolean;
}

export interface ValenceQuark {
  flavor: 'up' | 'down';
  chargeFraction: number; // +2/3 or -1/3
  chargeStr: string; // "+2/3 e" or "-1/3 e"
  massMev: number; // ~2.2 MeV for up, ~4.7 MeV for down
  colorCharge: 'red' | 'green' | 'blue';
}

export interface NucleonState {
  id: string;
  type: 'proton' | 'neutron';
  charge: number; // +1 or 0
  valenceQuarks: ValenceQuark[];
  position: [number, number, number]; // Deterministic packing coordinate
  phase: number;
}

export interface EnergyLevelState {
  n: number;
  label: string;
  energyEv: number;
  ionizationGapEv: number;
  isOccupied: boolean;
  electronCount: number;
}

export interface AtomicTransition {
  id: string;
  initialLevel: number; // n_initial
  finalLevel: number; // n_final
  initialEnergyEv: number;
  finalEnergyEv: number;
  deltaEnergyEv: number;
  wavelengthNm: number;
  frequencyHz: number;
  spectralSeriesName: string; // e.g. "Lyman", "Balmer", "Paschen", "Brackett"
  colorHex: string;
  isAllowedElectricDipole: boolean;
  selectionRuleDetails: string;
}
