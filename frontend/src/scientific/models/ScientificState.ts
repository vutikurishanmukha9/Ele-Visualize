/**
 * ScientificState Master Contract
 * Immutable data structure representing all scientific facts, calculated quantum states,
 * and provenance metadata for the active element/isotope.
 *
 * INVARIANT: Contains zero rendering instructions (no camera, bloom, particles, colors).
 * Renderers are strictly consumers of this state.
 */

import { ChemicalElement } from '@/data/elements';
import { IsotopeInfo } from '@/data/isotopes';
import { EpistemologyMetadata } from './Epistemology';
import { ModelContext } from './ModelContext';
import {
  ShellConfiguration,
  ElectronOrbitalState,
  NucleonState,
  EnergyLevelState,
  AtomicTransition,
} from './QuantumTypes';

export interface ElectronConfigurationState {
  standardNotation: string; // e.g. "1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵ 4s²"
  nobleGasCoreNotation: string; // e.g. "[Ar] 3d⁵ 4s²"
  shellOccupancies: number[]; // e.g. [2, 8, 13, 2]
  valenceElectronCount: number;
  unpairedElectronCount: number;
  highestOccupiedSubshell: string; // e.g. "3d"
  groundStateTermSymbol: string; // e.g. "⁶S₅/₂"
}

export interface NuclearStructureState {
  protons: number;
  neutrons: number;
  massNumber: number;
  bindingEnergyPerNucleonMev: number;
  protonNeutronRatio: number;
  nucleons: NucleonState[]; // Deterministic packing list
  totalValenceQuarks: {
    upQuarks: number;
    downQuarks: number;
    totalCharge: number;
  };
  isStable: boolean;
  halfLifeStr: string;
  decayModeStr: string;
}

export interface AtomicEnergyState {
  groundStateEnergyEv: number; // e.g. -13.6 eV for H
  firstIonizationEnergyEv: number; // from experimental NIST or Slater model
  effectiveNuclearChargeZeff: number; // Slater Z_eff for valence shell
  energyLevels: EnergyLevelState[];
}

export interface TransitionSpectroscopyState {
  availableTransitions: AtomicTransition[];
  activeTransition: AtomicTransition | null;
  dominantSpectralSeries: string;
}

export interface ScientificState {
  readonly element: ChemicalElement;
  readonly activeIsotope: IsotopeInfo;
  readonly electronConfiguration: ElectronConfigurationState;
  readonly shells: ShellConfiguration[];
  readonly orbitals: ElectronOrbitalState[];
  readonly nucleus: NuclearStructureState;
  readonly energy: AtomicEnergyState;
  readonly spectroscopy: TransitionSpectroscopyState;
  readonly modelContext: ModelContext;
  readonly provenance: EpistemologyMetadata;
  readonly timestamp: number;
}
