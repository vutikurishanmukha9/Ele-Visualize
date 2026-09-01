/**
 * Model Context Specification
 * Encapsulates the specific active theoretical model, approximation level, and data sources
 * used to generate a ScientificState.
 */

import { ProvenanceCitation } from './Epistemology';

export type EnergyModelType =
  | 'HYDROGENIC_ANALYTICAL'
  | 'SLATER_EFFECTIVE_CHARGE'
  | 'HARTREE_FOCK_NUMERICAL'
  | 'EMPIRICAL_NIST_LEVELS'
  | 'NORMALIZED_PEDAGOGICAL';

export type OrbitalModelType =
  | 'HYDROGENIC_ANALYTICAL_SPHERICAL_HARMONICS'
  | 'EFFECTIVE_CENTRAL_FIELD'
  | 'VALENCE_SHELL_APPROXIMATION';

export type NuclearModelType =
  | 'FERMI_GAS_DROPLET'
  | 'VALENCE_QUARK_CLUSTER'
  | 'CLOSE_PACKING_VISUAL_REPRESENTATION';

export type SpectroscopyModelType =
  | 'DIPOLE_SELECTION_RULES'
  | 'NIST_MEASURED_SPECTRAL_LINES';

export interface ModelContext {
  energyModel: EnergyModelType;
  orbitalModel: OrbitalModelType;
  nuclearModel: NuclearModelType;
  spectroscopyModel: SpectroscopyModelType;
  approximationLevel: string;
  dataSources: ProvenanceCitation[];
  modelVersion: string;
  isHydrogenic: boolean;
}

export const DEFAULT_HYDROGENIC_CONTEXT: ModelContext = {
  energyModel: 'HYDROGENIC_ANALYTICAL',
  orbitalModel: 'HYDROGENIC_ANALYTICAL_SPHERICAL_HARMONICS',
  nuclearModel: 'CLOSE_PACKING_VISUAL_REPRESENTATION',
  spectroscopyModel: 'DIPOLE_SELECTION_RULES',
  approximationLevel: 'Exact analytical solution for 1-electron potential',
  dataSources: [
    {
      sourceName: 'CODATA Internationally Recommended Values of Fundamental Physical Constants (2022)',
      sourceUrl: 'https://physics.nist.gov/cuu/Constants/',
    },
  ],
  modelVersion: '1.0.0-analytical',
  isHydrogenic: true,
};

export const DEFAULT_MULTI_ELECTRON_CONTEXT: ModelContext = {
  energyModel: 'SLATER_EFFECTIVE_CHARGE',
  orbitalModel: 'EFFECTIVE_CENTRAL_FIELD',
  nuclearModel: 'CLOSE_PACKING_VISUAL_REPRESENTATION',
  spectroscopyModel: 'DIPOLE_SELECTION_RULES',
  approximationLevel: "Slater Central Field Screening Approximation & NIST Reference Datasets",
  dataSources: [
    {
      sourceName: 'NIST Atomic Spectra Database (ASD)',
      sourceUrl: 'https://www.nist.gov/pml/atomic-spectra-database',
      standardReference: 'NIST Standard Reference Database 78',
    },
    {
      sourceName: 'IUPAC Periodic Table of the Elements',
      sourceUrl: 'https://iupac.org/what-we-do/periodic-table-of-elements/',
    },
  ],
  modelVersion: '1.2.0-semi-empirical',
  isHydrogenic: false,
};
